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

  // Cada build*() sintetiza sample a sample (milhares de Math.sin/exp por
  // chamada) — sem cache isso rodava de novo a CADA sorteio e travava o
  // reveal (visível principalmente em CPU mais fraca, já que o suspense
  // visual que escondia esse custo não existe mais). Os parâmetros usados
  // são um conjunto fixo e pequeno, então cachear por chave resolve: gera
  // uma vez, reaproveita o AudioBuffer pra sempre.
  const _bufCache = new Map();
  function cached(key, factory) {
    if (_bufCache.has(key)) return _bufCache.get(key);
    const buf = factory();
    _bufCache.set(key, buf);
    return buf;
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
      fire(cached('tick', buildTick), a.currentTime + 0.01, rate);
    },

    // Slam único pesado: engrenagem trancando com eco industrial — largura estéreo
    reveal() {
      const a = ctx(); if (!a) return;
      if (a.state === 'suspended') a.resume().catch(() => {});
      const buf = cached('impact:1:1', () => buildImpact(1.0, 1.0));
      const t0  = a.currentTime + 0.04;
      fire(buf, t0,        null, 0);
      fire(buf, t0 + 0.008, 1.0, -0.45);
      fire(buf, t0 + 0.008, 1.0,  0.45);
    },

    // Confirmação de gol: dois impactos rápidos (peso → impacto final)
    goal() {
      const a = ctx(); if (!a) return;
      if (a.state === 'suspended') a.resume().catch(() => {});
      fire(cached('impact:0.65:0',   () => buildImpact(0.65, 0)),   a.currentTime + 0.04);
      fire(cached('impact:1.05:0.7', () => buildImpact(1.05, 0.7)), a.currentTime + 0.04 + 0.16);
    },

    // Vitória: 3 impactos crescentes + slam final — sem melodia, só peso
    victory() {
      const a = ctx(); if (!a) return;
      if (a.state === 'suspended') a.resume().catch(() => {});
      const finalBuf = cached('impact:1.35:1', () => buildImpact(1.35, 1.0));
      const t0 = a.currentTime;
      fire(cached('impact:0.50:0', () => buildImpact(0.50, 0)), t0 + 0.04);
      fire(cached('impact:0.72:0', () => buildImpact(0.72, 0)), t0 + 0.04 + 0.20);
      fire(cached('impact:0.94:0', () => buildImpact(0.94, 0)), t0 + 0.04 + 0.40);
      fire(finalBuf, t0 + 0.04 + 0.66, null, 0);
      fire(finalBuf, t0 + 0.04 + 0.668, 1.0, -0.5);
      fire(finalBuf, t0 + 0.04 + 0.668, 1.0,  0.5);
    },

    // UCL: dois hits majestosos — buildup leve + slam épico, largura estéreo
    revealUCL() {
      const a = ctx(); if (!a) return;
      if (a.state === 'suspended') a.resume().catch(() => {});
      const bigBuf = cached('impact:1.3:1', () => buildImpact(1.3, 1.0));
      const t0 = a.currentTime;
      fire(cached('impact:0.55:0.2', () => buildImpact(0.55, 0.2)), t0 + 0.02);
      fire(bigBuf, t0 + 0.20,        null, 0);
      fire(bigBuf, t0 + 0.20 + 0.008, 1.0, -0.5);
      fire(bigBuf, t0 + 0.20 + 0.008, 1.0,  0.5);
    },

    // Time favorito saiu no sorteio: arpejo ascendente (tríade) varrendo estéreo + slam dourado
    favReveal() {
      const a = ctx(); if (!a) return;
      if (a.state === 'suspended') a.resume().catch(() => {});
      const t0 = a.currentTime;
      fire(cached('chime:880:0.5',  () => buildChime(880,  0.5)), t0 + 0.02, null, -0.5);
      fire(cached('chime:1108:0.5', () => buildChime(1108, 0.5)), t0 + 0.10, null,  0);
      fire(cached('chime:1318:0.6', () => buildChime(1318, 0.6)), t0 + 0.18, null,  0.5);
      fire(cached('impact:1.15:0.9', () => buildImpact(1.15, 0.9)), t0 + 0.05);
    },

    // Gera todos os buffers usados de uma vez, fora do caminho crítico do
    // sorteio (chamado no boot do app) — assim o primeiro reveal da sessão
    // já sai instantâneo também, não só os seguintes.
    prewarm() {
      if (!ctx()) return;
      cached('tick', buildTick);
      ['1:1','0.65:0','1.05:0.7','1.35:1','0.50:0','0.72:0','0.94:0','1.3:1','0.55:0.2','1.15:0.9']
        .forEach(k => cached(`impact:${k}`, () => {
          const [w, e] = k.split(':').map(Number);
          return buildImpact(w, e);
        }));
      [[880,0.5],[1108,0.5],[1318,0.6]]
        .forEach(([f,d]) => cached(`chime:${f}:${d}`, () => buildChime(f, d)));
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

/* ===== COMPETIÇÕES UEFA 2026-27 =====
 * Cada time carrega no teams.json o campo "comp": 'ucl' | 'uel' | 'uecl'
 * (só os times cadastrados nesta base — sem forçar clube que não temos).
 * Cada competição tem identidade visual própria (logo + 2 cores oficiais),
 * aplicada em --accent/--accent2/--gold/--gold2 quando o modo está ativo,
 * do mesmo jeito que o tema "Time do Coração" faz pros clubes. */
const UEFA_COMPS = {
  ucl: {
    id: 'ucl', badge: '⭐',
    label: 'UEFA Champions League', short: 'Champions League',
    logoUrl: './assets/leagues/1301394.png',
    color: '#0E1E45', color2: '#C0C0C0',
  },
  uel: {
    id: 'uel', badge: '🟠',
    label: 'UEFA Europa League', short: 'Europa League',
    logoUrl: './assets/leagues/1301396.png',
    color: '#F5760A', color2: '#1A1A1A',
  },
  uecl: {
    id: 'uecl', badge: '🟢',
    label: 'UEFA Conference League', short: 'Conference League',
    logoUrl: './assets/leagues/31051584.png',
    color: '#00A94F', color2: '#000000',
  },
};

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
let uclMode         = false;   // modo "sorteio rápido" de competição UEFA ativo
let uclSelectedTeams = [];     // times escolhidos no modal de sorteio
let champMode       = false;   // modo "chaveamento" de competição UEFA ativo
let activeCompId    = 'ucl';   // qual competição está ativa (ucl/uel/uecl) nos modos acima
let pendingCompFlow = null;    // 'arena' | 'bracket' — o que abrir depois de escolher a competição

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
  { id: 'roxo',        label: 'Roxo',            bg: '#08060f', accent: '#8b5cf6' },
  { id: 'neon',        label: 'Neon',            bg: '#05060d', accent: '#00e5ff' },
  { id: 'esmeralda',   label: 'Esmeralda',       bg: '#040d08', accent: '#12b76a' },
  { id: 'carmesim',    label: 'Carmesim',        bg: '#0a0505', accent: '#e11d2e' },
  { id: 'royal',       label: 'Royal',           bg: '#050810', accent: '#3b6bff' },
  { id: 'champions',   label: 'Champions',       bg: '#07070a', accent: '#d4af37' },
  { id: 'sunset',      label: 'Sunset',          bg: '#0d0710', accent: '#ff5f6d' },
  { id: 'gelo',        label: 'Gelo',            bg: '#eef1f8', accent: '#3b5bfd' },
  { id: 'ouroPremium', label: 'Ouro Premium',    bg: '#f7f6f2', accent: '#febe10' },
  { id: 'pretoDourado',label: 'Preto & Dourado', bg: '#000000', accent: '#e9c14d' },
  { id: 'realmadrid',  label: 'Real Madrid',     bg: '#050912', accent: '#f4f4f4' },
  { id: 'liverpool',   label: 'Liverpool',       bg: '#0a0303', accent: '#c8102e' },
  { id: 'meutime',     label: 'Time do Coração', bg: '#060608', accent: '#8b5cf6' },
];

