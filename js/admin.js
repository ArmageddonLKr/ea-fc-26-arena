// js/admin.js — FC 26 Arena · Painel Admin
// Controles: + / - por stat, toggle ativo, busca, importar/exportar

const STORAGE_KEY = 'fc26_teams_v2';
let teams   = [];
let editIdx = null;
let sortBy  = 'n';  // 'n' | 'ovr' | 'league'
let sortDir = 1;

/* ===== HELPERS ===== */
function getOVR(t) {
  return t.ovr != null ? t.ovr : Math.round((t.a + t.m + t.d) / 3);
}

function getLogoUrl(t) {
  if (t.logo && t.logo !== '' && t.logo !== null) return t.logo;
  if (t.logoId) return `./assets/logos/${t.logoId}`;
  return null;
}

function makeBadge(name, color) {
  const parts = (name||'??').split(/[\s&\-]+/).filter(Boolean);
  const initials = parts.map(w=>w[0]).join('').slice(0,3).toUpperCase();
  const c = color || '#c8102e';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 74">
    <path d="M32 3 L60 16 L60 40 C60 57 32 71 32 71 C32 71 4 57 4 40 L4 16 Z"
          fill="${c}" stroke="rgba(255,255,255,0.12)" stroke-width="1.5"/>
    <text x="32" y="46" text-anchor="middle"
          font-family="'Barlow Condensed',sans-serif"
          font-weight="900" font-size="${initials.length>=3?13:17}" fill="white">
      ${initials}
    </text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/* ===== INIT ===== */
async function init() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    teams = JSON.parse(saved);
  } else {
    try {
      const res = await fetch('./teams.json');
      teams = await res.json();
      save();
    } catch(e) {
      teams = [];
    }
  }
  // Calcula OVR de todos
  teams = teams.map(t => ({ ...t, ovr: Math.round((t.a + t.m + t.d) / 3) }));
  renderTeams();
}

