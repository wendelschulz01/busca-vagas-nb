export function recencyScore(iso, halfLifeDays = 30) {
    if (!iso) return 0.0;
    const ms = Date.now() - new Date(iso).getTime();
    if (isNaN(ms) || ms < 0 ) return 1.0;
    const days = ms / (1000 * 60 * 60 * 24);
    const lambda = Math.log(2) / halfLifeDays;
    return Math.exp(-lambda * days);
}