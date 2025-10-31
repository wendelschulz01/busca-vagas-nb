export default function PaginationBar({
  page,
  onPrev,
  onNext,
  loading,
  meta,
  itemsCount
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

        <button
          className="btn-outline"
          onClick={onNext}
          disabled={loading}
        >
          Próxima página ▶
        </button>
      </div>

      {meta && (
        <div className="meta">
          <span>
            NB {String(meta.prefersRemote && meta.weights?.W_NB > 0 ? "ativado" : "desativado")}
          </span>
          <span>Janela: {meta.days}d</span>
          <span>Itens: {itemsCount ?? 0}</span>
        </div>
      )}
    </div>
  );
}
