export async function fetchJobsFromSource({ source, company, timeoutMs = 8000 }) {
    if (source === "greenhouse") {
        const { fetchGreenhouse } = await import ("./greenhouse.js");
        return fetchGreenhouse({ company, timeoutMs });
    }
    throw new Error(`Fonte não suportada: ${source}`);
}