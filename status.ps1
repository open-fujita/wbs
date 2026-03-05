# WBS Manager 起動状況確認スクリプト

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  WBS Manager 起動状況の確認" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# バックエンドの確認（ポート3001）
Write-Host "`n[バックエンドAPIサーバー] ポート: 3001" -ForegroundColor Yellow
$backend = netstat -ano | Select-String ":3001\s" | Select-String "LISTENING"
if ($backend) {
    $pid3001 = ($backend -split "\s+")[-1]
    Write-Host "  ✅ 起動中 (PID: $pid3001)" -ForegroundColor Green

    # ヘルスチェック
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3001/api/health" -TimeoutSec 3 -ErrorAction Stop
        $json = $response.Content | ConvertFrom-Json
        Write-Host "  ヘルスチェック: OK (timestamp: $($json.timestamp))" -ForegroundColor Green
    }
    catch {
        Write-Host "  ヘルスチェック: 応答なし" -ForegroundColor Red
    }
}
else {
    Write-Host "  ❌ 停止中" -ForegroundColor Red
}

# フロントエンドの確認（ポート5173）
Write-Host "`n[フロントエンド開発サーバー] ポート: 5173" -ForegroundColor Yellow
$frontend = netstat -ano | Select-String ":5173\s" | Select-String "LISTENING"
if ($frontend) {
    $pid5173 = ($frontend -split "\s+")[-1]
    Write-Host "  ✅ 起動中 (PID: $pid5173)" -ForegroundColor Green
    Write-Host "  アクセスURL: http://localhost:5173/" -ForegroundColor Cyan
}
else {
    Write-Host "  ❌ 停止中" -ForegroundColor Red
}

Write-Host "`n========================================" -ForegroundColor Cyan
