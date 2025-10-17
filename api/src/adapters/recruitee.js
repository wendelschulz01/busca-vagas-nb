import { buildId, stripHtml, toBoolRemote, normalizeJob } from "./_common.js";

export default async function fetchRecruitee({ company, limit = 200, timeoutMs = 8000 }) {
  
  const url = `https://${company}.recruitee.com/api/offers`;
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), timeoutMs);

  const res = await fetch(url, { signal: ctrl.signal, headers: { "accept": "application/json" }});
  clearTimeout(to);
  if (!res.ok) throw new Error(`Recruitee ${company} ${res.status}`);

  const data = await res.json();
  const jobs = (data.offers || data || []).slice(0, limit);

  return jobs.map((j, idx) => normalizeJob({
    id: buildId("recruitee", company, j.id || j.slug || idx),
    title: j.title,
    company,
    location_raw: j.location || j.cities?.[0]?.city || null,
    remote_flag: toBoolRemote(j.remote || j.title),
    description: stripHtml(j.description || j.description_text || ""),
    url: j.careers_url || j.url || j.href,
    source: "recruitee",
    published_at: j.published_at || j.created_at || j.updated_at,
    facets_nb: {
      department: j.department?.name || j.department || null,
      employment_type: j.employment_type || null,
      tags: j.tags || []
    }
  }));
}
