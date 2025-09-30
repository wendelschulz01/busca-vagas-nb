#!/usr/bin/env bash
set -euo pipefail

PY="${PYTHON_BIN:-python}"

mkdir -p ml/models

INTENTS="ml/datasets/intents.csv"
JOBS="ml/datasets/jobs_labels.csv"

if [ -f "$INTENTS" ]; then
  echo "Treinando NB-Intent a partir de ${INTENTS}..."
  $PY - << 'PYCODE'
import pandas as pd, joblib
from sklearn.model_selection import StratifiedKFold, cross_val_score
from sklearn.pipeline import Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from pathlib import Path

df = pd.read_csv("ml/datasets/intents.csv")
X = df["text"].fillna("")
facets = ["cargo","senioridade","modalidade","local","area"]

models = {}
for f in facets:
    y = df[f].fillna("indefinido")
    pipe = Pipeline([
        ("tfidf", TfidfVectorizer(ngram_range=(1,2), min_df=2, max_df=0.95)),
        ("nb", MultinomialNB(alpha=0.5))
    ])
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    score = cross_val_score(pipe, X, y, cv=cv, scoring="f1_macro").mean()
    print(f"[NB-Intent] {f}: F1-macro={score:.3f}")
    pipe.fit(X, y)
    models[f] = pipe

Path("ml/models").mkdir(parents=True, exist_ok=True)
joblib.dump(models, "ml/models/model_intent.joblib")
print("NB-Intent salvo em ml/models/model_intent.joblib")
PYCODE
else
  echo "Aviso: dataset ${INTENTS} não encontrado. Pulei treino do NB-Intent."
fi

if [ -f "$JOBS" ]; then
  echo "Treinando NB-Taxonomia a partir de ${JOBS}..."
  $PY - << 'PYCODE'
import pandas as pd, joblib
from sklearn.model_selection import StratifiedKFold, cross_val_score
from sklearn.pipeline import Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from pathlib import Path

df = pd.read_csv("ml/datasets/jobs_labels.csv")
X = (df["title"].fillna("") + " " + df["description"].fillna("")).astype(str)

facets = [c for c in ["modalidade","area","senioridade"] if c in df.columns]
models = {}
for f in facets:
    y = df[f].fillna("indefinida")
    pipe = Pipeline([
        ("tfidf", TfidfVectorizer(ngram_range=(1,2), min_df=2, max_df=0.95)),
        ("nb", MultinomialNB(alpha=0.5))
    ])
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    score = cross_val_score(pipe, X, y, cv=cv, scoring="f1_macro").mean()
    print(f"[NB-Taxonomia] {f}: F1-macro={score:.3f}")
    pipe.fit(X, y)
    models[f] = pipe

Path("ml/models").mkdir(parents=True, exist_ok=True)
joblib.dump(models, "ml/models/model_tax.joblib")
print("NB-Taxonomia salvo em ml/models/model_tax.joblib")
PYCODE
else
  echo "Aviso: dataset ${JOBS} não encontrado. Pulei treino do NB-Taxonomia."
fi

echo "Treino finalizado."
