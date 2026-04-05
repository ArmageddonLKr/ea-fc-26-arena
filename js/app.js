import { getLogoUrl, renderLogo, fetchTeamsData } from './teams.js';
import { loadGlobalStats, saveGlobalStats, recordMatch, clearGlobalStats } from './stats.js';
import { generateTournament, renderBracket, getNextTournamentMatch, reportTournamentMatchResult, endTournament, tournState } from './tournament.js';

let masterDB = [];
export let teamsDB = [];
export let pNames  = { a:"Jogador 1", b:"Jogador 2" };
let isDrafting = false;
let lastTeams  = [];
let bannedTeams = [];
let roundCount = 0;
let matchHistory = [];
let ownerMap = { 1:'a', 2:'b' };
let scores   = { a:0, b:0 };

async function loadDB() {
  masterDB = await fetchTeamsData();
  teamsDB = [...masterDB];
  updateSummary();
  
  // Load saved names
  const savedP1 = localStorage.getItem('eafc_p1');
  const savedP2 = localStorage.getItem('eafc_p2');
  if(savedP1) { pNames.a = savedP1; document.getElementById('p1Input').value = savedP1; }
  if(savedP2) { pNames.b = savedP2; document.getElementById('p2Input').value = savedP2; }
}

export function getOVR(t) { return Math.min(Math.max(Math.round(t.a*0.3+t.m*0.4+t.d*0.3),60),99); }

async function boot() {
  await loadDB();
  setTimeout(() => {
    document.getElementById('splash').classList.add('out');
  }, 800);
}

function updateSummary() {
  document.getElementById('summaryTotal').textContent = teamsDB.length;
  const leagues = [...new Set(teamsDB.map(t => t.league||'Outra'))];
  document.getElementById('summaryLeagues').textContent = leagues.length;
}

window.bootArena = function() {
  pNames.a = document.getElementById('p1Input').value.trim() || "Jogador 1";
  pNames.b = document.getElementById('p2Input').value.trim() || "Jogador 2";
  document.getElementById('ah_p1').textContent = pNames.a;
  document.getElementById('ah_p2').textContent = pNames.b;
  document.getElementById('scoreName1').textContent = pNames.a;
  document.getElementById('scoreName2').textContent = pNames.b;
  scores = {a:0,b:0};
  document.getElementById('scoreNum1').textContent = '0';
  document.getElementById('scoreNum2').textContent = '0';
  roundCount = 0;
  document.getElementById('roundNum').textContent = '0';
  matchHistory = [];
  document.getElementById('historyWrap').style.display = 'none';
  document.getElementById('lobby').style.display = 'none';
  document.getElementById('arena').style.display = 'block';
  assignOwners();
  SoundSystem.init();
};

window.backToLobby = function() {
  document.getElementById('arena').style.display = 'none';
  document.getElementById('lobby').style.display = 'block';
};

window.addGoal = function(player) {
  scores[player]++;
  document.getElementById(player==='a'?'scoreNum1':'scoreNum2').textContent = scores[player];
  showToast(`⚽ Gol de ${player==='a'?pNames.a:pNames.b}!`);
  fireConfetti(player === 'a' ? '#ff1744' : '#00b4d8');
};

window.finishMatchAndSave = function() {
  if (!lastTeams || lastTeams.length < 2) return;
  const t1 = teamsDB.find(t=>t.n===lastTeams[lastTeams.length-2]);
  const t2 = teamsDB.find(t=>t.n===lastTeams[lastTeams.length-1]);
  if(t1 && t2) {
    let p1Score = scores.a;
    let p2Score = scores.b;
    if (ownerMap[1] === 'b') { p1Score = scores.b; p2Score = scores.a; }
    recordMatch(pNames.a, pNames.b, p1Score, p2Score, t1, t2, getLogoUrl(t1), getLogoUrl(t2));
    
    // Victory Screen Overlay
    document.getElementById('victoryPlayerName').textContent = p1Score > p2Score ? `${pNames.a} VENCEU!` : (p2Score > p1Score ? `${pNames.b} VENCEU!` : 'EMPATE!');
    document.getElementById('victoryPlayerName').style.color = p1Score > p2Score ? 'var(--p1)' : (p2Score > p1Score ? 'var(--p2)' : 'var(--muted)');
    document.getElementById('victoryScore').textContent = `${p1Score} x ${p2Score}`;
    document.getElementById('victoryTeam1').src = getLogoUrl(t1) || '';
    document.getElementById('victoryTeamName1').textContent = t1.n;
    document.getElementById('victoryTeam2').src = getLogoUrl(t2) || '';
    document.getElementById('victoryTeamName2').textContent = t2.n;
    
    document.getElementById('victoryOverlay').style.display = 'flex';
    fireConfetti('#00e676', 150);
    
    if (tournState.active) {
      reportTournamentMatchResult(p1Score, p2Score);
      window._nextDest = 'tournament';
    } else {
      window._nextDest = 'lobby';
    }
  }
};

