// js/app.js — FC 26 Arena · Competitive Engine
// Motor principal: sorteio, placar, torneio, estatísticas

/* ===== BANCO DE TIMES EMBUTIDO (fallback para file://) ===== */
const TEAMS_BUILTIN = [{"n":"FC Köln","f":"🇩🇪","league":"Bundesliga","i":"🔴⚪","s":"Kaminski & Schwäbe","c":"#e30613","a":74,"m":74,"d":71,"logoId":"916.png"},{"n":"Augsburg","f":"🇩🇪","league":"Bundesliga","i":"🔴🟢","s":"Claude-Maurice","c":"#ba3733","a":71,"m":75,"d":74,"logoId":"2238.png"},{"n":"Bayer Leverkusen","f":"🇩🇪","league":"Bundesliga","i":"🔴⚫","s":"Patrik Schick","c":"#e32219","a":85,"m":80,"d":78,"logoId":"901.png"},{"n":"Bayern München","f":"🇩🇪","league":"Bundesliga","i":"🔴⚪","s":"Harry Kane & Jamal Musiala","c":"#dd0000","a":90,"m":85,"d":83,"pid":36956,"logoId":"915.png"},{"n":"Borussia Dortmund","f":"🇩🇪","league":"Bundesliga","i":"🟡⚫","s":"Serhou Guirassy","c":"#FDE100","a":82,"m":79,"d":81,"pid":342229,"logoId":"907.png"},{"n":"Eintracht Frankfurt","f":"🇩🇪","league":"Bundesliga","i":"⚪🔴","s":"Mario Götze & Burkardt","c":"#e1000f","a":82,"m":77,"d":78,"logoId":"912.png"},{"n":"Mainz 05","f":"🇩🇪","league":"Bundesliga","i":"🔴⚪","s":"Nadiem Amiri","c":"#c3141e","a":73,"m":76,"d":74,"logoId":"918.png"},{"n":"M'gladbach","f":"🇩🇪","league":"Bundesliga","i":"⚪🟢","s":"Franck Honorat","c":"#009a44","a":76,"m":75,"d":75,"logoId":"908.png"},{"n":"RB Leipzig","f":"🇩🇪","league":"Bundesliga","i":"⚪🔴","s":"Péter Gulácsi","c":"#de0039","a":78,"m":78,"d":79,"logoId":"91013388.png"},{"n":"Stuttgart","f":"🇩🇪","league":"Bundesliga","i":"⚪🔴","s":"Angelo Stiller","c":"#e30613","a":80,"m":79,"d":77,"logoId":"960.png"},{"n":"Wolfsburg","f":"🇩🇪","league":"Bundesliga","i":"🟢⚪","s":"Mohamed Amoura","c":"#65b32e","a":76,"m":76,"d":74,"logoId":"961.png"},{"n":"Al-Ahli","f":"🇸🇦","league":"Saudi Pro League","i":"🟢⚪","s":"Riyad Mahrez","c":"#006400","a":77,"m":74,"d":73,"pid":84798,"logoId":"102850.png"},{"n":"Al-Hilal","f":"🇸🇦","league":"Saudi Pro League","i":"🔵⚪","s":"Karim Benzema","c":"#3b6eff","a":79,"m":81,"d":74,"pid":3781,"logoId":"102852.png"},{"n":"Al-Ittihad","f":"🇸🇦","league":"Saudi Pro League","i":"⚫🟡","s":"Moussa Diaby","c":"#fdb912","a":76,"m":76,"d":72,"logoId":"106063.png"},{"n":"Al Nassr","f":"🇸🇦","league":"Saudi Pro League","i":"🟡🔵","s":"Cristiano Ronaldo","c":"#ffe600","a":85,"m":77,"d":74,"pid":14981,"logoId":"102862.png"},{"n":"Boca Juniors","f":"🇦🇷","league":"Argentina","i":"🔵🟡","s":"Leandro Paredes","c":"#003366","a":74,"m":72,"d":75,"logoId":"82.png"},{"n":"Estudiantes","f":"🇦🇷","league":"Argentina","i":"🔴⚪","s":"Guido Carrillo","c":"#e30613","a":76,"m":73,"d":73,"logoId":"85.png"},{"n":"Racing Club","f":"🇦🇷","league":"Argentina","i":"🔵⚪","s":"Santiago Sosa","c":"#6caee0","a":74,"m":73,"d":73,"logoId":"93.png"},{"n":"River Plate","f":"🇦🇷","league":"Argentina","i":"⚪🔴","s":"Marcos Acuña","c":"#cc0000","a":74,"m":74,"d":74,"logoId":"94.png"},{"n":"Rosario Central","f":"🇦🇷","league":"Argentina","i":"🔵🟡","s":"Ángel Di María","c":"#003a70","a":72,"m":73,"d":70,"pid":50056,"logoId":"95.png"},{"n":"Alavés","f":"🇪🇸","league":"La Liga","i":"🔵⚪","s":"Antonio Blanco","c":"#005eb8","a":76,"m":73,"d":74,"logoId":"1688.png"},{"n":"Athletic Bilbao","f":"🇪🇸","league":"La Liga","i":"🔴⚪","s":"Iñaki Williams & Nico Williams","c":"#e30613","a":78,"m":81,"d":79,"pid":818671,"logoId":"1664.png"},{"n":"Atlético Madrid","f":"🇪🇸","league":"La Liga","i":"🔴⚪","s":"Griezmann & Julián Álvarez","c":"#cb3524","a":84,"m":81,"d":81,"pid":85975,"logoId":"1687.png"},{"n":"Barcelona","f":"🇪🇸","league":"La Liga","i":"🔵🔴","s":"Raphinha & Lamine Yamal","c":"#004d98","a":87,"m":85,"d":83,"pid":349990,"logoId":"1708.png"},{"n":"Celta Vigo","f":"🇪🇸","league":"La Liga","i":"🔵⚪","s":"Iago Aspas","c":"#6caee0","a":79,"m":75,"d":77,"logoId":"1724.png"},{"n":"Elche","f":"🇪🇸","league":"La Liga","i":"🟢⚪","s":"André Silva","c":"#00a550","a":74,"m":73,"d":74,"logoId":"1707.png"},{"n":"Mallorca","f":"🇪🇸","league":"La Liga","i":"🔴⚫","s":"Sergi Darder & Vedat Muriqi","c":"#e30613","a":77,"m":75,"d":76,"logoId":"1726.png"},{"n":"Osasuna","f":"🇪🇸","league":"La Liga","i":"🔴🔵","s":"Aimar Oroz & Javi Galán","c":"#0a346f","a":81,"m":77,"d":76,"logoId":"1685.png"},{"n":"Real Betis","f":"🇪🇸","league":"La Liga","i":"🟢⚪","s":"Antony & Isco Alarcón","c":"#00b140","a":80,"m":78,"d":77,"logoId":"1733.png"},{"n":"Real Madrid","f":"🇪🇸","league":"La Liga","i":"⚪⚪","s":"Vinícius Jr & Kylian Mbappé","c":"#c0a060","a":90,"m":84,"d":83,"pid":889569,"logoId":"1736.png"},{"n":"Real Sociedad","f":"🇪🇸","league":"La Liga","i":"🔵⚪","s":"Takefusa Kubo & Oyarzabal","c":"#0067b1","a":83,"m":78,"d":76,"logoId":"1742.png"},{"n":"Sevilla FC","f":"🇪🇸","league":"La Liga","i":"⚪🔴","s":"Alex Sánchez & Djibril Sow","c":"#cccccc","a":75,"m":75,"d":76,"logoId":"1759.png"},{"n":"Valencia CF","f":"🇪🇸","league":"La Liga","i":"⚪⚫","s":"José Gayà & Pepelu","c":"#cccccc","a":76,"m":75,"d":74,"logoId":"1775.png"},{"n":"Villarreal CF","f":"🇪🇸","league":"La Liga","i":"🟡🟡","s":"Dani Parejo & Gerard Moreno","c":"#fde100","a":80,"m":79,"d":76,"logoId":"1777.png"},{"n":"Inter Miami","f":"🇺🇸","league":"MLS","i":"🌸⚫","s":"Lionel Messi & Luis Suárez","c":"#f7b5cd","a":80,"m":72,"d":69,"pid":24116,"logoId":"72052048.png"},{"n":"LA Galaxy","f":"🇺🇸","league":"MLS","i":"⚪🔵","s":"Marco Reus","c":"#cccccc","a":72,"m":70,"d":69,"logoId":"1907.png"},{"n":"LAFC","f":"🇺🇸","league":"MLS","i":"⚫🟡","s":"Son Heung-min","c":"#c39300","a":77,"m":71,"d":70,"pid":104438,"logoId":"72049313.png"},{"n":"Whitecaps FC","f":"🇨🇦","league":"MLS","i":"🔵⚪","s":"Thomas Müller","c":"#009bc8","a":75,"m":73,"d":67,"logoId":"4400014.png"},{"n":"Lille OSC","f":"🇫🇷","league":"Ligue 1","i":"🔴🔵","s":"Olivier Giroud","c":"#e01e37","a":77,"m":77,"d":76,"logoId":"858.png"},{"n":"Lyon","f":"🇫🇷","league":"Ligue 1","i":"⚪🔵","s":"Endrick Felipe","c":"#cccccc","a":76,"m":78,"d":77,"logoId":"865.png"},{"n":"Marseille","f":"🇫🇷","league":"Ligue 1","i":"⚪🔵","s":"Aubameyang & Mason Greenwood","c":"#2598d5","a":80,"m":79,"d":79,"logoId":"866.png"},{"n":"AS Monaco","f":"🇨🇵","league":"Ligue 1","i":"🔴⚪","s":"Paul Pogba","c":"#e30613","a":79,"m":77,"d":77,"logoId":"826.png"},{"n":"PSG","f":"🇫🇷","league":"Ligue 1","i":"🔵🔴","s":"Dembélé & Kvaratskhelia","c":"#004170","a":85,"m":86,"d":86,"logoId":"868.png"},{"n":"Ajax","f":"🇳🇱","league":"Eredivisie","i":"⚪🔴","s":"Wout Weghorst","c":"#cc0000","a":76,"m":74,"d":73,"logoId":"992.png"},{"n":"AZ Alkmaar","f":"🇳🇱","league":"Eredivisie","i":"🔴⚪","s":"Weslley Patati","c":"#db0d0d","a":75,"m":73,"d":73,"logoId":"2000263050.png"},{"n":"Feyenoord","f":"🇳🇱","league":"Eredivisie","i":"🔴⚪","s":"Quinten Timber","c":"#cc0000","a":77,"m":75,"d":74,"logoId":"2000180086.png"},{"n":"PSV Eindhoven","f":"🇳🇱","league":"Eredivisie","i":"🔴⚪","s":"Ivan Perisic","c":"#cc0000","a":77,"m":78,"d":76,"logoId":"37087233.png"},{"n":"Arsenal","f":"🏴󠁧󠁢󠁥󠁮󠁧󠁿","league":"Premier League","i":"🔴⚪","s":"Bukayo Saka & Viktor Gyökeres","c":"#EF0107","a":84,"m":85,"d":85,"pid":517603,"logoId":"602.png"},{"n":"Aston Villa","f":"🏴󠁧󠁢󠁥󠁮󠁧󠁿","league":"Premier League","i":"🟣🔵","s":"Ollie Watkins & Morgan Rogers","c":"#670E36","a":82,"m":80,"d":80,"logoId":"603.png"},{"n":"Bournemouth","f":"🏴󠁧󠁢󠁥󠁮󠁧󠁿","league":"Premier League","i":"🔴⚫","s":"Evanilson Lima & Rayan Vitor","c":"#da291c","a":80,"m":78,"d":77,"logoId":"600.png"},{"n":"Brentford","f":"🏴󠁧󠁢󠁥󠁮󠁧󠁿","league":"Premier League","i":"🔴⚪","s":"Igor Thiago & Mikkel Damsgaard","c":"#e30613","a":81,"m":78,"d":77,"logoId":"617.png"},{"n":"Brighton","f":"🏴󠁧󠁢󠁥󠁮󠁧󠁿","league":"Premier League","i":"🔵⚪","s":"Kaoru Mitoma","c":"#0057b8","a":80,"m":79,"d":78,"logoId":"618.png"},{"n":"Burnley","f":"🏴󠁧󠁢󠁥󠁮󠁧󠁿","league":"Premier League","i":"🟣🔵","s":"Kyle Walker","c":"#6c1d45","a":75,"m":75,"d":75,"logoId":"622.png"},{"n":"Chelsea","f":"🏴󠁧󠁢󠁥󠁮󠁧󠁿","league":"Premier League","i":"🔵⚪","s":"Estêvão Willian & João Pedro","c":"#034694","a":79,"m":83,"d":80,"logoId":"630.png"},{"n":"Crystal Palace","f":"🏴󠁧󠁢󠁥󠁮󠁧󠁿","league":"Premier League","i":"🔵🔴","s":"Yeremy Pino","c":"#1b458f","a":76,"m":78,"d":77,"logoId":"642.png"},{"n":"Everton","f":"🏴󠁧󠁢󠁥󠁮󠁧󠁿","league":"Premier League","i":"🔵⚪","s":"Jordan Pickford","c":"#003399","a":76,"m":78,"d":77,"logoId":"650.png"},{"n":"Fulham","f":"🏴󠁧󠁢󠁥󠁮󠁧󠁿","league":"Premier League","i":"⚪⚫","s":"Bernd Leno","c":"#aaaaaa","a":78,"m":78,"d":78,"logoId":"654.png"},{"n":"Leeds United","f":"🏴󠁧󠁢󠁥󠁮󠁧󠁿","league":"Premier League","i":"⚪🟡","s":"Lucas Perri","c":"#cccccc","a":76,"m":77,"d":76,"logoId":"671.png"},{"n":"Liverpool","f":"🏴󠁧󠁢󠁥󠁮󠁧󠁿","league":"Premier League","i":"🔴🔴","s":"Mohamed Salah & Florian Wirtz","c":"#c8102e","a":86,"m":85,"d":84,"pid":80654,"logoId":"676.png"},{"n":"Man City","f":"🏴󠁧󠁢󠁥󠁮󠁧󠁿","league":"Premier League","i":"🔵⚪","s":"Erling Haaland & Rayan Cherki","c":"#6fc7ff","a":85,"m":85,"d":82,"pid":1109028,"logoId":"679.png"},{"n":"Man Utd","f":"🏴󠁧󠁢󠁥󠁮󠁧󠁿","league":"Premier League","i":"🔴⚫","s":"Bruno Fernandes & Matheus Cunha","c":"#da291c","a":82,"m":82,"d":79,"pid":236088,"logoId":"680.png"},{"n":"Newcastle","f":"🏴󠁧󠁢󠁥󠁮󠁧󠁿","league":"Premier League","i":"⚫⚪","s":"Anthony Gordon & Bruno Guimarães","c":"#555555","a":80,"m":81,"d":80,"logoId":"688.png"},{"n":"Nottm Forest","f":"🏴󠁧󠁢󠁥󠁮󠁧󠁿","league":"Premier League","i":"🔴⚪","s":"Igor Jesus & Chris Wood","c":"#dd0000","a":77,"m":78,"d":80,"logoId":"692.png"},{"n":"Sunderland","f":"🏴󠁧󠁢󠁥󠁮󠁧󠁿","league":"Premier League","i":"🔴⚪","s":"Granit Xhaka & Montassar Talbi","c":"#cc0000","a":76,"m":78,"d":78,"logoId":"722.png"},{"n":"Tottenham","f":"🏴󠁧󠁢󠁥󠁮󠁧󠁿","league":"Premier League","i":"⚪🔵","s":"James Maddison & Dominic Solanke","c":"#aaaaaa","a":79,"m":79,"d":80,"logoId":"728.png"},{"n":"West Ham","f":"🏴󠁧󠁢󠁥󠁮󠁧󠁿","league":"Premier League","i":"🟣🔵","s":"Jarrod Bowen & Taty Castellanos","c":"#7a263a","a":76,"m":78,"d":77,"logoId":"735.png"},{"n":"Wolves","f":"🏴󠁧󠁢󠁥󠁮󠁧󠁿","league":"Premier League","i":"🟠⚫","s":"João Gomes & José Sá","c":"#fdb913","a":74,"m":75,"d":74,"logoId":"740.png"},{"n":"Atalanta","f":"🇮🇹","league":"Serie A","i":"🔵⚫","s":"Marten de Roon & Éderson","c":"#1f2f57","a":77,"m":78,"d":78,"logoId":"1106.png"},{"n":"Bologna","f":"🇮🇹","league":"Serie A","i":"🔴🔵","s":"Riccardo Orsolini","c":"#a6192e","a":76,"m":78,"d":75,"logoId":"1111.png"},{"n":"Cagliari","f":"🇮🇹","league":"Serie A","i":"🔴🔵","s":"Andrea Belotti","c":"#00236a","a":74,"m":73,"d":73,"logoId":"1114.png"},{"n":"Como","f":"🇮🇹","league":"Serie A","i":"🔵⚪","s":"Nico Paz","c":"#0070b0","a":77,"m":77,"d":74,"logoId":"1123.png"},{"n":"Fiorentina","f":"🇮🇹","league":"Serie A","i":"🟣⚪","s":"Moise Kean","c":"#4f2c8f","a":77,"m":74,"d":75,"logoId":"1129.png"},{"n":"Inter Milan","f":"🇮🇹","league":"Serie A","i":"🔵⚫","s":"Lautaro Martínez & Nicolò Barella","c":"#0068a8","a":86,"m":83,"d":83,"logoId":"1135.png"},{"n":"Juventus","f":"🇮🇹","league":"Serie A","i":"⚫⚪","s":"Gleison Bremer & Kenan Yıldız","c":"#aaaaaa","a":81,"m":80,"d":80,"logoId":"1139.png"},{"n":"Lazio","f":"🇮🇹","league":"Serie A","i":"🔵⚪","s":"Mattia Zaccagni","c":"#87d8f7","a":77,"m":77,"d":76,"logoId":"1140.png"},{"n":"Milan","f":"🇮🇹","league":"Serie A","i":"🔴⚫","s":"Rafael Leão & Luka Modrić","c":"#fb090b","a":84,"m":82,"d":77,"pid":849591,"logoId":"1099.png"},{"n":"Napoli","f":"🇮🇹","league":"Serie A","i":"🔵⚪","s":"Kevin De Bruyne & Scott McTominay","c":"#003e7e","a":79,"m":82,"d":81,"pid":70958,"logoId":"1150.png"},{"n":"Roma","f":"🇮🇹","league":"Serie A","i":"🟤🟠","s":"Paulo Dybala & Wesley França","c":"#8e1f2f","a":78,"m":79,"d":80,"pid":105288,"logoId":"1100.png"},{"n":"Sassuolo","f":"🇮🇹","league":"Serie A","i":"🟢⚫","s":"Domenico Berardi","c":"#00a859","a":77,"m":75,"d":72,"logoId":"3800256.png"},{"n":"Torino","f":"🇮🇹","league":"Serie A","i":"🟤⚪","s":"Ivan Ilić & Duván Zapata","c":"#8a1e2b","a":78,"m":72,"d":74,"logoId":"1174.png"},{"n":"Udinese","f":"🇮🇹","league":"Serie A","i":"⚫⚪","s":"Nicolò Zaniolo","c":"#555555","a":73,"m":73,"d":73,"logoId":"1178.png"},{"n":"Benfica","f":"🇵🇹","league":"Liga Portugal","i":"🔴⚪","s":"Vangelis Pavlidis","c":"#cc0000","a":80,"m":79,"d":77,"logoId":"1487.png"},{"n":"Braga","f":"🇵🇹","league":"Liga Portugal","i":"🔴⚪","s":"Ricardo Horta","c":"#cc0000","a":76,"m":75,"d":73,"logoId":"1488.png"},{"n":"Porto","f":"🇵🇹","league":"Liga Portugal","i":"🔵⚪","s":"Alan Varela","c":"#004d9c","a":73,"m":78,"d":78,"logoId":"1478.png"},{"n":"Sporting CP","f":"🇵🇹","league":"Liga Portugal","i":"🟢⚪","s":"Morten Hjulmand","c":"#008057","a":78,"m":80,"d":77,"logoId":"1489.png"},{"n":"Beşiktaş","f":"🇹🇷","league":"Süper Lig","i":"⚫⚪","s":"Orkun Kökçü","c":"#555555","a":73,"m":75,"d":74,"logoId":"1866.png"},{"n":"Fenerbahçe","f":"🇹🇷","league":"Süper Lig","i":"🟡🔵","s":"Ederson Santana","c":"#002d72","a":81,"m":79,"d":76,"logoId":"1870.png"},{"n":"Galatasaray","f":"🇹🇷","league":"Süper Lig","i":"🟡🔴","s":"Victor Osimhen","c":"#a90432","a":83,"m":80,"d":78,"pid":946846,"logoId":"1871.png"}];

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
  // Garante que o splash some sempre, mesmo que dê erro
  const splashTimer = setTimeout(hideSplash, 3000);

  try {
    // Carrega settings
    try {
      const s = JSON.parse(localStorage.getItem(SK.settings) || '{}');
      cfg = { ...cfg, ...s };
    } catch(e) {}

    // Carrega times: localStorage → fetch → fallback embutido
    try {
      const saved = localStorage.getItem(SK.teams);
      if (saved) {
        teams = JSON.parse(saved);
      } else {
        try {
          const res = await fetch('./teams.json');
          if (!res.ok) throw new Error('HTTP ' + res.status);
          teams = await res.json();
          try { localStorage.setItem(SK.teams, JSON.stringify(teams)); } catch(e) {}
        } catch(fetchErr) {
          console.warn('[FC26] fetch falhou, usando banco embutido:', fetchErr.message);
          teams = TEAMS_BUILTIN;
          try { localStorage.setItem(SK.teams, JSON.stringify(teams)); } catch(e) {}
        }
      }
    } catch(e) {
      console.error('[FC26] Erro ao carregar times:', e);
      teams = TEAMS_BUILTIN;
    }

    // Garante que teams nunca é vazio
    if (!teams || teams.length === 0) teams = TEAMS_BUILTIN;

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
    teams = TEAMS_BUILTIN;
    rebuildPool();
  }

  // Esconde splash (antecipa o timer de segurança)
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
  const pct = v => `${Math.round(Math.max(0, Math.min(100, ((v-60)/39)*100))}%`;
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
