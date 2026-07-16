// js/app.js — FC 26 Arena · Competitive Engine
// Motor principal: sorteio, placar, torneio, estatísticas

/* ===== MOTOR DE SOM (SFX) ===== */
const SFX = (() => {
  let _ac = null;

  function ctx() {
    if (_ac) return _ac;
    try { _ac = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) { return null; }
    return _ac;
  }

  function fire(buf, when, rate, pan) {
    const a = ctx(); if (!a || !buf) return;
    try {
      const s = a.createBufferSource();
      s.buffer = buf;
      if (rate != null) s.playbackRate.value = rate;
      let node = s;
      if (pan != null && a.createStereoPanner) {
        const p = a.createStereoPanner();
        p.pan.value = Math.max(-1, Math.min(1, pan));
        s.connect(p);
        node = p;
      }
      node.connect(a.destination);
      s.start(when);
    } catch(e) {}
  }

  // TICK: UI digital blip — sub thump sintético + ping eletrônico + glitch shimmer HP
  function buildTick() {
    const a = ctx(); if (!a) return null;
    const sr    = a.sampleRate;
    const len   = Math.floor(sr * 0.055);    // 55ms — UI blip compacto
    const buf   = a.createBuffer(1, len, sr);
    const d     = buf.getChannelData(0);
    const atkN  = Math.floor(sr * 0.0005);   // 0.5ms — ataque ultra-crisp
    const shimN = Math.floor(sr * 0.018);    // 18ms janela de shimmer

    let shimPrev = 0;
    for (let i = 0; i < len; i++) {
      const t   = i / sr;
      const atk = i < atkN ? i / atkN : 1;
      // Sub thump sintético (72Hz)
      const sub  = Math.sin(2 * Math.PI * 72   * t) * 0.42 * Math.exp(-55  * t);
      // Digital ping — dois parciais high-freq que definem o caráter "eSports UI"
      const ping = Math.sin(2 * Math.PI * 2400 * t) * 0.28 * Math.exp(-130 * t)
                 + Math.sin(2 * Math.PI * 4100 * t) * 0.16 * Math.exp(-210 * t);
      // Glitch shimmer: ruído passado por filtro one-pole high-pass (y = x - x_prev)
      let shim = 0;
      if (i < shimN) {
        const raw = Math.random() * 2 - 1;
        shim = (raw - shimPrev) * Math.exp(-i / (shimN * 0.30)) * 0.14;
        shimPrev = raw;
      }
      d[i] = Math.tanh((sub + ping + shim) * 1.10 * atk) * 0.82;
    }
    return buf;
  }

  // CHIME: sino sintético breve (senoide + parciais harmônicos, decaimento suave)
  // usado só no reveal do time favorito — textura "premium", não é melodia.
  function buildChime(freq, dur) {
    const a = ctx(); if (!a) return null;
    const sr  = a.sampleRate;
    const len = Math.floor(sr * dur);
    const buf = a.createBuffer(1, len, sr);
    const d   = buf.getChannelData(0);
    const atkN = Math.floor(sr * 0.004);
    for (let i = 0; i < len; i++) {
      const t   = i / sr;
      const atk = i < atkN ? i / atkN : 1;
      const env = Math.exp(-3.2 * t);
      const tone = Math.sin(2*Math.PI*freq*t)        * 0.55
                 + Math.sin(2*Math.PI*freq*2.0*t)     * 0.18
                 + Math.sin(2*Math.PI*freq*3.01*t)    * 0.09;
      d[i] = Math.tanh(tone * env * atk * 1.1) * 0.5;
    }
    return buf;
  }

  // IMPACT: sub-bass hit cinematico (45Hz) + glitch shimmer eletrônico — estilo EA FC menu
  function buildImpact(weight, echo) {
    const a = ctx(); if (!a) return null;
    const sr     = a.sampleRate;
    const dry    = Math.floor(sr * 0.50);
    const tot    = Math.floor(sr * (echo > 0 ? 0.90 : 0.50));
    const buf    = a.createBuffer(1, tot, sr);
    const d      = buf.getChannelData(0);
    const atkN   = Math.floor(sr * 0.002);   // 2ms attack — punch cinematico
    const shimN  = Math.floor(sr * 0.070);   // 70ms janela de shimmer
    const shimSt = Math.floor(sr * 0.003);   // shimmer entra 3ms após o hit

    let shimPrev = 0;
    for (let i = 0; i < dry; i++) {
      const t   = i / sr;
      const atk = i < atkN ? i / atkN : 1;
      // Sub-bass hit: três camadas sintéticas — sub profundo + corpo + presença
      const sub  = Math.sin(2 * Math.PI * 45  * t) * 0.65 * Math.exp(-(5.0 / weight) * t);
      const sub2 = Math.sin(2 * Math.PI * 95  * t) * 0.30 * Math.exp(-(8.5 / weight) * t);
      const body = Math.sin(2 * Math.PI * 155 * t) * 0.18 * Math.exp(-(13  / weight) * t);
      // Glitch shimmer: high-pass noise com envelope — cauda digital crispo
      const si = i - shimSt;
      let shim = 0;
      if (si >= 0 && si < shimN) {
        const raw = Math.random() * 2 - 1;
        shim = (raw - shimPrev) * Math.exp(-si / (shimN * 0.35)) * 0.30 * weight;
        shimPrev = raw;
      }
      d[i] = Math.tanh(((sub + sub2 + body) * weight * atk + shim) * 0.95) * 0.72;
    }
    // Eco duplo — reverb sintético contido (não orgânico)
    if (echo > 0) {
      const e1 = Math.floor(sr * 0.105);
      const e2 = Math.floor(sr * 0.215);
      for (let i = 0; i < dry; i++) {
        if (i + e1 < tot) d[i + e1] += d[i] * echo * 0.22;
        if (i + e2 < tot) d[i + e2] += d[i] * echo * 0.08;
      }
    }
    return buf;
  }

  return {
    unlock() {
      const a = ctx(); if (!a) return;
      if (a.state === 'suspended') a.resume().catch(() => {});
      try {
        const b = a.createBuffer(1, a.sampleRate >> 2, a.sampleRate);
        const s = a.createBufferSource();
        s.buffer = b; s.connect(a.destination); s.start(a.currentTime);
      } catch(e) {}
    },

    // progress 0→1: blip brilhante → thud escuro (~1.3 oitavas de descida)
    tick(progress = 0) {
      const a = ctx(); if (!a) return;
      if (a.state === 'suspended') a.resume().catch(() => {});
      // rate 1.80→0.72 — pitch desce exponencialmente como slot desacelerando
      const rate = 1.80 * Math.pow(0.40, progress);
      fire(buildTick(), a.currentTime + 0.01, rate);
    },

    // Slam único pesado: engrenagem trancando com eco industrial — largura estéreo
    reveal() {
      const a = ctx(); if (!a) return;
      if (a.state === 'suspended') a.resume().catch(() => {});
      const buf = buildImpact(1.0, 1.0);
      const t0  = a.currentTime + 0.04;
      fire(buf, t0,        null, 0);
      fire(buf, t0 + 0.008, 1.0, -0.45);
      fire(buf, t0 + 0.008, 1.0,  0.45);
    },

    // Confirmação de gol: dois impactos rápidos (peso → impacto final)
    goal() {
      const a = ctx(); if (!a) return;
      if (a.state === 'suspended') a.resume().catch(() => {});
      fire(buildImpact(0.65, 0),   a.currentTime + 0.04);
      fire(buildImpact(1.05, 0.7), a.currentTime + 0.04 + 0.16);
    },

    // Vitória: 3 impactos crescentes + slam final — sem melodia, só peso
    victory() {
      const a = ctx(); if (!a) return;
      if (a.state === 'suspended') a.resume().catch(() => {});
      const finalBuf = buildImpact(1.35, 1.0);
      const t0 = a.currentTime;
      fire(buildImpact(0.50, 0), t0 + 0.04);
      fire(buildImpact(0.72, 0), t0 + 0.04 + 0.20);
      fire(buildImpact(0.94, 0), t0 + 0.04 + 0.40);
      fire(finalBuf, t0 + 0.04 + 0.66, null, 0);
      fire(finalBuf, t0 + 0.04 + 0.668, 1.0, -0.5);
      fire(finalBuf, t0 + 0.04 + 0.668, 1.0,  0.5);
    },

    // UCL: dois hits majestosos — buildup leve + slam épico, largura estéreo
    revealUCL() {
      const a = ctx(); if (!a) return;
      if (a.state === 'suspended') a.resume().catch(() => {});
      const bigBuf = buildImpact(1.3, 1.0);
      const t0 = a.currentTime;
      fire(buildImpact(0.55, 0.2), t0 + 0.02);
      fire(bigBuf, t0 + 0.20,        null, 0);
      fire(bigBuf, t0 + 0.20 + 0.008, 1.0, -0.5);
      fire(bigBuf, t0 + 0.20 + 0.008, 1.0,  0.5);
    },

    // Clique seco de "trava" — usado quando um card lock-a antes do outro no suspense
    lock(pan) {
      const a = ctx(); if (!a) return;
      if (a.state === 'suspended') a.resume().catch(() => {});
      fire(buildTick(), a.currentTime + 0.005, 0.62, pan);
    },

    // Time favorito saiu no sorteio: arpejo ascendente (tríade) varrendo estéreo + slam dourado
    favReveal() {
      const a = ctx(); if (!a) return;
      if (a.state === 'suspended') a.resume().catch(() => {});
      const t0 = a.currentTime;
      fire(buildChime(880,  0.5), t0 + 0.02, null, -0.5);
      fire(buildChime(1108, 0.5), t0 + 0.10, null,  0);
      fire(buildChime(1318, 0.6), t0 + 0.18, null,  0.5);
      fire(buildImpact(1.15, 0.9), t0 + 0.05);
    },
  };
})();

