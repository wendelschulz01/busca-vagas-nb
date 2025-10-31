export default function Header({ meta }) {

    const W_TEXT = meta?.weights?.W_TEXT ?? 0.7;
    const W_REC = meta?.weights?.W_REC   ?? 0.3;
    const W_NB = meta?.weights?.W_NB      ?? 0.0;
    const half = meta?.recency_halflife_days ?? 30;

    return (
        <header className="header">
            <h1>BuscaVagas NB (MVP)</h1>

            <p className="subtitle">
              Ranking = &nbsp;
              {W_TEXT > 0 && (
                <>
                  <code>Texto {W_TEXT}</code>
                  {" + "}
                </>    
              )}
              <code>Recência {W_REC}</code>
              {W_NB > 0 && (
                <>
                    {" + "}
                    <code>NB {W_NB}</code>
                </>
              )}
              {" "}
              (meia-vida {half} dias)
            </p>
        </header>
    );
}