const FONT_PACKS = [
  { id: 'classic', label: 'Esports Clássico', sample: 'Aa', family: "'Barlow Condensed', sans-serif" },
  { id: 'impacto', label: 'Impacto Total',    sample: 'Aa', family: "'Anton', sans-serif" },
  { id: 'cyber',   label: 'Cyber Neon',       sample: 'Aa', family: "'Orbitron', sans-serif" },
  { id: 'retro',   label: 'Estádio Retrô',    sample: 'Aa', family: "'Bebas Neue', sans-serif" },
];

// Clareia uma cor hex misturando com branco — usada pra derivar o --accent2
// do tema dinâmico "Time do Coração" a partir da cor real do time (t.c).
function lightenHex(hex, amt) {
  const h = (hex || '#8b5cf6').replace('#', '');
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  const num = parseInt(full, 16);
  if (Number.isNaN(num)) return '#a78bfa';
  const mix = (v) => Math.round(v + (255 - v) * amt);
  const r = mix((num >> 16) & 255), g = mix((num >> 8) & 255), b = mix(num & 255);
  return `#${[r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')}`;
}

// Mistura duas cores hex — usado pra "tingir" o preto de fundo do tema
// "Time do Coração" com a cor real do clube, em vez de deixar o fundo
// neutro e só depender das partículas/gradientes pra dar identidade.
function mixHex(hexA, hexB, ratio) {
  const toRgb = (hex) => {
    const h = (hex || '#000000').replace('#', '');
    const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
    const num = parseInt(full, 16);
    return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
  };
  const [ar, ag, ab] = toRgb(hexA), [br, bg, bb] = toRgb(hexB);
  const mix = (a, b) => Math.round(a + (b - a) * ratio);
  const r = mix(ar, br), g = mix(ag, bg), b = mix(ab, bb);
  return `#${[r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')}`;
}

// Luminância relativa (WCAG) — usada pra decidir se o texto sobre um botão
// pintado com a cor do time deve ser claro ou escuro. Sem isso, times com
// cor clara (Real Madrid, Newcastle, Al Nassr, Juventus...) quebrariam o
// contraste do botão no tema "Time do Coração".
function relLuminance(hex) {
  const h = (hex || '').replace('#', '');
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  const num = parseInt(full, 16);
  if (Number.isNaN(num)) return 0.3;
  const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  return 0.2126 * lin((num >> 16) & 255) + 0.7152 * lin((num >> 8) & 255) + 0.0722 * lin(num & 255);
}
function pickInk(bgHex) {
  const l = relLuminance(bgHex);
  const withWhite = (Math.max(l, 1) + 0.05) / (Math.min(l, 1) + 0.05);
  const withDark  = (Math.max(l, 0) + 0.05) / (Math.min(l, 0) + 0.05);
  return withWhite >= withDark ? '#ffffff' : '#12131d';
}

// HSL de uma cor hex — usado só pra classificar a cor primária do clube no
// motor "Time do Coração" (categoria clara-neutra/clara-saturada/escura,
// ver classifyClubColor) quando o time não tem instrução literal cadastrada.
function hexToHsl(hex) {
  const h = (hex || '#000000').replace('#', '');
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  const num = parseInt(full, 16);
  const r = ((num >> 16) & 255) / 255, g = ((num >> 8) & 255) / 255, b = (num & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let hh = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: hh = (g - b) / d + (g < b ? 6 : 0); break;
      case g: hh = (b - r) / d + 2; break;
      case b: hh = (r - g) / d + 4; break;
    }
    hh /= 6;
  }
  return { h: hh * 360, s: s * 100, l: l * 100 };
}

// Classifica a cor primária do clube em 3 categorias — 100% a partir do
// HSL, sem lista de exceções por nome de time:
//   A) clara-neutra   → L>=80% e S<=40% (branco, prata, cinza claro)
//   B) clara-saturada → L>=55% e S>40%  (amarelo, verde-limão, laranja claro)
//   C) escura/forte   → qualquer outra (vermelho, azul, preto, roxo...)
// Usado como fallback pra qualquer time futuro que não esteja na tabela
// literal MEUTIME_OVERRIDES abaixo — garante que nenhum time novo fique
// sem tema.
function classifyClubColor(hex) {
  const { s, l } = hexToHsl(hex);
  if (l >= 80 && s <= 40) return 'clara-neutra';
  if (l >= 55 && s > 40) return 'clara-saturada';
  return 'escura-forte';
}

