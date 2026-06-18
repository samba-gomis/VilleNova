'use strict';

const API_KEY   = '3a0c95fcb5fa426fb34f9a49557dbc07';
const AGENDA_ID = '9571344';
const LIMIT     = 6;
let offset      = 0;
let total       = 0;

const BASE = window.location.pathname.includes('/html/') ? '' : 'html/';

/* ---- ECHAPPEMENT XSS ---- */
function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/* ---- MENU MOBILE ---- */
const toggle = document.querySelector('.nav-toggle');
const menu   = document.getElementById('nav-menu');

if (toggle && menu) {
  toggle.addEventListener('click', () => {
    const open = menu.classList.toggle('open');
    toggle.setAttribute('aria-expanded', open);
  });

  document.addEventListener('click', e => {
    if (!toggle.contains(e.target) && !menu.contains(e.target)) {
      menu.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    }
  });
}

/* ---- FILTRES ---- */
function appliquerFiltre() {
  const chip   = document.querySelector('.chip.on');
  const filtre = chip?.dataset.filter || 'tous';
  document.querySelectorAll('#events-grid .card').forEach(card => {
    card.hidden = filtre !== 'tous' && card.dataset.cat !== filtre;
  });
  const nb = document.querySelectorAll('#events-grid .card:not([hidden])').length;
  const compteur = document.getElementById('compteur');
  if (compteur) compteur.textContent = nb;
}

if (document.querySelector('.chip')) {
  document.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.chip').forEach(c => {
        c.classList.remove('on');
        c.setAttribute('aria-pressed', 'false');
      });
      chip.classList.add('on');
      chip.setAttribute('aria-pressed', 'true');
      appliquerFiltre();
      const nb = document.querySelectorAll('#events-grid .card:not([hidden])').length;
      const annonce = document.getElementById('annonce');
      if (annonce) annonce.textContent = nb + ' événements pour : ' + chip.textContent;
    });
  });
}

/* ---- FAVORIS (grille agenda) ---- */
document.getElementById('events-grid')?.addEventListener('click', e => {
  const btn  = e.target.closest('.cfav');
  if (!btn) return;
  const card = btn.closest('.card');
  const on   = btn.getAttribute('aria-pressed') === 'true';

  btn.setAttribute('aria-pressed', String(!on));
  btn.innerHTML = on ? '&#9825;' : '&#9829;';
  btn.classList.toggle('cfav--on', !on);

  const data = JSON.parse(card?.dataset.event || 'null');
  if (!data) return;
  const favs = JSON.parse(localStorage.getItem('villenova_favoris') || '{}');
  if (on) delete favs[data.uid];
  else    favs[data.uid] = data;
  localStorage.setItem('villenova_favoris', JSON.stringify(favs));
});

/* ---- PARAMETRES DATE ---- */
function paramsDate() {
  const filtre = document.getElementById('date')?.value;
  if (!filtre) return '';

  const now = new Date();
  let gte, lte;

  if (filtre === 'weekend') {
    const day = now.getDay();
    const sam = new Date(now);
    sam.setDate(now.getDate() + (day === 6 ? 0 : day === 0 ? 0 : 6 - day));
    sam.setHours(0, 0, 0, 0);
    const dim = new Date(sam);
    dim.setDate(sam.getDate() + (day === 0 ? 0 : 1));
    dim.setHours(23, 59, 59, 999);
    gte = sam; lte = dim;
  } else if (filtre === 'semaine') {
    gte = new Date(now); gte.setHours(0, 0, 0, 0);
    lte = new Date(now); lte.setDate(now.getDate() + 7); lte.setHours(23, 59, 59, 999);
  } else if (filtre === 'mois') {
    gte = new Date(now); gte.setHours(0, 0, 0, 0);
    lte = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  }

  let extra = '';
  if (gte) extra += `&timings[gte]=${encodeURIComponent(gte.toISOString())}`;
  if (lte) extra += `&timings[lte]=${encodeURIComponent(lte.toISOString())}`;
  return extra;
}

/* ---- RECHERCHE ---- */
document.querySelector('.search')?.addEventListener('submit', e => {
  e.preventDefault();
  offset = 0;
  charger(0);
});

