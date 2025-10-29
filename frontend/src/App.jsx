import React, { useState, useEffect } from "react";
import "./style.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function App() {
  const [prefersRemote, setPrefersRemote] = useState(true);
  const [days, setDays] = useState(90);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Campo de texto reservado para futura busca semântica/termos
  const [q, setQ] = useState("");

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function fetchResults({ resetPage = false } = {}) {
    try {
      if (resetPage) setPage(1);
      setLoading(true);
      setErr("");

      const url = new URL(`${API}/search-nb`);
      url.searchParams.set("prefersRemote", String(prefersRemote));
      url.searchParams.set("days", String(days));
      url.searchParams.set("page", String(resetPage ? 1 : page));
      url.searchParams.set("pageSize", String(pageSize));

      const r = await fetch(url.toString());
      const json = await r.json();
      if (!r.ok || json.ok === false) {
        throw new Error(json?.error || `HTTP ${r.status}`);
      }
      setData(json);
    } catch (e) {
      setErr(e.message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(e) {
    e.preventDefault();
    fetchResults({ resetPage: true });
  }

  function onPrev() {
    if (page > 1) {
      setPage(p => p - 1);
    }
  }

  function onNext() {
    setPage(p => p + 1);
  }

   useEffect(() => {
    fetchResults();
  }, [page]);

  return (
    <div className="container">
      <header className="header">
        <h1>BuscaVagas NB (MVP)</h1>
        <p className="subtitle">
          Ranking = <code>NB {process.env.NB_WEIGHT || 0.7}</code> +{" "}
          <code>Recência {process.env.RECENCY_WEIGHT || 0.3}</code> (meia-vida {process.env.RECENCY_DECAY_DAYS || 30} dias)
        </p>
      </header>

      <form className="controls" onSubmit={onSubmit}>
        <div className="field">
          <label>Buscar termos (opcional)</label>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Ex: dev react, data, junior… (ainda não filtra no backend)"
          />
        </div>

        <div className="grid">
          <div className="field">
            <label>Prefere remoto?</label>
            <select
              value={prefersRemote ? "true" : "false"}
              onChange={(e) => setPrefersRemote(e.target.value === "true")}
            >
              <option value="true">Sim (prioriza remoto)</option>
              <option value="false">Não (prioriza presencial)</option>
            </select>
          </div>

          <div className="field">
            <label>Janela (dias)</label>
            <input
              type="number"
              min={7}
              max={365}
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
            />
          </div>

          <div className="field">
            <label>Itens por página</label>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
            >
              <option>10</option>
              <option>20</option>
              <option>50</option>
              <option>100</option>
            </select>
          </div>
        </div>

        <div className="actions">
          <button className="btn" type="submit" disabled={loading}>
            {loading ? "Buscando..." : "Buscar"}
          </button>
          <span className="hint">
            Dica: altere filtros e clique em <b>Buscar</b> para reiniciar na página 1.
          </span>
        </div>
      </form>

      <section className="results">
        <div className="results-header">
          <div className="pager">
            <button className="btn-outline" onClick={onPrev} disabled={loading || page <= 1}>
              ◀ Página anterior
            </button>
            <span className="page-indicator">
              Página <b>{page}</b>
            </span>
            <button className="btn-outline" onClick={onNext} disabled={loading}>
              Próxima página ▶
            </button>
          </div>

          {data?.meta && (
            <div className="meta">
              <span>NB {String(data.meta.nbEnabled ? "ativado" : "desativado")}</span>
              <span>Janela: {data.meta.days}d</span>
              <span>Itens: {data?.count ?? 0}</span>
            </div>
          )}
        </div>

        {err && <div className="error">Erro: {err}</div>}

        {!loading && !err && data?.items?.length === 0 && (
          <div className="empty">Nenhum resultado nessa combinação de filtros.</div>
        )}

        {loading && <div className="loading">Carregando…</div>}

        {!loading && !err && data?.items?.map((job) => {
          const when = job.published_at ? new Date(job.published_at) : null;
          const whenStr = when ? when.toLocaleString() : "—";
          const nb = Number(job.nb_score ?? 0);
          const rec = Number(job.recency_score ?? 0);
          const finalS = Number(job.final_score ?? 0);

          return (
            <article key={job.id} className="card">
              <div className="card-top">
                <h3 className="title">{job.title}</h3>
                {job.company && <span className="company">· {job.company}</span>}
              </div>

              <div className="muted">
                <span>{job.location_raw || "Local não informado"}</span>
                <span> • fonte: {job.source}</span>
                <span> • {whenStr}</span>
              </div>

              <div className="chips">
                <span className="chip chip-nb">NB: {nb.toFixed(2)}</span>
                <span className="chip chip-rec">Recência: {rec.toFixed(2)}</span>
                <span className="chip chip-final">Score: {finalS.toFixed(3)}</span>
                {job.remote_flag === true && <span className="chip chip-remote">remoto</span>}
              </div>

              {job.why?.length > 0 && (
                <div className="why">
                  {job.why.map((w, i) => (
                    <span key={i} className="pill">{w}</span>
                  ))}
                </div>
              )}

              <div className="actions-row">
                <a className="btn-link" href={job.url} target="_blank" rel="noreferrer">
                  Ver na origem ↗
                </a>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
