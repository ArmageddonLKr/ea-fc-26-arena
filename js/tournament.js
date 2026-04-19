import { getLogoUrl, LOGO_OVERRIDES } from './teams.js';
import { getOVR, teamsDB, pNames } from './app.js';

export let tournState = {
  active: false,
  matches: [],
  currentMatchIdx: -1
};

export function generateTournament(size, level) {
  let pool = teamsDB.filter(t => {
    const ovr = getOVR(t);
    if(level === '80') return ovr >= 80;
    if(level === '75') return ovr >= 75 && ovr < 80;
    return true; // 'all'
  });
  
  if (pool.length < size) {
    alert("Não há times suficientes nesse nível para gerar o torneio. Tente 'Mix Aleatório'.");
    return;
  }
  
  // Sorteia times e pareia por equilíbrio (nivelamento forçado do Torneio)
  pool.sort(() => Math.random() - 0.5); // embaralha
  let selected = pool.slice(0, size);
  
  // Para nivelamento máximo, ordena os selecionados por OVR para que os confrontos da 1ª fase sejam justos.
  selected.sort((a,b) => getOVR(b) - getOVR(a));
  let balancedPairs = [];
  for(let i=0; i<selected.length; i+=2) {
    balancedPairs.push([selected[i], selected[i+1]]);
  }
  balancedPairs.sort(() => Math.random() - 0.5); // embaralha as chaves

  tournState.active = true;
  tournState.matches = [];
  tournState.currentMatchIdx = 0;

  let matchId = 0;
  // Create first round
  let qfCount = size / 2;
  for(let i=0; i<qfCount; i++){
    tournState.matches.push({
      id: matchId++, phase: qfCount === 4 ? 'Quartas' : 'Semifinal', 
      t1: balancedPairs[i][0], t2: balancedPairs[i][1], winner: null
    });
  }
  // Create subsequent rounds
  if (qfCount === 4) {
    tournState.matches.push({id: matchId++, phase: 'Semifinal', t1: null, t2: null, winner: null, wait1: 0, wait2: 1});
    tournState.matches.push({id: matchId++, phase: 'Semifinal', t1: null, t2: null, winner: null, wait1: 2, wait2: 3});
    tournState.matches.push({id: matchId++, phase: 'Final', t1: null, t2: null, winner: null, wait1: 4, wait2: 5});
  } else {
    tournState.matches.push({id: matchId++, phase: 'Final', t1: null, t2: null, winner: null, wait1: 0, wait2: 1});
  }
  
  renderBracket();
  document.getElementById('tournSetupControls').style.display = 'none';
  document.getElementById('bracketWrap').style.display = 'block';
}

export function renderBracket() {
  const container = document.getElementById('bracketContainer');
  let html = '';
  tournState.matches.forEach((m, i) => {
    const logoImg = (team) => {
      const url = getLogoUrl(team);
      const fb  = LOGO_OVERRIDES[team.n] || '';
      return `<img src="${url}" data-fb="${fb}" style="width:18px;height:18px;object-fit:contain;" onerror="if(this.src!==this.dataset.fb&&this.dataset.fb){this.src=this.dataset.fb;this.onerror=null;}else{this.remove();}">`;
    };
    let t1Render = m.t1 ? `${logoImg(m.t1)} ${m.t1.n} (${getOVR(m.t1)})` : `Aguardando Vencedor`;
    let t2Render = m.t2 ? `${logoImg(m.t2)} ${m.t2.n} (${getOVR(m.t2)})` : `Aguardando Vencedor`;
    
    let cl1 = m.winner === 1 ? 'winner' : (m.winner === 2 ? 'loser' : '');
    let cl2 = m.winner === 2 ? 'winner' : (m.winner === 1 ? 'loser' : '');
    
    let isCurrent = (i === tournState.currentMatchIdx && m.t1 && m.t2 && !m.winner);
    let borderStyle = isCurrent ? 'border:1px solid var(--accent); box-shadow:0 0 10px rgba(0,230,118,0.2);' : '';

    html += `<div class="bracket-match" style="${borderStyle}">
      <div class="bracket-vs">${m.phase} - Jogo ${i+1}</div>
      <div class="bracket-team ${cl1}">${t1Render}</div>
      <div class="bracket-team ${cl2}">${t2Render}</div>
    </div>`;
  });
  
  // Confere se acabou
  const finalMatch = tournState.matches[tournState.matches.length - 1];
  if(finalMatch.winner) {
    let champion = finalMatch.winner === 1 ? finalMatch.t1 : finalMatch.t2;
    html += `<div style="text-align:center; padding:20px; font-family:'Rajdhani',sans-serif; color:var(--gold); font-size:1.8rem; font-weight:700;">🏆 CAMPEÃO: ${champion.n}</div>`;
    document.getElementById('btnNextMatch').style.display = 'none';
  } else {
    document.getElementById('btnNextMatch').style.display = 'block';
  }
  
  container.innerHTML = html;
}

export function getNextTournamentMatch() {
  if (!tournState.active || tournState.currentMatchIdx >= tournState.matches.length) return null;
  return tournState.matches[tournState.currentMatchIdx];
}

export function reportTournamentMatchResult(p1Score, p2Score) {
  if (!tournState.active) return;
  let m = tournState.matches[tournState.currentMatchIdx];
  if (m && m.t1 && m.t2 && !m.winner) {
    if(p1Score > p2Score) m.winner = 1;
    else if(p2Score > p1Score) m.winner = 2;
    else {
      alert("Partidas de torneio não podem terminar em empate! Desempate resolvido nos pênaltis imaginários para o Player 1.");
      m.winner = 1;
    }
    
    let wTeam = m.winner === 1 ? m.t1 : m.t2;
    
    // Avança o vencedor pra próxima fase
    tournState.matches.forEach(nextM => {
      if (nextM.wait1 === m.id) nextM.t1 = wTeam;
      if (nextM.wait2 === m.id) nextM.t2 = wTeam;
    });
    
    tournState.currentMatchIdx++;
    // Se o próximo jogo ainda não tiver os dois times, procura o próximo válido (não deveria acontecer pela estrutura)
    while(tournState.currentMatchIdx < tournState.matches.length && 
         (!tournState.matches[tournState.currentMatchIdx].t1 || !tournState.matches[tournState.currentMatchIdx].t2)) {
      tournState.currentMatchIdx++; // safe skip se needed
    }
    
    renderBracket();
  }
}

export function endTournament() {
  tournState.active = false;
  tournState.matches = [];
  document.getElementById('bracketWrap').style.display = 'none';
  document.getElementById('tournSetupControls').style.display = 'block';
}
