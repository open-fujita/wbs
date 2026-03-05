# WBS Manager 停止スクリプト
# バックエンド（ポート3001）とフロントエンド（ポート5173）を停止する

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  WBS Manager を停止しています..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$stopped = $false

# ポート3001（バックエンド）を使用しているプロセスを特定して停止
Write-Host "`n[1/2] バックエンドAPIサーバー (ポート: 3001) を停止中..." -ForegroundColor Yellow
$backend = netstat -ano | Select-String ":3001\s" | Select-String "LISTENING"
if ($backend) {
    $pid3001 = ($backend -split "\s+")[-1]
    try {
        Stop-Process -Id $pid3001 -Force -ErrorAction Stop
        Write-Host "  → 停止しました (PID: $pid3001)" -ForegroundColor Green
        $stopped = $true
    } catch {
        Write-Host "  → 停止できませんでした: $_" -ForegroundColor Red
    }
} else {
    Write-Host "  → バックエンドは起動していません" -ForegroundColor Gray
}

# ポート5173（フロントエンド）を使用しているプロセスを特定して停止
Write-Host "[2/2] フロントエンド開発サーバー (ポート: 5173) を停止中..." -ForegroundColor Yellow
$frontend = netstat -ano | Select-String ":5173\s" | Select-String "LISTENING"
if ($frontend) {
    $pid5173 = ($frontend -split "\s+")[-1]
    try {
        Stop-Process -Id $pid5173 -Force -ErrorAction Stop
        Write-Host "  → 停止しました (PID: $pid5173)" -ForegroundColor Green
        $stopped = $true
    } catch {
        Write-Host "  → 停止できませんでした: $_" -ForegroundColor Red
    }
} else {
    Write-Host "  → フロントエンドは起動していません" -ForegroundColor Gray
}

Write-Host "`n========================================" -ForegroundColor $(if ($stopped) { "Green" } else { "Gray" })
if ($stopped) {
    Write-Host "  停止完了しました。" -ForegroundColor Green
} else {
    Write-Host "  停止対象のサービスはありませんでした。" -ForegroundColor Gray
}
Write-Host "========================================" -ForegroundColor $(if ($stopped) { "Green" } else { "Gray" })
