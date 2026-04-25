// js/app.js — FC 26 Arena · Competitive Engine
// Motor principal: sorteio, placar, torneio, estatísticas

/* ===== ESTADO GLOBAL ===== */
let teams       = [];        // banco completo
let pool        = [];        // pool de sorteio (filtrado + ativos)
let bannedTeams = new Set(); // times banidos (por nome)
let roundTeams  = [null, null];
let score       = { a: 0, b: 0 };
let roundHistory = [];
let roundCount  = 0;
let sessionActive = false;

const SK = {
  teams:    'fc26_teams_v2',
  history:  'fc26_global_history',
  players:  'fc26_players',
  settings: 'fc26_settings',
  bans:     'fc26_bans',
  pwa:      'fc26_pwa_dismissed',
};

let cfg = {
  leagueFilter: 'all',
  leagueMode:   false,
  elite80:      false,
  handicap:     false,
};

/* ===== HELPERS DE COR / LOGO ===== */
function getOVR(t) {
  return t.ovr != null ? t.ovr : Math.round((t.a + t.m + t.d) / 3);
}

function getLogoUrl(t) {
  if (t && t.logo && t.logo !== '' && t.logo !== null) return t.logo;
  if (t && t.logoId) return `./assets/logos/${t.logoId}`;
  return null;
}

function isColorDark(hex) {
  const c = (hex || '#000000').replace('#', '');
  const r = parseInt(c.substr(0,2),16)||0;
  const g = parseInt(c.substr(2,2),16)||0;
  const b = parseInt(c.substr(4,2),16)||0;
  return (0.299*r + 0.587*g + 0.114*b) < 140;
}

function darken(hex, amt) {
  const c = (hex||'#333').replace('#','');
  const clamp = v => Math.max(0, Math.min(255, v));
  const r = clamp(parseInt(c.substr(0,2),16)-amt).toString(16).padStart(2,'0');
  const g = clamp(parseInt(c.substr(2,2),16)-amt).toString(16).padStart(2,'0');
  const b = clamp(parseInt(c.substr(4,2),16)-amt).toString(16).padStart(2,'0');
  return `#${r}${g}${b}`;
}

