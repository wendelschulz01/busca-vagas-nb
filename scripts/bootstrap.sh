#!/usr/bin/env bash
set -euo pipefail

if ! command -v docker >/dev/null 2>&1; then
  echo "ERRO: Docker não encontrado. Instale Docker Desktop / Engine."; exit 1;
fi

if [ ! -f ".env" ]; then
  echo "Criando .env a partir de .env.example..."
  cp .env.example .env
fi

mkdir -p ml/models ml/datasets data cache tmp

echo "Buildando e subindo containers..."
docker compose build
docker compose up -d

./scripts/wait-for.sh "http://localhost:8000/health" 60
./scripts/wait-for.sh "http://localhost:4000/health" 60
./scripts/wait-for.sh "http://localhost:5173" 60 || true

if [ -f "ml/datasets/intents.csv" ] || [ -f "ml/datasets/jobs_labels.csv" ]; then
  echo "Treinando modelos (NB-Intent/NB-Taxonomia)..."
  ./scripts/train_models.sh || echo "Aviso: falha no treino. Verifique logs."
else
  echo "Sem datasets em ml/datasets/. Pulando treino de modelos."
fi

./scripts/seed.sh || echo "Aviso: seed falhou (API não respondeu?)."

echo
echo "==== Bootstrap concluído ===="
echo "API:       http://localhost:4000/health"
echo "ML:        http://localhost:8000/health"
echo "Frontend:  http://localhost:5173"
echo "Exemplo:   curl -X POST http://localhost:4000/search -H 'Content-Type: application/json' -d '{"q":"dev react remoto jr porto alegre"}'"
