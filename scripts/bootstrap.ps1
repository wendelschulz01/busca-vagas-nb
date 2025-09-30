Param(
  [string]$ApiHealth = "http://localhost:4000/health",
  [string]$MlHealth = "http://localhost:8000/health",
  [string]$FeUrl = "http://localhost:5173"
)

function Wait-ForUrl($url, $timeoutSec=60) {
  Write-Host "Aguardando $url (timeout ${timeoutSec}s)..."
  $deadline = (Get-Date).AddSeconds($timeoutSec)
  while ((Get-Date) -lt $deadline) {
    try {
      $resp = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 5
      if ($resp.StatusCode -ge 200 -and $resp.StatusCode -lt 400) {
        Write-Host "OK: $url respondeu."
        return $true
      }
    } catch {}
    Start-Sleep -Seconds 1
  }
  Write-Host "ERRO: timeout ao aguardar $url"
  return $false
}

if (!(Test-Path ".env")) {
  Write-Host "Criando .env a partir de .env.example..."
  Copy-Item ".env.example" ".env"
}

New-Item -ItemType Directory -Force -Path "ml\models","ml\datasets","data","cache","tmp" | Out-Null

docker compose build
docker compose up -d

Wait-ForUrl $MlHealth 60 | Out-Null
Wait-ForUrl $ApiHealth 60 | Out-Null
Wait-ForUrl $FeUrl 60 | Out-Null

Write-Host "Inserindo vaga demo..."
try { curl -fsS -X POST "http://localhost:4000/ingest/demo" } catch {}

Write-Host "`nBootstrap concluído."
Write-Host "API: $ApiHealth"
Write-Host "ML:  $MlHealth"
Write-Host "FE:  $FeUrl"