function makeBadge(name, color) {
  const parts = (name||'??').split(/[\s&\-]+/).filter(Boolean);
  const initials = parts.map(w=>w[0]).join('').slice(0,3).toUpperCase();
  const c = color || '#c8102e';
  const tc = isColorDark(c) ? '#fff' : '#000';
  const fs = initials.length >= 3 ? 14 : 17;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 74">
    <defs>
      <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:${c}"/>
        <stop offset="100%" style="stop-color:${darken(c,35)}"/>
      </linearGradient>
    </defs>
    <path d="M32 3 L60 16 L60 40 C60 57 32 71 32 71 C32 71 4 57 4 40 L4 16 Z"
          fill="url(#g)" stroke="rgba(255,255,255,0.15)" stroke-width="1.5"/>
    <text x="32" y="46" text-anchor="middle"
          font-family="'Barlow Condensed',sans-serif"
          font-weight="900" font-size="${fs}" fill="${tc}" letter-spacing="0.5">
      ${initials}
    </text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function renderLogoInto(wrapEl, team) {
  if (!wrapEl || !team) return;
  const url = getLogoUrl(team);
  const badge = makeBadge(team.n, team.c);
  if (url) {
    const img = document.createElement('img');
    img.src = url;
    img.alt = team.n;
    img.style.cssText = 'width:100%;height:100%;object-fit:contain;';
    img.onerror = () => { img.src = badge; };
    wrapEl.innerHTML = '';
    wrapEl.appendChild(img);
  } else {
    const img = document.createElement('img');
    img.src = badge;
    img.alt = team.n;
    img.style.cssText = 'width:100%;height:100%;object-fit:contain;';
    wrapEl.innerHTML = '';
    wrapEl.appendChild(img);
  }
}

/* ===== INIT ===== */
function hideSplash() {
  const splash = document.getElementById('splash');
  if (splash) {
    splash.style.opacity = '0';
    splash.style.transition = 'opacity 0.5s ease';
    setTimeout(() => { splash.style.display = 'none'; }, 520);
  }
}

async function init() {
  // Timer de segurança: splash some mesmo se der erro
  const splashTimer = setTimeout(hideSplash, 4000);

  try {
    // Carrega settings
    try {
      const s = JSON.parse(localStorage.getItem(SK.settings) || '{}');
      cfg = { ...cfg, ...s };
    } catch(e) {}

    // Carrega times: localStorage → fetch
    try {
      const saved = localStorage.getItem(SK.teams);
      if (saved) {
        teams = JSON.parse(saved);
      } else {
        const res = await fetch('./teams.json');
        if (!res.ok) throw new Error('HTTP ' + res.status);
        teams = await res.json();
        try { localStorage.setItem(SK.teams, JSON.stringify(teams)); } catch(e) {}
      }
    } catch(e) {
      console.error('[FC26] Erro ao carregar times:', e);
      teams = [];
    }

    // Calcula OVR de todos
    teams = teams.map(t => ({
      ...t,
      ovr: Math.round((t.a + t.m + t.d) / 3),
    }));

    // Restaura nomes dos jogadores
    try {
      const names = JSON.parse(localStorage.getItem(SK.players) || '["",""]');
      document.getElementById('p1Input').value = names[0] || '';
      document.getElementById('p2Input').value = names[1] || '';
    } catch(e) {}

    // Aplica settings na UI
    try {
      document.getElementById('leagueFilter').value = cfg.leagueFilter;
      document.getElementById('leagueModeToggle').checked = cfg.leagueMode;
      document.getElementById('elite80Toggle').checked = cfg.elite80;
      document.getElementById('handicapToggle').checked = cfg.handicap;
    } catch(e) {}

    // Event listeners de config
    try {
      document.getElementById('elite80Toggle').addEventListener('change', () => {
        cfg.elite80 = document.getElementById('elite80Toggle').checked;
        saveSettings(); rebuildPool();
      });
      document.getElementById('handicapToggle').addEventListener('change', () => {
        cfg.handicap = document.getElementById('handicapToggle').checked;
        saveSettings();
      });
    } catch(e) {}

    // Restaura bans
    try {
      const bans = JSON.parse(localStorage.getItem(SK.bans) || '[]');
      bannedTeams = new Set(bans);
    } catch(e) {}

    rebuildPool();
    updateScoreNames();

  } catch(fatalErr) {
    console.error('[FC26] Erro fatal no init:', fatalErr);
  }

  // Esconde splash
  clearTimeout(splashTimer);
  setTimeout(hideSplash, 1800);

  setupPWA();
}

/* ===== POOL ===== */
function rebuildPool() {
  pool = teams.filter(t => {
    if (t.active === false) return false;
    if (cfg.leagueFilter !== 'all' && t.league !== cfg.leagueFilter) return false;
    if (cfg.elite80 && getOVR(t) < 80) return false;
    return true;
  });
  updateConfigStats();
}

/* ===== NOMES ===== */
function savePlayerNames() {
  const p1 = document.getElementById('p1Input').value;
  const p2 = document.getElementById('p2Input').value;
  localStorage.setItem(SK.players, JSON.stringify([p1, p2]));
  updateScoreNames();
}

function P(idx) {
  try {
    const n = JSON.parse(localStorage.getItem(SK.players)||'["",""]');
    return n[idx] || `P${idx+1}`;
  } catch(e) { return `P${idx+1}`; }
}

function updateScoreNames() {
  const p1 = P(0), p2 = P(1);
  ['scoreName1','ah_p1'].forEach(id => { const el=document.getElementById(id); if(el) el.textContent=p1; });
  ['scoreName2','ah_p2'].forEach(id => { const el=document.getElementById(id); if(el) el.textContent=p2; });
}

/* ===== PLACAR ===== */
function addGoal(side) {
  score[side]++;
  document.getElementById('scoreNum1').textContent = score.a;
  document.getElementById('scoreNum2').textContent = score.b;
  if (navigator.vibrate) navigator.vibrate(18);
  const flash = document.getElementById('flashOverlay');
  if (flash) {
    flash.style.opacity = '0.15';
    setTimeout(() => flash.style.opacity = '0', 250);
  }
  // Bump animation
  const numEl = document.getElementById(side === 'a' ? 'scoreNum1' : 'scoreNum2');
  numEl.style.transform = 'scale(1.25)';
  setTimeout(() => numEl.style.transform = 'scale(1)', 200);
}

function resetScore() {
  score = { a: 0, b: 0 };
  document.getElementById('scoreNum1').textContent = 0;
  document.getElementById('scoreNum2').textContent = 0;
  showToast('↺ Placar zerado');
}

/* ===== BOOT ARENA ===== */
function bootArena() {
  if (pool.length < 2) {
    showToast('Pool insuficiente. Ajuste os filtros.', 'warn'); return;
  }
  bannedTeams = new Set();
  _startSession();
}

function _startSession() {
  switchTab('arena');
  sessionActive = true;
  roundHistory = [];
  roundCount = 0;
  score = { a: 0, b: 0 };
  const s1=document.getElementById('scoreNum1');
  const s2=document.getElementById('scoreNum2');
  const rn=document.getElementById('roundNum');
  if(s1) s1.textContent=0;
  if(s2) s2.textContent=0;
  if(rn) rn.textContent=0;
  const hw = document.getElementById('historyWrap');
  if(hw) hw.style.display='none';
  updateScoreNames();
}

/* ===== DRAFT ===== */
async function startDraft() {
  const available = pool.filter(t => !bannedTeams.has(t.n));
  if (available.length < 2) {
    showToast('Pool insuficiente. Desbane times ou ajuste filtros.', 'warn'); return;
  }

  const btn = document.getElementById('btnSortear');
  if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spin-icon">⚡</span> Sorteando...'; }

  if (navigator.vibrate) navigator.vibrate([25,40,25]);

  // Animação de slot machine nos nomes
  await slotAnimation(available);

  // Escolhe 2 aleatórios
  const shuffled = [...available].sort(() => Math.random() - 0.5);
  let t1 = shuffled[0];
  let t2 = shuffled[1];

  // Handicap: tenta balancear se diferença > 5
  if (cfg.handicap) {
    const diff = Math.abs(getOVR(t1) - getOVR(t2));
    if (diff > 5) {
      const target = getOVR(t1);
      const sorted = available
        .filter(t => t.n !== t1.n)
        .sort((a,b) => Math.abs(getOVR(a)-target) - Math.abs(getOVR(b)-target));
      if (sorted.length > 0) t2 = sorted[0];
    }
  }

  roundTeams = [t1, t2];
  roundCount++;
  renderCard(1, t1, P(0));
  renderCard(2, t2, P(1));
  updateOVRAdv(t1, t2);

  if (roundHistory.length > 0) {
    const hw = document.getElementById('historyWrap');
    if(hw) hw.style.display='block';
    renderRoundHistory();
  }

  if(btn) { btn.disabled=false; btn.innerHTML='<span>⚡ Novo Sorteio</span>'; }
  const rn = document.getElementById('roundNum');
  if(rn) rn.textContent = roundCount;
}

function slotAnimation(pool) {
  const n1 = document.getElementById('name1');
  const n2 = document.getElementById('name2');
  const c1 = document.getElementById('c1');
  const c2 = document.getElementById('c2');

  if(c1) { c1.style.opacity='0.5'; c1.style.transform='scale(0.97)'; }
  if(c2) { c2.style.opacity='0.5'; c2.style.transform='scale(0.97)'; }

  return new Promise(resolve => {
    let ticks = 0;
    const max = 7;
    const iv = setInterval(() => {
      const r1 = pool[Math.floor(Math.random()*pool.length)];
      const r2 = pool[Math.floor(Math.random()*pool.length)];
      if(n1) n1.textContent = r1.n;
      if(n2) n2.textContent = r2.n;
      ticks++;
      if (ticks >= max) {
        clearInterval(iv);
        if(c1) { c1.style.opacity='1'; c1.style.transform='scale(1)'; }
        if(c2) { c2.style.opacity='1'; c2.style.transform='scale(1)'; }
        setTimeout(resolve, 80);
      }
    }, 80);
  });
}

/* ===== RENDER CARD ===== */
function renderCard(num, team, owner) {
  const ovr   = getOVR(team);
  const color = team.c || '#c8102e';
  const card  = document.getElementById(`c${num}`);
  if (!card) return;

  card.style.setProperty('--team-color', color);
  card.style.animation = 'none';
  void card.offsetWidth; // reflow
  card.style.animation = 'cardIn 0.45s cubic-bezier(0.34,1.3,0.64,1) forwards';

  // Owner
  const ownerEl = document.getElementById(`n${num}_owner`);
  if(ownerEl) ownerEl.textContent = owner || `P${num}`;

  // OVR
  const ovrEl = document.getElementById(`o${num}`);
  if (ovrEl) {
    ovrEl.textContent = ovr;
    ovrEl.className = 'ovr-num ' + (ovr >= 85 ? 'ovr-elite' : ovr >= 80 ? 'ovr-gold' : 'ovr-base');
  }

  // Logo
  renderLogoInto(document.getElementById(`logoWrap${num}`), team);

  // Liga + Nome
  const leagueEl = document.getElementById(`league${num}`);
  if (leagueEl) leagueEl.textContent = `${team.f||''} ${team.league}`;
  const nameEl = document.getElementById(`name${num}`);
  if (nameEl) nameEl.textContent = team.n;

  // Estrela
  const starEl = document.getElementById(`star${num}`);
  if (starEl) starEl.textContent = team.s || '—';

  // Stats — anima as barras
  const pct = v => `${Math.round(Math.max(0, Math.min(100, ((v-60)/39)*100)))}%`;
  ['a','m','d'].forEach(s => {
    const fill = document.getElementById(`f${num}${s}`);
    const val  = document.getElementById(`v${num}${s}`);
    if (fill) { fill.style.width = '0%'; setTimeout(()=>{ fill.style.width = pct(team[s]); }, 80); }
    if (val)  val.textContent = team[s];
  });
}

/* ===== OVR ADVANTAGE ===== */
function updateOVRAdv(t1, t2) {
  const o1 = getOVR(t1), o2 = getOVR(t2);
  const diff = o1 - o2;
  const chip = document.getElementById('ovrChip');
  const adv  = document.querySelector('.ovr-adv-text');
  if (!chip) return;

  chip.textContent = `${o1} vs ${o2}`;
  if (Math.abs(diff) <= 2) {
    chip.className = 'ovr-adv-chip chip-equal';
    if(adv) adv.textContent = '⚖ Equilíbrio de forças';
  } else if (diff > 2) {
    chip.className = 'ovr-adv-chip chip-p1';
    if(adv) adv.textContent = `▲ Vantagem ${P(0)} +${diff}`;
  } else {
    chip.className = 'ovr-adv-chip chip-p2';
    if(adv) adv.textContent = `▲ Vantagem ${P(1)} +${Math.abs(diff)}`;
  }
}

/* ===== HISTÓRICO DE RODADAS ===== */
function renderRoundHistory() {
  const list = document.getElementById('historyList');
  if (!list) return;
  list.innerHTML = [...roundHistory].reverse().slice(0,10).map(r => `
    <div class="history-item">
      <span class="hi-round">R${r.round}</span>
      <span class="hi-name">${r.t1}</span>
      <span class="hi-vs">vs</span>
      <span class="hi-name">${r.t2}</span>
    </div>
  `).join('');
}

/* ===== SALVAR PARTIDA ===== */
function finishMatchAndSave() {
  if (!roundTeams[0] || !roundTeams[1]) {
    showToast('Sorteie antes de salvar!', 'warn'); return;
  }

  const t1 = roundTeams[0], t2 = roundTeams[1];
  roundHistory.push({ round: roundCount, t1: t1.n, t2: t2.n });

  if (score.a !== score.b) {
    const winner   = score.a > score.b ? P(0) : P(1);
    const loser    = score.a > score.b ? P(1) : P(0);
    const winTeam  = score.a > score.b ? t1 : t2;
    const loseTeam = score.a > score.b ? t2 : t1;

    // Salva no histórico global
    const hist = JSON.parse(localStorage.getItem(SK.history)||'[]');
    hist.unshift({
      date: new Date().toLocaleDateString('pt-BR'),
      winner, loser,
      winTeam: winTeam.n, loseTeam: loseTeam.n,
      score: `${score.a}×${score.b}`,
      ts: Date.now(),
    });
    localStorage.setItem(SK.history, JSON.stringify(hist.slice(0,200)));

    showVictory(winner, t1, t2, score.a, score.b);
  } else {
    // Empate
    const hist = JSON.parse(localStorage.getItem(SK.history)||'[]');
    hist.unshift({
      date: new Date().toLocaleDateString('pt-BR'),
      winner: 'Empate', loser: '—',
      winTeam: t1.n, loseTeam: t2.n,
      score: `${score.a}×${score.b}`,
      ts: Date.now(),
    });
    localStorage.setItem(SK.history, JSON.stringify(hist.slice(0,200)));

    showToast('🤝 Empate registrado!');
    const hw = document.getElementById('historyWrap');
    if(hw) hw.style.display='block';
    renderRoundHistory();
  }
}

/* ===== VITÓRIA ===== */
function showVictory(winner, t1, t2, s1, s2) {
  const ov = document.getElementById('victoryOverlay');
  document.getElementById('victoryPlayerName').textContent = `🏆 ${winner}`;
  document.getElementById('victoryScore').textContent = `${s1} × ${s2}`;

  const badge1 = makeBadge(t1.n, t1.c);
  const badge2 = makeBadge(t2.n, t2.c);
  const v1 = document.getElementById('victoryTeam1');
  const v2 = document.getElementById('victoryTeam2');
  v1.src = getLogoUrl(t1) || badge1;
  v1.onerror = () => { v1.src = badge1; };
  v2.src = getLogoUrl(t2) || badge2;
  v2.onerror = () => { v2.src = badge2; };
  document.getElementById('victoryTeamName1').textContent = t1.n;
  document.getElementById('victoryTeamName2').textContent = t2.n;

  ov.style.display = 'flex';
  ov.style.animation = 'fadeIn 0.4s ease';
  launchConfetti();
  if (navigator.vibrate) navigator.vibrate([60,80,60,80,120]);
}

function dismissVictory() {
  document.getElementById('victoryOverlay').style.display = 'none';
  const canvas = document.getElementById('confettiCanvas');
  if (canvas) canvas.getContext('2d').clearRect(0,0,canvas.width,canvas.height);
  score = { a:0, b:0 };
  document.getElementById('scoreNum1').textContent = 0;
  document.getElementById('scoreNum2').textContent = 0;
  const hw = document.getElementById('historyWrap');
  if(hw) hw.style.display='block';
  renderRoundHistory();
}

function shareToWhatsApp() {
  const t1 = roundTeams[0]?.n || '?';
  const t2 = roundTeams[1]?.n || '?';
  const msg = `⚽ *FC 26 Arena* — Resultado\n\n*${P(0)}* (${t1})  ${score.a} × ${score.b}  (${t2}) *${P(1)}*\n\n🏟 Rodada ${roundCount} · FC 26 Arena`;
  window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
}

/* ===== CONFETTI ===== */
function launchConfetti() {
  const canvas = document.getElementById('confettiCanvas');
  if (!canvas) return;
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  const ctx = canvas.getContext('2d');
  const COLORS = ['#c8102e','#ffd700','#00b4d8','#fff','#ff6b6b','#4ecdc4','#f39c12'];
  const pieces = Array.from({length:130}, () => ({
    x: Math.random()*canvas.width, y: -10,
    w: Math.random()*10+5, h: Math.random()*6+3,
    color: COLORS[Math.floor(Math.random()*COLORS.length)],
    vx: (Math.random()-0.5)*4, vy: Math.random()*4+2,
    rot: Math.random()*360, rv: (Math.random()-0.5)*6,
    alpha: 1,
  }));

  let raf;
  function draw() {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    let alive = false;
    for (const p of pieces) {
      p.x += p.vx; p.y += p.vy; p.rot += p.rv;
      if (p.y > canvas.height*0.65) p.alpha = Math.max(0, p.alpha-0.018);
      if (p.alpha > 0) alive = true;
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot*Math.PI/180);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w/2,-p.h/2,p.w,p.h);
      ctx.restore();
    }
    if (alive) raf = requestAnimationFrame(draw);
    else ctx.clearRect(0,0,canvas.width,canvas.height);
  }
  draw();
}

