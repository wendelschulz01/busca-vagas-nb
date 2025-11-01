import React from "react";

export default function PaginationBar({
  page,
  onPrev,
  onNext,
  loading,
  meta,
  itemsCount,
}) {
  return (
    <div className="results-header">
      <div className="pager">
        <button
          className="btn-outline"
          onClick={onPrev}
          disabled={loading || page <= 1}
        >
          ◀ Página anterior
        </button>

        <span className="page-indicator">
          Página <b>{page}</b>
        </span>

        <button className="btn-outline" onClick={onNext} disabled={loading}>
          Próxima página ▶
        </button>
      </div>

      {meta && (
        <div className="meta">
          <span>
            {meta.nbEnabled
              ? "NB ativado"
              : "NB desativado"}
          </span>
          <span>
            Janela: {meta.days ?? meta.recency_halflife_days ?? "?"}d
          </span>
          <span>Itens: {itemsCount}</span>
        </div>
      )}
    </div>
  );
}