function contrastRatio(hexA, hexB) {
  const l1 = relLuminance(hexA), l2 = relLuminance(hexB);
  const hi = Math.max(l1, l2), lo = Math.min(l1, l2);
  return (hi + 0.05) / (lo + 0.05);
}

/* ===== TIME DO CORAÇÃO — instruções literais por time =====
 * Tabela com uma entrada por time (os 90 do banco), curada à mão e
 * validada contra contraste WCAG AA (4.5:1) pra fundo↔texto e
 * destaque↔texto — substitui a fórmula automática por HSL (só usada
 * como fallback pra time futuro fora dessa lista).
 * bg: ['tint', corKey, ratio, baseHexOpcional] | ['solid', corKey] | ['black'] | ['dark-red']
 * destaque/dInk/bInk: 'c' | 'c2' | 'white' | 'black' | 'w' | 'k' | hex literal */
const MEUTIME_BASE_DARK = '#08060f';
const MEUTIME_OVERRIDES = {
  'Bayern München':      { bg: ['tint','c',0.18], destaque:'c2', dInk:'w', bInk:'w' },
  'Bayer Leverkusen':    { bg: ['tint','c',0.18], destaque:'c',  dInk:'w', bInk:'w' },
  'Borussia Dortmund':   { bg: ['tint','c',0.10,'#000000'], destaque:'c', dInk:'k', bInk:'w' },
  'Eintracht Frankfurt': { bg: ['tint','c',0.18], destaque:'c',  dInk:'w', bInk:'w' },
  'Stuttgart':           { bg: ['tint','c',0.18], destaque:'c',  dInk:'w', bInk:'w' },
  'RB Leipzig':          { bg: ['tint','c',0.18], destaque:'c',  dInk:'w', bInk:'w' },
  // destaque = c2 (branco) — dInk corrigido pra escuro (a tabela de
  // referência trazia 'w', o que deixava o texto do botão invisível:
  // branco sobre branco)
  "M'gladbach":          { bg: ['black'],         destaque:'c2', dInk:'k', bInk:'w' },
  'Wolfsburg':           { bg: ['tint','c',0.18], destaque:'c',  dInk:'k', bInk:'w' },
  'Mainz 05':            { bg: ['tint','c',0.18], destaque:'c',  dInk:'w', bInk:'w' },
  'Augsburg':            { bg: ['tint','c',0.18], destaque:'c',  dInk:'w', bInk:'w' },
  'FC Köln':             { bg: ['tint','c',0.18], destaque:'c',  dInk:'w', bInk:'w' },

  'Al Nassr':            { bg: ['tint','c',0.18], destaque:'c',  dInk:'k', bInk:'w' },
  'Al-Hilal':            { bg: ['tint','c',0.18], destaque:'c',  dInk:'w', bInk:'w' },
  'Al-Ahli':             { bg: ['tint','c',0.18], destaque:'c',  dInk:'w', bInk:'w' },
  'Al-Ittihad':          { bg: ['tint','c',0.18], destaque:'c',  dInk:'k', bInk:'w' },

  'Boca Juniors':        { bg: ['tint','c',0.18], destaque:'c2', dInk:'k', bInk:'w' },
  'Estudiantes':         { bg: ['tint','c',0.18], destaque:'c',  dInk:'w', bInk:'w' },
  'River Plate':         { bg: ['solid','white'], destaque:'c2', dInk:'w', bInk:'k' },
  'Racing Club':         { bg: ['tint','c',0.18], destaque:'#3E7FA8', dInk:'w', bInk:'w' },
  'Rosario Central':     { bg: ['tint','c',0.18], destaque:'c2', dInk:'k', bInk:'w' },

  'Barcelona':           { special:'split' },
  // Real Madrid: branco + azul-claro por pedido explícito — a tabela de
  // referência trazia dourado (#FEBE10) aqui, trocado pra manter a
  // identidade que já vale no resto do app (teams.json, tema estático).
  'Real Madrid':         { bg: ['solid','white'], destaque:'#4FA8E0', dInk:'k', bInk:'k' },
  'Atlético Madrid':     { bg: ['tint','c',0.18], destaque:'c',  dInk:'w', bInk:'w' },
  'Athletic Bilbao':     { bg: ['tint','c',0.18], destaque:'c',  dInk:'k', bInk:'w' },
  'Real Betis':          { bg: ['tint','c',0.18], destaque:'c',  dInk:'k', bInk:'w' },
  'Real Sociedad':       { bg: ['tint','c',0.18], destaque:'c',  dInk:'w', bInk:'w' },
  'Celta Vigo':          { bg: ['tint','c',0.18], destaque:'#4A90C2', dInk:'k', bInk:'w' },
  'Osasuna':             { bg: ['tint','c',0.18], destaque:'c',  dInk:'w', bInk:'w' },
  'Villarreal CF':       { bg: ['tint','c2',0.18], destaque:'c2', dInk:'w', bInk:'w' },
  'Mallorca':            { bg: ['tint','c',0.18], destaque:'c',  dInk:'w', bInk:'w' },
  'Sevilla FC':          { bg: ['solid','white'], destaque:'c2', dInk:'w', bInk:'k' },
  'Valencia CF':         { bg: ['solid','white'], destaque:'c2', dInk:'k', bInk:'k' },
  'Alavés':              { bg: ['tint','c',0.18], destaque:'c',  dInk:'w', bInk:'w' },
  'Elche':               { bg: ['tint','c',0.18], destaque:'c',  dInk:'k', bInk:'w' },

  'Inter Miami':         { bg: ['tint','c',0.18], destaque:'c',  dInk:'k', bInk:'w' },
  'LAFC':                { bg: ['black'],         destaque:'c2', dInk:'k', bInk:'w' },
  'Whitecaps FC':        { bg: ['tint','c',0.18], destaque:'c',  dInk:'w', bInk:'w' },
  'LA Galaxy':           { bg: ['tint','c',0.18], destaque:'c2', dInk:'k', bInk:'w' },
  'Orlando City':        { bg: ['tint','c',0.18], destaque:'c',  dInk:'w', bInk:'w' },
  'Chicago Fire':        { bg: ['tint','c',0.18], destaque:'c',  dInk:'w', bInk:'w' },

  'PSG':                 { bg: ['tint','c',0.18], destaque:'c2', dInk:'w', bInk:'w' },
  'Marseille':           { bg: ['tint','c',0.18], destaque:'c',  dInk:'k', bInk:'w' },
  'AS Monaco':           { bg: ['tint','c',0.18], destaque:'c',  dInk:'w', bInk:'w' },
  'Lille OSC':           { bg: ['tint','c',0.18], destaque:'c',  dInk:'w', bInk:'w' },
  'Lyon':                { bg: ['tint','c',0.18], destaque:'c',  dInk:'w', bInk:'w' },

  'PSV Eindhoven':       { bg: ['tint','c',0.18], destaque:'c',  dInk:'w', bInk:'w' },
  'Feyenoord':           { bg: ['tint','c',0.18], destaque:'c',  dInk:'w', bInk:'w' },
  'Ajax':                { bg: ['tint','c',0.18], destaque:'c',  dInk:'w', bInk:'w' },
  'AZ Alkmaar':          { bg: ['tint','c',0.18], destaque:'c',  dInk:'w', bInk:'w' },

  'Arsenal':             { bg: ['tint','c',0.18], destaque:'c',  dInk:'w', bInk:'w' },
  'Liverpool':           { bg: ['dark-red'],      destaque:'white', dInk:'c', bInk:'w' },
  'Man City':            { bg: ['tint','c',0.18], destaque:'#2E7BB8', dInk:'w', bInk:'w' },
  'Aston Villa':         { bg: ['tint','c',0.18], destaque:'c',  dInk:'w', bInk:'w' },
  'Chelsea':             { bg: ['tint','c',0.18], destaque:'c',  dInk:'w', bInk:'w' },
  'Man Utd':             { bg: ['tint','c',0.18], destaque:'c',  dInk:'w', bInk:'w' },
  'Newcastle':           { bg: ['black'],         destaque:'white', dInk:'k', bInk:'w' },
  'Brentford':           { bg: ['tint','c',0.18], destaque:'c',  dInk:'w', bInk:'w' },
  'Brighton':            { bg: ['tint','c',0.18], destaque:'c',  dInk:'w', bInk:'w' },
  'Tottenham':           { bg: ['solid','white'], destaque:'c2', dInk:'w', bInk:'k' },
  'Bournemouth':         { bg: ['tint','c',0.18], destaque:'c',  dInk:'w', bInk:'w' },
  'Fulham':              { bg: ['solid','white'], destaque:'black', dInk:'w', bInk:'k' },
  'Nottm Forest':        { bg: ['tint','c',0.18], destaque:'c',  dInk:'w', bInk:'w' },
  'Crystal Palace':      { bg: ['tint','c',0.18], destaque:'c2', dInk:'w', bInk:'w' },
  'Everton':             { bg: ['tint','c',0.18], destaque:'c',  dInk:'w', bInk:'w' },
  'Sunderland':          { bg: ['tint','c',0.18], destaque:'c',  dInk:'w', bInk:'w' },
  'West Ham':            { bg: ['tint','c',0.18], destaque:'c2', dInk:'k', bInk:'w' },
  'Leeds United':        { bg: ['solid','#f2f0ea'], destaque:'#C9A200', dInk:'k', bInk:'k' },
  'Burnley':             { bg: ['tint','c',0.18], destaque:'c',  dInk:'w', bInk:'w' },
  'Wolves':              { bg: ['tint','c',0.18], destaque:'c',  dInk:'k', bInk:'w' },

  'Inter Milan':         { bg: ['tint','c',0.18], destaque:'c',  dInk:'w', bInk:'w' },
  'Milan':               { bg: ['tint','c',0.18], destaque:'c',  dInk:'k', bInk:'w' },
  'Napoli':              { bg: ['tint','c',0.18], destaque:'c',  dInk:'k', bInk:'w' },
  'Juventus':            { bg: ['black'],         destaque:'white', dInk:'k', bInk:'w' },
  'Roma':                { bg: ['tint','c',0.18], destaque:'c2', dInk:'k', bInk:'w' },
  'Atalanta':            { bg: ['tint','c',0.18], destaque:'c',  dInk:'w', bInk:'w' },
  'Lazio':               { bg: ['tint','c',0.18], destaque:'#3E8FB0', dInk:'k', bInk:'w' },
  'Bologna':             { bg: ['tint','c',0.18], destaque:'c2', dInk:'w', bInk:'w' },
  'Como':                { bg: ['tint','c',0.18], destaque:'c',  dInk:'w', bInk:'w' },
  'Fiorentina':          { bg: ['tint','c',0.18], destaque:'c',  dInk:'w', bInk:'w' },
  'Sassuolo':            { bg: ['tint','c',0.18], destaque:'c',  dInk:'k', bInk:'w' },
  'Torino':              { bg: ['tint','c',0.18], destaque:'c2', dInk:'k', bInk:'w' },
  'Cagliari':            { bg: ['tint','c',0.18], destaque:'c2', dInk:'w', bInk:'w' },
  'Udinese':             { bg: ['black'],         destaque:'white', dInk:'k', bInk:'w' },

  'Benfica':             { bg: ['tint','c',0.18], destaque:'c',  dInk:'w', bInk:'w' },
  'Sporting CP':         { bg: ['tint','c',0.18], destaque:'c',  dInk:'w', bInk:'w' },
  'Porto':               { bg: ['tint','c',0.18], destaque:'c',  dInk:'w', bInk:'w' },
  'Braga':               { bg: ['tint','c',0.18], destaque:'c',  dInk:'w', bInk:'w' },

  'Galatasaray':         { bg: ['tint','c',0.18], destaque:'c2', dInk:'k', bInk:'w' },
  'Fenerbahçe':          { bg: ['tint','c',0.18], destaque:'c',  dInk:'k', bInk:'w' },
  'Beşiktaş':            { bg: ['black'],         destaque:'white', dInk:'k', bInk:'w' },
};