/* ===== BANS ===== */
function openBanMenu() {
  if (pool.length < 2) { showToast('Pool insuficiente.', 'warn'); return; }
  const saved = JSON.parse(localStorage.getItem(SK.bans)||'[]');
  bannedTeams = new Set(saved);
  renderBanGrid();
  document.getElementById('banModal').classList.add('open');
}

function renderBanGrid() {
  const grid = document.getElementById('banTeamsGrid');
  if (!grid) return;
  grid.innerHTML = pool.map(t => {
    const banned = bannedTeams.has(t.n);
    const badge  = makeBadge(t.n, t.c);
    const logo   = getLogoUrl(t) || badge;
    const safeN  = t.n.replace(/'/g,"\\'").replace(/"/g,'&quot;');
    return `
      <div class="ban-item ${banned?'banned':''}" onclick="toggleBan('${safeN}')">
        <img src="${logo}" alt="${t.n}" onerror="this.src='${badge}'"
             style="width:36px;height:36px;object-fit:contain;">
        <div class="ban-name">${t.n.split(/\s+/)[0]}</div>
        ${banned ? '<div class="ban-x">✕</div>' : ''}
      </div>`;
  }).join('');
  const badge = document.getElementById('banCountBadge');
  if(badge) badge.textContent = bannedTeams.size;
}

