import express from "express";
import cors from "cors";

import dotenv from "dotenv";
import fetch from "node-fetch";
import pkg from "pg";

import { fetchJobsFromSource } from "./adapters/index.js";
import { upsertJobs } from "./services/jobsService.js";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors({origin: process.env.CORS_ORIGIN?.split(",") || "*" }));

const { Pool } = pkg;
const pool = new Pool({
    host: process.env.POSTGRES_HOST || "db",
    port: Number(process.env.POSTGRES_PORT || 5434),
    user: process.env.POSTGRES_USER || "jobs",
    password: process.env.POSTGRES_PASSWORD || "jobs123",
    database: process.env.POSTGRES_DB || "jobsdb"
});

const ML_BASE = process.env.ML_BASE_URL || `http://ml:${process.env.ML_PORT || 8000}`;

app.get("/health", async (req, res) => {
   const status = { ok: true, db: null, ml: null, errors: {} };

   try{
    const db = await pool.query("SELECT 1 as ok");
    status.db = db.rows[0];
   } catch(e){
    status.ok = false;
    status.errors.db = e.message;
   }

   try{
    const r = await fetch(`${ML_BASE}/health`, { signal: AbortSignal.timeout(3000) });
    status.ml = await r.json();
   } catch(e){
    status.ok = false;
    status.errors.ml = e.message;
   }

   const code = status.ok ? 200 : 503;
   res.status(code).json(status);

});

app.post("/ingest/:source", async (req, res) =>{
    const source = req.params.source;
    const { company, limit } = req.query;
    const timeoutMs = Number(process.env.ADAPTER_TIMEOUT_MS || 8000);

    console.time(`ingest:${source}:${company || "na"}`);
    try{ 
        const items = await fetchJobsFromSource({ 
            source, company, timeoutMs, limit: limit ? Number(limit) : undefined 
        });

        const unique = Array.from(new Map(items.map(j => [j.id, j])).values());

        const result = await upsertJobs(unique);

        console.timeEnd(`ingest:${source}:${company || "na"}`);
        res.json({ source, company, count_in: items.length, ...result });
    }catch (e){
        console.timeEnd(`ingest:${source}:${company || "na"}`);
        res.status(400).json({ error: e.message });
    }
});

app.post("/search", async (req, res) => {
    const q = req.body?.q ?? "";
    let intent = {};
    try {
        intent = await fetch(`${ML_BASE}/intent`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ q }) 
        }).then(r => r.json());
    } catch (e) {
        intent = { error: "ML indisponível", details: e.message };
    }

    try {
        const { rows } = await pool.query(
            `SELECT id,title,location_raw,remote_flag,url,source,published_at,facets_nb
            FROM jobs ORDER BY published_at DESC LIMIT 20`
        );

        //aplicar ranking de verdade (cosine + match de facetas)
        const items = rows.map(r => ({
            ...r,
            score: 0.5,
            why: ["demo"]
        }));

        res.json({ intent, items });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

const PORT = Number(process.env.API_PORT || 4000);
app.listen(PORT, () => console.log(`API on http://0.0.0.0:${PORT}`));
