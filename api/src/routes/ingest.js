import express from "express";
import { fetchJobsFromSource } from "../adapters/index.js";
import { upsertJobs } from "../services/jobsService.js";
import { runDailyIngestAll } from "../cron/ingestDaily.js";

const router = express.Router();

router.post("/run-all", async (_req, res) => {
    try{
        const r = await runDailyIngestAll();
        res.json({ ok: true, ...r });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

router.post("/:source", async (_req, res) => {
    const { source } = req.params;
    let { company, limit } = req.query;
    const timeoutMs = Number(process.env.ADAPTER_TIMEOUT_MS || 8000);

    const needsCompany = ["lever", "greenhouse", "recruitee", "ashby", "workable"].includes(source);
    if(needsCompany && !company) {
        return res.status(400).json({ error: "Parâmetro 'company' é obrigatório para esta fonte" });
    };

    const lim = Math.max(1, Math.mim(500, Number(limit || 200) || 200));

    console.time(`ingest:${source}:${company || "na"}`);
    try{
        const items = await fetchJobsFromSource({ source, company, timeoutMs, limit: lim });
        if(!Array.isArray(items)) throw new Error(`Adapter '${source}' retornou tipo inválido (esperado array)`);

        const unique = Array.from(new Map(items.map(j => [j.id, j])).values());
    console.log(`[ingest] ${source}/${company || "na"} in=${items.length} unique=${unique.length}`);

    const result = await upsertJobs(unique);

    console.timeEnd(`ingest:${source}:${company || "na"}`);
    res.json({ source, company, count_in: items.length, count_unique: unique.length, ...result });
  } catch (err) {
    console.timeEnd(`ingest:${source}:${company || "na"}`);
    console.error(`[ingest:error] ${source}/${company || "na"} ->`, err);

    const msg = err?.message || String(err);
    const isClientErr =
      /Parâmetro 'company'|Fonte não suportada|Adapter inválido|slug inválido|HTTP 404|400 Bad Request/i.test(msg);
    res.status(isClientErr ? 400 : 500).json({ error: msg });
  }
});

export default router;