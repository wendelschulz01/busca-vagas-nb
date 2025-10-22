export { default as fetchGreenhouse } from "./greenhouse.js";
export { default as fetchLever } from "./lever.js";
export { default as fetchRecruitee } from "./recruitee.js";
export { default as fetchAshby } from "./ashby.js";
export { default as fetchWorkable } from "./workable.js";

const registry = {
  greenhouse: { path: "./greenhouse.js", name: "fetchGreenhouse" },
  lever:      { path: "./lever.js",      name: "fetchLever" },
  recruitee:  { path: "./recruitee.js",  name: "fetchRecruitee" },
  ashby:      { path: "./ashby.js",      name: "fetchAshby" },
  workable:   { path: "./workable.js",   name: "fetchWorkable" }
};

async function loadAdapter(source) {
  const entry = registry[source];
  if (!entry) {
    const known = Object.keys(registry).join(", ");
    throw new Error(`Fonte não suportada: ${source}. Use uma de: ${known}`);
  }
  const mod = await import(entry.path);
  const fn = (typeof mod.default === "function") ? mod.default : mod[entry.name];
  if (typeof fn !== "function") {
    throw new Error(
      `Adapter inválido para '${source}': esperado export default ou named '${entry.name}'`
    );
  }
  return fn;
}

export async function fetchJobsFromSource({ source, company, limit = 200, timeoutMs = 8000 }) {
  if (!company) throw new Error("Parâmetro 'company' é obrigatório");
  const adapter = await loadAdapter(source);
  return adapter({ company, limit, timeoutMs });
}