window.dismissVictory = function() {
  document.getElementById('victoryOverlay').style.display = 'none';
  if(window._nextDest === 'tournament') {
    document.getElementById('arena').style.display = 'none';
    document.getElementById('tournament').style.display = 'block';
  } else {
    backToLobby();
  }
};

function fireConfetti(color, count=50) {
  const canvas = document.getElementById('confettiCanvas');
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  let particles = [];
  for(let i=0; i<count; i++) {
    particles.push({
      x: canvas.width/2, y: canvas.height/2,
      vx: (Math.random()-0.5)*20, vy: (Math.random()-0.5)*20 - 5,
      size: Math.random()*8+4, color: Math.random()>0.5?color:'#fff'
    });
  }
  function draw() {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    let active = false;
    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy; p.vy += 0.5; // gravity
      if(p.y < canvas.height) active = true;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size);
    });
    if(active) requestAnimationFrame(draw);
    else ctx.clearRect(0,0,canvas.width,canvas.height);
  }
  draw();
}

window.resetScore = function() {
  scores={a:0,b:0};
  document.getElementById('scoreNum1').textContent='0';
  document.getElementById('scoreNum2').textContent='0';
  showToast('Placar zerado');
};

window.savePlayerNames = function() {
  const p1 = document.getElementById('p1Input').value.trim();
  const p2 = document.getElementById('p2Input').value.trim();
  if (p1) localStorage.setItem('eafc_p1', p1);
  if (p2) localStorage.setItem('eafc_p2', p2);
};

window.shareToWhatsApp = function() {
  if (!lastTeams || lastTeams.length < 2) return;
  const t1 = masterDB.find(t=>t.n===lastTeams[lastTeams.length-2]);
  const t2 = masterDB.find(t=>t.n===lastTeams[lastTeams.length-1]);
  if(t1 && t2) {
    let p1Score = scores.a;
    let p2Score = scores.b;
    if (ownerMap[1] === 'b') { p1Score = scores.b; p2Score = scores.a; }
    
    const txt = `🎮 *Sorteio EA FC 26 Finalizado!*\n\n⚽ ${pNames.a} *${p1Score} x ${p2Score}* ${pNames.b}\n\n🛡️ ${t1.n} (OVR ${getOVR(t1)}) vs 🛡️ ${t2.n} (OVR ${getOVR(t2)})\n\n_Batalha Gerada via Sorteador Competitivo_`;
    const url = 'https://wa.me/?text=' + encodeURIComponent(txt);
    window.open(url, '_blank');
  }
};

window.applyLeagueFilter = function() {
  const val = document.getElementById('leagueFilter').value;
  if(val === 'clubs') {
    teamsDB = masterDB.filter(t => t.league !== 'International');
  } else if(val === 'nations') {
    teamsDB = masterDB.filter(t => t.league === 'International');
  } else {
    teamsDB = [...masterDB];
  }
  updateSummary();
  showToast(`Filtro Aplicado: ${teamsDB.length} Times Disponíveis`);
};

function assignOwners() {
  const rev = Math.random()>0.5;
  ownerMap[1]=rev?'b':'a'; ownerMap[2]=rev?'a':'b';
  updateOwnerBadge(1); updateOwnerBadge(2);
}

function updateOwnerBadge(id) {
  const badge = document.getElementById(`n${id}_owner`);
  const owner = ownerMap[id];
  const isP1  = owner==='a';
  badge.textContent = isP1?pNames.a:pNames.b;
  badge.style.background = isP1?'rgba(255,23,68,0.2)':'rgba(0,180,216,0.2)';
  badge.style.color = isP1?'var(--p1)':'var(--p2)';
}

