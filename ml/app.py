from fastapi import FastAPI
from pydantic import BaseModel
import os, json, time, joblib
import psycopg2
from sklearn.feature_extraction.text import TfidfVectorizer, ENGLISH_STOP_WORDS
from sklearn.naive_bayes import MultinomialNB, ComplementNB
from sklearn.pipeline import Pipeline
from sklearn.model_selection import train_test_split
from sklearn.metrics import f1_score
from sklearn.metrics.pairwise import cosine_similarity

app = FastAPI()
MODEL_DIR = "/app/models"
os.makedirs(MODEL_DIR, exist_ok=True)

MODEL = None
MODEL_META = {}

PT_STOP = {
    "de","da","do","das","dos","e","a","o","os","as","um","uma","uns","umas",
    "para","por","com","sem","em","no","na","nos","nas","ao","aos","à","às",
    "que","quem","quando","onde","como","porque","porquê","se","mas","ou"
}
STOPWORDS = ENGLISH_STOP_WORDS.union(PT_STOP)

def pg_conn():
    return psycopg2.connect(
        host=os.getenv("POSTGRES_HOST","db"),
        port=int(os.getenv("POSTGRES_PORT","5432")),
        user=os.getenv("POSTGRES_USER","jobs"),
        password=os.getenv("POSTGRES_PASSWORD","jobs123"),
        dbname=os.getenv("POSTGRES_DB","jobsdb"),
    )

@app.get("/health")
def health():
    return {"ok": True, "time": time.strftime("%Y-%m-%dT%H:%M:%S"), "model_loaded": MODEL is not None}

class TrainBody(BaseModel):
    task: str = "remote"
    since_days: int | None = 180
    max_samples: int | None = 50000
    alpha: float = 1.0
    use_complement_nb: bool = False
    ngram_min: int = 1
    ngram_max: int = 2
    min_df: int = 2
    max_df: float = 0.9
    test_size: float = 0.2
    random_state: int = 42
    version: str | None = None

def log_training_run(meta: dict):
    
    create_sql = """
    CREATE TABLE IF NOT EXISTS training_runs (
      id            bigserial PRIMARY KEY,
      started_at    timestamptz NOT NULL DEFAULT now(),
      finished_at   timestamptz,
      task          text NOT NULL,
      samples_train int,
      samples_val   int,
      params_json   jsonb,
      metrics_json  jsonb,
      model_uri     text,
      ok            boolean NOT NULL DEFAULT false,
      error_message text
    );
    """
    insert_sql = """
    INSERT INTO training_runs (started_at, finished_at, task, samples_train, samples_val,
                               params_json, metrics_json, model_uri, ok, error_message)
    VALUES (to_timestamp(%s), to_timestamp(%s), %s, %s, %s, %s, %s, %s, %s, %s)
    """
    with pg_conn() as conn, conn.cursor() as cur:
        cur.execute(create_sql)
        cur.execute(insert_sql, (
            meta.get("started_at", time.time()),
            meta.get("finished_at", time.time()),
            meta["task"],
            meta.get("samples_train"),
            meta.get("samples_val"),
            json.dumps(meta.get("params")),
            json.dumps(meta.get("metrics")),
            meta.get("model_uri"),
            meta.get("ok", False),
            meta.get("error_message")
        ))

