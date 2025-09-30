#!/usr/bin/env bash
set -euo pipefail
API_URL="${API_URL:-http://localhost:4000}"

echo "Inserindo vaga demo na API (${API_URL})..."
curl -fsS -X POST "${API_URL}/ingest/demo" -H "Content-Type: application/json" || {
  echo "Falhou inserir demo (API indisponível?)"; exit 1; }

echo "Busca de teste:"
curl -fsS -X POST "${API_URL}/search" -H "Content-Type: application/json"   -d '{"q":"dev react remoto jr porto alegre"}' || true
echo
echo "Seed concluído."
