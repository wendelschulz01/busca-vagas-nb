const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

export async function runSearch({ q, prefersRemote, days, page, pageSize }) {
    const params = new URLSearchParams({
        q: q || "",
        prefersRemote: prefersRemote ? "true" : "false",
        days: String(days),
        page: String(page),
        pageSize: String(pageSize)
    });

    const url = `${API}/search?` + params.toString();
    const r = await fetch(url);
    const json = await r.json();

    if (!r.ok || json.ok === false) {
        throw new Error(json?.error || `HTTP ${r.status}`);
    }
    return json;
}