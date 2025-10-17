// api/src/adapters/lever.js
import { buildId, stripHtml, toBoolRemote, normalizeJob } from "./_common.js";

export default async function fetchLever({ company, limit = 200, timeoutMs = 8000 }) {
  if (!company) throw new Error("Parâmetro 'company' é obrigatório para Lever");

  const url = `https://api.lever.co/v0/postings/${company}?mode=json`;
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), timeoutMs);

  const res = await fetch(url, {
    signal: ctrl.signal,
    headers: { "accept": "application/json", "user-agent": "BuscaVagas-NB/1.0" }
  });
  clearTimeout(to);

  if (!res.ok) {
    let body = "";
    try { body = (await res.text()).slice(0, 200); } catch {}
    throw new Error(`Lever ${company} ${res.status}. Body: ${body}`);
  }

  const data = await res.json();
  const raw = Array.isArray(data) ? data : [];
  const jobs = raw.slice(0, limit);

  return jobs.map((j, idx) => {
    // Lever costuma ter:
    //  - j.text (título), j.description (HTML), j.descriptionPlain (texto),
    //  - j.categories.location / department / team / commitment
    //  - j.createdAt / updatedAt (epoch ms),
    //  - j.hostedUrl
    const title = j.text || j.title || "";
    const loc =
      j.categories?.location ||
      j.workplaceType || // alguns tenants novos
      j.additional?.location ||
      "";
    const html = j.description || "";
    const desc = stripHtml(j.descriptionPlain || html || "");
    const remote = toBoolRemote(`${loc} ${title} ${html}`);

    return normalizeJob({
      id: buildId("lever", company, j.id ?? j._id ?? j.slug ?? idx),
      title,
      company,
      location_raw: loc || null,
      remote_flag: remote,
      description: desc,
      url: j.hostedUrl || j.applyUrl || j.urls?.show || j.hostedUrl ?? null,
      source: "lever",
      published_at: j.updatedAt || j.createdAt || null, // epoch ms aceito por Date(...)
      facets_nb: {
        department: j.categories?.department || null,
        team: j.categories?.team || null,
        commitment: j.categories?.commitment || null,
        lever_id: j.id || j._id || null
      }
    });
  });
}
