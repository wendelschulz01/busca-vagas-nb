import cron from "node-cron";
import pool from "../db/pool.js";
import { fetchJobsFromSource } from "../adapters/index.js";
import { upsertJobs } from "../services/jobsService.js";

const DAILY_SOURCES = [
{ source: "greenhouse", company: "catawiki", limit: 200 },
{ source: "greenhouse", company: "vercel", limit: 200 },
{ source: "lever", company: "welocalize", limit: 200 },
{ source: "lever", company: "lyrahealth", limit: 200 },
{ source: "recruitee", company: "natilik", limit: 200 },
{ source: "recruitee", company: "hostaway", limit: 200 },
{ source: "ashby", company: "openai", limit: 200 },
{ source: "workable", company: "futureplc", limit: 200 },
];

async function saveRun(row) {
    const sql = `
        INSERT INTO ingest_runs
            (started_at, finished_at, source, company, limit_req,
             count_in, inserted, updated, skipped, ok, error_message, duration_ms)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)     
    `;

    const vals = [
        row.started_at, row.finished_at, row.source, row.company, row.limit_req,
        row.count_in ?? null, row.inserted ?? null, row.updated ?? null, row.skipped ?? null,
        row.ok ?? false, row.error_message ?? null, row.duration_ms ?? null
    ];
    try{
        await pool.query(sql, vals);
    }catch (e) {
        console.error("[ingest:metrics] erro ao salvar em ingest_runs:", e.message);
    };
};

async function runOne({ source, company, limit=200, timeoutMs = 8000 }) {

    const started = new Date();
    const t0 = Date.now();
    let result = null;

    try {
        console.time(`ingest:${source}:${company}`);
        const items = await fetchJobsFromSource({ source, company, limit, timeoutMs });
        const unique = Array.from(new Map(items.map(j => [j.id, j])).values());
        const up = await upsertJobs(unique);
        console.timeEnd(`ingest:${source}:${company}`);

        result = {
            ok: true,
            count_in: items.length,
            inserted: up.inserted,
            updated: up.updated,
            skipped: up.skipped
        };
        return result;
    } catch(err) {
        console.error(`[ingest:error] ${source}/${company}`, err);
        result = { ok: false, error_message: err?.message || String(err) };
        return result;
    
    }   finally {
        await saveRun({
            started_at: started,
            finished_at: new Date(),
            source, company, limit_req: limit,
            ...(result || {}),
            duration_ms: Date.now() - t0
        });
    }   
};

export async function runDailyIngestAll() {
    console.log("[cron] início da ingestão diária:", new Date().toISOString());
    for (const job of DAILY_SOURCES) {
        await runOne(job);
    }
    console.log("[cron] fim da ingestão diária:", new Date().toISOString());
};

export function scheduleDailyIngest() {
    const enabled = (process.env.ENABLE_CRON || "").toLowerCase() === "true";
    if (!enabled) {
        console.log("[cron] desabilitado (ENABLE_CRON != true)");
        return;
    };
    //Rodar todos os dias as 03:00h
    const expr = "0 3 * * *";
    const tz = "America/Sao_Paulo";

    cron.schedule(expr, ()=> {
        runDailyIngestAll().catch(err => console.error("[cron:runDaily] erro",err));    
    }, { timezone: tz });

    console.log(`[cron] agendado: "${expr}" (${tz}) - execução diária`);
};