/* ---- API OPENAGENDA ---- */
async function charger(off) {
  const loading = document.getElementById('loading');
  const grid    = document.getElementById('events-grid');
  if (!grid) return;

  if (loading) loading.hidden = false;

  const q = document.getElementById('q')?.value.trim() || '';

  try {
    let url = `https://api.openagenda.com/v2/agendas/${AGENDA_ID}/events?key=${API_KEY}&limit=${LIMIT}&offset=${off}&detailed=1${paramsDate()}`;
    if (q) url += `&search=${encodeURIComponent(q)}`;

    const res  = await fetch(url);
    const data = await res.json();
    total = data.total || 0;

    if (off === 0) grid.innerHTML = '';

    (data.events || []).forEach(e => grid.appendChild(creerCarte(e)));

    restaurerFavoris();
    appliquerFiltre();

    const loaded = grid.querySelectorAll('.card').length;
    const nb     = grid.querySelectorAll('.card:not([hidden])').length;
    const nbRes  = document.getElementById('nb-resultats');
    const cpt    = document.getElementById('compteur');
    if (nbRes) nbRes.textContent = total;
    if (cpt)   cpt.textContent  = nb;

    if (!nb && off === 0) {
      grid.innerHTML = '<p class="card--error">Aucun événement trouvé pour cette recherche.</p>';
    }

    const btnMore = document.getElementById('btn-more');
    if (btnMore) {
      if (loaded >= total && total > LIMIT) {
        btnMore.textContent  = 'Voir moins';
        btnMore.dataset.mode = 'moins';
        btnMore.hidden       = false;
      } else {
        btnMore.textContent  = 'Voir plus';
        btnMore.dataset.mode = 'plus';
        btnMore.hidden       = loaded >= total;
      }
    }

  } catch {
    grid.innerHTML = '<p role="alert" class="card--error">Impossible de charger les événements.</p>';
  } finally {
    if (loading) loading.hidden = true;
  }
}

/* ---- CREER UNE CARTE ---- */
function creerCarte(ev) {
  const titre = ev.title?.fr || 'Sans titre';
  const lieu  = ev.location?.name || '';
  const date  = ev.firstTiming?.begin
    ? new Date(ev.firstTiming.begin).toLocaleDateString('fr-FR', { weekday:'short', day:'numeric', month:'long', hour:'2-digit', minute:'2-digit' })
    : '';
  const cat = (ev.keywords?.fr?.[0] || 'evenement')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/s$/, '');

  let image = null;
  if (ev.image) {
    if (typeof ev.image === 'string')            image = ev.image;
    else if (ev.image.base && ev.image.filename) image = ev.image.base + ev.image.filename;
    else if (ev.image.filename)                  image = 'https://cdn.openagenda.com/main/' + ev.image.filename;
    else if (ev.image.url)                       image = ev.image.url;
  }

  const conditions = typeof ev.conditions === 'string'
    ? ev.conditions
    : (ev.conditions?.fr || ev.conditions?.en || '');
  const gratuit = /gratuit|free|0\s*€/i.test(conditions.trim());
  const prix    = !gratuit && conditions ? conditions : null;

  const art = document.createElement('article');
  art.className     = 'card';
  art.dataset.cat   = cat;
  art.dataset.uid   = ev.uid;
  art.dataset.event = JSON.stringify({ uid: ev.uid, titre, lieu, date, cat, image, gratuit, prix });

  art.innerHTML = `
    <div class="card-img">
      ${image ? `<img src="${esc(image)}" alt="${esc(titre)}" width="392" height="150" loading="lazy">` : ''}
      <span class="cbadge">${esc(cat)}</span>
      <button class="cfav" aria-pressed="false" aria-label="Ajouter aux favoris : ${esc(titre)}">&#9825;</button>
    </div>
    <div class="card-body">
      <p class="cdate"><time>${esc(date)}</time></p>
      <h3>${esc(titre)}</h3>
      <p class="clieu">${esc(lieu)}</p>
    </div>
    <div class="card-footer">
      ${gratuit ? '<span class="free">Gratuit</span>' : prix ? `<span class="price">${esc(prix)}</span>` : '<span></span>'}
      <a href="${BASE}event-detail.html?id=${esc(ev.uid)}" class="btn-b">${gratuit ? 'En savoir plus' : 'Réserver'}</a>
    </div>
  `;

  return art;
}

/* ---- VOIR PLUS / MOINS ---- */
document.getElementById('btn-more')?.addEventListener('click', () => {
  const btn = document.getElementById('btn-more');
  if (btn.dataset.mode === 'moins') {
    offset = 0;
    charger(0);
  } else {
    offset += LIMIT;
    charger(offset);
  }
});

