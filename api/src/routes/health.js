import express from "express";
import fetch from "node-fetch";
import pool from "../db/pool.js";

const router = express.Router();

const ML_BASE = process.env.ML_BASE || process.env.ML_BASE_URL || `http://ml:${process.env.ML_PORT || 8000}`;

router.get("/", async (_req, res) => {
    const status = { ok: true, db: null, ml: null, errors: {} };

    try{
        const db = await pool.query("SELECT 1 AS ok");
        status.db = db.rows[0];
    } catch (e) {
        status.ok = false;
        status.errors.db = e.message;
    }

    try{
        const r = await fetch(`${ML_BASE}/health`, {signal: AbortSignal.timeout(3000) });
        status.ml = await r.json();
    } catch (e) {
        status.ok = false;
        status.errors.ml = e.message;
    }

    res.status(status.ok ? 200 : 503).json(status);
});

export default router;