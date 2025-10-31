const DEFAULT_DECAY_DAYS = Number(process.env.RECENCY_DECAY_DAYS || 30);

export function recencyScore(publishedAtIso, halfLifeDays = DEFAULT_DECAY_DAYS) {
    if (!publishedAtIso) return 0.0;
    const ms = Date.now() - new Date(publishedAtIso).getTime();
    if (isNaN(ms) || ms < 0 ) return 1.0;

    const days = ms / (1000 * 60 * 60 * 24);
    
    const lambda = Math.log(2) / halfLifeDays;
    const s = Math.exp(-lambda * days);
    
    return Math.max(0, Math.min(1, s));
}