document.addEventListener('touchstart', () => SFX.unlock(), { passive: true });
document.addEventListener('click',      () => SFX.unlock(), { passive: true });

/* ===== RNG JUSTO (sorteio) =====
 * crypto.getRandomValues em vez de Math.random(): gerador criptográfico do
 * próprio navegador, não determinístico/seedável — ninguém (nem o app) tem
 * como prever ou forçar o próximo resultado. Usado só onde o RESULTADO do
 * sorteio é decidido (escolha de times, embaralhamento de chaveamento).
 * Efeitos cosméticos (som, confete, ticks do suspense) seguem com
 * Math.random(), pois não influenciam o time sorteado. */
function fairRandom() {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] / 4294967296; // [0, 1)
}

function fairInt(maxExclusive) {
  return Math.floor(fairRandom() * maxExclusive);
}

function fairPick(arr) {
  return arr[fairInt(arr.length)];
}

// Fisher-Yates — shuffle real e uniforme (diferente de array.sort(() => Math.random()-0.5), que é viesado)
function fairShuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = fairInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ===== UCL 2026-27 — 32 times participantes ===== */
const UCL_26_27 = new Set([
  // Bundesliga (4)
  'Bayern München','Bayer Leverkusen','Borussia Dortmund','RB Leipzig',
  // La Liga (4)
  'Real Madrid','Barcelona','Atlético Madrid','Villarreal CF',
  // Premier League (5)
  'Liverpool','Arsenal','Man City','Chelsea','Aston Villa',
  // Ligue 1 (3)
  'PSG','AS Monaco','Marseille',
  // Serie A (5)
  'Inter Milan','Napoli','Juventus','Milan','Atalanta',
  // Eredivisie (2)
  'PSV Eindhoven','Feyenoord',
  // Liga Portugal (3)
  'Sporting CP','Benfica','Porto',
  // Süper Lig / playoff (2)
  'Galatasaray','Fenerbahçe',
  // Classificados via playoff / 5ª vaga
  'Ajax','Bologna','Newcastle','Stuttgart',
]);