function toggleBan(name) {
  if (bannedTeams.has(name)) bannedTeams.delete(name);
  else bannedTeams.add(name);
  localStorage.setItem(SK.bans, JSON.stringify([...bannedTeams]));
  renderBanGrid();
}

function closeBanMenu() {
  document.getElementById('banModal').classList.remove('open');
}

function applyBansAndStart() {
  closeBanMenu();
  _startSession();
}

/* ===== TORNEIO ===== */
let tourn = { teams:[], bracket:[], idx:0, done:false };

function openTournamentMenu() { switchTab('torneio'); }

function generateTournament() {
  const size  = parseInt(document.getElementById('tourneySize').value);
  const level = document.getElementById('tourneyLevel').value;

  let eligible = [...pool];
  if (level !== 'all') {
    const min = parseInt(level);
    eligible = eligible.filter(t => getOVR(t) >= min);
  }

  if (eligible.length < size) {
    showToast(`Precisa de ${size} times elegíveis. Ajuste os filtros.`, 'warn'); return;
  }

  const picked = [...eligible].sort(()=>Math.random()-0.5).slice(0, size);
  tourn = { teams: picked, bracket: [], idx: 0, done: false };

  for (let i = 0; i < picked.length; i += 2) {
    tourn.bracket.push({ t1: picked[i], t2: picked[i+1], winner: null, round: 1 });
  }

  renderBracket();
  document.getElementById('bracketWrap').style.display = 'block';
  document.getElementById('tournSetupControls').style.display = 'none';
  document.getElementById('btnNextMatch').style.display = 'block';
}

