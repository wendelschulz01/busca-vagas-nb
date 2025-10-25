import express from "express";
import pool from "../db/pool.js";
import fetch from "node-fetch";

const router = express.Router();

const ML_BASE = process.env.ML_BASE || process.env.ML_BASE_URL || `http://ml:${process.env.ML_PORT || 8000}`;

router.get("/", async (req, res) => {
  const q        = (req.query.q || "").toString().trim();
  const source   = (req.query.source || "").toString().trim() || null;
  const company  = (req.query.company || "").toString().trim() || null;
  const remote   = (req.query.remote || "").toString().trim(); 
  const days     = Number(req.query.days || 0);
  const page     = Math.max(1, Number(req.query.page || 1));
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize || 20)));
  const order    = (req.query.order || "recent").toString();

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

  const offset = (page - 1) * pageSize;

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
    const [{ rows: c1 }, { rows: c2 }] = await Promise.all([
      pool.query(sqlCount, params),
      pool.query(sqlPage, params),
    ]);

    res.json({
      intent,
      total: c1[0]?.total || 0,
      page,
      pageSize,
      items: c2,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;