@app.post("/train")
def train(body: TrainBody):
    t0 = time.time()
    meta = {"task": body.task, "started_at": t0, "params": body.dict()}
    try:
        assert body.task == "remote", "Apenas 'remote' no MVP"

        where = []
        if body.since_days:
            where.append(f"published_at >= NOW() - INTERVAL '{body.since_days} days'")
        where_sql = ("WHERE " + " AND ".join(where)) if where else ""

        sql = f"""
        SELECT CONCAT(COALESCE(title,''),' ',COALESCE(description,'')) AS text,
               CASE WHEN remote_flag IS TRUE THEN 1 ELSE 0 END AS label
        FROM jobs
        {where_sql}
        LIMIT {body.max_samples or 50000}
        """
        with pg_conn() as conn, conn.cursor() as cur:
            cur.execute(sql)
            rows = cur.fetchall()

        X = [r[0] or "" for r in rows]
        y = [int(r[1]) for r in rows]

        if len(X) < 200:
            raise ValueError("Poucos exemplos para treinar (mínimo ~200).")

        vec = TfidfVectorizer(
            ngram_range=(body.ngram_min, body.ngram_max),
            min_df=body.min_df,
            max_df=body.max_df,
            lowercase=True,
            stop_words=list(STOPWORDS)
        )

        nb = ComplementNB(alpha=body.alpha) if body.use_complement_nb else MultinomialNB(alpha=body.alpha)
        pipe = Pipeline([("vec", vec), ("nb", nb)])

        Xtr, Xva, ytr, yva = train_test_split(
            X, y, test_size=body.test_size, stratify=y, random_state=body.random_state
        )

        pipe.fit(Xtr, ytr)
        pred = pipe.predict(Xva)
        f1 = f1_score(yva, pred, average="macro")

        version = body.version or f"remote_nb_v{int(time.time())}"
        model_path = os.path.join(MODEL_DIR, f"{version}.joblib")
        joblib.dump(pipe, model_path)

        latest_path = os.path.join(MODEL_DIR, "latest_remote_nb.joblib")
        try:
            import shutil
            shutil.copyfile(model_path, latest_path)
        except Exception:
            pass
     
        global MODEL, MODEL_META
        MODEL = pipe
        MODEL_META = {
            "version": version,
            "task": body.task,
            "params": body.dict(),
            "metrics": {"f1_macro": float(f1)},
            "created_at": time.time()
        }

        meta.update({
            "finished_at": time.time(),
            "samples_train": len(Xtr),
            "samples_val": len(Xva),
            "metrics": MODEL_META["metrics"],
            "model_uri": model_path,
            "ok": True
        })
        log_training_run(meta)
        return {"ok": True, "version": version, "metrics": MODEL_META["metrics"]}

    except Exception as e:
        meta.update({
            "finished_at": time.time(),
            "ok": False,
            "error_message": str(e)
        })
        try:
            log_training_run(meta)
        except Exception:
            pass
        return {"ok": False, "error": str(e)}

class ClassifyBody(BaseModel):
    text: str

@app.post("/classify")
def classify(body: ClassifyBody):
    if MODEL is None:
        return {"ok": False, "error": "modelo não carregado"}
    proba = float(MODEL.predict_proba([body.text])[0][1])
    label = "remoto" if proba >= 0.5 else "presencial"
    return {"ok": True, "version": MODEL_META.get("version"), "label": label, "score": proba}

class ClassifyBatchBody(BaseModel):
    texts: list[str]

@app.post("/classify-batch")
def classify_batch(body: ClassifyBody | ClassifyBatchBody):
    if MODEL is None:
        return {"ok": False, "error": "modelo não carregado"}
    texts = body.texts if hasattr(body, "texts") else [body.text]
    probs = MODEL.predict_proba(texts)[:,1]
    items = [{"label": ("remoto" if p>=0.5 else "presencial"), "score": float(p)} for p in probs]
    return {"ok": True, "version": MODEL_META.get("version"), "items": items}

class RankBody(BaseModel):
    query: str
    docs: list[str]  # textos (title + desc), na mesma ordem dos itens consultados

@app.post("/rank")
def rank(body: RankBody):
    if MODEL is None:
        return {"ok": False, "error": "modelo não carregado"}
    try:
        vec = MODEL.named_steps.get("vec")
        if vec is None:
            return {"ok": False, "error": "vetorizer não encontrado no pipeline"}

        qX = vec.transform([body.query])
        dX = vec.transform(body.docs)

        sim = cosine_similarity(qX, dX).ravel().tolist()  # [0..1]
        return {"ok": True, "scores": sim}
    except Exception as e:
        return {"ok": False, "error": str(e)}
    
@app.post("/load-latest")
def load_latest():
    try:
        latest = os.path.join(MODEL_DIR, "latest_remote_nb.joblib")
        if not os.path.exists(latest):
            return {"ok": False, "error": "latest_remote_nb.joblib não encontrado"}
        global MODEL, MODEL_META
        MODEL = joblib.load(latest)
        MODEL_META = {"version": "latest_remote_nb", "loaded_at": time.time()}
        return {"ok": True, "version": MODEL_META["version"]}
    except Exception as e:
        return {"ok": False, "error": str(e)}