window.startDraft = function() {
  if(isDrafting) return;
  if(teamsDB.length < 2) { showToast('Carregando times...'); return; }
  
  // Se está em torneio, não é draft aleatório total, apenas revela os 2 times que a chave mandou!
  if(tournState.active) {
    const nextM = getNextTournamentMatch();
    if (nextM) {
       isDrafting = true;
       document.getElementById('btnSortear').disabled = true;
       document.getElementById('arena').classList.add('shuffling');
       SoundSystem.init();
       // Animação rápida só de suspense
       let ticks=0;
       const iv=setInterval(() => {
         SoundSystem.playTick(150+ticks*8);
         ticks++;
         if(ticks>=10) { 
            clearInterval(iv); 
            finalizeTournamentMatch(nextM.t1, nextM.t2); 
         }
       }, 80);
       return;
    }
  }

  isDrafting=true;
  const btn=document.getElementById('btnSortear');
  btn.disabled=true;
  document.getElementById('arena').classList.add('shuffling');
  SoundSystem.init();
  let ticks=0, total=14;
  const iv=setInterval(()=>{
    const r1=teamsDB[Math.floor(Math.random()*teamsDB.length)];
    const r2=teamsDB[Math.floor(Math.random()*teamsDB.length)];
    updateCard(1,r1,false);
    updateCard(2,r2,false);
    SoundSystem.playTick(150+ticks*8);
    ticks++;
    if(ticks>=total){ clearInterval(iv); finalize(); }
  },60);
};

function finalizeTournamentMatch(t1, t2) {
  assignOwners();
  lastTeams.push(t1.n, t2.n);
  if(lastTeams.length>14) lastTeams.splice(0,2);
  roundCount++;
  document.getElementById('roundNum').textContent=roundCount;
  const flash=document.getElementById('flashOverlay');
  flash.classList.add('on');
  setTimeout(()=>flash.classList.remove('on'),100);
  document.getElementById('arena').classList.remove('shuffling');
  setTimeout(()=>{
    updateCard(1,t1,true);
    updateCard(2,t2,true);
    SoundSystem.playImpact();
    const ovr1=getOVR(t1), ovr2=getOVR(t2);
    updateAdvantage(ovr1,ovr2);
    addToHistory(t1,t2,ovr1,ovr2);
    document.getElementById('btnSortear').disabled=false;
    isDrafting=false;
  },60);
}

function finalize() {
  assignOwners();
  let available = teamsDB.filter(t=>!lastTeams.includes(t.n) && !bannedTeams.includes(t.n));
  if(available.length<4){lastTeams=[]; available=teamsDB.filter(t=>!bannedTeams.includes(t.n));}
  
  let t1=available[Math.floor(Math.random()*available.length)];
  let ovr1=getOVR(t1);
  const tol=ovr1>84?3:4;
  let pool=available.filter(t=>{const diff=Math.abs(ovr1-getOVR(t));return diff<=tol&&t.n!==t1.n;});
  if(pool.length===0) pool=available.filter(t=>t.n!==t1.n);
  if(pool.length===0) pool=available;
  let t2=pool[Math.floor(Math.random()*pool.length)];
  
  // HANDICAP LOGIC
  const useHandicap = document.getElementById('handicapToggle').checked;
  if (useHandicap) {
    const stats = loadGlobalStats();
    let p1NeedsHelp = (stats.p2Wins - stats.p1Wins) >= 2;
    let p2NeedsHelp = (stats.p1Wins - stats.p2Wins) >= 2;
    
    if (p1NeedsHelp || p2NeedsHelp) {
      let isCard1P1 = ownerMap[1] === 'a'; // Does Card 1 belong to Player 1?
      let card1NeedsBest = (p1NeedsHelp && isCard1P1) || (p2NeedsHelp && !isCard1P1);
      
      let bestT = getOVR(t1) >= getOVR(t2) ? t1 : t2;
      let worstT = getOVR(t1) < getOVR(t2) ? t1 : t2;
      
      t1 = card1NeedsBest ? bestT : worstT;
      t2 = card1NeedsBest ? worstT : bestT;
    }
  }

  lastTeams.push(t1.n,t2.n);
  if(lastTeams.length>14) lastTeams.splice(0,2);
  roundCount++;
  document.getElementById('roundNum').textContent=roundCount;
  const flash=document.getElementById('flashOverlay');
  flash.classList.add('on');
  setTimeout(()=>flash.classList.remove('on'),100);
  document.getElementById('arena').classList.remove('shuffling');
  
  // Trigger Slot Machine Anim
  document.getElementById('c1').classList.add('slot-reveal');
  document.getElementById('c2').classList.add('slot-reveal');
  setTimeout(() => {
    document.getElementById('c1').classList.remove('slot-reveal');
    document.getElementById('c2').classList.remove('slot-reveal');
  }, 300);

  setTimeout(()=>{
    updateCard(1,t1,true);
    updateCard(2,t2,true);
    SoundSystem.playImpact();
    const ovr2=getOVR(t2);
    updateAdvantage(ovr1,ovr2);
    addToHistory(t1,t2,ovr1,ovr2);
    document.getElementById('btnSortear').disabled=false;
    isDrafting=false;
  },60);
}

