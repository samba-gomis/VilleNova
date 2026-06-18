'use strict';

const API_KEY   = '3a0c95fcb5fa426fb34f9a49557dbc07';
const AGENDA_ID = '9571344';
const LIMIT     = 6;
let offset      = 0;
let total       = 0;

const BASE = window.location.pathname.includes('/html/') ? '' : 'html/';

/* ---- XSS ESCAPING ---- */
function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/* ---- MOBILE MENU ---- */
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

/* ---- CATEGORY FILTER ---- */
function applyFilter() {
  const chip     = document.querySelector('.chip.on');
  const category = chip?.dataset.filter || 'tous';
  document.querySelectorAll('#events-grid .card').forEach(card => {
    card.hidden = category !== 'tous' && card.dataset.category !== category;
  });
  const count = document.querySelectorAll('#events-grid .card:not([hidden])').length;
  const counter = document.getElementById('counter');
  if (counter) counter.textContent = count;
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
      applyFilter();
      const count        = document.querySelectorAll('#events-grid .card:not([hidden])').length;
      const announcement = document.getElementById('announcement');
      if (announcement) announcement.textContent = count + ' événements pour : ' + chip.textContent;
    });
  });
}

/* ---- FAVORITES (agenda grid) ---- */
document.getElementById('events-grid')?.addEventListener('click', e => {
  const btn  = e.target.closest('.card-fav');
  if (!btn) return;
  const card = btn.closest('.card');
  const on   = btn.getAttribute('aria-pressed') === 'true';

  btn.setAttribute('aria-pressed', String(!on));
  btn.innerHTML = on ? '&#9825;' : '&#9829;';
  btn.classList.toggle('card-fav--on', !on);

  const data = JSON.parse(card?.dataset.event || 'null');
  if (!data) return;
  const favorites = JSON.parse(localStorage.getItem('villenova_favorites') || '{}');
  if (on) delete favorites[data.uid];
  else    favorites[data.uid] = data;
  localStorage.setItem('villenova_favorites', JSON.stringify(favorites));
});

/* ---- DATE PARAMS ---- */
function buildDateParams() {
  const filter = document.getElementById('date')?.value;
  if (!filter) return '';

  const now = new Date();
  let gte, lte;

  if (filter === 'weekend') {
    const day = now.getDay();
    const sat = new Date(now);
    sat.setDate(now.getDate() + (day === 6 ? 0 : day === 0 ? 0 : 6 - day));
    sat.setHours(0, 0, 0, 0);
    const sun = new Date(sat);
    sun.setDate(sat.getDate() + (day === 0 ? 0 : 1));
    sun.setHours(23, 59, 59, 999);
    gte = sat; lte = sun;
  } else if (filter === 'semaine') {
    gte = new Date(now); gte.setHours(0, 0, 0, 0);
    lte = new Date(now); lte.setDate(now.getDate() + 7); lte.setHours(23, 59, 59, 999);
  } else if (filter === 'mois') {
    gte = new Date(now); gte.setHours(0, 0, 0, 0);
    lte = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  }

  let params = '';
  if (gte) params += `&timings[gte]=${encodeURIComponent(gte.toISOString())}`;
  if (lte) params += `&timings[lte]=${encodeURIComponent(lte.toISOString())}`;
  return params;
}

/* ---- SEARCH FORM ---- */
document.querySelector('.search')?.addEventListener('submit', e => {
  e.preventDefault();
  offset = 0;
  loadEvents(0);
});

