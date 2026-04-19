/* ═══ LOGO ENGINE ═══
 * Priority: team.logo (custom URL or explicit path)
 *        → ./assets/logos/<sanitized-name>.png  (auto — just drop the file)
 *        → LOGO_OVERRIDES (Sofascore CDN)
 *        → flag emoji fallback
 *
 * Naming convention for local files (assets/logos/):
 *   Barcelona.png · Real-Madrid.png · Bayern-Munchen.png
 *   Sanitise: strip accents, apostrophes → hyphens for spaces, keep alphanumeric
 */

export const LOGO_OVERRIDES = {
  // Premier League
  "Arsenal":             "https://api.sofascore.com/api/v1/team/42/image",
  "Aston Villa":         "https://api.sofascore.com/api/v1/team/40/image",
  "Bournemouth":         "https://api.sofascore.com/api/v1/team/60/image",
  "Brentford":           "https://api.sofascore.com/api/v1/team/50/image",
  "Brighton":            "https://api.sofascore.com/api/v1/team/30/image",
  "Burnley":             "https://api.sofascore.com/api/v1/team/336/image",
  "Chelsea":             "https://api.sofascore.com/api/v1/team/38/image",
  "Crystal Palace":      "https://api.sofascore.com/api/v1/team/7/image",
  "Everton":             "https://api.sofascore.com/api/v1/team/48/image",
  "Fulham":              "https://api.sofascore.com/api/v1/team/43/image",
  "Leeds United":        "https://api.sofascore.com/api/v1/team/66/image",
  "Liverpool":           "https://api.sofascore.com/api/v1/team/44/image",
  "Man City":            "https://api.sofascore.com/api/v1/team/17/image",
  "Man Utd":             "https://api.sofascore.com/api/v1/team/35/image",
  "Newcastle":           "https://api.sofascore.com/api/v1/team/39/image",
  "Nottm Forest":        "https://api.sofascore.com/api/v1/team/14/image",
  "Sunderland":          "https://api.sofascore.com/api/v1/team/45/image",
  "Tottenham":           "https://api.sofascore.com/api/v1/team/33/image",
  "West Ham":            "https://api.sofascore.com/api/v1/team/37/image",
  "Wolves":              "https://api.sofascore.com/api/v1/team/3/image",
  // La Liga
  "Alavés":              "https://api.sofascore.com/api/v1/team/2839/image",
  "Athletic Bilbao":     "https://api.sofascore.com/api/v1/team/2825/image",
  "Atlético Madrid":     "https://api.sofascore.com/api/v1/team/2836/image",
  "Barcelona":           "https://api.sofascore.com/api/v1/team/2817/image",
  "Celta Vigo":          "https://api.sofascore.com/api/v1/team/2826/image",
  "Elche":               "https://api.sofascore.com/api/v1/team/2855/image",
  "Mallorca":            "https://api.sofascore.com/api/v1/team/2861/image",
  "Osasuna":             "https://api.sofascore.com/api/v1/team/2838/image",
  "Real Betis":          "https://api.sofascore.com/api/v1/team/2858/image",
  "Real Madrid":         "https://api.sofascore.com/api/v1/team/2829/image",
  "Real Sociedad":       "https://api.sofascore.com/api/v1/team/2859/image",
  "Sevilla FC":          "https://api.sofascore.com/api/v1/team/2833/image",
  "Valencia CF":         "https://api.sofascore.com/api/v1/team/2828/image",
  "Villarreal CF":       "https://api.sofascore.com/api/v1/team/2827/image",
  // Bundesliga
  "FC Köln":             "https://api.sofascore.com/api/v1/team/2682/image",
  "Augsburg":            "https://api.sofascore.com/api/v1/team/2679/image",
  "Bayer Leverkusen":    "https://api.sofascore.com/api/v1/team/2681/image",
  "Bayern München":      "https://api.sofascore.com/api/v1/team/2672/image",
  "Borussia Dortmund":   "https://api.sofascore.com/api/v1/team/2673/image",
  "Eintracht Frankfurt": "https://api.sofascore.com/api/v1/team/2685/image",
  "Mainz 05":            "https://api.sofascore.com/api/v1/team/2686/image",
  "M'gladbach":          "https://api.sofascore.com/api/v1/team/2676/image",
  "RB Leipzig":          "https://api.sofascore.com/api/v1/team/37296/image",
  "Stuttgart":           "https://api.sofascore.com/api/v1/team/2680/image",
  "Wolfsburg":           "https://api.sofascore.com/api/v1/team/2674/image",
  // Serie A
  "Atalanta":            "https://api.sofascore.com/api/v1/team/2695/image",
  "Bologna":             "https://api.sofascore.com/api/v1/team/2696/image",
  "Cagliari":            "https://api.sofascore.com/api/v1/team/2711/image",
  "Como":                "https://api.sofascore.com/api/v1/team/2722/image",
  "Cremonese":           "https://api.sofascore.com/api/v1/team/2748/image",
  "Fiorentina":          "https://api.sofascore.com/api/v1/team/2716/image",
  "Genoa":               "https://api.sofascore.com/api/v1/team/2712/image",
  "Inter Milan":         "https://api.sofascore.com/api/v1/team/2697/image",
  "Juventus":            "https://api.sofascore.com/api/v1/team/2693/image",
  "Lazio":               "https://api.sofascore.com/api/v1/team/2699/image",
  "Lecce":               "https://api.sofascore.com/api/v1/team/2750/image",
  "Milan":               "https://api.sofascore.com/api/v1/team/2692/image",
  "Napoli":              "https://api.sofascore.com/api/v1/team/2714/image",
  "Parma":               "https://api.sofascore.com/api/v1/team/2720/image",
  "Pisa":                "https://api.sofascore.com/api/v1/team/2738/image",
  "Roma":                "https://api.sofascore.com/api/v1/team/2702/image",
  "Sassuolo":            "https://api.sofascore.com/api/v1/team/2718/image",
  "Torino":              "https://api.sofascore.com/api/v1/team/2706/image",
  "Udinese":             "https://api.sofascore.com/api/v1/team/2704/image",
  "Verona":              "https://api.sofascore.com/api/v1/team/2709/image",
  // Ligue 1
  "Lille OSC":           "https://api.sofascore.com/api/v1/team/2651/image",
  "Lyon":                "https://api.sofascore.com/api/v1/team/2643/image",
  "Marseille":           "https://api.sofascore.com/api/v1/team/2648/image",
  "AS Monaco":           "https://api.sofascore.com/api/v1/team/2636/image",
  "Paris FC":            "https://api.sofascore.com/api/v1/team/3958/image",
  "PSG":                 "https://api.sofascore.com/api/v1/team/1644/image",
  "Strasbourg":          "https://api.sofascore.com/api/v1/team/2655/image",
  // Eredivisie
  "Ajax":                "https://api.sofascore.com/api/v1/team/2657/image",
  "AZ Alkmaar":          "https://api.sofascore.com/api/v1/team/2666/image",
  "Feyenoord":           "https://api.sofascore.com/api/v1/team/2654/image",
  "PSV Eindhoven":       "https://api.sofascore.com/api/v1/team/2664/image",
  // Liga Portugal
  "Benfica":             "https://api.sofascore.com/api/v1/team/6907/image",
  "Braga":               "https://api.sofascore.com/api/v1/team/6909/image",
  "Porto":               "https://api.sofascore.com/api/v1/team/6912/image",
  "Sporting CP":         "https://api.sofascore.com/api/v1/team/6914/image",
  // Swiss
  "Basel":               "https://api.sofascore.com/api/v1/team/2869/image",
  "Young Boys":          "https://api.sofascore.com/api/v1/team/2870/image",
  // Saudi
  "Al-Ahli":             "https://api.sofascore.com/api/v1/team/2932/image",
  "Al-Hilal":            "https://api.sofascore.com/api/v1/team/2931/image",
  "Al-Ittihad":          "https://api.sofascore.com/api/v1/team/2946/image",
  "Al Nassr":            "https://api.sofascore.com/api/v1/team/2936/image",
  // Argentina
  "Boca Juniors":        "https://api.sofascore.com/api/v1/team/6581/image",
  "Estudiantes":         "https://api.sofascore.com/api/v1/team/6586/image",
  "Racing Club":         "https://api.sofascore.com/api/v1/team/6584/image",
  "River Plate":         "https://api.sofascore.com/api/v1/team/6570/image",
  "Rosario Central":     "https://api.sofascore.com/api/v1/team/6601/image",
  // MLS
  "Inter Miami":         "https://api.sofascore.com/api/v1/team/335158/image",
  "LA Galaxy":           "https://api.sofascore.com/api/v1/team/137042/image",
  "LAFC":                "https://api.sofascore.com/api/v1/team/284025/image",
  "Whitecaps FC":        "https://api.sofascore.com/api/v1/team/140179/image",
  // Turkey
  "Beşiktaş":            "https://api.sofascore.com/api/v1/team/2634/image",
  "Fenerbahçe":          "https://api.sofascore.com/api/v1/team/2637/image",
  "Galatasaray":         "https://api.sofascore.com/api/v1/team/2638/image"
};

