import { fetchTeamsData, LOGO_OVERRIDES, FM26_IDS } from './teams.js';

let teams = [];

function getOVR(t) {
  return Math.min(Math.max(Math.round(t.a * 0.3 + t.m * 0.4 + t.d * 0.3), 60), 99);
}

function save() {
  localStorage.setItem('fc26_custom_db', JSON.stringify(teams));
}

function sanitizeName(name) {
  return name
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[''']/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9-]/g, '');
}

function getLogoUrl(t) {
  if (t.logo) return t.logo;
  if (FM26_IDS[t.n]) return `./assets/logos/${FM26_IDS[t.n]}.png`;
  if (LOGO_OVERRIDES[t.n]) return LOGO_OVERRIDES[t.n];
  return `./assets/logos/${sanitizeName(t.n)}.png`;
}

window.renderTeams = function() {
  const q = (document.getElementById('searchInput').value || '').toLowerCase();
  const filtered = teams.filter(t =>
    t.n.toLowerCase().includes(q) || (t.league || '').toLowerCase().includes(q)
  );
  document.getElementById('listLabel').textContent = `${filtered.length} time${filtered.length !== 1 ? 's' : ''}`;
  document.getElementById('teamCountBadge').textContent = `${teams.length} Times`;

  const list = document.getElementById('teamList');
  if (filtered.length === 0) {
    list.innerHTML = '<div class="empty-state">Nenhum time encontrado</div>';
    return;
  }
  list.innerHTML = filtered.map((t, i) => {
    const realIdx = teams.indexOf(t);
    const logo = getLogoUrl(t);
    const fb = LOGO_OVERRIDES[t.n] || '';
    const logoHtml = `<img src="${logo}" data-fb="${fb}" loading="lazy" onerror="if(this.src!==this.dataset.fb&&this.dataset.fb){this.src=this.dataset.fb;this.onerror=null;}else{this.outerHTML='<span class=\\'fallback\\'>${t.f||'🌐'}</span>'}">`;
    const ovr = getOVR(t);
    return `<div class="team-row">
      <div class="team-row-logo">${logoHtml}</div>
      <div class="team-row-info">
        <div class="team-row-name">${t.n}</div>
        <div class="team-row-meta">${t.league || 'Outra'} ${t.f || ''}</div>
      </div>
      <div class="team-row-ovr">${ovr}</div>
      <div class="team-row-actions">
        <button class="icon-btn" onclick="openEditModal(${realIdx})" title="Editar">✏</button>
        <button class="icon-btn del" onclick="removeTeam(${realIdx})" title="Remover">🗑</button>
      </div>
    </div>`;
  }).join('');
};

window.openEditModal = function(idx) {
  const modal = document.getElementById('editModal');
  document.getElementById('editIdx').value = idx === null ? '' : idx;
  document.getElementById('editModalTitle').textContent = idx === null ? 'Adicionar Time' : 'Editar Time';

  const t = idx !== null ? teams[idx] : null;
  document.getElementById('fName').value = t ? t.n : '';
  document.getElementById('fLeague').value = t ? (t.league || 'Outra') : 'Premier League';
  document.getElementById('fFlag').value = t ? (t.f || '') : '';
  document.getElementById('fA').value = t ? t.a : 75;
  document.getElementById('fM').value = t ? t.m : 75;
  document.getElementById('fD').value = t ? t.d : 75;
  document.getElementById('fAVal').textContent = t ? t.a : 75;
  document.getElementById('fMVal').textContent = t ? t.m : 75;
  document.getElementById('fDVal').textContent = t ? t.d : 75;
  document.getElementById('fStar').value = t ? (t.s || '') : '';
  const pidEl = document.getElementById('fPid');
  if (pidEl) pidEl.value = t && t.pid != null && t.pid !== '' ? String(t.pid) : '';
  document.getElementById('fLogo').value = t ? (t.logo || '') : '';
  const col = t ? (t.c || '#c8102e') : '#c8102e';
  document.getElementById('fColor').value = col;
  document.getElementById('fColorHex').value = col;

  updateOVRPreview();
  previewLogo();
  modal.classList.add('open');
};

window.closeEditModal = function() {
  document.getElementById('editModal').classList.remove('open');
};

window.updateOVRPreview = function() {
  const a = parseInt(document.getElementById('fA').value);
  const m = parseInt(document.getElementById('fM').value);
  const d = parseInt(document.getElementById('fD').value);
  document.getElementById('ovrPreview').textContent = Math.min(Math.max(Math.round(a * 0.3 + m * 0.4 + d * 0.3), 60), 99);
};

window.previewLogo = function() {
  const url = document.getElementById('fLogo').value.trim();
  const wrap = document.getElementById('logoPreview');
  if (!url) {
    wrap.innerHTML = '<span style="font-size:1.5rem;color:var(--muted);">?</span>';
    return;
  }
  wrap.innerHTML = `<img src="${url}" style="width:100%;height:100%;object-fit:contain;" onerror="this.outerHTML='<span style=color:var(--muted)>✗</span>'">`;
};

window.syncColorPicker = function() {
  const hex = document.getElementById('fColorHex').value.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(hex)) {
    document.getElementById('fColor').value = hex;
  }
};

document.getElementById('fColor').addEventListener('input', function() {
  document.getElementById('fColorHex').value = this.value;
});

window.saveTeam = function() {
  const name = document.getElementById('fName').value.trim();
  if (!name) { alert('Nome do clube é obrigatório.'); return; }

  const idx = document.getElementById('editIdx').value;
  const prev = idx !== '' ? { ...teams[parseInt(idx, 10)] } : {};

  const t = {
    ...prev,
    n: name,
    league: document.getElementById('fLeague').value,
    f: document.getElementById('fFlag').value.trim(),
    a: parseInt(document.getElementById('fA').value, 10),
    m: parseInt(document.getElementById('fM').value, 10),
    d: parseInt(document.getElementById('fD').value, 10),
    s: document.getElementById('fStar').value.trim() || undefined,
    c: document.getElementById('fColorHex').value.trim() || document.getElementById('fColor').value,
    logo: document.getElementById('fLogo').value.trim() || null,
  };
  if (!t.s) delete t.s;
  if (!t.logo) delete t.logo;

  const pidRaw = document.getElementById('fPid')?.value.trim();
  if (pidRaw) {
    const n = parseInt(pidRaw, 10);
    if (!Number.isNaN(n)) t.pid = n;
    else delete t.pid;
  } else {
    delete t.pid;
  }

  if (idx === '') {
    teams.push(t);
  } else {
    teams[parseInt(idx, 10)] = t;
  }

  save();
  renderTeams();
  closeEditModal();
};

window.removeTeam = function(idx) {
  if (!confirm(`Remover "${teams[idx].n}"? Esta ação não pode ser desfeita.`)) return;
  teams.splice(idx, 1);
  save();
  renderTeams();
};

window.exportJSON = function() {
  const blob = new Blob([JSON.stringify(teams, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'teams.json';
  a.click();
  URL.revokeObjectURL(a.href);
};

window.importJSON = function(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      if (!Array.isArray(data)) throw new Error('Formato inválido');
      teams = data;
      save();
      renderTeams();
      alert(`✅ ${teams.length} times importados com sucesso!`);
    } catch (err) {
      alert('❌ Arquivo inválido: ' + err.message);
    }
    input.value = '';
  };
  reader.readAsText(file);
};

window.resetDB = function() {
  if (!confirm('Restaurar banco original? Todas as edições feitas aqui serão apagadas.')) return;
  localStorage.removeItem('fc26_custom_db');
  location.reload();
};

async function init() {
  teams = await fetchTeamsData();
  renderTeams();
}

init();
