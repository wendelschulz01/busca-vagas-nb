import express from "express";
import pool from "../db/pool.js";
import fetch from "node-fetch";

import { textSimilarityScore } from "../utils/textScore.js";
import { recencyScore } from "../utils/recency.js";

const router = express.Router();

const ML_BASE =
  process.env.ML_BASE ||
  process.env.ML_BASE_URL ||
  `http://ml:${process.env.ML_PORT || 8000}`;

const W_TEXT = Number(process.env.W_TEXT || 0.7);
const W_REC  = Number(process.env.W_REC  || 0.3);
const W_NB   = Number(process.env.W_NB   || 0.0);
const RECENCY_HALFLIFE = Number(process.env.RECENCY_HALFLIFE_DAYS || 30);


function splitQueryTerms(q) {
  return q
    .toLowerCase()
    .replace(/[^a-z0-9áéíóúàâêôãõç]+/gi, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function buildWhereAND(terms, baseFilters, params) {
  const clauses = [...baseFilters]; 

  const perTermClauses = [];

  for (const term of terms) {
    params.push(`%${term}%`);
    const idxTitle = params.length;
    params.push(`%${term}%`);
    const idxDesc = params.length;

    perTermClauses.push(
      `(title ILIKE $${idxTitle} OR description ILIKE $${idxDesc})`
    );
  }

  if (perTermClauses.length > 0) {
    clauses.push(`(${perTermClauses.join(" AND ")})`);
  }

  return clauses;
}

function buildWhereOR(terms, baseFilters, params) {
  const clauses = [...baseFilters];
  
  const perTermClauses = [];

  for (const term of terms) {
    params.push(`%${term}%`);
    const idxTitle = params.length;
    params.push(`%${term}%`);
    const idxDesc = params.length;

    perTermClauses.push(
      `(title ILIKE $${idxTitle} OR description ILIKE $${idxDesc})`
    );
  }

  if (perTermClauses.length > 0) {
    clauses.push(`(${perTermClauses.join(" OR ")})`);
  }

  return clauses;
}

async function runQuery({ whereClauses, params, orderBy, pageSize, offset }) {
  
  const filtersSQL = Array.isArray(whereClauses) ? whereClauses : [];

  const whereSQL = filtersSQL.length
    ? "WHERE " + filtersSQL.join(" AND ")
    : "";

  const sqlCount = `
    SELECT COUNT(*)::int AS total
    FROM jobs
    ${whereSQL}
  `;

  const sqlPage = `
    SELECT id,
           title,
           company,
           source,
           location_raw,
           remote_flag,
           url,
           published_at,
           facets_nb,
           description
    FROM jobs
    ${whereSQL}
    ORDER BY ${orderBy}
    LIMIT ${pageSize} OFFSET ${offset}
  `;

  try {
    const [cRes, pRes] = await Promise.all([
      pool.query(sqlCount, params),
      pool.query(sqlPage, params),
    ]);

    const total = cRes.rows?.[0]?.total || 0;
    return { total, rows: pRes.rows || [] };

  } catch (err) {
    console.error("[runQuery] ERRO SQL -----------------");
    console.error("whereClauses:", filtersSQL);
    console.error("params:", params);
    console.error("sqlCount:", sqlCount);
    console.error("sqlPage:", sqlPage);
    console.error("Postgres error:", err);
    console.error("-------------------------------------");
    throw err; // deixa a rota /search pegar no try/catch dela
  }
}

router.get("/", async (req, res) => {
  try {
 
    const q              = (req.query.q || "").toString().trim();
    const source         = (req.query.source || "").toString().trim() || null;
    const company        = (req.query.company || "").toString().trim() || null;

    const remoteFilter   = (req.query.remote || "").toString().trim();
    const prefersRemote  = String(req.query.prefersRemote || "false").toLowerCase() === "true";

    const days           = Number(req.query.days || 0);
    const page           = Math.max(1, Number(req.query.page || 1));
    const pageSize       = Math.min(100, Math.max(1, Number(req.query.pageSize || 20)));
    const order          = (req.query.order || "recent").toString();

    const offset         = (page - 1) * pageSize;

    let intent = {};
    if (q) {
      try {
        const intentResp = await fetch(`${ML_BASE}/intent`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ q })
        });
        intent = await intentResp.json();
      } catch (e) {
        intent = { error: "ML indisponível", details: e.message };
      }
    }

    function buildBaseFilters() {
      const filters = [];
      const params = [];

      if (source) {
        params.push(source);
        filters.push(`source = $${params.length}`);
      }

      if (company) {
        params.push(company);
        filters.push(`company = $${params.length}`);
      }

      if (remoteFilter === "true" || remoteFilter === "false") {
        params.push(remoteFilter === "true");
        filters.push(`remote_flag = ($${params.length})::boolean`);
      }

      if (days > 0) {
        params.push(days);
       
        filters.push(
          `published_at >= now() - ($${params.length}::text || ' days')::interval`
        );
      }

      return { filters, params };
    }

    let orderBy = "published_at DESC";
    if (order === "title")   orderBy = "title ASC, published_at DESC";
    if (order === "company") orderBy = "company ASC, published_at DESC";

    const terms = q ? splitQueryTerms(q) : [];

    const { filters: baseFiltersAND, params: baseParamsAND } = buildBaseFilters();

    const whereAND = q
      ? buildWhereAND(terms, baseFiltersAND, baseParamsAND)
      : baseFiltersAND;

    let { rows, total } = await runQuery({
      whereClauses: whereAND,
      params: baseParamsAND,
      orderBy,
      pageSize,
      offset
    });

    if ((rows.length === 0) && terms.length > 0) {
      const { filters: baseFiltersOR, params: baseParamsOR } = buildBaseFilters();
      const whereOR = buildWhereOR(terms, baseFiltersOR, baseParamsOR);

      const { rows: rowsOR, total: totalOR } = await runQuery({
        whereClauses: whereOR,
        params: baseParamsOR,
        orderBy,
        pageSize,
        offset
      });

      if (rowsOR.length > 0) {
        rows  = rowsOR;
        total = totalOR;
      }
    }

    if (rows.length === 0) {
      return res.json({
        ok: true,
        intent,
        meta: {
          page,
          pageSize,
          days,
          prefersRemote,
          weights: { W_TEXT, W_REC, W_NB },
          recency_halflife_days: RECENCY_HALFLIFE,
          fallback_used: (terms.length > 0)
        },
        total,
        items: []
      });
    }

    const localTextScores = rows.map(job => {
      if (!q) return 0.0;
      const blob = `${job.title || ""} ${(job.description || "").slice(0, 5000)}`;
      const s = textSimilarityScore(q, blob);
      return Number.isFinite(s) ? s : 0.0;
    });

    let nbScoresRaw = rows.map(() => 0.0);
    if (prefersRemote && W_NB > 0) {
      try {
        const docsForNB = rows.map(job =>
          `${job.title || ""}\n${(job.description || "").slice(0, 5000)}`
        );

        const nbResp = await fetch(`${ML_BASE}/classify-batch`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ texts: docsForNB })
        });

        const nbJson = await nbResp.json();
        if (
          nbJson.ok &&
          Array.isArray(nbJson.items) &&
          nbJson.items.length === rows.length
        ) {
          nbScoresRaw = nbJson.items.map(it => {
            const v = Number(it.score);
            return Number.isFinite(v) ? v : 0.0;
          });
        }
      } catch (e) {
        // se o serviço ML cair, segue sem NB
      }
    }

    const nbScoresEffective = (prefersRemote && W_NB > 0)
      ? nbScoresRaw
      : rows.map(() => 0.0);

    const recScores = rows.map(job => {
      const r = recencyScore(job.published_at, RECENCY_HALFLIFE);
      return Number.isFinite(r) ? r : 0.0;
    });

    const ranked = rows.map((job, i) => {
      const sTxt = localTextScores[i] ?? 0.0;
      const sRec = recScores[i]      ?? 0.0;
      const sNb  = nbScoresEffective[i] ?? 0.0;

      const finalVal = (W_TEXT * sTxt) + (W_REC * sRec) + (W_NB * sNb);

      return {
        ...job,
        text_score:    Number(sTxt.toFixed(6)),
        recency_score: Number(sRec.toFixed(6)),
        nb_score:      Number(sNb.toFixed(6)),
        final_score:   Number(finalVal.toFixed(6)),
        why: [
          `text:${sTxt.toFixed(2)}*${W_TEXT}`,
          `rec:${sRec.toFixed(2)}*${W_REC}`,
          ...(prefersRemote && W_NB > 0
            ? [`nb:${(nbScoresRaw[i] ?? 0).toFixed(2)}*${W_NB}`]
            : [])
        ]
      };
    });

    ranked.sort((a, b) => b.final_score - a.final_score);

    // tira description do payload final só pra resposta ficar menor
    const items = ranked.map(({ description, ...rest }) => rest);

    return res.json({
      ok: true,
      intent,
      meta: {
        page,
        pageSize,
        days,
        prefersRemote,
        weights: { W_TEXT, W_REC, W_NB },
        recency_halflife_days: RECENCY_HALFLIFE,
        fallback_used: (terms.length > 0)
      },
      total,
      items
    });

  } catch (err) {
    console.error("[/search] erro interno final:", err);
    return res.status(500).json({
      ok: false,
      error: err.message || String(err)
    });
  }
});

export default router;
