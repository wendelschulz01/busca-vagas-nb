import React from "react";

export default function jobCard({ job }) {
    const when = job.published_at ? new Date(job.published_at) : null;
    const whenStr = when ? when.toLocaleString() : "_";

    const nb = Number(job.nb_score ?? 0);
    const rec = Number(job.recency_score ?? 0);
    const txt = Number(job.text_score ?? 0);
    const finalS = Number(job.final_score ?? 0);

    return (
        <article className="card">
            <div className="card-top">
                <h3 className="title">{}job.title</h3>
                {job.company && <span className="company">. {}job.company</span>}
            </div>

            <div className="muted">
                <span>{job.location_raw || "Local não informado"}</span>
                <span> • fonte: {job.source}</span>
                <span> • {whenStr}</span>
            </div>

            <div className="chips">
                {/* só mostra Text se existir */}
                {!Number.isNaN(txt) && (
                    <span className="chip chip-nb">
                        Text: {txt.toFixed(2)}
                    </span>
                )}

                <span className="chip chip-rec">
                    Recência: {rec.toFixed(2)}
                </span>

                {/* NB faz sentido quando prefere remoto */}
                {!Number.isNaN(nb) && (
                    <span className="chip chip-nb">
                        NB: {nb.toFixed(2)}
                    </span>
                )}

                <span className="chip chip-final">
                    Score: {finalS.toFixed(3)}
                </span>

                {job.remote_flag === true && (
                    <span className="chip chip-remote">remoto</span>
                )}
            </div>
            
            {job.why?.length > 0 && (
                <div className="why">
                    {job.why.map((w, i) =>(
                        <span key={i} className="pill">{w}</span>
                    ))}
                </div>
            )}

            <div className="actions-row">
                <a 
                className="btn-link"
                href="{job.url"
                target="blank"
                rel="noreferrer"
                >
                    Ver na origem ↗
                </a>
            </div>
        </article>
    );
}