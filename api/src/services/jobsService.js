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

export async function upsertJobs(pool, items = []) {
  if (!items.length) return { inserted: 0, updated: 0, skipped: 0 };

  const COLS = [
    "id","title","company","location_raw","remote_flag",
    "description","url","source","published_at","facets_nb"
  ];
  const N = COLS.length;

  const values = [];
  const rowsSql = items.map((j, i) => {
    const b = i * N;
    // OBS: o último parâmetro ($...::jsonb) faz cast para JSONB
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
      JSON.stringify(j.facets_nb || {})   // << importante: stringify
    );
  }

  const text = `
    INSERT INTO jobs (${COLS.join(",")})
    VALUES ${rowsSql}
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
  `;

  await pool.query(text, values);
  // se você já calcula inserted/updated/skipped, mantenha sua lógica
  return { inserted: 0, updated: items.length, skipped: 0 };
}