function resolveOverrideColor(key, team) {
  if (key === 'c') return team.c;
  if (key === 'c2') return team.c2 || team.c;
  if (key === 'white') return '#FFFFFF';
  if (key === 'black') return '#000000';
  if (key === 'w') return '#ffffff';
  if (key === 'k') return '#12131d';
  return key; // hex literal
}

// Retorna {bg,isGradientBg,destaque,destaqueInk,bgInk} pra um time cadastrado
// em MEUTIME_OVERRIDES, ou null se o time não estiver na lista literal
// (cai na fórmula automática por HSL em applyThemeAndFont).
function computeOverrideTheme(team) {
  const ov = MEUTIME_OVERRIDES[team.n];
  if (!ov) return null;

  if (ov.special === 'split') {
    // Barcelona: fundo dividido diagonal nas 2 cores oficiais — cor
    // sólida dos dois lados (sem gradiente/blend), via clip-path em CSS
    // (ver body.meutime-split em main.css). --bg fica com a cor 1 como
    // fallback sólido pra quem só lê essa variável (meta theme-color etc.).
    const destInk = contrastRatio(team.c, '#FFFFFF') >= contrastRatio(team.c2 || team.c, '#FFFFFF') ? team.c : (team.c2 || team.c);
    return {
      bg: team.c,
      isSplitBg: true,
      splitC1: team.c, splitC2: team.c2 || team.c,
      destaque: '#FFFFFF', destaqueInk: destInk, bgInk: '#ffffff',
    };
  }

  const [mode, ...args] = ov.bg;
  let bg;
  if (mode === 'tint') {
    const [colorKey, ratio, baseOverride] = args;
    bg = mixHex(baseOverride || MEUTIME_BASE_DARK, resolveOverrideColor(colorKey, team), ratio);
  } else if (mode === 'solid') {
    bg = resolveOverrideColor(args[0], team);
  } else if (mode === 'black') {
    bg = '#000000';
  } else if (mode === 'dark-red') {
    bg = mixHex('#0a0303', team.c, 0.55);
  }

  return {
    bg, isGradientBg: false,
    destaque: resolveOverrideColor(ov.destaque, team),
    destaqueInk: resolveOverrideColor(ov.dInk, team),
    bgInk: resolveOverrideColor(ov.bInk, team),
  };
}