export const PLAYER_IDS = {
  "Harry Kane": 36956, "Serhou Guirassy": 342229,
  "Riyad Mahrez": 84798, "Karim Benzema": 3781, "Cristiano Ronaldo": 14981,
  "Ángel Di María": 50056, "Iñaki Williams": 818671,
  "Antoine Griezmann": 85975, "Julián Álvarez": 979606,
  "Raphinha Belloli": 349990, "Lamine Yamal": 1157765,
  "Vinícius Jr": 889569, "Kylian Mbappé": 1057814,
  "Lionel Messi": 24116, "Luis Suárez": 2456,
  "Son Heung-min": 104438,
  "Bukayo Saka": 517603, "Mohamed Salah": 80654,
  "Florian Wirtz": 948513, "Erling Haaland": 1109028,
  "Bruno Fernandes": 236088, "Rafael Leão": 849591,
  "Luka Modrić": 5846, "Kevin De Bruyne": 70958,
  "Paulo Dybala": 105288
};

export function getPlayerFaceUrl(pid) {
  if (!pid) return null;
  return `https://api.sofascore.com/api/v1/player/${pid}/image`;
}

// Convert team name → safe filename: "Bayern München" → "Bayern-Munchen"
function sanitizeName(name) {
  return name
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[''']/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9-]/g, '');
}

export const FM26_IDS = {
  // Premier League
  "Arsenal": 602, "Aston Villa": 603, "Bournemouth": 600, "Brentford": 617,
  "Brighton": 618, "Burnley": 622, "Chelsea": 630, "Crystal Palace": 642,
  "Everton": 650, "Fulham": 654, "Leeds United": 671, "Liverpool": 676,
  "Man City": 679, "Man Utd": 680, "Newcastle": 688, "Nottm Forest": 692,
  "Sunderland": 722, "Tottenham": 728, "West Ham": 735, "Wolves": 740,
  // La Liga
  "Alavés": 1688, "Athletic Bilbao": 1664, "Atlético Madrid": 1687,
  "Barcelona": 1708, "Celta Vigo": 1724, "Elche": 1707, "Mallorca": 1726,
  "Osasuna": 1685, "Real Betis": 1733, "Real Madrid": 1736,
  "Real Sociedad": 1742, "Sevilla FC": 1759, "Valencia CF": 1775, "Villarreal CF": 1777,
  // Bundesliga
  "FC Köln": 916, "Augsburg": 2238, "Bayer Leverkusen": 901, "Bayern München": 915,
  "Borussia Dortmund": 907, "M'gladbach": 908, "Eintracht Frankfurt": 912,
  "Mainz 05": 918, "RB Leipzig": 91013388, "Stuttgart": 960, "Wolfsburg": 961,
  // Serie A
  "Atalanta": 1106, "Bologna": 1111, "Cagliari": 1114, "Como": 1123,
  "Cremonese": 1125, "Fiorentina": 1129, "Genoa": 1132, "Inter Milan": 1135,
  "Juventus": 1139, "Lazio": 1140, "Lecce": 1141, "Milan": 1099,
  "Napoli": 1150, "Parma": 1156, "Pisa": 2215, "Roma": 1100,
  "Sassuolo": 3800256, "Torino": 1174, "Udinese": 1178, "Verona": 2201,
  // Ligue 1
  "Lille OSC": 858, "Lyon": 865, "Marseille": 866, "AS Monaco": 826,
  "Paris FC": 867, "PSG": 868, "Strasbourg": 872,
  // Eredivisie
  "Feyenoord": 2000180086, "AZ Alkmaar": 2000263050, "PSV Eindhoven": 37087233,
  // Liga Portugal
  "Benfica": 1487, "Braga": 1488, "Porto": 1478, "Sporting CP": 1489,
  // Saudi Pro League
  "Al-Ahli": 102850, "Al-Hilal": 102852, "Al-Ittihad": 106063, "Al Nassr": 102862,
  // MLS
  "Inter Miami": 72052048, "LA Galaxy": 1907, "LAFC": 72049313, "Whitecaps FC": 4400014,
  // Argentina
  "Boca Juniors": 82, "Estudiantes": 85, "Racing Club": 93,
  "River Plate": 94, "Rosario Central": 95,
  // Super League CH
  "Basel": 1849, "Young Boys": 1847,
  // Süper Lig
  "Beşiktaş": 1866, "Fenerbahçe": 1870, "Galatasaray": 1871,
};

export function getLogoUrl(team) {
  if (team.logo) return team.logo;
  if (FM26_IDS[team.n]) return `./assets/logos/${FM26_IDS[team.n]}.png`;
  if (LOGO_OVERRIDES[team.n]) return LOGO_OVERRIDES[team.n];
  return `./assets/logos/${sanitizeName(team.n)}.png`;
}

// Renders logo with fallback chain:
//   team.logo → ./assets/logos/<name>.png → ./assets/logos/<fm26-id>.png → Sofascore CDN → emoji
export function renderLogo(wrapEl, team) {
  wrapEl.innerHTML = '';
  const urls = [];
  if (team.logo) urls.push(team.logo);
  urls.push(`./assets/logos/${sanitizeName(team.n)}.png`);
  if (FM26_IDS[team.n]) urls.push(`./assets/logos/${FM26_IDS[team.n]}.png`);
  if (LOGO_OVERRIDES[team.n]) urls.push(LOGO_OVERRIDES[team.n]);

  if (urls.length === 0) {
    wrapEl.innerHTML = `<span class="logo-fallback">${team.f || '🌐'}</span>`;
    return;
  }

  const img = document.createElement('img');
  img.style.cssText = 'width:100%;height:100%;object-fit:contain;display:block;';
  img.alt = team.n;
  img.loading = 'lazy';

  let idx = 0;
  img.onerror = () => {
    idx++;
    if (idx < urls.length) {
      img.src = urls[idx];
    } else {
      wrapEl.innerHTML = `<span class="logo-fallback">${team.f || '🌐'}</span>`;
    }
  };
  img.src = urls[0];
  wrapEl.appendChild(img);
}

export async function fetchTeamsData() {
  const custom = localStorage.getItem('fc26_custom_db');
  if (custom) {
    try { return JSON.parse(custom); } catch(e) { /* fall through */ }
  }
  try {
    const res = await fetch('./teams.json');
    if (!res.ok) throw new Error('Teams not found');
    return await res.json();
  } catch (err) {
    console.error(err);
    return [];
  }
}
