import express from "express";
import fetch from "node-fetch";
import pool from "../db/pool.js";

const router = express.Router();

const ML_BASE =
  process.env.ML_BASE ||
  process.env.ML_BASE_URL ||
  `http://ml:${process.env.ML_PORT || 8000}`;

const NB_ENABLED = String(process.env.NB_RERANK_ENABLED || "true").toLowerCase() === "true";
const NB_WEIGHT = Number(process.env.NB_WEIGHT || 0.7);
const REC_WEIGHT = Number(process.env.RECENCY_WEIGHT || 0.3);
const DECAY_DAYS = Number(process.env.RECENCY_DECAY_DAYS || 30);

function recencyScore(publishedAtIso) {
  if (!publishedAtIso) return 0.0;
  const ms = Date.now() - new Date(publishedAtIso).getTime();
  if (isNaN(ms) || ms < 0) return 1.0;
  const days = ms / (1000 * 60 * 60 * 24);
  const lambda = Math.log(2) / DECAY_DAYS; 
  const s = Math.exp(-lambda * days);
  return Math.max(0, Math.min(1, s));
}

router.get("/", async (req, res) => {
  const prefersRemote = String(req.query.prefersRemote || "false").toLowerCase() === "true";
  const page = Math.max(1, parseInt(req.query.page || "1", 10));
  const pageSize = Math.max(1, Math.min(100, parseInt(req.query.pageSize || "20", 10)));
  const days = parseInt(req.query.days || "180", 10) || 180;

  try {
    const { rows } = await pool.query(
      `
      SELECT id, title, company, source, remote_flag, description, url, published_at, facets_nb
      FROM jobs
      WHERE published_at >= NOW() - INTERVAL '${days} days'
      ORDER BY published_at DESC
      LIMIT $1 OFFSET $2
      `,
      [pageSize, (page - 1) * pageSize]
    );

    const texts = rows.map(r => `${r.title || ""}\n${(r.description || "").slice(0, 5000)}`);

    let nbItems = rows.map(() => ({ label: "presencial", score: 0.0 }));
    if (NB_ENABLED && texts.length) {
      try {
        const r = await fetch(`${ML_BASE}/classify-batch`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ texts })
        });
        const out = await r.json();
        if (out.ok && Array.isArray(out.items) && out.items.length === texts.length) {
          nbItems = out.items;
        }
      } catch (e) {
        
      }
    }

    const items = rows.map((r, i) => {
      const nb = nbItems[i]?.score ?? 0.0;
      const nbAdjusted = prefersRemote
        ? nb
        : (1 - nb); 

      const rec = recencyScore(r.published_at);
      const finalScore = (NB_ENABLED ? NB_WEIGHT * nbAdjusted : 0) + REC_WEIGHT * rec;

      return {
        ...r,
        nb_score: nb,
        recency_score: rec,
        final_score: Number(finalScore.toFixed(6)),
        why: NB_ENABLED
          ? [`nb:${nbAdjusted.toFixed(2)}*${NB_WEIGHT}`, `rec:${rec.toFixed(2)}*${REC_WEIGHT}`]
          : [`rec:${rec.toFixed(2)}*${REC_WEIGHT}`]
      };
    });

    items.sort((a, b) => b.final_score - a.final_score);

    res.json({
      ok: true,
      meta: { page, pageSize, days, nbEnabled: NB_ENABLED, nbWeight: NB_WEIGHT, recencyWeight: REC_WEIGHT },
      count: items.length,
      items
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

export default router;
