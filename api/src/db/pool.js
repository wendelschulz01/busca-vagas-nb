import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({
    host: process.env.POSTGRES_HOST || "db",
    port: Number(process.env.POSTGRES_PORT || 5432),
    user: process.env.POSTGRES_USER || "jobs",
    password: process.env.POSTGRES_PASSWORD || "jobs123",
    database: process.env.POSTGRES_DB || "jobsdb",
    max: Number(process.env.PG_POOL_MAX || 10),
    idleTimeoutMillis: Number(process.env.PG_IDLE_MS || 30000),
    connectionTimeoutMillis: Number(process.env.PG_CONN_MS || 5000)
});

pool.on("error", err => {
    console.error("[pg:pool] erro inesperado no cliente do pool: ", err);
});

export default pool;