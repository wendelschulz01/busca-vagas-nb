import express from "express";
import pool from "../db/pool.js";
import fetch from "node-fetch";
import { recencyScore } from "../utils/recency.js";

const router = express.Router();

const ML_BASE = process.env.ML_BASE || process.env.ML_BASE_URL || `http://ml:${process.env.ML_PORT || 8000}`;

const W_TEXT = Number(process.env.W_TEXT || 0.7); // similaridade texto-consulta
const W_REC  = Number(process.env.W_REC  || 0.3); // recência
const W_NB   = Number(process.env.W_NB   || 0.0); // prob. NB de REMOTO (só aplica se prefersRemote=true)
const RECENCY_HALFLIFE = Number(process.env.RECENCY_HALFLIFE_DAYS || 30);

router.get("/", async (req, res) => {
  const q        = (req.query.q || "").toString().trim();
  const source   = (req.query.source || "").toString().trim() || null;
  const company  = (req.query.company || "").toString().trim() || null;

  const remote   = (req.query.remote || "").toString().trim(); 
  const prefersRemote = String(req.query.prefersRemote || "false").toLowerCase() === "true";

  const days     = Number(req.query.days || 0);
  const page     = Math.max(1, Number(req.query.page || 1));
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize || 20)));
  const order    = (req.query.order || "recent").toString();
  const offset = (page -1) * pageSize;

  let intent = {};
  if (q) {
    try {
      intent = await fetch(`${ML_BASE}/intent`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ q })
      }).then(r => r.json());
    } catch (e) {
      intent = { error: "ML indisponível", details: e.message };
    }
  }

  const where = [];
  const params = [];

  if (q) {
    params.push(`%${q}%`, `%${q}%`);
    where.push(`(title ILIKE $${params.length-1} OR description ILIKE $${params.length})`);
  }
  if (source) {
    params.push(source);
    where.push(`source = $${params.length}`);
  }
  if (company) {
    params.push(company);
    where.push(`company = $${params.length}`);
  }
  if (remote === "true" || remote === "false") {
    params.push(remote === "true");
    where.push(`remote_flag = $${params.length}`);
  }
  if (days > 0) {
    params.push(days);
    where.push(`published_at >= now() - ($${params.length}::text || ' days')::interval`);
  }

   let orderBy = "published_at DESC";
  if (order === "title")   orderBy = "title ASC, published_at DESC";
  if (order === "company") orderBy = "company ASC, published_at DESC";

  const sqlCount = `
    SELECT COUNT(*)::int AS total
    FROM jobs
    ${where.length ? "WHERE " + where.join(" AND ") : ""}
  `;
  const sqlPage = `
    SELECT id, title, company, source, location_raw, remote_flag, url, published_at, facets_nb
    FROM jobs
    ${where.length ? "WHERE " + where.join(" AND ") : ""}
    ORDER BY ${orderBy}
    LIMIT ${pageSize} OFFSET ${offset}
  `;

  try {
    const [{ rows: c1 }, { rows: rows }] = await Promise.all([
      pool.query(sqlCount, params),
      pool.query(sqlPage, params),
    ]);
  
    const total = c1[0]?.total || 0;
    if (rows.length === 0) {
      return res.json({ intent, total, page, pageSize, items:[] });
    }

    const docs = rows.map(r => `${r.title || ""}\n${(r.description || "").slice(0, 5000)}`);

    let textScore = rows.map(() => 0.0);
    if(q) {
      try {
        const r = await fetch(`${ML_BASE}/rank`,{
          method: "POST",
          headers: {"content-type": "application/json"},
          body: JSON.stringify({ query: q, docs})
        });
        const out = await r.json();
        if (out.ok && Array.isArray(out.scores) && out.scores.length === docs.length) {
          textScores = out.scores.map(x => Number(x) || 0.0);
        }
      } catch (e) {
        //silencioso
      }
    }

    let nbScores = rows.map(() => 0.0);
    if (prefersRemote && W_NB > 0) {
      try {
        const r = await fetch(`${ML_BASE}/classify-batch`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ texts: docs })
        });
        const out = await r.json();
        if (out.ok && Array.isArray(out.items) && out.items.length === docs.length) {
          nbScores = out.items.map(it => Number(it.score) || 0.0); // prob de REMOTO
        }
      } catch (e) {}
    }
    //Recencia
    const recScores = rows.map(r => recencyScore(r.published_at, RECENCY_HALFLIFE));


    const itemsRanked = rows.map((r, i) => {
      const sTxt = textScores[i] ?? 0.0;
      const sRec = recScores[i] ?? 0.0;
      const sNb  = nbScores[i] ?? 0.0;
      const final = (W_TEXT * sTxt) + (W_REC * sRec) + (W_NB * sNb);
      return {
        ...r,
        text_score: Number(sTxt.toFixed(6)),
        recency_score: Number(sRec.toFixed(6)),
        nb_score: Number(sNb.toFixed(6)),
        final_score: Number(final.toFixed(6)),
        why: [
          `text:${sTxt.toFixed(2)}*${W_TEXT}`,
          `rec:${sRec.toFixed(2)}*${W_REC}`,
          ...(prefersRemote && W_NB > 0 ? [`nb:${sNb.toFixed(2)}*${W_NB}`] : [])
        ]
      };
    });

    itemsRanked.sort((a, b) => b.final_score - a.final_score);

    const items = itemsRanked.map(({ description, ...rest }) => rest);

    res.json({
      ok: true,
      intent,
      meta: {
        page, pageSize, days,
        prefersRemote,
        weights: { W_TEXT, W_REC, W_NB },
        recency_halflife_days: RECENCY_HALFLIFE
      },
      total,
      items
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }  
});

export default router;