/* ---- RESTAURER FAVORIS ---- */
function restaurerFavoris() {
  const favs = JSON.parse(localStorage.getItem('villenova_favoris') || '{}');
  document.querySelectorAll('#events-grid .card').forEach(card => {
    if (card.dataset.uid && favs[card.dataset.uid]) {
      const btn = card.querySelector('.cfav');
      if (btn) {
        btn.setAttribute('aria-pressed', 'true');
        btn.setAttribute('aria-label', 'Retirer des favoris : ' + (favs[card.dataset.uid].titre || ''));
        btn.innerHTML = '&#9829;';
        btn.classList.add('cfav--on');
      }
    }
  });
}

/* ---- CARTE CLIQUABLE ---- */
['events-grid', 'favoris-grid'].forEach(id => {
  document.getElementById(id)?.addEventListener('click', e => {
    if (e.target.closest('.cfav') || e.target.closest('.btn-b')) return;
    const card = e.target.closest('.card');
    if (!card?.dataset.uid) return;
    window.location.href = `${BASE}event-detail.html?id=${card.dataset.uid}`;
  });
});

/* ---- PAGE FAVORIS ---- */
const favorisGrid = document.getElementById('favoris-grid');
if (favorisGrid) {
  const favs   = JSON.parse(localStorage.getItem('villenova_favoris') || '{}');
  const events = Object.values(favs);

  if (!events.length) {
    favorisGrid.innerHTML = `<p style="padding:2rem;grid-column:1/-1;color:#6B7280">Aucun favori pour l'instant. Ajoutez des événements depuis l'<a href="index.html" style="color:#1A3A5C;text-decoration:underline">agenda</a>.</p>`;
  } else {
    events.forEach(ev => {
      const art = document.createElement('article');
      art.className   = 'card';
      art.dataset.cat = ev.cat;
      art.dataset.uid = ev.uid;
      art.innerHTML = `
        <div class="card-img">
          ${ev.image ? `<img src="${esc(ev.image)}" alt="${esc(ev.titre)}" width="392" height="150" loading="lazy">` : ''}
          <span class="cbadge">${esc(ev.cat)}</span>
          <button class="cfav cfav--on" aria-pressed="true" aria-label="Retirer des favoris : ${esc(ev.titre)}">&#9829;</button>
        </div>
        <div class="card-body">
          <p class="cdate"><time>${esc(ev.date)}</time></p>
          <h3>${esc(ev.titre)}</h3>
          <p class="clieu">${esc(ev.lieu)}</p>
        </div>
        <div class="card-footer">
          ${ev.gratuit ? '<span class="free">Gratuit</span>' : ev.prix ? `<span class="price">${esc(ev.prix)}</span>` : '<span></span>'}
          <a href="${BASE}event-detail.html?id=${esc(ev.uid)}" class="btn-b">${ev.gratuit ? 'En savoir plus' : 'Réserver'}</a>
        </div>
      `;
      favorisGrid.appendChild(art);
    });
  }

  favorisGrid.addEventListener('click', e => {
    const btn = e.target.closest('.cfav');
    if (!btn) return;
    const card = btn.closest('.card');
    const uid  = card?.dataset.uid;
    if (!uid) return;

    const favs = JSON.parse(localStorage.getItem('villenova_favoris') || '{}');
    delete favs[uid];
    localStorage.setItem('villenova_favoris', JSON.stringify(favs));
    card.remove();

    if (!favorisGrid.querySelector('.card')) {
      favorisGrid.innerHTML = `<p style="padding:2rem;grid-column:1/-1;color:#6B7280">Aucun favori pour l'instant. Ajoutez des événements depuis l'<a href="index.html" style="color:#1A3A5C;text-decoration:underline">agenda</a>.</p>`;
    }
  });
}

/* ---- INIT AGENDA ---- */
if (document.getElementById('events-grid')) {
  charger(0);
}

/* ---- PAGE DETAIL ---- */
const detailContainer = document.getElementById('event-detail');
if (detailContainer) {
  const uid = new URLSearchParams(window.location.search).get('id');
  if (!uid) {
    detailContainer.innerHTML = '<div class="w" style="padding:2rem"><p>Événement introuvable.</p><a href="../index.html" class="btn-l" style="margin-top:1rem;display:inline-block">Retour à l\'agenda</a></div>';
  } else {
    fetch(`https://api.openagenda.com/v2/agendas/${AGENDA_ID}/events/${encodeURIComponent(uid)}?key=${API_KEY}&detailed=1`)
      .then(r => r.json())
      .then(data => {
        if (!data.event) throw new Error();
        afficherDetail(data.event, detailContainer);
      })
      .catch(() => {
        detailContainer.innerHTML = '<div class="w" style="padding:2rem"><p class="card--error">Impossible de charger cet événement.</p><a href="../index.html" class="btn-l" style="margin-top:1rem;display:inline-block">Retour à l\'agenda</a></div>';
      });
  }
}