/* ===== MAPA DE LIGAS (ID → imagem em assets/leagues/<id>.png) ===== */
const LEAGUE_IDS = {
  'Premier League':              11,
  'La Liga':                     67,
  'LaLiga':                      67,
  'Serie A':                     32,
  'Bundesliga':                  22,
  'Ligue 1':                     16,
  'Eredivisie':                  29,
  'Liga Portugal':               60,
  'MLS':                         40,
  'Argentina':                   102421,
  'Liga Profesional':            102421,
  'Süper Lig':                   130286,
  'Saudi Pro League':            7920263,
  'RSL':                         7920263,
  'UEFA Champions League':       1301394,
  'Champions League':            1301394,
};

function getLeagueLogoUrl(leagueName) {
  const id = LEAGUE_IDS[leagueName];
  return id ? `./assets/leagues/${id}.png` : null;
}

const LEAGUE_LIST = [
  { value: 'all',              label: 'Todos os Times',  emoji: '🌍',  id: null },
  { value: 'Premier League',   label: 'Premier League',  emoji: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', id: 11 },
  { value: 'La Liga',          label: 'La Liga',         emoji: '🇪🇸', id: 67 },
  { value: 'Serie A',          label: 'Serie A',         emoji: '🇮🇹', id: 32 },
  { value: 'Bundesliga',       label: 'Bundesliga',      emoji: '🇩🇪', id: 22 },
  { value: 'Ligue 1',          label: 'Ligue 1',         emoji: '🇫🇷', id: 16 },
  { value: 'Eredivisie',       label: 'Eredivisie',      emoji: '🇳🇱', id: 29 },
  { value: 'Liga Portugal',    label: 'Liga Portugal',   emoji: '🇵🇹', id: 60 },
  { value: 'Saudi Pro League', label: 'Saudi Pro',       emoji: '🇸🇦', id: 7920263 },
  { value: 'MLS',              label: 'MLS',             emoji: '🇺🇸', id: 40 },
  { value: 'Argentina',        label: 'Argentina',       emoji: '🇦🇷', id: 102421 },
  { value: 'Süper Lig',        label: 'Süper Lig',       emoji: '🇹🇷', id: 130286 },
  { value: 'UEFA Champions League', label: 'Champions',  emoji: '🏆',  id: 1301394 },
];

function renderLeagueFilter() {
  const grid = document.getElementById('leagueFilterGrid');
  if (!grid) return;
  grid.innerHTML = '';
  LEAGUE_LIST.forEach(league => {
    const chip = document.createElement('button');
    chip.type = 'button';
    const isAll = league.value === 'all';
    const isActive = cfg.leagueFilter === league.value;
    chip.className = 'league-chip' + (isAll ? ' league-chip-all' : '') + (isActive ? ' active' : '');
    chip.onclick = () => selectLeague(league.value);

    if (league.id) {
      const img = document.createElement('img');
      img.src = `./assets/leagues/${league.id}.png`;
      img.alt = league.label;
      const fallback = document.createElement('span');
      fallback.className = 'league-chip-emoji';
      fallback.textContent = league.emoji;
      fallback.style.display = 'none';
      img.onerror = function() { this.style.display = 'none'; fallback.style.display = ''; };
      chip.appendChild(img);
      chip.appendChild(fallback);
    } else {
      const em = document.createElement('span');
      em.className = 'league-chip-emoji';
      em.textContent = league.emoji;
      chip.appendChild(em);
    }

    const lbl = document.createElement('span');
    lbl.className = 'league-chip-label';
    lbl.textContent = league.label;
    chip.appendChild(lbl);

    grid.appendChild(chip);
  });
}

function selectLeague(value) {
  cfg.leagueFilter = value;
  saveSettings();
  rebuildPool();
  renderLeagueFilter();
}

/* ===== ESTADO GLOBAL ===== */
let teams         = [];        // banco completo
let pool          = [];        // pool de sorteio (filtrado + ativos)
let bannedTeams   = new Set(); // times banidos (por nome)
let recentQueue   = [];        // últimos 8 times usados (4 pares) — evita repetição
let roundTeams    = [null, null];
let score         = { a: 0, b: 0 };
let roundHistory  = [];
let roundCount    = 0;
let sessionActive = false;
let uclMode         = false;   // modo UCL ativo
let uclSelectedTeams = [];     // times escolhidos no modal UCL
let champMode       = false;   // modo Champions 26-27 (bracket) ativo

const SK = {
  teams:    'fc26_teams_v2',
  history:  'fc26_global_history',
  players:  'fc26_players',
  settings: 'fc26_settings',
  bans:     'fc26_bans',
  pwa:      'fc26_pwa_dismissed',
};

let cfg = {
  leagueFilter:  'all',
  leagueMode:    false,
  elite80:       false,
  handicap:      false,
  theme:         'roxo',
  font:          'classic',
  favoriteTeam:  null,
};

/* ===== TEMAS & FONTES ===== */
const THEMES = [
  { id: 'roxo',      label: 'Roxo',      bg: '#08060f', accent: '#8b5cf6' },
  { id: 'neon',      label: 'Neon',      bg: '#05060d', accent: '#00e5ff' },
  { id: 'esmeralda', label: 'Esmeralda', bg: '#040d08', accent: '#12b76a' },
  { id: 'carmesim',  label: 'Carmesim',  bg: '#0a0505', accent: '#e11d2e' },
  { id: 'royal',     label: 'Royal',     bg: '#050810', accent: '#3b6bff' },
  { id: 'champions', label: 'Champions', bg: '#07070a', accent: '#d4af37' },
  { id: 'sunset',    label: 'Sunset',    bg: '#0d0710', accent: '#ff5f6d' },
  { id: 'gelo',      label: 'Gelo',      bg: '#eef1f8', accent: '#3b5bfd' },
];

const FONT_PACKS = [
  { id: 'classic', label: 'Esports Clássico', sample: 'Aa', family: "'Barlow Condensed', sans-serif" },
  { id: 'impacto', label: 'Impacto Total',    sample: 'Aa', family: "'Anton', sans-serif" },
  { id: 'cyber',   label: 'Cyber Neon',       sample: 'Aa', family: "'Orbitron', sans-serif" },
  { id: 'retro',   label: 'Estádio Retrô',    sample: 'Aa', family: "'Bebas Neue', sans-serif" },
];

function applyThemeAndFont() {
  document.documentElement.setAttribute('data-theme', cfg.theme || 'roxo');
  document.documentElement.setAttribute('data-font',  cfg.font  || 'classic');
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) {
    const t = THEMES.find(x => x.id === cfg.theme);
    if (t) metaTheme.setAttribute('content', t.bg);
  }
}