function renderBracket() {
  const c = document.getElementById('bracketContainer');
  if (!c) return;
  c.innerHTML = tourn.bracket.map((m, i) => {
    const isDone   = !!m.winner;
    const isCur    = i === tourn.idx && !isDone;
    const b1 = m.t1 ? (getLogoUrl(m.t1)||makeBadge(m.t1.n,m.t1.c)) : '';
    const b2 = m.t2 ? (getLogoUrl(m.t2)||makeBadge(m.t2.n,m.t2.c)) : '';
    const badge1 = m.t1 ? makeBadge(m.t1.n,m.t1.c) : '';
    const badge2 = m.t2 ? makeBadge(m.t2.n,m.t2.c) : '';
    return `
      <div class="bracket-match ${isDone?'done':''} ${isCur?'active':''}">
        <div class="bracket-team ${m.winner===m.t1?.n?'winner':''}">
          ${m.t1 ? `<img src="${b1}" onerror="this.src='${badge1}'" style="width:24px;height:24px;object-fit:contain;">` : ''}
          <span>${m.t1?.n || 'TBD'}</span>
          <span class="bracket-ovr">${m.t1 ? getOVR(m.t1) : '—'}</span>
        </div>
        <div class="bracket-vs">VS</div>
        <div class="bracket-team ${m.winner===m.t2?.n?'winner':''}">
          ${m.t2 ? `<img src="${b2}" onerror="this.src='${badge2}'" style="width:24px;height:24px;object-fit:contain;">` : ''}
          <span>${m.t2?.n || 'TBD'}</span>
          <span class="bracket-ovr">${m.t2 ? getOVR(m.t2) : '—'}</span>
        </div>
        ${isDone ? `<div style="text-align:center;font-size:0.6rem;color:var(--gold);font-family:var(--font-head);letter-spacing:1px;margin-top:6px;">🏆 ${m.winner}</div>` : ''}
      </div>`;
  }).join('');
}

