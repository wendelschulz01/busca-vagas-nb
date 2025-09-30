# BuscaVagas NB — Bootstrap Pack

Este pacote contém **.env.example**, **README** e **scripts de bootstrap** para subir o projeto com Docker Compose:
API (Express), ML (FastAPI/Python), Frontend (Vite/React) e DB (PostgreSQL).

## Como usar

1. Copie estes arquivos para a **raiz** do seu projeto.
2. Gere seu `.env` a partir do exemplo:
   ```bash
   cp .env.example .env
   ```
3. Dê permissão de execução nos scripts (Linux/WSL/macOS):
   ```bash
   chmod +x scripts/*.sh
   ```
4. Rode o bootstrap:
   ```bash
   ./scripts/bootstrap.sh
   ```
   No Windows (PowerShell):
   ```powershell
   ./scripts/bootstrap.ps1
   ```

## O que o bootstrap faz

- Verifica Docker/Compose
- Cria `.env` se não existir
- Cria pastas `ml/models`, `ml/datasets`, `data`, `cache`, `tmp`
- Sobe os containers (`docker compose up -d`)
- Aguarda **ML**, **API** e **Frontend** ficarem acessíveis
- (Opcional) treina modelos Naive Bayes se houver datasets em `ml/datasets/`
- Executa **seed** com uma vaga demo e faz uma busca de teste

## URLs padrão

- API: `http://localhost:4000/health`
- ML:  `http://localhost:8000/health`
- FE:  `http://localhost:5173`

## Datasets opcionais para treino local

- `ml/datasets/intents.csv` com colunas: `text,cargo,senioridade,modalidade,local,area`
- `ml/datasets/jobs_labels.csv` com colunas: `title,description,modalidade,area,senioridade`

Rode o treino manualmente se desejar:
```bash
./scripts/train_models.sh
```

Os modelos serão salvos em `ml/models/`.

## Troubleshooting

- **Porta em uso** → ajuste `API_PORT`, `ML_PORT`, `POSTGRES_PORT` no `.env` e reflita no `docker-compose.yml`.
- **API não conecta no DB** → verifique `POSTGRES_*` na API e se o serviço `db` está ativo.
- **ML indisponível** → `docker logs jobs-ml` e teste `http://localhost:8000/health`.
- **Permissões no WSL** → evite mapeamento de volumes do Windows com espaços; use diretórios do WSL.
