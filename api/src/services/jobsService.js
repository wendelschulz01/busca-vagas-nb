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

export async function upsertJobs(items) {
    if (!Array.isArray(items) || items.length === 0 ) {
        return { inserted: 0, updated: 0, skipped: 0};
    };

    let inserted = 0, updated = 0, skipped = 0;

    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        const text = `
           INSERT INTO jobs (id, title, company, location_raw, remote_flag, description, url, source, published_at, facets_nb)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
           ON CONFLICT (id) DO UPDATE SET
            title = EXCLUDED.title,
            company = EXCLUDED.company,
            location_raw = EXCLUDED.location_raw,
            remote_flag = EXCLUDED.remote_flag,
            description = EXCLUDED.description,
            url = EXCLUDED.url,
            source = EXCLUDED.source,
            published_at = EXCLUDED.published_at
            facets_nb=COALESCE(jobs.facets_nb,'{}'::jsonb) || COALESCE(EXCLUDED.facets_nb,'{}'::jsonb)
          RETURNING (xmax = 0) AS inserted
        `;

        for (const j of items) {
            if(!validateJob(j)) { skipped++; continue; }
            const values = [
                j.id, j.title, j.company || null, j.location_raw || null, !!j.remote_flag,
                j.description || null, j.url, j.source || null, j.published_at || new Date().toISOString(),
                j.facets_nb || null
            ];
            const { rows } = await client.query(text, values);
            if (rows[0]?.inserted) inserted++; else updated++;
        }
        await client.query("COMMIT");
        return { inserted, updated, skipped };
    }catch(e) {
        await client.query("ROLLBACK");
        throw e;
    } finally{
        client.release();
    }
}