function renderThemeGrid() {
  const grid = document.getElementById('themeSwatchGrid');
  if (!grid) return;
  grid.innerHTML = THEMES.map(t => `
    <button type="button" class="theme-swatch${cfg.theme === t.id ? ' active' : ''}" onclick="selectTheme('${t.id}')">
      <span class="theme-swatch-dot" style="background:linear-gradient(135deg, ${t.accent}, ${t.bg});"></span>
      <span class="theme-swatch-label">${t.label}</span>
    </button>
  `).join('');
}

function selectTheme(id) {
  cfg.theme = id;
  saveSettings();
  applyThemeAndFont();
  renderThemeGrid();
}

function renderFontpackGrid() {
  const grid = document.getElementById('fontpackGrid');
  if (!grid) return;
  grid.innerHTML = FONT_PACKS.map(f => `
    <button type="button" class="fontpack-btn${cfg.font === f.id ? ' active' : ''}" onclick="selectFontPack('${f.id}')">
      <span class="fontpack-preview" style="font-family:${f.family};">${f.sample}</span>
      <span class="fontpack-name">${f.label}</span>
      <span class="fontpack-check">✓</span>
    </button>
  `).join('');
}

function selectFontPack(id) {
  cfg.font = id;
  saveSettings();
  applyThemeAndFont();
  renderFontpackGrid();
}

/* ===== TIME FAVORITO ===== */
function updateFavTeamButton() {
  const btn      = document.getElementById('favTeamBtn');
  const nameEl   = document.getElementById('favTeamBtnName');
  const badgeWrap= document.getElementById('favTeamBtnBadgeWrap');
  if (!btn || !nameEl || !badgeWrap) return;
  const team = teams.find(t => t.n === cfg.favoriteTeam);
  if (team) {
    btn.classList.add('has-team');
    nameEl.textContent = team.n;
    const badge = makeBadge(team.n, team.c);
    const url = getLogoUrl(team) || badge;
    badgeWrap.innerHTML = `<img class="favteam-btn-badge" src="${url}" alt="${team.n}" onerror="this.src='${badge}'">`;
  } else {
    btn.classList.remove('has-team');
    nameEl.textContent = 'Escolher time';
    badgeWrap.innerHTML = `<span class="favteam-btn-icon">⚽</span>`;
  }
}

function openFavoriteTeamModal() {
  const search = document.getElementById('favTeamSearch');
  if (search) search.value = '';
  renderFavTeamGrid();
  document.getElementById('favTeamModal').classList.add('open');
}

function closeFavoriteTeamModal() {
  document.getElementById('favTeamModal').classList.remove('open');
}

function renderFavTeamGrid() {
  const grid = document.getElementById('favTeamGrid');
  if (!grid) return;
  const q = (document.getElementById('favTeamSearch')?.value || '').trim().toLowerCase();
  const active = teams.filter(t => t.active !== false);
  const list = q ? active.filter(t => t.n.toLowerCase().includes(q)) : active;
  grid.innerHTML = list.slice(0, 400).map(t => {
    const sel   = cfg.favoriteTeam === t.n;
    const badge = makeBadge(t.n, t.c);
    const logo  = getLogoUrl(t) || badge;
    const safeN = t.n.replace(/'/g, "\\'").replace(/"/g, '&quot;');
    return `
      <div class="champions-team${sel ? ' selected' : ''}" onclick="setFavoriteTeam('${safeN}')">
        <img src="${logo}" alt="${t.n}" onerror="this.src='${badge}'"
             style="width:36px;height:36px;object-fit:contain;">
        <div class="champions-team-name">${t.n.split(/\s+/)[0]}</div>
      </div>`;
  }).join('');
}

function setFavoriteTeam(name) {
  cfg.favoriteTeam = name || null;
  saveSettings();
  updateFavTeamButton();
  renderFavTeamGrid();
  if (!name) showToast('☆ Time favorito removido');
}

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