/* ---- OPENAGENDA API ---- */
async function loadEvents(off) {
  const loading = document.getElementById('loading');
  const grid    = document.getElementById('events-grid');
  if (!grid) return;

  if (loading) loading.hidden = false;

  const query = document.getElementById('q')?.value.trim() || '';

  try {
    let url = `https://api.openagenda.com/v2/agendas/${AGENDA_ID}/events?key=${API_KEY}&limit=${LIMIT}&offset=${off}&detailed=1${buildDateParams()}`;
    if (query) url += `&search=${encodeURIComponent(query)}`;

    const res  = await fetch(url);
    const data = await res.json();
    total = data.total || 0;

    if (off === 0) grid.innerHTML = '';

    (data.events || []).forEach(ev => grid.appendChild(createCard(ev)));

    restoreFavorites();
    applyFilter();

    const loaded       = grid.querySelectorAll('.card').length;
    const visibleCount = grid.querySelectorAll('.card:not([hidden])').length;
    const resultsCount = document.getElementById('results-count');
    const counter      = document.getElementById('counter');
    if (resultsCount) resultsCount.textContent = total;
    if (counter)      counter.textContent      = visibleCount;

    if (!visibleCount && off === 0) {
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

/* ---- CREATE CARD ---- */
function createCard(ev) {
  const title    = ev.title?.fr || 'Sans titre';
  const location = ev.location?.name || '';
  const date     = ev.firstTiming?.begin
    ? new Date(ev.firstTiming.begin).toLocaleDateString('fr-FR', { weekday:'short', day:'numeric', month:'long', hour:'2-digit', minute:'2-digit' })
    : '';
  const category = (ev.keywords?.fr?.[0] || 'evenement')
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
  const isFree = /gratuit|free|0\s*€/i.test(conditions.trim());
  const price  = !isFree && conditions ? conditions : null;

  const article = document.createElement('article');
  article.className      = 'card';
  article.dataset.category = category;
  article.dataset.uid    = ev.uid;
  article.dataset.event  = JSON.stringify({ uid: ev.uid, title, location, date, category, image, isFree, price });

  article.innerHTML = `
    <div class="card-img">
      ${image ? `<img src="${esc(image)}" alt="${esc(title)}" width="392" height="150" loading="lazy">` : ''}
      <span class="card-badge">${esc(category)}</span>
      <button class="card-fav" aria-pressed="false" aria-label="Ajouter aux favoris : ${esc(title)}">&#9825;</button>
    </div>
    <div class="card-body">
      <p class="card-date"><time>${esc(date)}</time></p>
      <h3>${esc(title)}</h3>
      <p class="card-location">${esc(location)}</p>
    </div>
    <div class="card-footer">
      ${isFree ? '<span class="free">Gratuit</span>' : price ? `<span class="price">${esc(price)}</span>` : '<span></span>'}
      <a href="${BASE}event-detail.html?id=${esc(ev.uid)}" class="btn-b">${isFree ? 'En savoir plus' : 'Réserver'}</a>
    </div>
  `;

  return article;
}

/* ---- LOAD MORE / LESS ---- */
document.getElementById('btn-more')?.addEventListener('click', () => {
  const btn = document.getElementById('btn-more');
  if (btn.dataset.mode === 'moins') {
    offset = 0;
    loadEvents(0);
  } else {
    offset += LIMIT;
    loadEvents(offset);
  }
});

/* ---- RESTORE FAVORITES ---- */
function restoreFavorites() {
  const favorites = JSON.parse(localStorage.getItem('villenova_favorites') || '{}');
  document.querySelectorAll('#events-grid .card').forEach(card => {
    if (card.dataset.uid && favorites[card.dataset.uid]) {
      const btn = card.querySelector('.card-fav');
      if (btn) {
        btn.setAttribute('aria-pressed', 'true');
        btn.setAttribute('aria-label', 'Retirer des favoris : ' + (favorites[card.dataset.uid].title || ''));
        btn.innerHTML = '&#9829;';
        btn.classList.add('card-fav--on');
      }
    }
  });
}

/* ---- CLICKABLE CARD ---- */
['events-grid', 'favorites-grid'].forEach(id => {
  document.getElementById(id)?.addEventListener('click', e => {
    if (e.target.closest('.card-fav') || e.target.closest('.btn-b')) return;
    const card = e.target.closest('.card');
    if (!card?.dataset.uid) return;
    window.location.href = `${BASE}event-detail.html?id=${card.dataset.uid}`;
  });
});

/* ---- FAVORITES PAGE ---- */
const favoritesGrid = document.getElementById('favorites-grid');
if (favoritesGrid) {
  const favorites = JSON.parse(localStorage.getItem('villenova_favorites') || '{}');
  const events    = Object.values(favorites);

  if (!events.length) {
    favoritesGrid.innerHTML = `<p style="padding:2rem;grid-column:1/-1;color:#6B7280">Aucun favori pour l'instant. Ajoutez des événements depuis l'<a href="index.html" style="color:#1A3A5C;text-decoration:underline">agenda</a>.</p>`;
  } else {
    events.forEach(ev => {
      const article = document.createElement('article');
      article.className        = 'card';
      article.dataset.category = ev.category;
      article.dataset.uid      = ev.uid;
      article.innerHTML = `
        <div class="card-img">
          ${ev.image ? `<img src="${esc(ev.image)}" alt="${esc(ev.title)}" width="392" height="150" loading="lazy">` : ''}
          <span class="card-badge">${esc(ev.category)}</span>
          <button class="card-fav card-fav--on" aria-pressed="true" aria-label="Retirer des favoris : ${esc(ev.title)}">&#9829;</button>
        </div>
        <div class="card-body">
          <p class="card-date"><time>${esc(ev.date)}</time></p>
          <h3>${esc(ev.title)}</h3>
          <p class="card-location">${esc(ev.location)}</p>
        </div>
        <div class="card-footer">
          ${ev.isFree ? '<span class="free">Gratuit</span>' : ev.price ? `<span class="price">${esc(ev.price)}</span>` : '<span></span>'}
          <a href="${BASE}event-detail.html?id=${esc(ev.uid)}" class="btn-b">${ev.isFree ? 'En savoir plus' : 'Réserver'}</a>
        </div>
      `;
      favoritesGrid.appendChild(article);
    });
  }

  favoritesGrid.addEventListener('click', e => {
    const btn = e.target.closest('.card-fav');
    if (!btn) return;
    const card = btn.closest('.card');
    const uid  = card?.dataset.uid;
    if (!uid) return;

    const favorites = JSON.parse(localStorage.getItem('villenova_favorites') || '{}');
    delete favorites[uid];
    localStorage.setItem('villenova_favorites', JSON.stringify(favorites));
    card.remove();

    if (!favoritesGrid.querySelector('.card')) {
      favoritesGrid.innerHTML = `<p style="padding:2rem;grid-column:1/-1;color:#6B7280">Aucun favori pour l'instant. Ajoutez des événements depuis l'<a href="index.html" style="color:#1A3A5C;text-decoration:underline">agenda</a>.</p>`;
    }
  });
}

/* ---- INIT AGENDA ---- */
if (document.getElementById('events-grid')) {
  loadEvents(0);
}

/* ---- EVENT DETAIL PAGE ---- */
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
        displayDetail(data.event, detailContainer);
      })
      .catch(() => {
        detailContainer.innerHTML = '<div class="w" style="padding:2rem"><p class="card--error">Impossible de charger cet événement.</p><a href="../index.html" class="btn-l" style="margin-top:1rem;display:inline-block">Retour à l\'agenda</a></div>';
      });
  }
}