/* Pinta o app inteiro com a identidade da competição UEFA ativa. As cores
   de cada competição (Champions/Europa/Conference) vivem em CSS —
   body.ucl-mode[data-comp="uel"/"uecl"] — então aqui só liga o atributo;
   quando sai do modo, o tema pessoal do usuário volta a valer sozinho. */
function applyCompTheme(compId) {
  document.body.dataset.comp = compId;
}
function clearCompTheme() {
  delete document.body.dataset.comp;
}

function applyThemeAndFont() {
  const id = cfg.theme || 'roxo';
  document.documentElement.setAttribute('data-theme', id);
  document.documentElement.setAttribute('data-font',  cfg.font  || 'classic');

  // Tema dinâmico: pinta o accent com a cor real do time favorito por cima
  // da base escura do tema "meutime" — QUALQUER um dos 88 times funciona
  // como tema completo, não só os 4 clubes com CSS dedicado. Fora dele,
  // limpa qualquer override.
  const root = document.documentElement.style;
  if (id === 'meutime') {
    const team = teams.find(t => t.n === cfg.favoriteTeam);
    const c  = team && team.c  ? team.c  : '#8b5cf6';
    const c2 = team && team.c2 ? team.c2 : lightenHex(c, 0.35);
    const c3 = team && team.c3 ? team.c3 : c2;

    // Se o time estiver na tabela literal MEUTIME_OVERRIDES (curada à mão,
    // validada contra contraste WCAG), ela SUBSTITUI a fórmula automática
    // por HSL abaixo. Times fora da lista (cadastrados no futuro) caem na
    // fórmula — nenhum time fica sem tema.
    const override = team ? computeOverrideTheme(team) : null;

    let bg, destaque, destaqueInk, bgInk, isSplitBg = false;
    if (override) {
      ({ bg, destaque, destaqueInk, bgInk } = override);
      isSplitBg = !!override.isSplitBg;
    } else {
      const categoria = classifyClubColor(c);
      if (categoria === 'clara-neutra') {
        bg = c;
        destaque = team && team.c2 ? team.c2 : c3;
      } else {
        bg = mixHex(MEUTIME_BASE_DARK, c, 0.10);
        destaque = c;
      }
      destaqueInk = pickInk(destaque);
      bgInk = pickInk(bg);
    }

    root.setProperty('--accent',      destaque);
    root.setProperty('--accent2',     c2);
    root.setProperty('--accent3',     c3);
    root.setProperty('--p1',          destaque);
    root.setProperty('--accent-ink',  destaqueInk); // texto sobre o destaque (toast, pills, botões)
    root.setProperty('--text',        bgInk);        // texto sobre o fundo do app — crítico pra times com fundo branco (Real Madrid, Tottenham, Fulham...)

    root.setProperty('--bg', bg);
    if (!isSplitBg) {
      root.setProperty('--surface',  mixHex('#0d0d11', c, 0.14));
      root.setProperty('--surface2', mixHex('#131318', destaque, 0.14));
      root.setProperty('--surface3', mixHex('#1a1a22', destaque, 0.13));
      root.setProperty('--border',   mixHex('#24242e', destaque, 0.42));
      root.setProperty('--border2',  mixHex('#242440', destaque, 0.42));
      document.body.classList.remove('meutime-split');
    } else {
      // Barcelona: fundo é dividido em cor sólida (sem gradiente) via
      // clip-path — ver body.meutime-split em main.css. Superfícies ficam
      // num preto neutro sóbrio por cima, sem competir com o split.
      root.setProperty('--surface',  'rgba(5,5,8,0.82)');
      root.setProperty('--surface2', 'rgba(5,5,8,0.9)');
      root.setProperty('--surface3', 'rgba(5,5,8,0.96)');
      root.setProperty('--border',   'rgba(255,255,255,0.16)');
      root.setProperty('--border2',  'rgba(255,255,255,0.24)');
      root.setProperty('--split-c1', override.splitC1);
      root.setProperty('--split-c2', override.splitC2);
      document.body.classList.add('meutime-split');
    }

    root.setProperty('--gold',      destaque);
    root.setProperty('--gold2',     c3);
    root.setProperty('--gold-ink',  destaqueInk);
  } else {
    root.removeProperty('--accent');
    root.removeProperty('--accent2');
    root.removeProperty('--accent3');
    root.removeProperty('--p1');
    root.removeProperty('--accent-ink');
    root.removeProperty('--text');
    root.removeProperty('--gold');
    root.removeProperty('--gold2');
    root.removeProperty('--gold-ink');
    root.removeProperty('--bg');
    root.removeProperty('--surface');
    root.removeProperty('--surface2');
    root.removeProperty('--surface3');
    root.removeProperty('--border');
    root.removeProperty('--border2');
    document.body.classList.remove('meutime-split');
  }

  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) {
    const t = THEMES.find(x => x.id === id);
    if (t) metaTheme.setAttribute('content', t.bg);
  }

  updateThemeWatermark(id);
}

