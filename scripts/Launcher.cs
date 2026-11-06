using System;
using System.Diagnostics;
using System.IO;
using System.Net.Sockets;
using System.Threading;
using System.Windows.Forms;

namespace EisenhowerMatrix
{
    static class Program
    {
        private static string logFile = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            @"EisenhowerMatrix\launcher.log"
        );

        private static void Log(string msg)
        {
            try
            {
                string dir = Path.GetDirectoryName(logFile);
                if (!Directory.Exists(dir)) Directory.CreateDirectory(dir);
                File.AppendAllText(logFile, string.Format("[{0:yyyy-MM-dd HH:mm:ss.fff}] {1}\r\n", DateTime.Now, msg));
            }
            catch {}
        }

        private static bool IsPortOpen(string host, int port)
        {
            try
            {
                using (var client = new TcpClient())
                {
                    var res = client.BeginConnect(host, port, null, null);
                    bool ok = res.AsyncWaitHandle.WaitOne(200);
                    if (ok)
                    {
                        client.EndConnect(res);
                        return true;
                    }
                    return false;
                }
            }
            catch
            {
                return false;
            }
        }

        private static string FindNodeExecutable()
        {
            string[] paths = new string[]
            {
                @"D:\nodejs\node.exe",
                @"C:\Program Files\nodejs\node.exe",
                @"C:\Program Files (x86)\nodejs\node.exe",
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), @"Programs\node\node.exe")
            };

            foreach (var p in paths)
            {
                if (File.Exists(p)) return p;
            }

            var envPath = Environment.GetEnvironmentVariable("PATH") ?? "";
            foreach (var dir in envPath.Split(';'))
            {
                var candidate = Path.Combine(dir.Trim(), "node.exe");
                if (File.Exists(candidate)) return candidate;
            }

            return "node.exe";
        }

        private static string FindBrowserExecutable()
        {
            string[] candidates = new string[]
            {
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), @"Microsoft\Edge\Application\msedge.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), @"Microsoft\Edge\Application\msedge.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), @"Microsoft\Edge\Application\msedge.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), @"Google\Chrome\Application\chrome.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), @"Google\Chrome\Application\chrome.exe")
            };

            foreach (var p in candidates)
            {
                if (File.Exists(p)) return p;
            }
            return null;
        }

        private static void KillPort(int port)
        {
            try
            {
                ProcessStartInfo psi = new ProcessStartInfo
                {
                    FileName = "cmd.exe",
                    Arguments = string.Format("/c for /f \"tokens=5\" %a in ('netstat -aon ^| findstr :{0}') do taskkill /f /pid %a", port),
                    CreateNoWindow = true,
                    WindowStyle = ProcessWindowStyle.Hidden,
                    UseShellExecute = false
                };
                var p = Process.Start(psi);
                if (p != null) p.WaitForExit(2000);
            }
            catch (Exception ex)
            {
                Log("KillPort error: " + ex.Message);
            }
        }

        [STAThread]
        static void Main()
        {
            Log("=== Application Launcher Started ===");
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            int port = 5173;
            string host = "127.0.0.1";
            string appUrl = string.Format("http://{0}:{1}", host, port);

            Process nodeProc = null;

            try
            {
                // 1. Determine Project Directory
                string baseDir = AppDomain.CurrentDomain.BaseDirectory.TrimEnd('\\', '/');
                if (Path.GetFileName(baseDir).Equals("scripts", StringComparison.OrdinalIgnoreCase))
                {
                    baseDir = Directory.GetParent(baseDir).FullName;
                }
                Log("Project base directory: " + baseDir);

                string viteJs = Path.Combine(baseDir, @"node_modules\vite\bin\vite.js");
                if (!File.Exists(viteJs))
                {
                    Log("ERROR: vite.js not found at " + viteJs);
                    MessageBox.Show(string.Format("未在项目目录找到 vite.js：\n{0}\n请确认依赖已正确安装。", viteJs), "启动错误", MessageBoxButtons.OK, MessageBoxIcon.Error);
                    return;
                }

                // 2. Find Browser
                string browserPath = FindBrowserExecutable();
                Log("Browser path: " + (browserPath ?? "NULL"));
                if (string.IsNullOrEmpty(browserPath))
                {
                    Log("ERROR: No Edge/Chrome found.");
                    MessageBox.Show("未在系统中找到 Microsoft Edge 或 Google Chrome 浏览器，无法以应用窗口启动。", "启动失败", MessageBoxButtons.OK, MessageBoxIcon.Error);
                    return;
                }

                // 3. Start Vite if port not already open
                if (!IsPortOpen(host, port))
                {
                    string nodePath = FindNodeExecutable();
                    Log("Starting Node from: " + nodePath);

                    ProcessStartInfo nodePsi = new ProcessStartInfo
                    {
                        FileName = nodePath,
                        Arguments = string.Format("\"{0}\" --host {1} --port {2}", viteJs, host, port),
                        WorkingDirectory = baseDir,
                        CreateNoWindow = true,
                        WindowStyle = ProcessWindowStyle.Hidden,
                        UseShellExecute = false
                    };

                    try
                    {
                        nodeProc = Process.Start(nodePsi);
                        Log(string.Format("Node process started. PID: {0}", nodeProc.Id));
                    }
                    catch (Exception ex)
                    {
                        Log("ERROR starting node: " + ex.ToString());
                        MessageBox.Show(string.Format("启动 Node.js 服务失败：\n{0}", ex.Message), "启动失败", MessageBoxButtons.OK, MessageBoxIcon.Error);
                        return;
                    }

                    // Wait for port to be ready
                    bool ready = false;
                    for (int i = 0; i < 40; i++)
                    {
                        Thread.Sleep(250);
                        if (IsPortOpen(host, port))
                        {
                            ready = true;
                            Log(string.Format("Port {0} became ready in {1} ms.", port, (i + 1) * 250));
                            break;
                        }
                    }

                    if (!ready)
                    {
                        Log("ERROR: Port wait timed out.");
                        if (nodeProc != null && !nodeProc.HasExited)
                        {
                            try { nodeProc.Kill(); } catch {}
                        }
                        MessageBox.Show("启动本地应用服务超时，请检查端口 5173 是否被占用。", "启动失败", MessageBoxButtons.OK, MessageBoxIcon.Error);
                        return;
                    }
                }
                else
                {
                    Log(string.Format("Port {0} is already open. Reusing existing server.", port));
                }

                // 4. Launch Edge in App Mode (Frameless Desktop Experience)
                string browserArgs = string.Format("--app={0} --window-size=1360,860", appUrl);
                Log("Launching browser with args: " + browserArgs);

                ProcessStartInfo edgePsi = new ProcessStartInfo
                {
                    FileName = browserPath,
                    Arguments = browserArgs,
                    UseShellExecute = true
                };

                try
                {
                    Process.Start(edgePsi);
                    Log("Browser window launched successfully.");
                }
                catch (Exception ex)
                {
                    Log("ERROR launching browser: " + ex.ToString());
                    MessageBox.Show(string.Format("唤起应用窗口失败：\n{0}", ex.Message), "启动失败", MessageBoxButtons.OK, MessageBoxIcon.Error);
                    return;
                }

                // 5. If we started the node server, wait for node to exit (triggered by window close beacon or watchdog)
                if (nodeProc != null)
                {
                    Log("Waiting for application exit signal...");
                    nodeProc.WaitForExit();
                    Log("Node process exited.");
                }
            }
            catch (Exception globalEx)
            {
                Log("FATAL UNHANDLED EXCEPTION: " + globalEx.ToString());
                MessageBox.Show(string.Format("应用运行异常：\n{0}", globalEx.Message), "错误", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
            finally
            {
                // 6. Clean Teardown on exit
                Log("Executing teardown...");
                Thread.Sleep(200);
                if (nodeProc != null && !nodeProc.HasExited)
                {
                    try
                    {
                        Log(string.Format("Stopping Node process PID {0}...", nodeProc.Id));
                        nodeProc.Kill();
                        nodeProc.WaitForExit(1000);
                    }
                    catch (Exception ex)
                    {
                        Log("Error stopping node: " + ex.Message);
                    }
                }
                KillPort(port);
                Log("=== Application Launcher Exited Cleanly ===\r\n");
            }
        }
    }
}