function displayDetail(ev, container) {
  const title      = ev.title?.fr || 'Sans titre';
  const desc       = ev.longDescription?.fr || ev.description?.fr || '';
  const conditions = typeof ev.conditions === 'string' ? ev.conditions : (ev.conditions?.fr || ev.conditions?.en || '');
  const isFree     = /gratuit|free|0\s*€/i.test(conditions.trim());
  const category   = (ev.keywords?.fr?.[0] || '')
    .toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/s$/, '');
  const venue      = ev.location || {};
  const address    = [venue.address, venue.postalCode, venue.city].filter(Boolean).join(', ');

  let imageSrc = null;
  if (ev.image?.base && ev.image?.filename) imageSrc = ev.image.base + ev.image.filename;

  const safeLink = ev.onlineAccessLink?.startsWith('https://') ? ev.onlineAccessLink : null;

  const start   = ev.firstTiming?.begin ? new Date(ev.firstTiming.begin) : null;
  const end     = ev.firstTiming?.end   ? new Date(ev.firstTiming.end)   : null;
  const fmtDate = d => d.toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
  const fmtTime = d => d.toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' });
  const timings = ev.timings || [];

  document.title = `${esc(title)} — VilleNova`;

  container.innerHTML = `
    <div class="w" style="padding-top:2rem;padding-bottom:3rem;">

      <a href="../index.html" class="detail-back">← Retour à l'agenda</a>

      ${imageSrc ? `<img src="${esc(imageSrc)}" alt="${esc(title)}" class="detail-hero-img" decoding="async" loading="eager">` : ''}

      <div class="detail-grid">

        <div>
          <div class="detail-meta">
            ${category ? `<span class="detail-badge">${esc(category)}</span>` : ''}
            ${isFree ? '<span class="free">Gratuit</span>' : conditions ? `<span class="price">${esc(conditions)}</span>` : ''}
            ${ev.attendanceMode === 2 || ev.attendanceMode === 3 ? '<span class="detail-badge" style="background:#E8501A;">En ligne</span>' : ''}
          </div>
          <h1 class="detail-title">${esc(title)}</h1>
          ${desc ? `<div class="detail-description">${desc}</div>` : ''}
          ${safeLink ? `<div style="margin-top:1.5rem;"><a href="${esc(safeLink)}" class="btn-b" target="_blank" rel="noopener noreferrer">Accéder en ligne</a></div>` : ''}
        </div>

        <aside>
          ${start ? `
          <div class="detail-info-block">
            <p class="detail-info-label">Date</p>
            <p class="detail-info-value">${fmtDate(start)}</p>
            ${end ? `<p class="detail-info-sub">${fmtTime(start)} – ${fmtTime(end)}</p>` : ''}
          </div>` : ''}

          ${venue.name ? `
          <div class="detail-info-block">
            <p class="detail-info-label">Lieu</p>
            <p class="detail-info-value">${esc(venue.name)}</p>
            ${address ? `<p class="detail-info-sub">${esc(address)}</p>` : ''}
          </div>` : ''}

          ${timings.length > 1 ? `
          <div class="detail-info-block">
            <p class="detail-info-label">Toutes les dates (${timings.length})</p>
            <ul class="detail-timings">
              ${timings.slice(0, 8).map(t => {
                const d = new Date(t.begin);
                return `<li>${d.toLocaleDateString('fr-FR', {weekday:'short',day:'numeric',month:'short'})} · ${fmtTime(d)}</li>`;
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
