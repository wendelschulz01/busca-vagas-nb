CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    company TEXT,
    location_raw TEXT,
    remote_flag BOOLEAN DEFAULT FALSE,
    description TEXT,
    url TEXT,
    source TEXT,
    published_at TIMESTAMPZ DEFAULT NOW(),
    facets_nb JSONB    
);

CREATE INDEX IF NOT EXISTS idx_jobs_published_at ON jobs (published_at DESC);