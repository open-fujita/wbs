# WBS Manager 起動スクリプト
# バックエンドとフロントエンドを別ウィンドウで起動する

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  WBS Manager を起動しています..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# バックエンドAPIサーバーを新しいウィンドウで起動
Write-Host "`n[1/2] バックエンドAPIサーバーを起動中 (ポート: 3001)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "cd '$projectRoot'; Write-Host '[バックエンド] 起動中...' -ForegroundColor Cyan; npm run server"
) -WindowStyle Normal

# フロントエンドが起動するまで少し待機
Start-Sleep -Seconds 2

# フロントエンド開発サーバーを新しいウィンドウで起動
Write-Host "[2/2] フロントエンド開発サーバーを起動中 (ポート: 5173)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "cd '$projectRoot'; Write-Host '[フロントエンド] 起動中...' -ForegroundColor Cyan; npm run dev"
) -WindowStyle Normal

# 起動完了メッセージ
Start-Sleep -Seconds 3
Write-Host "`n========================================" -ForegroundColor Green
Write-Host "  起動完了！" -ForegroundColor Green
Write-Host "  ブラウザでアクセス: http://localhost:5173/" -ForegroundColor Green
Write-Host "  API ヘルスチェック: http://localhost:3001/api/health" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "`n停止するには stop.ps1 を実行してください。" -ForegroundColor Gray
