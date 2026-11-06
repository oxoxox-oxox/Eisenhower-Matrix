# ============================================================
# 在用户桌面创建「四象限时间管理」快捷方式
# ============================================================
$ErrorActionPreference = "SilentlyContinue"
$projectRoot = Split-Path -Parent $PSScriptRoot
if (-not $projectRoot) {
    $projectRoot = "d:\code\Eisenhower-Matrix"
}

$vbsPath = Join-Path $projectRoot "启动应用.vbs"
$desktop = [System.Environment]::GetFolderPath('Desktop')
$shortcutPath = Join-Path $desktop "四象限时间管理.lnk"

# 查找图标路径
$iconPath = "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"
if (-not (Test-Path $iconPath)) {
    $iconPath = "${env:ProgramFiles}\Microsoft\Edge\Application\msedge.exe"
}

$wshShell = New-Object -ComObject WScript.Shell
$shortcut = $wshShell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = "wscript.exe"
$shortcut.Arguments = "`"$vbsPath`""
$shortcut.WorkingDirectory = $projectRoot
$shortcut.Description = "四象限时间管理 - 桌面独立应用"
if (Test-Path $iconPath) {
    $shortcut.IconLocation = "$iconPath,0"
}
$shortcut.Save()

Write-Host "已在桌面成功创建快捷方式: $shortcutPath" -ForegroundColor Green