function afficherDetail(ev, container) {
  const titre      = ev.title?.fr || 'Sans titre';
  const desc       = ev.longDescription?.fr || ev.description?.fr || '';
  const conditions = typeof ev.conditions === 'string' ? ev.conditions : (ev.conditions?.fr || ev.conditions?.en || '');
  const gratuit    = /gratuit|free|0\s*€/i.test(conditions.trim());
  const cat        = (ev.keywords?.fr?.[0] || '')
    .toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/s$/, '');
  const lieu       = ev.location || {};
  const adresse    = [lieu.address, lieu.postalCode, lieu.city].filter(Boolean).join(', ');

  let imageSrc = null;
  if (ev.image?.base && ev.image?.filename) imageSrc = ev.image.base + ev.image.filename;

  const safeLink = ev.onlineAccessLink?.startsWith('https://') ? ev.onlineAccessLink : null;

  const debut   = ev.firstTiming?.begin ? new Date(ev.firstTiming.begin) : null;
  const fin     = ev.firstTiming?.end   ? new Date(ev.firstTiming.end)   : null;
  const fmtD    = d => d.toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
  const fmtT    = d => d.toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' });
  const timings = ev.timings || [];

  document.title = `${esc(titre)} — VilleNova`;

  container.innerHTML = `
    <div class="w" style="padding-top:2rem;padding-bottom:3rem;">

      <a href="../index.html" class="detail-back">← Retour à l'agenda</a>

      ${imageSrc ? `<img src="${esc(imageSrc)}" alt="${esc(titre)}" class="detail-hero-img" decoding="async" loading="eager">` : ''}

      <div class="detail-grid">

        <div>
          <div class="detail-meta">
            ${cat ? `<span class="detail-badge">${esc(cat)}</span>` : ''}
            ${gratuit ? '<span class="free">Gratuit</span>' : conditions ? `<span class="price">${esc(conditions)}</span>` : ''}
            ${ev.attendanceMode === 2 || ev.attendanceMode === 3 ? '<span class="detail-badge" style="background:#E8501A;">En ligne</span>' : ''}
          </div>
          <h1 class="detail-title">${esc(titre)}</h1>
          ${desc ? `<div class="detail-description">${desc}</div>` : ''}
          ${safeLink ? `<div style="margin-top:1.5rem;"><a href="${esc(safeLink)}" class="btn-b" target="_blank" rel="noopener noreferrer">Accéder en ligne</a></div>` : ''}
        </div>

        <aside>
          ${debut ? `
          <div class="detail-info-block">
            <p class="detail-info-label">Date</p>
            <p class="detail-info-value">${fmtD(debut)}</p>
            ${fin ? `<p class="detail-info-sub">${fmtT(debut)} – ${fmtT(fin)}</p>` : ''}
          </div>` : ''}

          ${lieu.name ? `
          <div class="detail-info-block">
            <p class="detail-info-label">Lieu</p>
            <p class="detail-info-value">${esc(lieu.name)}</p>
            ${adresse ? `<p class="detail-info-sub">${esc(adresse)}</p>` : ''}
          </div>` : ''}

          ${timings.length > 1 ? `
          <div class="detail-info-block">
            <p class="detail-info-label">Toutes les dates (${timings.length})</p>
            <ul class="detail-timings">
              ${timings.slice(0, 8).map(t => {
                const d = new Date(t.begin);
                return `<li>${d.toLocaleDateString('fr-FR', {weekday:'short',day:'numeric',month:'short'})} · ${fmtT(d)}</li>`;
              }).join('')}
              ${timings.length > 8 ? `<li class="detail-info-sub">+ ${timings.length - 8} autres dates</li>` : ''}
            </ul>
          </div>` : ''}

          ${ev.age?.min != null || ev.age?.max != null ? `
          <div class="detail-info-block">
            <p class="detail-info-label">Public</p>
            <p class="detail-info-value">${ev.age?.min != null ? 'Dès ' + ev.age.min + ' ans' : ''}${ev.age?.max != null ? (ev.age?.min != null ? ' — ' : '') + "jusqu'à " + ev.age.max + ' ans' : ''}</p>
          </div>` : ''}

          ${ev.imageCredits ? `
          <div class="detail-info-block">
            <p class="detail-info-label">Crédit photo</p>
            <p class="detail-info-sub">${esc(ev.imageCredits)}</p>
          </div>` : ''}
        </aside>
      </div>
    </div>
  `;
}