function playNextMatch() {
  const m = tourn.bracket[tourn.idx];
  if (!m) { showToast('Nenhuma partida disponível.', 'warn'); return; }
  if (m.winner) { showToast('Selecione a próxima partida.', 'warn'); return; }

  roundTeams = [m.t1, m.t2];
  score = { a:0, b:0 };
  const s1=document.getElementById('scoreNum1'); if(s1) s1.textContent=0;
  const s2=document.getElementById('scoreNum2'); if(s2) s2.textContent=0;
  renderCard(1, m.t1, P(0));
  renderCard(2, m.t2, P(1));
  updateOVRAdv(m.t1, m.t2);
  switchTab('arena');

  // Botão de salvar vai registrar o vencedor no bracket
  sessionActive = true;
}

function recordTournamentResult(winner) {
  const m = tourn.bracket[tourn.idx];
  if (!m) return;
  m.winner = winner.n;
  tourn.idx++;

  // Verifica se tem próxima
  if (tourn.idx >= tourn.bracket.length) {
    showToast('🏆 Torneio concluído!');
    const btn = document.getElementById('btnNextMatch');
    if(btn) btn.style.display = 'none';
  }
  renderBracket();
}

function backToLobbyFromTournament() {
  tourn = { teams:[], bracket:[], idx:0, done:false };
  const bw = document.getElementById('bracketWrap');
  const sc = document.getElementById('tournSetupControls');
  if(bw) bw.style.display = 'none';
  if(sc) sc.style.display = 'block';
  switchTab('home');
}

