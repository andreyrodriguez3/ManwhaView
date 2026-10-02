const KEY = 'manwhaview.v1';
let items = [];
try { items = JSON.parse(localStorage.getItem(KEY)) || []; } catch {}
const $ = id => document.getElementById(id);
const save = () => localStorage.setItem(KEY, JSON.stringify(items));
let editing = null, reading = null;

function esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function safeUrl(u) { try { const x = new URL(u); return /^https?:$/.test(x.protocol) ? x.href : ''; } catch { return ''; } }

function render() {
  const q = $('search').value.trim().toLowerCase(), f = $('filter').value;
  const list = items.filter(m => (!f || m.status === f) && m.title.toLowerCase().includes(q));
  $('grid').innerHTML = list.length ? list.map(m => {
    const pct = m.total ? Math.min(100, m.chapter / m.total * 100) : 0;
    const cover = safeUrl(m.cover);
    return `<article class="card">
      <div class="cover" style="${cover ? `background-image:url('${esc(cover)}')` : ''}">${cover ? '' : '📖'}</div>
      <div class="info">
        <h3>${esc(m.title)}</h3>
        <div class="meta">${esc(m.status)} · Cap. ${m.chapter}${m.total ? '/' + m.total : ''}${m.rating ? ' · ★' + m.rating : ''}</div>
        ${m.total ? `<div class="bar"><i style="width:${pct}%"></i></div>` : ''}
        ${m.notes ? `<div class="meta">${esc(m.notes)}</div>` : ''}
        <div class="row">
          <button data-a="next" data-id="${m.id}">+1 cap.</button>
          <button class="sec" data-a="read" data-id="${m.id}">Leer</button>
          <button class="sec" data-a="edit" data-id="${m.id}">Editar</button>
          <button class="sec" data-a="del" data-id="${m.id}">🗑</button>
        </div>
      </div></article>`;
  }).join('') : '<div class="empty">Aún no hay manhwas. Pulsa “+ Añadir”.</div>';
}

function openForm(m) {
  editing = m || null;
  const f = $('form');
  f.reset();
  $('form-title').textContent = m ? 'Editar manhwa' : 'Nuevo manhwa';
  if (m) for (const k of ['title','cover','status','chapter','total','rating','url','notes']) f.elements[k].value = m[k] ?? '';
  $('form-dlg').showModal();
}

$('add').onclick = () => openForm();
$('save').onclick = e => {
  const f = $('form');
  if (!f.reportValidity()) return;
  e.preventDefault();
  const d = Object.fromEntries(new FormData(f));
  const rec = { title: d.title.trim(), cover: d.cover, status: d.status, chapter: +d.chapter || 0,
    total: d.total ? +d.total : null, rating: d.rating ? +d.rating : null, url: d.url, notes: d.notes };
  if (editing) Object.assign(editing, rec); else items.unshift({ id: crypto.randomUUID(), ...rec });
  save(); render(); $('form-dlg').close();
};

$('grid').onclick = e => {
  const b = e.target.closest('button[data-a]'); if (!b) return;
  const m = items.find(x => x.id === b.dataset.id); if (!m) return;
  switch (b.dataset.a) {
    case 'next': m.chapter++; if (m.total && m.chapter >= m.total) m.status = 'Completado'; save(); render(); break;
    case 'edit': openForm(m); break;
    case 'del': if (confirm(`¿Eliminar “${m.title}”?`)) { items = items.filter(x => x !== m); save(); render(); } break;
    case 'read': reading = m; $('reader-title').textContent = `${m.title} · Cap. ${m.chapter}`; $('pages').innerHTML = ''; $('reader-urls').value = ''; $('reader-dlg').showModal(); break;
  }
};

$('reader-load').onclick = () => {
  const urls = $('reader-urls').value.split('\n').map(s => safeUrl(s.trim())).filter(Boolean);
  $('pages').innerHTML = urls.map(u => `<img loading="lazy" src="${esc(u)}" alt="">`).join('');
};
$('reader-close').onclick = () => $('reader-dlg').close();
$('search').oninput = $('filter').onchange = render;

$('export').onclick = () => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(items, null, 2)], { type: 'application/json' }));
  a.download = 'manwhaview-backup.json'; a.click(); URL.revokeObjectURL(a.href);
};
$('import').onchange = async e => {
  const file = e.target.files[0]; if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (!Array.isArray(data)) throw 0;
    items = data.filter(x => x && typeof x.title === 'string').map(x => ({ ...x, id: x.id || crypto.randomUUID(), chapter: +x.chapter || 0 }));
    save(); render();
  } catch { alert('Archivo no válido'); }
  e.target.value = '';
};
render();
