import React from "react";

export default function ResultsSection({ loading, err, items }) {
  if (err) {
    return <div className="error">Erro: {err}</div>;
  }

  if (loading) {
    return <div className="loading">Carregando…</div>;
  }

  if (!items || items.length === 0) {
    return (
      <div className="empty">
        Nenhum resultado nessa combinação de filtros.
      </div>
    );
  }

  return (
    <>
      {items.map((job) => {
        const when = job.published_at
          ? new Date(job.published_at)
          : null;
        const whenStr = when ? when.toLocaleString() : "—";

        const nb = Number(job.nb_score ?? 0);
        const rec = Number(job.recency_score ?? 0);
        const finalS = Number(job.final_score ?? 0);

        return (
          <article key={job.id} className="card">
            <div className="card-top">
              <h3 className="title">{job.title}</h3>
              {job.company && (
                <span className="company"> · {job.company}</span>
              )}
            </div>

            <div className="muted">
              <span>{job.location_raw || "Local não informado"}</span>
              <span> • fonte: {job.source}</span>
              <span> • {whenStr}</span>
            </div>

            <div className="chips">
              <span className="chip chip-nb">
                NB: {nb.toFixed(2)}
              </span>
              <span className="chip chip-rec">
                Recência: {rec.toFixed(2)}
              </span>
              <span className="chip chip-final">
                Score: {finalS.toFixed(3)}
              </span>
              {job.remote_flag === true && (
                <span className="chip chip-remote">remoto</span>
              )}
            </div>

            {job.why?.length > 0 && (
              <div className="why">
                {job.why.map((w, i) => (
                  <span key={i} className="pill">
                    {w}
                  </span>
                ))}
              </div>
            )}

            <div className="actions-row">
              <a
                className="btn-link"
                href={job.url}
                target="_blank"
                rel="noreferrer"
              >
                Ver na origem ↗
              </a>
            </div>
          </article>
        );
      })}
    </>
  );
}
