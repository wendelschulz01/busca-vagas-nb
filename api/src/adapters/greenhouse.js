// api/src/adapters/greenhouse.js
import { buildId, stripHtml, toBoolRemote, normalizeJob } from "./_common.js";

export default async function fetchGreenhouse({ company, limit = 200, timeoutMs = 8000 }) {
  if (!company) throw new Error("Parâmetro 'company' é obrigatório para Greenhouse");

  const url = `https://boards-api.greenhouse.io/v1/boards/${company}/jobs`;
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
    throw new Error(`Greenhouse ${company} ${res.status}. Body: ${body}`);
  }

  const data = await res.json();
  const raw = Array.isArray(data?.jobs) ? data.jobs : [];
  const jobs = raw.slice(0, limit);

  return jobs.map((j, idx) => {
    // Greenhouse manda HTML em `content`, location em `location.name`
    const title = j.title || "";
    const loc = j.location?.name || "";
    const html = j.content || "";
    const desc = stripHtml(html);
    const remote = toBoolRemote(`${loc} ${title} ${html}`);

    return normalizeJob({
      id: buildId("greenhouse", company, j.id ?? idx),
      title,
      company,
      location_raw: loc || null,
      remote_flag: remote,
      description: desc,
      url: j.absolute_url || j.hosted_url || j.internal_job_url || null,
      source: "greenhouse",
      published_at: j.updated_at || j.created_at || null,
      facets_nb: {
        // alguns boards trazem department/office/teams dentro do objeto
        department: j.departments?.[0]?.name ?? j.departments ?? null,
        office: j.offices?.[0]?.name ?? j.offices ?? null,
        // manter o payload mínimo que possa ser útil
        gh_id: j.id
      }
    });
  });
}
