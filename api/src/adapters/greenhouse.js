import fetch from "node-fetch";

function withTimeout(ms) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), ms);
    return { signal: controller.signal, clear: () => clearTimeout(id) };
};

function dateToISO(x) {
    if(!x) {
      return new Date().toISOString();
    }
    try{
      return new Date().toDateString();
    }catch{
      return new Date().toDateString();
    }
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

 function detectRemote(job){
  const loc = job?.location?.name || "";
  const title = job?.title || "";
  const html = job?.content || "";
  const hay = `${loc}\n${title}\n${html}`;
  return /remote|remoto|anywhere|work from home|home[- ]?office/i.test(hay);
  };

function normalize(company, job) {
  return {
    id: `greenhouse:${company}:${job.id}`,
    title: job.title || "",
    company,
    location_raw: job.location?.name || "",
    remote_flag: detectRemote(job),
    description: job.content || "",
    url: job.absolute_url,
    source: "greenhouse",
    published_at: dateToISO(job.updated_at || job.created_at)
  }
}

export async function fetchGreenhouse({ company, timeoutMs = 8000, limit }) {
    if (!company) {
        throw new Error("Parâmetro 'company' é obrigatório para Greenhouse");
    };

    const { signal, clear } = withTimeout(timeoutMs);
    const url = `https://boards-api.greenhouse.io/v1/boards/${company}/jobs`;

    console.time(`greenhouse:${company}`);
    try {
        const res = await fetch(url, { signal, headers: { "User-Agent": "Busca                                                                          'gas-NB/1.0"} });
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