#!/usr/bin/env bash
URL="${1:-http://localhost:4000/health}"
TIMEOUT="${2:-60}"
echo "Aguardando ${URL} (timeout ${TIMEOUT}s)..."
for i in $(seq 1 "$TIMEOUT"); do
  if curl -fsS "$URL" >/dev/null 2>&1; then
    echo "OK: ${URL} respondeu."
    exit 0
  fi
  sleep 1
done
echo "ERRO: timeout ao aguardar ${URL}"
exit 1
