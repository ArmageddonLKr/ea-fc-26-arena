export function loadGlobalStats() {
  try {
    const s = localStorage.getItem('eafc26_stats');
    if (s) return JSON.parse(s);
  } catch(e){}
  return { matches: 0, p1Wins: 0, p2Wins: 0, draws: 0, history: [] };
}

export function saveGlobalStats(stats) {
  localStorage.setItem('eafc26_stats', JSON.stringify(stats));
}

export function recordMatch(p1Name, p2Name, p1Score, p2Score, t1, t2, t1LogoUrl = null, t2LogoUrl = null) {
  const stats = loadGlobalStats();
  stats.matches++;
  if (p1Score > p2Score) stats.p1Wins++;
  else if (p2Score > p1Score) stats.p2Wins++;
  else stats.draws++;
  
  stats.history.unshift({
    date: new Date().toISOString(),
    p1Name, p2Name, p1Score, p2Score, t1Name: t1.n, t2Name: t2.n,
    t1Logo: t1LogoUrl || t1.logo || null, 
    t2Logo: t2LogoUrl || t2.logo || null, 
    t1Flag: t1.f, t2Flag: t2.f
  });
  
  if (stats.history.length > 20) stats.history.pop();
  saveGlobalStats(stats);
}

export function clearGlobalStats() {
  localStorage.removeItem('eafc26_stats');
}