function updateCard(id, data, animate) {
  const card=document.getElementById(`c${id}`);
  const ovr=getOVR(data);
  card.style.setProperty('--team-color', data.c||'#00e676');
  if(animate){card.classList.remove('revealed');void card.offsetWidth;card.classList.add('revealed');}
  const oEl=document.getElementById(`o${id}`);
  oEl.className='ovr-num';
  if(ovr>=85) oEl.classList.add('ovr-legend');
  else if(ovr>=80) oEl.classList.add('ovr-elite');
  else if(ovr>=75) oEl.classList.add('ovr-gold');
  else oEl.classList.add('ovr-base');
  oEl.textContent=ovr;
  if(animate){oEl.classList.remove('pop');void oEl.offsetWidth;oEl.classList.add('pop');}
  
  const logoWrap=document.getElementById(`logoWrap${id}`);
  renderLogo(logoWrap, null, data);
  
  document.getElementById(`league${id}`).textContent=data.league||'';
  document.getElementById(`name${id}`).textContent=data.n;
  document.getElementById(`star${id}`).textContent=data.s||'';
  ['a','m','d'].forEach(type=>{
    const val=data[type]||0;
    document.getElementById(`v${id}${type}`).textContent=val;
    const bar=document.getElementById(`f${id}${type}`);
    bar.style.width='0%';
    if(animate) setTimeout(()=>{bar.style.width=val+'%';},80);
    else bar.style.width=val+'%';
  });
}

function updateAdvantage(ovr1,ovr2) {
  const chip=document.getElementById('ovrChip');
  const diff=ovr1-ovr2;
  chip.className='ovr-adv-chip';
  if(diff===0){chip.textContent='⚖ Equilíbrio perfeito';chip.classList.add('chip-equal');}
  else{
    const stronger=diff>0?1:2;
    const owner=ownerMap[stronger];
    const name=owner==='a'?pNames.a:pNames.b;
    const isP1=owner==='a';
    chip.textContent=`${name} +${Math.abs(diff)} OVR`;
    chip.classList.add(isP1?'chip-red':'chip-blue');
  }
}

function addToHistory(t1,t2,ovr1,ovr2) {
  matchHistory.unshift({t1,t2,ovr1,ovr2,round:roundCount});
  if(matchHistory.length>5) matchHistory.pop();
  const wrap=document.getElementById('historyWrap');
  const list=document.getElementById('historyList');
  wrap.style.display='block';
  list.innerHTML=matchHistory.map(m=>{
    const logo1=getLogoUrl(m.t1);
    const logo2=getLogoUrl(m.t2);
    const img1=logo1?`<img class="hi-logo" src="${logo1}" onerror="this.style.display='none'">`:`${m.t1.f||''}`;
    const img2=logo2?`<img class="hi-logo" src="${logo2}" onerror="this.style.display='none'">`:`${m.t2.f||''}`;
    return `<div class="history-item">
      <span class="hi-round">R${m.round}</span>
      <span class="hi-teams">${img1} ${m.t1.n} × ${img2} ${m.t2.n}</span>
      <span class="hi-ovrs">${m.ovr1}·${m.ovr2}</span>
    </div>`;
  }).join('');
}

let toastTimer;
function showToast(msg) {
  const t=document.getElementById('toast');
  t.textContent=msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>t.classList.remove('show'),2200);
}