/* ===== STATS / HISTÓRICO GLOBAL ===== */
function openStatsMenu() {
  const hist = JSON.parse(localStorage.getItem(SK.history)||'[]');

  // Calcula stats por jogador
  const map = {};
  for (const m of hist) {
    if (m.winner && m.winner !== 'Empate') {
      if (!map[m.winner]) map[m.winner] = { w:0, l:0, d:0 };
      if (!map[m.loser])  map[m.loser]  = { w:0, l:0, d:0 };
      map[m.winner].w++;
      map[m.loser].l++;
    }
  }

  const summary = document.getElementById('globalStatsSummary');
  if (summary) {
    const entries = Object.entries(map);
    if (entries.length === 0) {
      summary.innerHTML = '<div style="color:var(--muted);font-size:0.72rem;text-align:center;padding:12px;">Nenhuma partida salva ainda.</div>';
    } else {
      summary.innerHTML = entries.map(([p, s]) => {
        const tot = s.w + s.l;
        const pct = tot > 0 ? Math.round(s.w/tot*100) : 0;
        return `
          <div class="summary-card">
            <div class="summary-label">${p}</div>
            <div class="summary-val">${s.w}V · ${s.l}D</div>
            <div style="font-size:0.6rem;color:${pct>=50?'var(--gold)':'var(--muted)'};">${pct}% aproveit.</div>
          </div>`;
      }).join('');
    }
  }

  const list = document.getElementById('globalHistoryList');
  if (list) {
    if (hist.length === 0) {
      list.innerHTML = '<div style="color:var(--muted);padding:20px;text-align:center;font-size:0.72rem;letter-spacing:1px;">Nenhum confronto salvo</div>';
    } else {
      list.innerHTML = hist.slice(0,30).map(m => `
        <div class="history-item">
          <span class="hi-winner" style="${m.winner==='Empate'?'color:var(--text2)':''}">
            ${m.winner==='Empate'?'🤝':m.winner==='Empate'?'🤝':'🏆'} ${m.winner}
          </span>
          <span class="hi-score">${m.score}</span>
          <span style="font-size:0.62rem;color:var(--muted);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${m.winTeam} vs ${m.loseTeam}</span>
        </div>`).join('');
    }
  }

  document.getElementById('statsModal').classList.add('open');
}