function preloadTeamLogos() {
  teams.forEach(t => {
    const url = getLogoUrl(t);
    if (!url) return;
    const img = new Image();
    img.src = url;
  });
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

    // Pré-carrega os escudos em segundo plano — evita o "pop" tardio do
    // logo depois do suspense do sorteio (fica no cache do browser).
    preloadTeamLogos();

    // Restaura nomes dos jogadores
    try {
      const names = JSON.parse(localStorage.getItem(SK.players) || '["",""]');
      document.getElementById('p1Input').value = names[0] || '';
      document.getElementById('p2Input').value = names[1] || '';
    } catch(e) {}

    // Aplica settings na UI
    try {
      applyThemeAndFont();
      renderThemeGrid();
      renderFontpackGrid();
      updateFavTeamButton();
      renderLeagueFilter();
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
  if (uclMode) {
    pool = uclSelectedTeams.filter(t => t.active !== false);
    updateConfigStats();
    return;
  }
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

/* ===== VALIDAÇÃO OBRIGATÓRIA DE NOMES ANTES DE SORTEAR ===== */
function requirePlayerNames() {
  const p1 = document.getElementById('p1Input');
  const p2 = document.getElementById('p2Input');
  const v1 = ((p1 && p1.value) || '').trim();
  const v2 = ((p2 && p2.value) || '').trim();
  if (v1 && v2) return true;

  switchTab('home');
  showToast('⚠ Preencha os dois nomes antes de sortear!', 'warn');

  [[p1, v1], [p2, v2]].forEach(([el, v]) => {
    if (!el || v) return;
    const slot = el.closest('.player-slot');
    if (slot) {
      slot.classList.remove('slot-error');
      void slot.offsetWidth; // reflow — permite reanimar o shake em tentativas seguidas
      slot.classList.add('slot-error');
    }
  });
  (v1 ? p2 : p1)?.focus();
  return false;
}

function updateScoreNames() {
  const p1 = P(0), p2 = P(1);
  ['scoreName1','ah_p1'].forEach(id => { const el=document.getElementById(id); if(el) el.textContent=p1; });
  ['scoreName2','ah_p2'].forEach(id => { const el=document.getElementById(id); if(el) el.textContent=p2; });
}

/* ===== PLACAR ===== */
function addGoal(side) {
  SFX.unlock(); // garante contexto ativo no gesto
  score[side]++;
  document.getElementById('scoreNum1').textContent = score.a;
  document.getElementById('scoreNum2').textContent = score.b;
  SFX.goal();
  if (navigator.vibrate) navigator.vibrate(18);
  const flash = document.getElementById('flashOverlay');
  if (flash) {
    flash.style.opacity = '0.12';
    setTimeout(() => flash.style.opacity = '0', 220);
  }
  const numEl = document.getElementById(side === 'a' ? 'scoreNum1' : 'scoreNum2');
  numEl.classList.remove('pop');
  void numEl.offsetWidth;
  numEl.classList.add('pop');
  setTimeout(() => numEl.classList.remove('pop'), 260);
}

function resetScore() {
  score = { a: 0, b: 0 };
  document.getElementById('scoreNum1').textContent = 0;
  document.getElementById('scoreNum2').textContent = 0;
  showToast('↺ Placar zerado');
}

/* ===== BOOT ARENA ===== */
function bootArena() {
  if (!requirePlayerNames()) return;
  uclMode = false;
  champMode = false;
  document.body.classList.remove('ucl-mode');
  rebuildPool();
  if (pool.length < 2) {
    showToast('Pool insuficiente. Ajuste os filtros.', 'warn'); return;
  }
  bannedTeams = new Set();
  _startSession();
}

/* ===== UCL MODE — MODAL DE SELEÇÃO ===== */
function bootArenaUCL() {
  if (!requirePlayerNames()) return;
  const allUCL = teams.filter(t => t.active !== false && t.ucl === true);
  if (allUCL.length < 2) {
    showToast('Nenhum time UCL disponível.', 'warn'); return;
  }
  // Pré-seleciona os 32 times da UCL 26-27 por padrão
  uclSelectedTeams = allUCL.filter(t => UCL_26_27.has(t.n));
  if (uclSelectedTeams.length < 2) uclSelectedTeams = [...allUCL];
  renderUCLModal();
  document.getElementById('uclModal').classList.add('open');
}

function renderUCLModal() {
  const grid = document.getElementById('uclTeamsGrid');
  if (!grid) return;
  const allUCL = teams.filter(t => t.active !== false && t.ucl === true);

  // Ordena: 26-27 primeiro, depois extras
  const official = allUCL.filter(t =>  UCL_26_27.has(t.n));
  const extras   = allUCL.filter(t => !UCL_26_27.has(t.n));
  const ordered  = [...official, ...extras];

  let html = '';
  if (extras.length > 0) {
    html += `<div style="grid-column:1/-1;font-family:var(--font-head);font-size:0.55rem;letter-spacing:2px;text-transform:uppercase;color:var(--muted);padding:2px 0 4px;">UCL 2026-27</div>`;
  }
  html += official.map(t => teamChipHtml(t)).join('');
  if (extras.length > 0) {
    html += `<div style="grid-column:1/-1;font-family:var(--font-head);font-size:0.55rem;letter-spacing:2px;text-transform:uppercase;color:var(--muted);padding:8px 0 4px;">Outras opções</div>`;
    html += extras.map(t => teamChipHtml(t)).join('');
  }
  grid.innerHTML = html;
  updateUCLCounter();
}

function teamChipHtml(t) {
  const sel   = uclSelectedTeams.some(s => s.n === t.n);
  const badge = makeBadge(t.n, t.c);
  const logo  = getLogoUrl(t) || badge;
  const safeN = t.n.replace(/'/g, "\\'").replace(/"/g, '&quot;');
  return `
    <div class="ban-item${sel ? '' : ' banned'}" onclick="toggleUCLTeam('${safeN}')">
      <img src="${logo}" alt="${t.n}" onerror="this.src='${badge}'"
           style="width:36px;height:36px;object-fit:contain;">
      <div class="ban-name">${t.n.split(/\s+/)[0]}</div>
      ${sel ? '' : '<div class="ban-x">✕</div>'}
    </div>`;
}

function toggleUCLTeam(name) {
  const team = teams.find(t => t.n === name);
  if (!team) return;
  const idx = uclSelectedTeams.findIndex(s => s.n === name);
  if (idx >= 0) uclSelectedTeams.splice(idx, 1);
  else          uclSelectedTeams.push(team);
  renderUCLModal();
}

function updateUCLCounter() {
  const n   = uclSelectedTeams.length;
  const el  = document.getElementById('uclTeamCount');
  const btn = document.getElementById('btnStartUCL');
  if (el)  el.textContent = n;
  if (btn) {
    btn.disabled       = n < 2;
    btn.style.opacity  = n >= 2 ? '1' : '0.45';
    btn.style.cursor   = n >= 2 ? 'pointer' : 'not-allowed';
  }
}

function closeUCLModal() {
  document.getElementById('uclModal').classList.remove('open');
}

function startArenaUCL() {
  if (uclSelectedTeams.length < 2) {
    showToast('Selecione ao menos 2 times.', 'warn'); return;
  }
  const elite80Chk  = document.getElementById('uclElite80');
  const balancedChk = document.getElementById('uclBalanced');

  let finalPool = [...uclSelectedTeams];
  if (elite80Chk && elite80Chk.checked) {
    finalPool = finalPool.filter(t => getOVR(t) >= 80);
    if (finalPool.length < 2) {
      showToast('Menos de 2 times Elite 80+ selecionados.', 'warn'); return;
    }
  }

  closeUCLModal();
  uclMode = true;
  champMode = false;
  uclSelectedTeams = finalPool;
  document.body.classList.add('ucl-mode');
  pool = finalPool;

  cfg.handicap = balancedChk ? balancedChk.checked : false;

  bannedTeams = new Set();
  _startSession();
}

function _startSession() {
  switchTab('arena');
  sessionActive = true;
  roundHistory = [];
  roundCount = 0;
  recentQueue = [];
  const uclBadge = document.getElementById('uclArenaBadge');
  if (uclBadge) uclBadge.style.display = uclMode ? 'block' : 'none';
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
function startDraft() {
  if (!requirePlayerNames()) return;
  SFX.unlock();
  const base = pool.filter(t => !bannedTeams.has(t.n));
  if (base.length < 2) {
    showToast('Pool insuficiente. Desbane times ou ajuste filtros.', 'warn'); return;
  }

  // ── ESCOLHA DE t1 ────────────────────────────────────────────────────────
  // Anti-repetição: exclui últimos 8 times usados (4 pares).
  // Afrouxa progressivamente se o pool ficar pequeno.
  let poolT1 = base.filter(t => !recentQueue.includes(t.n));
  if (poolT1.length < 2) poolT1 = base.filter(t => !recentQueue.slice(0, 4).includes(t.n));
  if (poolT1.length < 1) poolT1 = base;

  const t1 = fairPick(poolT1);

  // ── ESCOLHA DE t2 ────────────────────────────────────────────────────────
  // Sempre parte de TODOS os não-banidos exceto t1 (não filtra por recentes).
  // Isso garante que o balanceamento não seja limitado pelo anti-repetição.
  const candidatesAll = base.filter(t => t.n !== t1.n);

  let t2;
  if (cfg.handicap && candidatesAll.length > 0) {
    const target = getOVR(t1);

    // Busca progressiva: ±2 → ±4 → ±6 → mais próximo disponível
    for (const th of [2, 4, 6]) {
      const within = candidatesAll.filter(t => Math.abs(getOVR(t) - target) <= th);
      if (within.length > 0) {
        // Dentro do threshold, prefere times não-recentes
        const fresh  = within.filter(t => !recentQueue.includes(t.n));
        const source = fresh.length > 0 ? fresh : within;
        t2 = fairPick(source);
        break;
      }
    }
    // Fallback final: o mais próximo em OVR de t1
    if (!t2) {
      const sorted = [...candidatesAll].sort((a, b) =>
        Math.abs(getOVR(a) - target) - Math.abs(getOVR(b) - target)
      );
      t2 = sorted[0];
    }
  } else {
    // Sem balanceamento: escolhe aleatório, preferindo não-recentes
    const fresh  = candidatesAll.filter(t => !recentQueue.includes(t.n));
    const source = fresh.length > 0 ? fresh : candidatesAll;
    t2 = fairPick(source);
  }

  // ── REGISTRA (síncrono) e REVELA com suspense ────────────────────────────
  recentQueue = [t1.n, t2.n, ...recentQueue].slice(0, 8);
  roundTeams  = [t1, t2];
  roundCount++;

  if (navigator.vibrate) navigator.vibrate([18]);
  _suspenseReveal(t1, t2);
}

/* Animação de suspense: 7 ticks (35 → 105ms) ≈ 450ms, mesmo orçamento de
   tempo de sempre — só a APRESENTAÇÃO mudou. O card 1 trava um tick antes
   do card 2 (lock-in escalonado, cria expectativa), com blur/pulse durante
   o giro. O par já foi calculado — o suspense é puramente visual. */
function _suspenseReveal(t1, t2) {
  const c1 = document.getElementById('c1');
  const c2 = document.getElementById('c2');
  const n1 = document.getElementById('name1');
  const n2 = document.getElementById('name2');

  [c1, c2].forEach(c => { if (c) c.classList.remove('card-locked', 'reveal-sweep'); });
  if (c1) c1.classList.add('card-spinning');
  if (c2) c2.classList.add('card-spinning');

  const src   = pool.length >= 2 ? pool : [t1, t2];
  const TICKS = 7, T0 = 35, T1 = 105;
  const ratio = Math.pow(T1 / T0, 1 / (TICKS - 1));
  const LOCK1_AT = TICKS - 2; // card 1 trava um tick antes — lock-in escalonado
  let i = 0;
  let locked1 = false;

  function tick() {
    if (!locked1 && n1) n1.textContent = src[Math.floor(Math.random() * src.length)].n;
    if (n2) n2.textContent = src[Math.floor(Math.random() * src.length)].n;
    if (i % 2 === 0) SFX.tick(i / TICKS);

    if (!locked1 && i >= LOCK1_AT) {
      locked1 = true;
      if (n1) n1.textContent = t1.n;
      if (c1) { c1.classList.remove('card-spinning'); c1.classList.add('card-locked'); }
      SFX.lock(-0.4);
      if (navigator.vibrate) navigator.vibrate(10);
    }

    i++;
    if (i < TICKS) {
      setTimeout(tick, T0 * Math.pow(ratio, i));
    } else {
      _finishReveal(t1, t2, c1, c2);
    }
  }

  setTimeout(tick, T0);
}

/* Reveal final: injeta dados reais, dispara sweep de luz e som de impacto —
   ou, se o time favorito estiver em campo, um fanfarra dourada + confete. */
function _finishReveal(t1, t2, c1, c2) {
  if (c1) { c1.classList.remove('card-spinning', 'card-locked'); c1.classList.add('reveal-sweep'); }
  if (c2) { c2.classList.remove('card-spinning', 'card-locked'); c2.classList.add('reveal-sweep'); }

  renderCard(1, t1, P(0));
  renderCard(2, t2, P(1));
  updateOVRAdv(t1, t2);

  const favTeam = !cfg.favoriteTeam ? null
    : (t1.n === cfg.favoriteTeam ? t1 : (t2.n === cfg.favoriteTeam ? t2 : null));

  const flash = document.getElementById('flashOverlay');
  if (flash) {
    flash.style.background = favTeam ? 'radial-gradient(circle, #ffe680, #f0c040)' : '#fff';
    flash.style.opacity = favTeam ? '0.22' : '0.09';
    setTimeout(() => { flash.style.opacity = '0'; flash.style.background = '#fff'; }, 200);
  }

  if (favTeam) {
    SFX.favReveal();
    if (navigator.vibrate) navigator.vibrate([30, 40, 30, 40, 90]);
    launchConfetti([favTeam.c || '#f0c040', '#ffd700', '#ffffff'], 90);
    showToast(`⭐ ${favTeam.n} entrou em campo!`);
  } else {
    uclMode ? SFX.revealUCL() : SFX.reveal();
  }

  setTimeout(() => {
    if (c1) c1.classList.remove('reveal-sweep');
    if (c2) c2.classList.remove('reveal-sweep');
  }, 520);

  const rn = document.getElementById('roundNum');
  if (rn) rn.textContent = roundCount;

  if (roundHistory.length > 0) {
    const hw = document.getElementById('historyWrap');
    if (hw) hw.style.display = 'block';
    renderRoundHistory();
  }
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

  // Destaque de time favorito
  const isFav = !!cfg.favoriteTeam && team.n === cfg.favoriteTeam;
  const existingBadge = card.querySelector('.fav-badge');
  if (isFav) {
    card.classList.add('fav-hit');
    if (!existingBadge) {
      const b = document.createElement('div');
      b.className = 'fav-badge';
      b.textContent = '⭐ SEU TIME!';
      card.appendChild(b);
    }
  } else {
    card.classList.remove('fav-hit');
    if (existingBadge) existingBadge.remove();
  }

  // Owner
  const ownerEl = document.getElementById(`n${num}_owner`);
  if(ownerEl) ownerEl.textContent = owner || `P${num}`;

  // OVR — tiers: base < 75 · gold 75-79 · elite 80-84 · hero 85+ (tema verde escuro)
  const ovrEl = document.getElementById(`o${num}`);
  const ovrTier = ovr >= 85 ? 'ovr-hero' : ovr >= 80 ? 'ovr-elite' : ovr >= 75 ? 'ovr-gold' : 'ovr-base';
  if (ovrEl) {
    ovrEl.textContent = ovr;
    ovrEl.className = 'ovr-num ' + ovrTier;
  }
  const ovrBadgeEl = document.getElementById(`c${num}`)?.querySelector('.ovr-badge');
  if (ovrBadgeEl) ovrBadgeEl.classList.toggle('ovr-badge-hero', ovrTier === 'ovr-hero');

  // Logo
  renderLogoInto(document.getElementById(`logoWrap${num}`), team);

  // Liga + Nome
  const leagueEl = document.getElementById(`league${num}`);
  if (leagueEl) {
    if (uclMode) {
      leagueEl.innerHTML = `⭐ UEFA Champions League`;
    } else if (champMode) {
      leagueEl.innerHTML = `🏆 Champions 26-27`;
    } else {
      const lgUrl = getLeagueLogoUrl(team.league);
      leagueEl.innerHTML = lgUrl
        ? `<img class="league-logo" src="${lgUrl}" alt="" onerror="this.remove()">${team.f||''} ${team.league}`
        : `${team.f||''} ${team.league}`;
    }
  }
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

/* ===== MODAL DE PLACAR ===== */
let _modalScore = { a: 0, b: 0 };

function openScoreModal() {
  if (!roundTeams[0] || !roundTeams[1]) {
    showToast('Sorteie antes de salvar!', 'warn'); return;
  }
  _modalScore = { a: score.a, b: score.b };
  document.getElementById('sim-score-a').textContent = _modalScore.a;
  document.getElementById('sim-score-b').textContent = _modalScore.b;
  document.getElementById('sim-p1').textContent = P(0);
  document.getElementById('sim-p2').textContent = P(1);
  document.getElementById('sim-t1').textContent = roundTeams[0].n;
  document.getElementById('sim-t2').textContent = roundTeams[1].n;
  document.getElementById('scoreModal').classList.add('open');
}

function adjustModalScore(side, delta) {
  _modalScore[side] = Math.max(0, _modalScore[side] + delta);
  document.getElementById(`sim-score-${side}`).textContent = _modalScore[side];
  SFX.tick(0.4);
}

function closeScoreModal() {
  document.getElementById('scoreModal').classList.remove('open');
}

function confirmScoreAndSave() {
  score = { ..._modalScore };
  document.getElementById('scoreNum1').textContent = score.a;
  document.getElementById('scoreNum2').textContent = score.b;
  closeScoreModal();
  finishMatchAndSave();
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
  SFX.victory();
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
function launchConfetti(colors, count) {
  const canvas = document.getElementById('confettiCanvas');
  if (!canvas) return;
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  const ctx = canvas.getContext('2d');
  const COLORS = colors && colors.length ? colors : ['#c8102e','#ffd700','#00b4d8','#fff','#ff6b6b','#4ecdc4','#f39c12'];
  const pieces = Array.from({length: count || 130}, () => ({
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
  if (!requirePlayerNames()) return;
  if (!uclMode && champMode) {
    champMode = false;
    document.body.classList.remove('ucl-mode');
  }
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

/* ===== CHAMPIONS MODE ===== */
let championsSelected = []; // array of team objects currently selected

function openChampionsModal() {
  if (!requirePlayerNames()) return;
  const activeTeams = teams.filter(t => t.active !== false);
  if (activeTeams.length < 4) { showToast('Precisa de ao menos 4 times ativos.', 'warn'); return; }

  // Pré-seleciona os times da Champions 26-27 (até o máximo de 16 do chaveamento)
  const champTeams = activeTeams.filter(t => UCL_26_27.has(t.n));
  championsSelected = champTeams.length >= 4 ? champTeams.slice(0, 16) : [];

  renderChampionsGrid();
  updateChampionsCounter();
  document.getElementById('championsModal').classList.add('open');
}

function closeChampionsModal() {
  document.getElementById('championsModal').classList.remove('open');
}

function renderChampionsGrid() {
  const grid = document.getElementById('championsGrid');
  if (!grid) return;
  const activeTeams = teams.filter(t => t.active !== false);
  const official = activeTeams.filter(t =>  UCL_26_27.has(t.n));
  const extras   = activeTeams.filter(t => !UCL_26_27.has(t.n));

  const chipHtml = t => {
    const selected = championsSelected.some(s => s.n === t.n);
    const badge    = makeBadge(t.n, t.c);
    const logo     = getLogoUrl(t) || badge;
    const safeN    = t.n.replace(/'/g, "\\'").replace(/"/g, '&quot;');
    return `
      <div class="champions-team${selected ? ' selected' : ''}" onclick="toggleChampionsTeam('${safeN}')">
        <img src="${logo}" alt="${t.n}" onerror="this.src='${badge}'"
             style="width:36px;height:36px;object-fit:contain;">
        <div class="champions-team-name">${t.n.split(/\s+/)[0]}</div>
      </div>`;
  };

  let html = '';
  if (official.length > 0) {
    html += `<div style="grid-column:1/-1;font-family:var(--font-head);font-size:0.55rem;letter-spacing:2px;text-transform:uppercase;color:var(--muted);padding:2px 0 4px;">Champions 26-27</div>`;
    html += official.map(chipHtml).join('');
  }
  if (extras.length > 0) {
    html += `<div style="grid-column:1/-1;font-family:var(--font-head);font-size:0.55rem;letter-spacing:2px;text-transform:uppercase;color:var(--muted);padding:8px 0 4px;">Outros times</div>`;
    html += extras.map(chipHtml).join('');
  }
  grid.innerHTML = html;
}

function toggleChampionsTeam(name) {
  const team = teams.find(t => t.n === name);
  if (!team) return;
  const idx = championsSelected.findIndex(s => s.n === name);
  if (idx >= 0) {
    championsSelected.splice(idx, 1);
  } else {
    championsSelected.push(team);
  }
  renderChampionsGrid();
  updateChampionsCounter();
}

function updateChampionsCounter() {
  const n = championsSelected.length;
  const valid = n === 4 || n === 8 || n === 16;
  const counter = document.getElementById('championsCounter');
  const btn     = document.getElementById('btnStartChampions');
  if (counter) {
    counter.textContent = `${n} / 16`;
    counter.className = 'champions-counter' + (valid ? ' valid' : '');
  }
  if (btn) {
    btn.disabled = !valid;
    btn.style.opacity = valid ? '1' : '0.45';
    btn.style.cursor  = valid ? 'pointer' : 'not-allowed';
  }
}

function startChampionsBracket() {
  const n = championsSelected.length;
  if (n !== 4 && n !== 8 && n !== 16) {
    showToast('Selecione 4, 8 ou 16 times.', 'warn'); return;
  }

  // Shuffle the selected teams
  const picked = fairShuffle(championsSelected);
  tourn = { teams: picked, bracket: [], idx: 0, done: false };

  for (let i = 0; i < picked.length; i += 2) {
    tourn.bracket.push({ t1: picked[i], t2: picked[i+1], winner: null, round: 1 });
  }

  closeChampionsModal();
  champMode = true;
  uclMode = false;
  document.body.classList.add('ucl-mode');
  switchTab('torneio');

  // Show bracket, hide setup controls
  renderBracket();
  document.getElementById('bracketWrap').style.display = 'block';
  document.getElementById('tournSetupControls').style.display = 'none';
  document.getElementById('btnNextMatch').style.display = 'block';

  showToast(`🏆 Chaveamento Champions 26-27 com ${n} times gerado!`);
}

/* ===== TORNEIO ===== */
let tourn = { teams:[], bracket:[], idx:0, done:false };

function openTournamentMenu() { switchTab('torneio'); }

function generateTournament() {
  if (!requirePlayerNames()) return;
  champMode = false;
  document.body.classList.remove('ucl-mode');
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

  const picked = fairShuffle(eligible).slice(0, size);
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

  const uclBadge = document.getElementById('uclArenaBadge');
  const uclBadgeText = document.getElementById('uclArenaBadgeText');
  if (uclBadge) {
    uclBadge.style.display = champMode ? 'block' : 'none';
    if (champMode && uclBadgeText) uclBadgeText.textContent = '🏆 Champions 26-27';
  }

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
  if (champMode) {
    champMode = false;
    document.body.classList.remove('ucl-mode');
  }
  const uclBadge = document.getElementById('uclArenaBadge');
  if (uclBadge) uclBadge.style.display = 'none';
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
  // Delegated to selectLeague() — kept for backwards compat
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
