import { buildId, stripHtml, toBoolRemote, normalizeJob } from "./_common.js";

export default async function fetchAshby({ company, limit = 200, timeoutMs = 8000 }) {
 
  const url = `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(company)}?includeCompensation=true`;
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), timeoutMs);

  const res = await fetch(url, { signal: ctrl.signal, headers: { "accept": "application/json" }});
  clearTimeout(to);
  if (!res.ok) throw new Error(`Ashby ${company} ${res.status}`);

  const data = await res.json();
  const jobs = (data.jobs || []).slice(0, limit);

  return jobs.map((j, idx) => normalizeJob({
    id: buildId("ashby", company, j.jobUrl || idx),
    title: j.title,
    company,
    location_raw: j.location || (j.address?.postalAddress?.addressLocality ?? null),
    remote_flag: toBoolRemote(j.isRemote),
    description: j.descriptionPlain || stripHtml(j.descriptionHtml || ""),
    url: j.jobUrl || j.applyUrl,
    source: "ashby",
    published_at: j.publishedAt,
    facets_nb: {
      department: j.department || null,
      team: j.team || null,
      employment_type: j.employmentType || null,
      secondaryLocations: (j.secondaryLocations || []).map(x => x.location).filter(Boolean)
    }
  }));
}
