import { buildId, stripHtml, toBoolRemote, normalizeJob } from "./_common.js";

export default async function fetchWorkable({ company, limit = 200, timeoutMs = 8000 }) {
  
  const url = `https://apply.workable.com/api/v1/widget/accounts/${encodeURIComponent(company)}`;
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), timeoutMs);

  const res = await fetch(url, { signal: ctrl.signal, headers: { "accept": "application/json" }});
  clearTimeout(to);
  if (!res.ok) throw new Error(`Workable ${company} ${res.status}`);

  const data = await res.json();
  const jobs = (data.jobs || data).slice(0, limit); // alguns retornos vêm como {jobs: [...]}

  return jobs.map((j, idx) => normalizeJob({
    id: buildId("workable", company, j.id || j.slug || idx),
    title: j.title,
    company,
    location_raw: j.location?.city ? `${j.location.city}${j.location.region ? ", " + j.location.region : ""}` : (j.location || j.city || null),
    remote_flag: toBoolRemote(j.workplace || j.location_formatted || j.title),
    description: stripHtml(j.description || j.content || ""),
    url: j.url || j.career_page_url || j.application_url,
    source: "workable",
    published_at: j.published || j.created_at || j.updated_at,
    facets_nb: {
      department: j.department || null,
      employment_type: j.employment_type || j.type || null,
      workplace: j.workplace || null
    }
  }));
}