/* ===== RENDER LISTA ===== */
function renderTeams() {
  const query  = (document.getElementById('searchInput')?.value || '').toLowerCase().trim();
  const league = document.getElementById('leagueFilterAdmin')?.value || 'all';

  let filtered = teams.filter(t => {
    const matchQ = !query ||
      t.n.toLowerCase().includes(query) ||
      (t.league||'').toLowerCase().includes(query) ||
      (t.s||'').toLowerCase().includes(query);
    const matchL = league === 'all' || t.league === league;
    return matchQ && matchL;
  });

  // Ordenação
  filtered = filtered.sort((a, b) => {
    if (sortBy === 'ovr')    return (getOVR(b) - getOVR(a)) * sortDir;
    if (sortBy === 'league') return a.league.localeCompare(b.league) * sortDir;
    return a.n.localeCompare(b.n) * sortDir;
  });

  const list  = document.getElementById('teamList');
  const label = document.getElementById('listLabel');
  const badge = document.getElementById('teamCountBadge');

  if(label) label.textContent = `${filtered.length} time${filtered.length!==1?'s':''}`;
  if(badge) badge.textContent = `${teams.length} Times`;

  if (!list) return;

  if (filtered.length === 0) {
    list.innerHTML = '<div class="empty-state">Nenhum time encontrado</div>';
    return;
  }

  list.innerHTML = filtered.map(t => {
    const realIdx = teams.indexOf(t);
    const ovr     = getOVR(t);
    const isActive = t.active !== false;
    const logoUrl  = getLogoUrl(t);
    const badgeUrl = makeBadge(t.n, t.c);
    const safeN    = t.n.replace(/'/g,"\\'").replace(/\\/g,'\\\\');

    const ovrClass = ovr >= 85 ? 'ovr-elite' : ovr >= 80 ? 'ovr-gold' : 'ovr-norm';

    return `
      <div class="team-row ${!isActive?'inactive':''}">
        <div class="team-row-logo">
          <img src="${logoUrl||badgeUrl}" alt="${t.n}"
               onerror="this.src='${badgeUrl}'"
               style="width:36px;height:36px;object-fit:contain;filter:drop-shadow(0 1px 4px rgba(0,0,0,0.5));">
        </div>
        <div class="team-row-info">
          <div class="team-row-name">${t.f||''} ${t.n}</div>
          <div class="team-row-meta">${t.league} · Ata ${t.a} · Med ${t.m} · Def ${t.d}</div>
        </div>
        <div class="team-row-ovr ${ovrClass}">${ovr}</div>
        <div class="team-row-actions">
          <button class="icon-btn toggle-btn ${isActive?'is-active':''}"
            onclick="toggleActive(${realIdx})" title="${isActive?'Ativo — clique p/ desativar':'Inativo — clique p/ ativar'}">
            ${isActive ? '✓' : '○'}
          </button>
          <button class="icon-btn" onclick="openEditModal(${realIdx})" title="Editar">✎</button>
          <button class="icon-btn del" onclick="deleteTeam(${realIdx})" title="Deletar">✕</button>
        </div>
      </div>`;
  }).join('');
}

/* ===== ORDENAÇÃO ===== */
function setSortBy(key) {
  if (sortBy === key) sortDir *= -1;
  else { sortBy = key; sortDir = 1; }
  renderTeams();
}

/* ===== TOGGLE ATIVO ===== */
function toggleActive(idx) {
  teams[idx].active = teams[idx].active === false ? true : false;
  save();
  renderTeams();
}

/* ===== EDIT MODAL ===== */
function openEditModal(idx) {
  editIdx = idx;
  const isNew = idx === null;
  document.getElementById('editModalTitle').textContent = isNew ? 'Novo Time' : 'Editar Time';

  const t = isNew ? {
    n:'', league:'Premier League', f:'🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    a:75, m:75, d:75, s:'', c:'#c8102e', logo:'', logoId:'', pid:'', active:true
  } : teams[idx];

  document.getElementById('fName').value   = t.n   || '';
  document.getElementById('fLeague').value = t.league || 'Premier League';
  document.getElementById('fFlag').value   = t.f   || '';
  document.getElementById('fStar').value   = t.s   || '';
  document.getElementById('fPid').value    = t.pid  || '';
  document.getElementById('fLogo').value   = t.logo || '';
  document.getElementById('fLogoId').value = t.logoId || '';
  document.getElementById('fColor').value    = t.c || '#c8102e';
  document.getElementById('fColorHex').value = t.c || '#c8102e';

  setStatVal('A', t.a || 75);
  setStatVal('M', t.m || 75);
  setStatVal('D', t.d || 75);
  updateOVRPreview();
  previewLogo();

  document.getElementById('editModal').classList.add('open');
}

function closeEditModal() {
  document.getElementById('editModal').classList.remove('open');
}

/* ===== CONTROLES DE STAT (+/-) ===== */
function setStatVal(stat, val) {
  const clamped = Math.max(60, Math.min(99, parseInt(val)||75));
  const input = document.getElementById(`f${stat}`);
  const disp  = document.getElementById(`f${stat}Val`);
  if(input) input.value = clamped;
  if(disp)  disp.textContent = clamped;
}

function adjustStat(stat, delta) {
  const input = document.getElementById(`f${stat}`);
  if (!input) return;
  setStatVal(stat, parseInt(input.value||75) + delta);
  updateOVRPreview();
}

function onStatInput(stat) {
  const input = document.getElementById(`f${stat}`);
  if (!input) return;
  setStatVal(stat, input.value);
  updateOVRPreview();
}

function updateOVRPreview() {
  const a = parseInt(document.getElementById('fA')?.value)||75;
  const m = parseInt(document.getElementById('fM')?.value)||75;
  const d = parseInt(document.getElementById('fD')?.value)||75;
  const ovr = Math.round((a+m+d)/3);
  const el = document.getElementById('ovrPreview');
  if(el) {
    el.textContent = ovr;
    el.className = 'ovr-preview-num ' + (ovr>=85?'ovr-elite':ovr>=80?'ovr-gold':'');
  }
}

/* ===== LOGO PREVIEW ===== */
function previewLogo() {
  const url  = document.getElementById('fLogo')?.value || '';
  const lid  = document.getElementById('fLogoId')?.value || '';
  const prev = document.getElementById('logoPreview');
  if (!prev) return;

  const src = url || (lid ? `./assets/logos/${lid}` : '');
  if (src) {
    prev.innerHTML = `<img src="${src}" alt="logo"
      style="width:100%;height:100%;object-fit:contain;"
      onerror="this.parentNode.innerHTML='<span style=\\'font-size:1.5rem;color:var(--muted)\\'>?</span>'">`;
  } else {
    prev.innerHTML = '<span style="font-size:1.5rem;color:var(--muted);">?</span>';
  }
}

function syncColorPicker() {
  const hex = document.getElementById('fColorHex')?.value || '';
  if (/^#[0-9a-fA-F]{6}$/.test(hex)) {
    const picker = document.getElementById('fColor');
    if(picker) picker.value = hex;
  }
}

function syncColorHex() {
  const val = document.getElementById('fColor')?.value || '';
  const hex = document.getElementById('fColorHex');
  if(hex) hex.value = val;
}

/* ===== SALVAR TIME ===== */
function saveTeam() {
  const name = document.getElementById('fName')?.value.trim();
  if (!name) { alert('Nome do clube é obrigatório!'); return; }

  const a = parseInt(document.getElementById('fA')?.value)||75;
  const m = parseInt(document.getElementById('fM')?.value)||75;
  const d = parseInt(document.getElementById('fD')?.value)||75;

  const t = {
    n:      name,
    f:      document.getElementById('fFlag')?.value.trim() || '',
    league: document.getElementById('fLeague')?.value || 'Premier League',
    a, m, d,
    ovr:    Math.round((a+m+d)/3),
    s:      document.getElementById('fStar')?.value.trim() || '',
    c:      document.getElementById('fColor')?.value || '#c8102e',
    logo:   document.getElementById('fLogo')?.value.trim() || null,
    logoId: document.getElementById('fLogoId')?.value.trim() || null,
    pid:    parseInt(document.getElementById('fPid')?.value)||null,
    active: editIdx !== null ? (teams[editIdx].active !== false) : true,
  };

  if (editIdx === null) {
    teams.push(t);
  } else {
    teams[editIdx] = { ...teams[editIdx], ...t };
  }

  save();
  closeEditModal();
  renderTeams();
  showAdminToast(editIdx===null ? '✅ Time adicionado!' : '✅ Time atualizado!');
}

/* ===== DELETAR ===== */
function deleteTeam(idx) {
  const name = teams[idx]?.n || '?';
  if (!confirm(`Deletar "${name}"?\n\nEssa ação não pode ser desfeita.`)) return;
  teams.splice(idx, 1);
  save();
  renderTeams();
  showAdminToast('🗑 Time removido');
}

/* ===== IMPORT / EXPORT / RESET ===== */
function exportJSON() {
  const blob = new Blob([JSON.stringify(teams, null, 2)], { type:'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = `fc26-teams-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function importJSON(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      if (!Array.isArray(data)) throw new Error('Formato inválido');
      teams = data.map(t => ({ ...t, ovr: Math.round(((t.a||75)+(t.m||75)+(t.d||75))/3) }));
      save();
      renderTeams();
      showAdminToast(`✅ ${teams.length} times importados!`);
    } catch(err) {
      alert('❌ Arquivo inválido. Precisa ser um JSON de times.');
    }
  };
  reader.readAsText(file);
  input.value = '';
}

function resetDB() {
  if (!confirm('Restaurar banco original de times?\n\nTodas as edições serão perdidas.')) return;
  localStorage.removeItem(STORAGE_KEY);
  fetch('./teams.json')
    .then(r => r.json())
    .then(data => {
      teams = data.map(t => ({ ...t, ovr: Math.round((t.a+t.m+t.d)/3) }));
      save();
      renderTeams();
      showAdminToast('✅ Banco restaurado!');
    })
    .catch(() => alert('❌ Erro ao buscar teams.json'));
}

/* ===== PERSIST ===== */
function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(teams));
}

/* ===== TOAST ADMIN ===== */
let _adminToastTimer;
function showAdminToast(msg) {
  const t = document.getElementById('adminToast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(_adminToastTimer);
  _adminToastTimer = setTimeout(() => t.classList.remove('show'), 2500);
}

/* ===== START ===== */
init();