const SoundSystem = {
  ctx:null,
  init(){
    if(!this.ctx) try{this.ctx=new(window.AudioContext||window.webkitAudioContext)();}catch(e){}
  },
  playTick(f=200){
    if(!this.ctx) return;
    const o=this.ctx.createOscillator(), g=this.ctx.createGain();
    o.type='square';
    o.frequency.setValueAtTime(f+(Math.random()*12-6),this.ctx.currentTime);
    g.gain.setValueAtTime(0.04,this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001,this.ctx.currentTime+0.07);
    o.connect(g);g.connect(this.ctx.destination);o.start();o.stop(this.ctx.currentTime+0.07);
    
    // Haptic
    if(navigator.vibrate) try{navigator.vibrate(10);}catch(e){}
  },
  playImpact(){
    if(!this.ctx) return;
    [{type:'triangle',f1:90,f2:30,gain:0.4,dur:0.5},{type:'sine',f1:220,f2:110,gain:0.15,dur:0.3}]
    .forEach(({type,f1,f2,gain,dur})=>{
      const o=this.ctx.createOscillator(),g=this.ctx.createGain();
      o.type=type;
      o.frequency.setValueAtTime(f1,this.ctx.currentTime);
      o.frequency.exponentialRampToValueAtTime(f2,this.ctx.currentTime+dur);
      g.gain.setValueAtTime(gain,this.ctx.currentTime);
      g.gain.linearRampToValueAtTime(0,this.ctx.currentTime+dur);
      o.connect(g);g.connect(this.ctx.destination);o.start();o.stop(this.ctx.currentTime+dur);
    });
    // Haptic
    if(navigator.vibrate) try{navigator.vibrate([30,50,30]);}catch(e){}
  }
};

boot();

let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredPrompt = e;
  const dismissed = localStorage.getItem('pwa_dismissed');
  if (!dismissed) {
    setTimeout(() => {
      document.getElementById('pwaBanner').style.display = 'block';
    }, 3000);
  }
});
window.addEventListener('appinstalled', () => {
  document.getElementById('pwaBanner').style.display = 'none';
  showToast('✅ App instalado com sucesso!');
  deferredPrompt = null;
});
window.doPWAInstall = function() {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  deferredPrompt.userChoice.then(choice => {
    if (choice.outcome === 'accepted') showToast('🚀 Instalando...');
    deferredPrompt = null;
    document.getElementById('pwaBanner').style.display = 'none';
  });
};
window.dismissPWA = function() {
  document.getElementById('pwaBanner').style.display = 'none';
  document.getElementById('iosBanner').style.display = 'none';
  localStorage.setItem('pwa_dismissed', '1');
};

const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
const isInStandaloneMode = window.navigator.standalone;
if (isIOS && !isInStandaloneMode) {
  const dismissed = localStorage.getItem('pwa_dismissed');
  if (!dismissed) {
    setTimeout(() => {
      document.getElementById('iosBanner').style.display = 'block';
    }, 4000);
  }
}

// ── NOVOS MENUS (TORNEIO E STATUS) ──
window.openTournamentMenu = function() {
  document.getElementById('lobby').style.display = 'none';
  document.getElementById('tournament').style.display = 'block';
};

// ── BAN MENU ──
window.openBanMenu = function() {
  bannedTeams = [];
  document.getElementById('banCountBadge').textContent = '0 selecionados';
  renderBanGrid();
  document.getElementById('banModal').classList.add('open');
};

window.closeBanMenu = function() {
  document.getElementById('banModal').classList.remove('open');
};

window.toggleBan = function(teamName) {
  if (bannedTeams.includes(teamName)) {
    bannedTeams = bannedTeams.filter(n => n !== teamName);
  } else {
    if (bannedTeams.length >= 10) return showToast('Máximo de 10 bans!');
    bannedTeams.push(teamName);
  }
  document.getElementById('banCountBadge').textContent = `${bannedTeams.length} selecionado(s)`;
  renderBanGrid();
};

function renderBanGrid() {
  const grid = document.getElementById('banTeamsGrid');
  grid.innerHTML = teamsDB.map(t => {
    const isBanned = bannedTeams.includes(t.n);
    const logoUrl = getLogoUrl(t);
    const imgHtml = logoUrl ? `<img src="${logoUrl}" loading="lazy">` : `<span style="font-size:1.5rem">${t.f||'🌐'}</span>`;
    return `<div class="ban-item ${isBanned?'banned':''}" onclick="toggleBan('${t.n.replace(/'/g, "\\'")}')" title="${t.n}">
      ${imgHtml}
    </div>`;
  }).join('');
}

