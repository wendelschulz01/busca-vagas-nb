import React, { useState } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function App(){
  const [q, setQ] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  async function onSearch(e){
    e.preventDefault();
    setLoading(true);
    const r = await fetch(`${API}/search`, {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({ q })
    });
    const json = await r.json();
    setData(json);
    setLoading(false);
  }

  return (
    <div style={{maxWidth: 900, margin: "40px auto", fontFamily: "system-ui"}}>
      <h1>BuscaVagas NB (MVP)</h1>
      <form onSubmit={onSearch}>
        <input
          value={q}
          onChange={e=>setQ(e.target.value)}
          placeholder="Ex: dev react remoto jr porto alegre"
          style={{width:"100%", padding:12, fontSize:16}}
        />
        <button style={{marginTop:10, padding:"10px 16px"}} disabled={loading}>
          {loading ? "Buscando..." : "Buscar"}
        </button>
      </form>

      {data && (
        <>
          <h3 style={{marginTop:30}}>Intenção detectada</h3>
          <pre style={{background:"#f6f6f6", padding:12}}>
            {JSON.stringify(data.intent, null, 2)}
          </pre>

          <h3>Resultados</h3>
          {data.items?.map(job => (
            <div key={job.id} style={{border:"1px solid #ddd", padding:12, marginBottom:12}}>
              <b>{job.title}</b> — {job.company} <br/>
              <small>{job.location_raw} · fonte: {job.source} · {new Date(job.published_at).toLocaleString()}</small><br/>
              <a href={job.url} target="_blank">ver origem</a>
              <div style={{marginTop:8}}>
                {job.why?.map((w,i)=>(
                  <span key={i} style={{border:"1px solid #ccc", padding:"2px 6px", marginRight:6}}>{w}</span>
                ))}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
