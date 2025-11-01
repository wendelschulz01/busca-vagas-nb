import React from "react";

export default function SearchForm({
  q,
  setQ,
  prefersRemote,
  setPrefersRemote,
  days,
  setDays,
  pageSize,
  setPageSize,
  loading,
  onSubmit,
}) {
  return (
    <form className="controls" onSubmit={onSubmit}>
      <div className="field">
        <label>Buscar termos (opcional)</label>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Ex: dev react, data, junior…"
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
          Dica: altere filtros e clique em <b>Buscar</b> para reiniciar na
          página 1.
        </span>
      </div>
    </form>
  );
}