// Escudo + nome gigantes atrás de tudo, tipo pôster de estádio — só nos
// temas realmente ligados a um clube específico (Real Madrid, Liverpool
// e Time do Coração, este com o time favorito escolhido pelo usuário).
function updateThemeWatermark(id) {
  const el = document.getElementById('themeWatermark');
  if (!el) return;
  const img  = document.getElementById('themeWatermarkImg');
  const text = document.getElementById('themeWatermarkText');

  const watermarkTeam = id === 'meutime'   ? teams.find(t => t.n === cfg.favoriteTeam)
                      : id === 'realmadrid' ? teams.find(t => t.n === 'Real Madrid')
                      : id === 'liverpool'  ? teams.find(t => t.n === 'Liverpool')
                      : null;

  if (watermarkTeam) {
    const url = getLogoUrl(watermarkTeam);
    if (img) { img.style.display = url ? '' : 'none'; if (url) img.src = url; }
    if (text) text.textContent = watermarkTeam.n;
    el.classList.add('active');
  } else {
    el.classList.remove('active');
  }
}

function renderThemeGrid() {
  const grid = document.getElementById('themeSwatchGrid');
  if (!grid) return;
  const favTeam = teams.find(t => t.n === cfg.favoriteTeam);
  grid.innerHTML = THEMES.map(t => {
    // O swatch de "Time do Coração" já mostra a cor oficial real
    // (primária) do time favorito escolhido, não um fallback genérico.
    const dot = (t.id === 'meutime' && favTeam && favTeam.c) ? favTeam.c : t.accent;
    return `
    <button type="button" class="theme-swatch${cfg.theme === t.id ? ' active' : ''}" onclick="selectTheme('${t.id}')">
      <span class="theme-swatch-dot" style="background:${dot};"></span>
      <span class="theme-swatch-label">${t.label}</span>
    </button>
  `;
  }).join('');
}

