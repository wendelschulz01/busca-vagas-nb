import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool ({
    host: process.env.POSTGRES_HOST || "db",
    port: Number(process.env.POSTGRES_PORT || 5432),
    user: process.env.POSTGRES_USER || "jobs",
    password: process.env.POSTGRES_PASSWORD || "jobs123",
    database: process.env.POSTGRES_DB || 'jobsdb'
});

function validateJob(j) {
    if (!j.id || !j.title || !j.url) {
        return false;
    } else{return true};
}

e// api/src/services/jobsService.js
export async function upsertJobs(pool, items = []) {
  if (!Array.isArray(items) || items.length === 0) {
    return { inserted: 0, updated: 0, skipped: 0 };
  }

  // colunas e ordem fixas
  const COLS = [
    "id","title","company","location_raw","remote_flag",
    "description","url","source","published_at","facets_nb"
  ];
  const N = COLS.length;

  const values = [];
  const rows = items.map((j, i) => {
    const b = i * N;
    return `($${b+1},$${b+2},$${b+3},$${b+4},$${b+5},$${b+6},$${b+7},$${b+8},$${b+9},$${b+10}::jsonb)`;
  }).join(",");

  for (const j of items) {
    values.push(
      j.id,
      j.title || "",
      j.company || null,
      j.location_raw || null,
      !!j.remote_flag,
      j.description || "",
      j.url || null,
      j.source || null,
      j.published_at || new Date().toISOString(),
      JSON.stringify(j.facets_nb || {})
    );
  }

  // Truque: (xmax = 0) é true em linhas recém-inseridas; false quando foi UPDATE
  const sql = `
    INSERT INTO jobs (${COLS.join(",")})
    VALUES ${rows}
    ON CONFLICT (id) DO UPDATE SET
      title         = EXCLUDED.title,
      company       = EXCLUDED.company,
      location_raw  = EXCLUDED.location_raw,
      remote_flag   = EXCLUDED.remote_flag,
      description   = EXCLUDED.description,
      url           = EXCLUDED.url,
      source        = EXCLUDED.source,
      published_at  = EXCLUDED.published_at,
      facets_nb     = COALESCE(EXCLUDED.facets_nb, jobs.facets_nb)
    RETURNING (xmax = 0) AS inserted
  `;

  const r = await pool.query(sql, values);
  const inserted = r.rows.filter(x => x.inserted === true).length;
  const updated  = r.rowCount - inserted;
  return { inserted, updated, skipped: 0 };
}

