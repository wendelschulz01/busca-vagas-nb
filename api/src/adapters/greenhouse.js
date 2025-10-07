import fetch from "node-fetch";

function withTimeout(ms) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), ms);
    return { signal: controller.signal, clear: () => clearTimeout(id) };
};

function epochToISO(x) {
    const n = Number(x);
    if(!n || Number.isNaN(n)) return new Date().toISOString();
    try{
        return new Date(n).toISOString();
    } catch{
        return new Date().toISOString();
    };
};

function extractDescription(job) {
  if (typeof job.descriptionPlain === "string" && job.descriptionPlain.trim()) {
    return job.descriptionPlain;
  }
  if (typeof job.description === "string" && job.description.trim()) {
    return job.description;
  }
  if (Array.isArray(job.lists)) {
    const chunks = [];
    for (const sec of job.lists) {
      if (sec?.text) chunks.push(String(sec.text));
      if (Array.isArray(sec?.content)) {
        for (const it of sec.content) if (it?.text) chunks.push(String(it.text));
      }
    }
    const joined = chunks.join("\n").trim();
    if (joined) return joined;
  }
  return "";
};

function normalize(company, job) {
  const title = job.text || job.title || "";
  const location_raw = job?.categories?.location || job?.country || "";
  const description = extractDescription(job);
  const remote_flag = detectRemote(job);
  const url =
    job.hostedUrl ||
    job.applyUrl ||
    job.hosted_url ||
    job.urls?.show ||
    job.urls?.apply ||
    "";

  const published_at = epochToISO(job.createdAt || job.updatedAt);

  return {
    id: `lever:${company}:${job.id}`,
    title,
    company,
    location_raw,
    remote_flag,
    description,
    url,
    source: "lever",
    published_at
  };
}
export async function fetchGreenhouse({ company, timeoutMs = 8000, limit }) {
    if (!company) {
        throw new Error("Parâmetro 'company' é obrigatório para Greenhouse");
    };

    const { signal, clear } = withTimeout(timeoutMs);
    const url = `https://boards-api.greenhouse.io/v1/boards/${company}/jobs`;

    console.time(`greenhouse:${company}`);
    try {
        const res = await fetch(url, { signal, headers: { "User-Agent": "BuscaVagas-NB/1.0"} });
        if  (!res.ok) {
            throw new Error(`HTTP ${res.status} ao buscar ${url}`);
        };
        const data = await res.json();
        const items = Array.isArray(data.jobs) ? data.jobs.map(j => normalize(company, j)) : [];
        return items;
    } finally {
        console.timeEnd(`greenhouse:${company}`);
        clear();
    }
      
}