function selectTheme(id) {
  cfg.theme = id;
  saveSettings();
  applyThemeAndFont();
  renderThemeGrid();
  // "Time do Coração" funciona com qualquer um dos 88 times: já aplica na
  // hora (com uma cor de fallback se ainda não tiver time escolhido) e abre
  // o seletor pra trocar — cada time tocado ali já re-pinta o app ao vivo.
  if (id === 'meutime') {
    if (!cfg.favoriteTeam) showToast('⭐ Toque um time pra pintar o app com a cor dele!');
    openFavoriteTeamModal();
  }
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

// Mesmos limiares de tier usados no badge de OVR do card de partida
// (renderCard) — reaproveitados aqui pra não ter duas fontes de verdade
// sobre o que é "hero"/"elite"/"gold"/"base".
function ovrTierOf(t) {
  const ovr = getOVR(t);
  return ovr >= 85 ? { cls: 'ovr-hero',  label: 'Hero'  }
       : ovr >= 80 ? { cls: 'ovr-elite', label: 'Elite' }
       : ovr >= 75 ? { cls: 'ovr-gold',  label: 'Gold'  }
       :             { cls: 'ovr-base',  label: 'Base'  };
}

// Um card do grid: escudo real com anel na cor primária do clube + fundo
// na secundária (mesma leitura visual de "camisa" dos cards de partida),
// nome e uma pílula de tier — dá pra ver a força e a identidade do time
// de cara, antes mesmo de escolher.
function favTeamCardHtml(t) {
  const sel    = cfg.favoriteTeam === t.n;
  const badge  = makeBadge(t.n, t.c);
  const logo   = getLogoUrl(t) || badge;
  const safeN  = t.n.replace(/'/g, "\\'").replace(/"/g, '&quot;');
  const ring   = t.c || 'var(--border2)';
  const fill   = t.c2 || t.c || 'var(--surface2)';
  const tier   = ovrTierOf(t);
  return `
    <div class="favteam-card${sel ? ' selected' : ''}" onclick="setFavoriteTeam('${safeN}')">
      <span class="favteam-badge" style="border-color:${ring};background:${fill};">
        <img src="${logo}" alt="${t.n}" onerror="this.src='${badge}'">
      </span>
      <div class="favteam-card-name">${t.n.split(/\s+/)[0]}</div>
      <span class="favteam-tier ${tier.cls}">${tier.label}</span>
    </div>`;
}

function renderFavTeamGrid() {
  const grid = document.getElementById('favTeamGrid');
  if (!grid) return;
  const q = (document.getElementById('favTeamSearch')?.value || '').trim().toLowerCase();
  const active = teams.filter(t => t.active !== false);

  if (q) {
    // Buscando: lista plana, sem cabeçalho de liga.
    const list = active.filter(t => t.n.toLowerCase().includes(q));
    grid.innerHTML = list.slice(0, 400).map(favTeamCardHtml).join('');
    return;
  }

  // Sem busca: agrupado por liga, na mesma ordem do filtro de ligas do
  // app — mais fácil de achar o time quando você já sabe o campeonato.
  let html = '';
  LEAGUE_LIST.forEach(league => {
    if (league.value === 'all') return;
    const inLeague = active.filter(t => t.league === league.value);
    if (inLeague.length === 0) return;
    html += `<div class="favteam-league-head">${league.emoji} ${league.label}</div>`;
    html += inLeague.map(favTeamCardHtml).join('');
  });
  // Qualquer time cuja liga não esteja no LEAGUE_LIST (não deveria
  // acontecer, mas evita sumir time silenciosamente se acontecer).
  const known = new Set(LEAGUE_LIST.map(l => l.value));
  const orphans = active.filter(t => !known.has(t.league));
  if (orphans.length > 0) {
    html += `<div class="favteam-league-head">🌍 Outros</div>`;
    html += orphans.map(favTeamCardHtml).join('');
  }
  grid.innerHTML = html;
}

function setFavoriteTeam(name) {
  cfg.favoriteTeam = name || null;
  saveSettings();
  updateFavTeamButton();
  renderFavTeamGrid();
  if (cfg.theme === 'meutime') applyThemeAndFont(); // atualiza o accent na hora
  renderThemeGrid();
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

    // Gera os buffers de som com a splash ainda na tela, não no primeiro
    // sorteio — setTimeout joga pra depois do paint atual, então não
    // atrasa a primeira renderização da splash.
    setTimeout(() => SFX.prewarm(), 0);

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
  clearCompTheme();
  rebuildPool();
  if (pool.length < 2) {
    showToast('Pool insuficiente. Ajuste os filtros.', 'warn'); return;
  }
  bannedTeams = new Set();
  _startSession();
}

/* ===== SELETOR DE COMPETIÇÃO UEFA ===== */
function openCompPicker(flow) {
  if (!requirePlayerNames()) return;
  pendingCompFlow = flow; // 'arena' (sorteio rápido) ou 'bracket' (chaveamento)
  renderCompPicker();
  document.getElementById('compPickerModal').classList.add('open');
}

function closeCompPicker() {
  document.getElementById('compPickerModal').classList.remove('open');
}

function renderCompPicker() {
  const grid = document.getElementById('compPickerGrid');
  if (!grid) return;
  grid.innerHTML = Object.values(UEFA_COMPS).map(comp => {
    const n = teams.filter(t => t.active !== false && t.comp === comp.id).length;
    return `
    <button type="button" class="comp-pick-card" style="--cp-accent:${comp.color};--cp-accent2:${comp.color2};" onclick="pickComp('${comp.id}')">
      <img src="${comp.logoUrl}" alt="${comp.short}" onerror="this.style.display='none'">
      <div class="comp-pick-text">
        <div class="comp-pick-label">${comp.short}</div>
        <div class="comp-pick-count">${n} time${n === 1 ? '' : 's'} cadastrado${n === 1 ? '' : 's'}</div>
      </div>
    </button>`;
  }).join('');
}

function pickComp(compId) {
  activeCompId = compId;
  closeCompPicker();
  if (pendingCompFlow === 'bracket') openChampionsModal();
  else bootArenaUCL();
}

/* ===== UCL MODE — MODAL DE SELEÇÃO (sorteio rápido pra qualquer competição UEFA) ===== */
function bootArenaUCL() {
  if (!requirePlayerNames()) return;
  const comp = UEFA_COMPS[activeCompId];
  const activeAll = teams.filter(t => t.active !== false);
  if (activeAll.length < 2) {
    showToast('Nenhum time disponível.', 'warn'); return;
  }
  // Pré-seleciona os times classificados pra competição escolhida — se a
  // competição tiver poucos times cadastrados (ex.: Conference League),
  // completa com os demais times ativos pra sempre dar pra sortear.
  const compTeams = activeAll.filter(t => t.comp === activeCompId);
  uclSelectedTeams = compTeams.length >= 2 ? compTeams : [...activeAll];
  renderUCLModal();
  const title = document.getElementById('uclModalTitle');
  if (title) title.innerHTML = `<img src="${comp.logoUrl}" alt="" style="width:20px;height:20px;object-fit:contain;vertical-align:-4px;margin-right:6px;" onerror="this.remove()">${comp.short}`;
  document.getElementById('uclModal').classList.add('open');
}

function renderUCLModal() {
  const grid = document.getElementById('uclTeamsGrid');
  if (!grid) return;
  const comp = UEFA_COMPS[activeCompId];
  const activeAll = teams.filter(t => t.active !== false);

  // Ordena: classificados da competição primeiro, depois o resto
  const official = activeAll.filter(t =>  t.comp === activeCompId);
  const extras   = activeAll.filter(t => t.comp !== activeCompId);

  let html = '';
  if (official.length > 0) {
    html += `<div style="grid-column:1/-1;font-family:var(--font-head);font-size:0.55rem;letter-spacing:2px;text-transform:uppercase;color:var(--muted);padding:2px 0 4px;">${comp.short}</div>`;
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
  applyCompTheme(activeCompId);
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
  const uclBadgeText = document.getElementById('uclArenaBadgeText');
  if (uclBadge) uclBadge.style.display = uclMode ? 'block' : 'none';
  if (uclMode && uclBadgeText) {
    const comp = UEFA_COMPS[activeCompId];
    uclBadgeText.textContent = `${comp.badge} ${comp.label}`;
  }
  score = { a: 0, b: 0 };
  const s1=document.getElementById('scoreNum1');
  const s2=document.getElementById('scoreNum2');
  const rn=document.getElementById('roundNum');
  if(s1) { s1.textContent=0; s1.style.color=''; s1.style.textShadow=''; }
  if(s2) { s2.textContent=0; s2.style.color=''; s2.style.textShadow=''; }
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

    // Busca progressiva: ±1 → ±2 → ±3 → mais próximo disponível (confrontos bem justos)
    for (const th of [1, 2, 3]) {
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

  // ── REGISTRA (síncrono) e REVELA na hora ─────────────────────────────────
  recentQueue = [t1.n, t2.n, ...recentQueue].slice(0, 8);
  roundTeams  = [t1, t2];
  roundCount++;

  if (navigator.vibrate) navigator.vibrate([18]);
  _suspenseReveal(t1, t2);
}

/* Revelação instantânea: o par já foi calculado no ato do clique, então o
   time entra em campo na hora — zero espera entre o sorteio e a exibição.
   O impacto visual vem do reveal-sweep (brilho) e do cardIn (entrada com
   leve "bounce"), ambos decorativos e não bloqueiam nada. */
function _suspenseReveal(t1, t2) {
  const c1 = document.getElementById('c1');
  const c2 = document.getElementById('c2');
  [c1, c2].forEach(c => { if (c) c.classList.remove('card-spinning', 'card-locked', 'reveal-sweep'); });
  _finishReveal(t1, t2, c1, c2);
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
    flash.style.background = favTeam ? '#f0c040' : '#fff';
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

  // Cores oficiais do clube (primária/secundária/terciária) — dá vida ao
  // card. Quando não há 2ª/3ª cor, repete a primária.
  const color2 = team.c2 || color;
  card.style.setProperty('--team-color',  color);
  card.style.setProperty('--team-color2', color2);
  card.style.setProperty('--team-color3', team.c3 || color2 || color);
  // Mesma regra do handoff oficial de design: quando a 2ª cor do clube é
  // clara (luminância simples > 0.6 — ex.: Arsenal, Liverpool, PSG, que
  // têm branco como cor 2), o card vira branco sólido com borda na cor 1,
  // em vez de um bloco cheio da cor 1. Dá variedade real entre os cards
  // (nem todo sorteio vira "bloco colorido") e é fiel ao visual de
  // referência. Luminância SIMPLES (mesma fórmula do handoff, sem
  // correção gama) só pra essa classificação — o --card-ink em si segue
  // via pickInk (WCAG), mais preciso pra decidir o texto de verdade.
  const simpleLum = (hex) => {
    const h = (hex || '').replace('#', '');
    const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
    const hexNum = parseInt(full, 16);
    if (Number.isNaN(hexNum)) return 0.5;
    return (0.299*((hexNum>>16)&255) + 0.587*((hexNum>>8)&255) + 0.114*(hexNum&255)) / 255;
  };
  const lightSecondary = simpleLum(color2) > 0.6;
  const cardBg = lightSecondary ? '#ffffff' : color;
  card.style.setProperty('--card-bg',  cardBg);
  card.style.setProperty('--card-ink', pickInk(cardBg));
  card.style.animation = 'none';
  void card.offsetWidth; // reflow
  card.style.animation = 'cardIn 0.45s cubic-bezier(0.34,1.3,0.64,1) forwards';

  // Banner do topo da Arena — mesmo tratamento do handoff: fundo dividido
  // nas cores reais dos dois times sorteados.
  const arenaHeader = document.getElementById('arenaHeader');
  if (arenaHeader) arenaHeader.style.setProperty(`--vsbanner-c${num}`, color);

  // O placar grande (P1/P2) passa a brilhar na cor REAL do time sorteado
  // em vez do --p1/--p2 genérico do tema — o "0" já denuncia quem é quem
  // antes mesmo de olhar pro card.
  const scoreNumEl = document.getElementById(`scoreNum${num}`);
  if (scoreNumEl) {
    scoreNumEl.style.color = color;
    scoreNumEl.style.textShadow = `0 0 30px color-mix(in srgb, ${color} 35%, transparent)`;
  }

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
    if (uclMode || champMode) {
      const comp = UEFA_COMPS[activeCompId];
      leagueEl.innerHTML = `<img class="league-logo" src="${comp.logoUrl}" alt="" onerror="this.remove()">${comp.label}`;
    } else {
      const lgUrl = getLeagueLogoUrl(team.league);
      // Time classificado pra uma competição UEFA carrega o emblema dela
      // junto da liga nacional, mesmo fora do modo de sorteio dedicado.
      const compBadge = team.comp && UEFA_COMPS[team.comp]
        ? `<img class="league-logo comp-logo" src="${UEFA_COMPS[team.comp].logoUrl}" alt="${UEFA_COMPS[team.comp].short}" title="${UEFA_COMPS[team.comp].label}" onerror="this.remove()">`
        : '';
      leagueEl.innerHTML = (lgUrl
        ? `<img class="league-logo" src="${lgUrl}" alt="" onerror="this.remove()">${team.f||''} ${team.league}`
        : `${team.f||''} ${team.league}`) + compBadge;
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
    clearCompTheme();
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

  const comp = UEFA_COMPS[activeCompId];
  // Pré-seleciona os times classificados pra competição (até o máximo de
  // 16 do chaveamento); com menos de 4 (ex.: Conference League), o usuário
  // completa manualmente na seção "Outros times".
  const champTeams = activeTeams.filter(t => t.comp === activeCompId);
  championsSelected = champTeams.length >= 4 ? champTeams.slice(0, 16) : [];

  renderChampionsGrid();
  updateChampionsCounter();
  const title = document.getElementById('championsModalTitle');
  if (title) title.innerHTML = `<img src="${comp.logoUrl}" alt="" style="width:20px;height:20px;object-fit:contain;vertical-align:-4px;margin-right:6px;" onerror="this.remove()">${comp.short}`;
  document.getElementById('championsModal').classList.add('open');
}

function closeChampionsModal() {
  document.getElementById('championsModal').classList.remove('open');
}

function renderChampionsGrid() {
  const grid = document.getElementById('championsGrid');
  if (!grid) return;
  const comp = UEFA_COMPS[activeCompId];
  const activeTeams = teams.filter(t => t.active !== false);
  const official = activeTeams.filter(t =>  t.comp === activeCompId);
  const extras   = activeTeams.filter(t => t.comp !== activeCompId);

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
    html += `<div style="grid-column:1/-1;font-family:var(--font-head);font-size:0.55rem;letter-spacing:2px;text-transform:uppercase;color:var(--muted);padding:2px 0 4px;">${comp.short}</div>`;
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
  applyCompTheme(activeCompId);
  switchTab('torneio');

  // Show bracket, hide setup controls
  renderBracket();
  document.getElementById('bracketWrap').style.display = 'block';
  document.getElementById('tournSetupControls').style.display = 'none';
  document.getElementById('btnNextMatch').style.display = 'block';

  showToast(`🏆 Chaveamento ${UEFA_COMPS[activeCompId].short} com ${n} times gerado!`);
}

/* ===== TORNEIO ===== */
let tourn = { teams:[], bracket:[], idx:0, done:false };

function openTournamentMenu() { switchTab('torneio'); }

function generateTournament() {
  if (!requirePlayerNames()) return;
  champMode = false;
  document.body.classList.remove('ucl-mode');
  clearCompTheme();
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
    if (champMode && uclBadgeText) {
      const comp = UEFA_COMPS[activeCompId];
      uclBadgeText.textContent = `🏆 ${comp.short}`;
    }
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
    clearCompTheme();
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
