import fetch from "node-fetch";

function withTimeout(ms) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), ms);
    return { signal: controller.signal, clear: () => clearTimeout(id) };
}

function normalize(company, job) {
    return {
        id: `greenhouse:${company}:${job.id}`,
        title: job.title || "",
        company,
        location_raw: job.location?.name || "",
        remote_flag: /remote|remoto/i.test(job.location?.name || ""),
        description: job.content || "",
        url: job.absolute_url,
        source: "greenhouse",
        published_at: job.updated_at || job.created_at || new Date().toISOString()
    };
}

export async function fetchGreenhouse({ company, timeoutMs = 8000 }) {
    if (!company) {
        throw new Error("Parâmetro 'company' é obrigatório para Greenhouse");
    };

    const { signal, clear } = withTimeout(timeoutMs);
    const url = `https://boards-api.greenhouse.io/v1/boards/${company}/jobs`;

    console.time("requisição");
    try {
        const res = await fetch(url, { signal, headers: { "User-Agent": "BuscaVagas-NB/1.0"} });
        if  (!res.ok) {
            throw new Error(`HTTP ${res.status} ao buscar ${url}`);
        };
        const data = await res.json();
        const items = Array.isArray(data.jobs) ? data.jobs.map(j => normalize(company, j)) : [];
        return items;
    } finally {
        clear();
    }
    
    console.timeEnd("Requisição");
}