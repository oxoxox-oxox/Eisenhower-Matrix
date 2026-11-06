import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// 忽略不受信任证书（如部分内网或学校教务系统 SSL 证书）
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

/**
 * 强大的日历订阅反向代理中间件
 * 支持 webcal/https/http 自动切换、标准日程客户端 User-Agent 与证书容错
 */
function calendarProxyPlugin(): Plugin {
  const handler = async (req: any, res: any) => {
    try {
      const parsedUrl = new URL(req.url || '', 'http://localhost');
      const targetUrl = parsedUrl.searchParams.get('url');

      if (!targetUrl) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.end('Missing url query parameter');
        return;
      }

      // 候选协议地址：若为 webcal 则优先尝试 https，失败自动降级 http
      const candidates: string[] = [];
      if (/^webcal:\/\//i.test(targetUrl)) {
        candidates.push(targetUrl.replace(/^webcal:\/\//i, 'https://'));
        candidates.push(targetUrl.replace(/^webcal:\/\//i, 'http://'));
      } else {
        candidates.push(targetUrl);
        if (/^https:\/\//i.test(targetUrl)) {
          candidates.push(targetUrl.replace(/^https:\/\//i, 'http://'));
        }
      }

      let lastError: any = null;
      let responseText = '';
      let success = false;

      // 模拟标准 Calendar / 现代浏览器 Headers
      const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/calendar, text/x-vcalendar, application/calendar+xml, text/plain, */*',
        'Cache-Control': 'no-cache',
      };

      for (const candidate of candidates) {
        try {
          const resp = await fetch(candidate, {
            headers,
            redirect: 'follow',
          });

          if (!resp.ok) {
            lastError = new Error(`远程服务器返回 HTTP ${resp.status} (${resp.statusText})`);
            continue;
          }

          responseText = await resp.text();
          success = true;
          break;
        } catch (fetchErr: any) {
          lastError = fetchErr;
        }
      }

      if (!success) {
        res.statusCode = 502;
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.end(`代理拉取日历失败: ${lastError?.message || '无法连接到远程日历服务器'}`);
        return;
      }

      res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.statusCode = 200;
      res.end(responseText);
    } catch (error: any) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.end(`代理内部错误: ${error.message || 'Unknown error'}`);
    }
  };

  return {
    name: 'calendar-proxy-plugin',
    configureServer(server) {
      server.middlewares.use('/api/calendar-proxy', handler);
    },
    configurePreviewServer(server) {
      server.middlewares.use('/api/calendar-proxy', handler);
    },
  };
}

/**
 * 优雅关闭服务的中间件
 * 支持关窗信标（sendBeacon）、页面心跳看门狗（Watchdog）与主动停机，安全释放 Node 进程与端口
 */
function appShutdownPlugin(): Plugin {
  let lastHeartbeat = Date.now();
  let shutdownTimer: NodeJS.Timeout | null = null;

  return {
    name: 'app-shutdown-plugin',
    configureServer(server) {
      const startTime = Date.now();

      // 后台看门狗：如果启动 15 秒后，连续 8 秒未收到前端心跳且无活动，说明窗口已异常关闭，自动停机
      setInterval(() => {
        if (Date.now() - startTime < 15000) return;
        if (Date.now() - lastHeartbeat > 8000) {
          console.log('[App] 超过 8 秒未检测到前端心跳，正在自动退出服务...');
          server.close();
          process.exit(0);
        }
      }, 2000);

      server.middlewares.use((req: any, res: any, next: any) => {
        const url = req.url || '';

        // 心跳接口
        if (url.startsWith('/api/heartbeat')) {
          lastHeartbeat = Date.now();
          if (shutdownTimer) {
            clearTimeout(shutdownTimer);
            shutdownTimer = null;
          }
          res.statusCode = 200;
          res.setHeader('Content-Type', 'text/plain; charset=utf-8');
          res.end('ok');
          return;
        }

        // 关窗或退出指令接口
        if (url.startsWith('/api/shutdown') && req.method === 'POST') {
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.end(JSON.stringify({ success: true, message: 'Server is shutting down' }));

          if (!shutdownTimer) {
            shutdownTimer = setTimeout(() => {
              server.close();
              process.exit(0);
            }, 800);
          }
          return;
        }

        // 普通请求：更新活跃时间，并取消可能因页面刷新（F5）产生的临时停机倒计时
        lastHeartbeat = Date.now();
        if (shutdownTimer && !url.startsWith('/api/shutdown')) {
          clearTimeout(shutdownTimer);
          shutdownTimer = null;
        }

        next();
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((req: any, res: any, next: any) => {
        const url = req.url || '';
        if (url.startsWith('/api/shutdown') && req.method === 'POST') {
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ success: true }));
          setTimeout(() => process.exit(0), 500);
          return;
        }
        next();
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    calendarProxyPlugin(),
    appShutdownPlugin(),
  ],
})