function closeStatsMenu() {
  document.getElementById('statsModal').classList.remove('open');
}

function clearStats() {
  if (!confirm('Limpar todo o histórico de partidas?')) return;
  localStorage.removeItem(SK.history);
  closeStatsMenu();
  showToast('🗑 Histórico limpo!');
}

/* ===== FILTROS / CONFIG ===== */
function applyLeagueFilter() {
  cfg.leagueFilter = document.getElementById('leagueFilter').value;
  saveSettings(); rebuildPool();
}

function toggleLeagueMode() {
  cfg.leagueMode = document.getElementById('leagueModeToggle').checked;
  saveSettings(); rebuildPool();
}

function saveSettings() {
  localStorage.setItem(SK.settings, JSON.stringify(cfg));
}

function updateConfigStats() {
  const leagues = new Set(pool.map(t => t.league));
  const te = document.getElementById('summaryTotal');
  const le = document.getElementById('summaryLeagues');
  if(te) te.textContent = pool.length;
  if(le) le.textContent = leagues.size;
}

/* ===== TABS ===== */
function switchTab(tab) {
  ['home','arena','torneio','config'].forEach(t => {
    const el  = document.getElementById(`tab-${t}`);
    const btn = document.querySelector(`.tab-item[data-tab="${t}"]`);
    if(el)  el.style.display = t===tab ? 'block' : 'none';
    if(btn) btn.classList.toggle('active', t===tab);
  });
  // Scroll to top
  window.scrollTo(0,0);
}

/* ===== TOAST ===== */
let _toastTimer;
function showToast(msg, type='ok') {
  const t = document.getElementById('toast');
  if(!t) return;
  t.textContent = msg;
  t.className = `toast show${type==='warn'?' warn':''}`;
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => { t.className='toast'; }, 2800);
}

/* ===== PWA ===== */
let _pwaPrompt;
function setupPWA() {
  if (localStorage.getItem(SK.pwa)) return;

  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    _pwaPrompt = e;
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.navigator.standalone;
    if (isIOS) {
      const b = document.getElementById('iosBanner');
      if(b) b.style.display='block';
    } else {
      const b = document.getElementById('pwaBanner');
      if(b) b.style.display='block';
    }
  });
}

function doPWAInstall() {
  if (_pwaPrompt) {
    _pwaPrompt.prompt();
    _pwaPrompt.userChoice.then(r => {
      if (r.outcome==='accepted') dismissPWA();
      _pwaPrompt = null;
    });
  }
}

function dismissPWA() {
  localStorage.setItem(SK.pwa, '1');
  const pb = document.getElementById('pwaBanner');
  const ib = document.getElementById('iosBanner');
  if(pb) pb.style.display='none';
  if(ib) ib.style.display='none';
}

/* ===== BOOT ===== */
init();
