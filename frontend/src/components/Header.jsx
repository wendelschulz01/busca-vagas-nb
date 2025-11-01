import React from "react";

export default function Header({ meta }) {
 
  const weights = meta?.weights || {};
  const textW   = weights.W_TEXT ?? meta?.textWeight ?? 0.7;
  const recW    = weights.W_REC  ?? meta?.recencyWeight ?? 0.3;
  const half    = meta?.recency_halflife_days ?? 30;

  return (
    <header className="header">
      <h1>BuscaVagas NB (MVP)</h1>
      <p className="subtitle">
        Ranking ={" "}
        <code>Texto {textW}</code>{" + "}
        <code>Recência {recW}</code>{" "}
        (meia-vida {half} dias)
      </p>
    </header>
  );
}
