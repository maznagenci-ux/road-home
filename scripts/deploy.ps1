# Production deploy helper (Windows PowerShell)
# Usage: .\scripts\deploy.ps1

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

Write-Host "==> Prisma generate + db push"
npx prisma generate
npx prisma db push

Write-Host "==> Build"
npm run build

Write-Host "==> Start on :3001 (Ctrl+C to stop)"
Write-Host "Set HTTPS / reverse proxy (Caddy/Nginx) in front for production domains."
npm run start
