# ml/app.py
from fastapi import FastAPI
from pydantic import BaseModel
from typing import Optional
import re
from datetime import datetime

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
    return {"ok": True, "time": datetime.utcnow().isoformat()}

@app.post("/intent")
def intent(q: Query):
    text = q.q.lower()

    if "react" in text or "frontend" in text:
        cargo = "dev front"
    elif "node" in text or "java" in text or "backend" in text:
        cargo = "dev back"
    else:
        cargo = "analista"

    if "jr" in text or "junior" in text:
        senioridade = "jr"
    elif "sr" in text or "senior" in text:
        senioridade = "sr"
    else:
        senioridade = "pl"

    if "remoto" in text or "remote" in text:
        modalidade = "remoto"
    elif "híbrido" in text or "hibrido" in text:
        modalidade = "hibrido"
    else:
        modalidade = "presencial"

    if "porto alegre" in text or "poa" in text:
        local = "porto alegre"
    elif "são paulo" in text or re.search(r"\bsp\b", text):
        local = "são paulo"
    elif "remoto" in text or "remote" in text:
        local = "remoto"
    else:
        local = "indefinido"

    area = "ti"
    return {"cargo": cargo, "senioridade": senioridade, "modalidade": modalidade, "local": local, "area": area}

@app.post("/taxonomy")
def taxonomy(job: Job):
    text = f"{job.title} {job.description}".lower()

    modalidade = "remoto" if any(k in text for k in ["remoto", "remote", "anywhere"]) else "presencial"
    area = "ti" if any(k in text for k in ["developer", "dev", "software", "dados", "data", "suporte"]) else "outras"

    if "junior" in text or "jr" in text:
        senioridade = "jr"
    elif "pleno" in text or re.search(r"\bpl\b", text):
        senioridade = "pl"
    elif "senior" in text or re.search(r"\bsr\b", text):
        senioridade = "sr"
    else:
        senioridade = "indefinida"

    return {"senioridade": senioridade, "modalidade": modalidade, "area": area}
