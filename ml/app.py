from fastapi import FastAPI
from pydantic import BaseModel
from typing import Optional, Dict
import datetime as dt

app = FastAPI(title="ML Service (NB)")

class Query(BaseModel):
    q: str

class Job(BaseModel):
    title: str
    description: Optional[str] = ""
    location_raw: Optional[str] = ""
    source: Optional[str] = ""
    published_at: Optional[str] = None

@app.get("/health")
def health():
    return {"ok": True}

@app.post("/intent")
def intent(q: Query):
    text = q.q.lower()

    # --- PLACEHOLDER SIMPLES (trocar por NB) ---
    cargo = "dev front" if "react" in text or "frontend" in text else "dev back" if "node" in text or "java" in text else "analista"
    senioridade = "jr" if "jr" in text or "junior" in text else "sr" if "sr" in text or "senior" in text else "pl"
    modalidade = "remoto" if "remoto" in text or "remote" in text else "hibrido" if "híbrido" in text or "hibrido" in text else "presencial"
    local = "porto alegre" if "porto alegre" in text or "poa" in text else ("são paulo" if "são paulo" in text or "sp" in text else "remoto" if "remoto" in text else "indefinido")
    area = "ti"

    return {
        "cargo": cargo,
        "senioridade": senioridade,
        "modalidade": modalidade,
        "local": local,
        "area": area,
        "debug": {"placeholder": True}
    }

@app.post("/taxonomy")
def taxonomy(job: Job):
    text = f"{job.title} {job.description}".lower()

    # --- PLACEHOLDER SIMPLES (trocar por NB) ---
   modalidade = "remoto" if any(k in text for k in ["remoto","remote","anywhere"]) else "presencial"
    area = "ti" if any(k in text for k in ["developer","dev","software","dados","data","suporte"]) else "outras"

    if "junior" in text or "jr" in text:
        senioridade = "jr"
    elif "pleno" in text or re.search(r"\bpl\b", text or ""):
        senioridade = "pl"
    elif "senior" in text or re.search(r"\bsr\b", text or ""):
        senioridade = "sr"
    else:
        senioridade = "indefinida"

    return {
        "senioridade": senioridade,
        "modalidade": modalidade,
        "area": area
    }
