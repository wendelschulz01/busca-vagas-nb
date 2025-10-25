import express from "express";
import fetch from "node-fetch";
import pool from "../db/pool.js";

const router = express.Router();
const ML_BASE = process.env.ML_BASE || process.env.ML_BASE_URL || `http://ml:${process.env.ML_PORT || 8000}`;

router.get("/", async (req, res) => {
  const prefersRemote = (req.query.prefersRemote || "false") === "true";

  try {
    const { rows } = await pool.query(`
      SELECT id, title, company, source, remote_flag, description, url, published_at
      FROM jobs
      ORDER BY published_at DESC
      LIMIT 80
    `);

    const scored = [];
    for (const j of rows) {
      const text = `${j.title}\n${j.description || ""}`.slice(0, 5000);
      let score = 0.0;
      try {
        const r = await fetch(`${ML_BASE}/classify`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ text })
        });
        const out = await r.json();
        if (out.ok) {
            score = prefersRemote
            ? (out.label === "remoto" ? out.score : 1 - out.score)
            : out.score;
        }
      } catch {
        score = 0.0;
      }
      scored.push({ ...j, nb_score: score });
    }

    scored.sort((a, b) => b.nb_score - a.nb_score);
    res.json({ count: scored.length, items: scored });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
