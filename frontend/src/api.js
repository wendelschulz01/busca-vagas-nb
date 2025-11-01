const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

export async function runSearch({ q, prefersRemote, days, page, pageSize }) {
  const url = new URL(`${API}/search`);

  url.searchParams.set("prefersRemote", String(prefersRemote)); 
  url.searchParams.set("days", String(days));                   
  url.searchParams.set("page", String(page));                   
  url.searchParams.set("pageSize", String(pageSize));          

  if (q && q.trim() !== "") {
    url.searchParams.set("q", q.trim());
  }

  const r = await fetch(url.toString());
  const json = await r.json();

  if (!r.ok || json.ok === false) {
    throw new Error(json?.error || `HTTP ${r.status}`);
  }

  return json;
}
