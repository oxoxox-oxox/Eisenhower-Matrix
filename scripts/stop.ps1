# ============================================================
# Eisenhower Matrix - Stop background service script
# ============================================================
$ErrorActionPreference = "SilentlyContinue"
$port = 5173

Write-Host "Checking port $port..." -ForegroundColor Cyan

$conns = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
$stoppedCount = 0

foreach ($c in $conns) {
    $procId = $c.OwningProcess
    try {
        $p = Get-Process -Id $procId -ErrorAction SilentlyContinue
        if ($p) {
            Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
            Write-Host "Terminated process: $($p.ProcessName) (PID: $procId)" -ForegroundColor Green
            $stoppedCount++
        }
    } catch {}
}

if ($stoppedCount -eq 0) {
    Write-Host "Port $port is free. No background service running." -ForegroundColor Yellow
} else {
    Write-Host "Port $port released successfully. All services stopped." -ForegroundColor Green
}
