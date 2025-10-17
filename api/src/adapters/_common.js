export function buildId(source, company, rawId) {
  return `${source}:${company}:${rawId}`;
}

export function stripHtml(html = "") {
  // remove tags e normaliza espaços
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<\/?[^>]+(>|$)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isoOrNow(dt) {
  if (!dt) return new Date().toISOString();
  const d = new Date(dt);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

export function toBoolRemote(v) {
  if (typeof v === "boolean") return v;
  if (!v) return false;
  const s = String(v).toLowerCase();
  return ["remote", "remoto", "anywhere", "work from anywhere", "remote-first", "wfh"].some(x => s.includes(x));
}

// saída normalizada para o upsert
export function normalizeJob({
  id, title, company, location_raw, remote_flag, description, url, source, published_at, facets_nb = {}
}) {
  return {
    id, title, company, location_raw, remote_flag: !!remote_flag,
    description, url, source, published_at: isoOrNow(published_at),
    facets_nb
  };
}