window.applyBansAndStart = function() {
  closeBanMenu();
  bootArena();
};

window.backToLobbyFromTournament = function() {
  document.getElementById('tournament').style.display = 'none';
  document.getElementById('lobby').style.display = 'block';
};

window.openStatsMenu = function() {
  const modal = document.getElementById('statsModal');
  const stats = loadGlobalStats();
  
  // Update Summary
  let wlHtml = `<div class="summary-card"><div class="summary-label">${pNames.a} Vitórias</div><div class="summary-val" style="color:var(--p1)">${stats.p1Wins}</div></div>
                <div class="summary-card"><div class="summary-label">${pNames.b} Vitórias</div><div class="summary-val" style="color:var(--p2)">${stats.p2Wins}</div></div>
                <div class="summary-card"><div class="summary-label">Empates</div><div class="summary-val" style="color:var(--muted)">${stats.draws}</div></div>`;
  document.getElementById('globalStatsSummary').innerHTML = wlHtml;

  // Update List
  const list = document.getElementById('globalHistoryList');
  if(stats.history.length === 0) list.innerHTML = `<div class="history-item"><div class="hi-teams" style="text-align:center;">Nenhuma partida registrada</div></div>`;
  else {
    list.innerHTML = stats.history.map(m => {
      const img1 = m.t1Logo ? `<img class="hi-logo" src="${m.t1Logo}">` : `${m.t1Flag||'🌐'}`;
      const img2 = m.t2Logo ? `<img class="hi-logo" src="${m.t2Logo}">` : `${m.t2Flag||'🌐'}`;
      let c1='#fff', c2='#fff';
      if(m.p1Score > m.p2Score) { c1='var(--accent)'; c2='rgba(255,255,255,0.3)'; }
      if(m.p2Score > m.p1Score) { c2='var(--accent)'; c1='rgba(255,255,255,0.3)'; }
      
      return `<div class="history-item" style="flex-direction:column; align-items:stretch;">
        <div style="display:flex;justify-content:space-between;font-size:0.6rem;color:var(--muted);text-transform:uppercase;margin-bottom:4px;">
          <span>${m.p1Name} (P1)</span>
          <span>${m.p2Name} (P2)</span>
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div style="display:flex; align-items:center; gap:6px;"><span style="color:${c1}; font-family:'Rajdhani'; font-size:1.2rem; font-weight:700;">${m.p1Score}</span> ${img1} <span style="color:rgba(255,255,255,0.7); font-size:0.8rem; max-width:80px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${m.t1Name}</span></div>
          <span style="color:rgba(255,255,255,0.2); font-size:0.7rem;">×</span>
          <div style="display:flex; align-items:center; gap:6px; flex-direction:row-reverse;"><span style="color:${c2}; font-family:'Rajdhani'; font-size:1.2rem; font-weight:700;">${m.p2Score}</span> ${img2} <span style="text-align:right; color:rgba(255,255,255,0.7); font-size:0.8rem; max-width:80px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${m.t2Name}</span></div>
        </div>
      </div>`;
    }).join('');
  }
  
  modal.classList.add('open');
};

window.closeStatsMenu = function() {
  document.getElementById('statsModal').classList.remove('open');
};

window.clearStats = function() {
  if(!confirm("Tem certeza que deseja apagar o histórico de estatísticas de todas as rodadas?")) return;
  clearGlobalStats();
  openStatsMenu();
};

window.generateTournament = function() {
  const size = parseInt(document.getElementById('tourneySize').value) || 8;
  const level = document.getElementById('tourneyLevel').value;
  generateTournament(size, level);
};

window.playNextMatch = function() {
  const match = getNextTournamentMatch();
  if (!match) return;
  
  // Abre arena modo torneio
  window.bootArena();
  
  // Prepara o botão sortear (agora ele vai invocar finalizeTournamentMatch via startDraft modificado)
  const btn = document.getElementById('btnSortear');
  btn.innerHTML = `<span>⚡ Revelar Partida de Torneio</span>`;
  
  document.getElementById('tournament').style.display = 'none';
};

window.endTournament = function() {
  if(!confirm("Tem certeza que deseja cancelar essa Copa?")) return;
  endTournament();
};
