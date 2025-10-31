export function tokenizeToSet(str = "") {
    return new Set(
        str.toLowerCase()
           .replace(/[^a-z0-9áéíóúàâêôãõç]+/gi, " ")
           .split(/\s+/)
           .filter(Boolean)        
    );
}

export function textSimilarityScore(query, jobText) {
    const qTokens = Array.from(tokenizeToSet(query));
    if(qTokens.length === 0) return 0.0;

    const jobTokens = tokenizeToSet(jobText);
    let hits =0;
    for (const qt of qTokens) {
        if (jobTokens.has(qt)) hits += 1;
    }
    return hits / qTokens.length;
}