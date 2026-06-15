'use strict';

const API_KEY   = '3a0c95fcb5fa426fb34f9a49557dbc07';
const AGENDA_ID = '9571344';
const LIMIT     = 6;
let offset      = 0;
let total       = 0;

/* ---- MENU MOBILE ---- */
const toggle = document.querySelector('.nav-toggle');
const menu   = document.getElementById('nav-menu');

toggle.addEventListener('click', () => {
  const open = menu.classList.toggle('open');
  toggle.setAttribute('aria-expanded', open);
});

document.addEventListener('click', e => {
  if (!toggle.contains(e.target) && !menu.contains(e.target)) {
    menu.classList.remove('open');
    toggle.setAttribute('aria-expanded', false);
  }
});

/* ---- FILTRES ---- */
if (document.querySelector('.chip')) document.querySelectorAll('.chip').forEach(chip => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('.chip').forEach(c => {
      c.classList.remove('on');
      c.setAttribute('aria-pressed', false);
    });
    chip.classList.add('on');
    chip.setAttribute('aria-pressed', true);

    const filtre = chip.dataset.filter;
    document.querySelectorAll('.card').forEach(card => {
      card.hidden = filtre !== 'tous' && card.dataset.cat !== filtre;
    });

    const nb = document.querySelectorAll('.card:not([hidden])').length;
    document.getElementById('compteur').textContent = nb;
    document.getElementById('annonce').textContent  = nb + ' evenements pour : ' + chip.textContent;
  });
});

/* ---- FAVORIS ---- */
document.getElementById('events-grid')?.addEventListener('click', e => {
  const btn  = e.target.closest('.cfav');
  if (!btn) return;
  const card = btn.closest('.card');
  const on   = btn.getAttribute('aria-pressed') === 'true';

  btn.setAttribute('aria-pressed', String(!on));
  btn.innerHTML   = on ? '&#9825;' : '&#9829;';
  btn.style.color = on ? '' : '#E8501A';

  const data = JSON.parse(card?.dataset.event || 'null');
  if (!data) return;
  const favs = JSON.parse(localStorage.getItem('villenova_favoris') || '{}');
  if (on) delete favs[data.uid];
  else    favs[data.uid] = data;
  localStorage.setItem('villenova_favoris', JSON.stringify(favs));
});

/* ---- RECHERCHE ---- */
function paramsDate() {
  const filtre = document.getElementById('date').value;
  if (!filtre) return '';

  const now = new Date();
  let gte, lte;

  if (filtre === 'weekend') {
    const day = now.getDay(); // 0=dim, 6=sam
    const sam = new Date(now);
    // Si on est sam(6) : aujourd'hui, si dim(0) : aujourd'hui, sinon : prochain sam
    const joursAvantSam = day === 6 ? 0 : day === 0 ? 0 : (6 - day);
    sam.setDate(now.getDate() + joursAvantSam);
    sam.setHours(0, 0, 0, 0);
    const dim = new Date(sam);
    // Si on est dim, le week-end c'est aujourd'hui seulement ; sinon sam+dim
    dim.setDate(sam.getDate() + (day === 0 ? 0 : 1));
    dim.setHours(23, 59, 59, 999);
    gte = sam; lte = dim;
  } else if (filtre === 'semaine') {
    // Aujourd'hui → dans 7 jours
    gte = new Date(now); gte.setHours(0, 0, 0, 0);
    lte = new Date(now); lte.setDate(now.getDate() + 7); lte.setHours(23, 59, 59, 999);
  } else if (filtre === 'mois') {
    // Aujourd'hui → fin du mois en cours
    gte = new Date(now); gte.setHours(0, 0, 0, 0);
    lte = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  }

  let extra = '';
  if (gte) extra += `&timings[gte]=${encodeURIComponent(gte.toISOString())}`;
  if (lte) extra += `&timings[lte]=${encodeURIComponent(lte.toISOString())}`;
  return extra;
}

document.querySelector('.search')?.addEventListener('submit', e => {
  e.preventDefault();
  offset = 0;
  charger(0);
});

/* ---- API OPENAGENDA ---- */
async function charger(off) {
  const loading = document.getElementById('loading');
  const grid    = document.getElementById('events-grid');

  loading.hidden = false;

  try {
    const res  = await fetch(`https://api.openagenda.com/v2/agendas/${AGENDA_ID}/events?key=${API_KEY}&limit=${LIMIT}&offset=${off}&detailed=1${paramsDate()}`);
    const data = await res.json();
    total      = data.total || 0;

    if (off === 0) grid.innerHTML = '';

    (data.events || []).forEach(e => grid.appendChild(creerCarte(e)));

    const q = document.getElementById('q').value.trim().toLowerCase();
    if (q) {
      grid.querySelectorAll('.card').forEach(card => {
        const titre = card.querySelector('h3')?.textContent.toLowerCase() || '';
        const lieu  = card.querySelector('address')?.textContent.toLowerCase() || '';
        card.hidden = !titre.includes(q) && !lieu.includes(q);
      });
    }

    restaurerFavoris();

    const loaded  = grid.querySelectorAll('.card').length;
    const nb      = grid.querySelectorAll('.card:not([hidden])').length;
    document.getElementById('nb-resultats').textContent = total;
    document.getElementById('compteur').textContent     = nb;

    if (!nb && off === 0) {
      grid.innerHTML = '<p style="padding:2rem;grid-column:1/-1">Aucun evenement trouve pour cette recherche.</p>';
    }

    const btnMore = document.getElementById('btn-more');
    if (loaded >= total && total > LIMIT) {
      btnMore.textContent  = 'Voir moins';
      btnMore.dataset.mode = 'moins';
      btnMore.hidden       = false;
    } else {
      btnMore.textContent  = 'Voir plus';
      btnMore.dataset.mode = 'plus';
      btnMore.hidden       = loaded >= total;
    }

  } catch {
    grid.innerHTML = '<p role="alert" style="color:#DC2626;padding:2rem;grid-column:1/-1">Impossible de charger les evenements.</p>';
  } finally {
    loading.hidden = true;
  }
}

/* ---- CREER UNE CARTE ---- */
function creerCarte(ev) {
  const titre = ev.title?.fr || 'Sans titre';
  const lieu  = ev.location?.name || '';
  const date  = ev.firstTiming?.begin
    ? new Date(ev.firstTiming.begin).toLocaleDateString('fr-FR', { weekday:'short', day:'numeric', month:'long', hour:'2-digit', minute:'2-digit' })
    : '';
  const cat   = (ev.keywords?.fr?.[0] || 'evenement')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/s$/, '');

  let image = null;
  if (ev.image) {
    if (typeof ev.image === 'string')              image = ev.image;
    else if (ev.image.base && ev.image.filename)   image = ev.image.base + ev.image.filename;
    else if (ev.image.filename)                    image = 'https://cdn.openagenda.com/main/' + ev.image.filename;
    else if (ev.image.url)                         image = ev.image.url;
  }

  const conditions = typeof ev.conditions === 'string'
    ? ev.conditions
    : (ev.conditions?.fr || ev.conditions?.en || '');
  const gratuit = /gratuit|free|0\s*€/i.test(conditions.trim());
  const prix    = !gratuit && conditions ? conditions : null;

  const art = document.createElement('article');
  art.className      = 'card';
  art.dataset.cat    = cat.toLowerCase();
  art.dataset.uid    = ev.uid;
  art.dataset.event  = JSON.stringify({ uid: ev.uid, titre, lieu, date, cat, image, gratuit, prix });

  art.innerHTML = `
    <div class="card-img">
      ${image ? `<img src="${image}" alt="Affiche ${titre}" width="392" height="150" loading="lazy">` : ''}
      <span class="cbadge">${cat}</span>
      <button class="cfav" aria-pressed="false" aria-label="Favori ${titre}">&#9825;</button>
    </div>
    <div class="card-body">
      <p class="cdate"><time>${date}</time></p>
      <h3>${titre}</h3>
      <address>${lieu}</address>
    </div>
    <div class="card-footer">
      ${gratuit ? '<span class="free">Gratuit</span>' : prix ? `<span class="price">${prix}</span>` : '<span></span>'}
      <a href="event-detail.html?id=${ev.uid}" class="btn-b">${gratuit ? 'En savoir plus' : 'Reserver'}</a>
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
        btn.innerHTML   = '&#9829;';
        btn.style.color = '#E8501A';
      }
    }
  });
}

/* ---- PAGE FAVORIS ---- */
const favorisGrid = document.getElementById('favoris-grid');
if (favorisGrid) {
  const favs   = JSON.parse(localStorage.getItem('villenova_favoris') || '{}');
  const events = Object.values(favs);

  if (!events.length) {
    favorisGrid.innerHTML = '<p style="padding:2rem;grid-column:1/-1;color:#6B7280">Aucun favori pour l\'instant. Ajoutez des evenements depuis l\'<a href="index.html" style="color:#1A3A5C;text-decoration:underline">agenda</a>.</p>';
  } else {
    events.forEach(ev => {
      const art = document.createElement('article');
      art.className   = 'card';
      art.dataset.cat = ev.cat;
      art.dataset.uid = ev.uid;
      art.innerHTML = `
        <div class="card-img">
          ${ev.image ? `<img src="${ev.image}" alt="Affiche ${ev.titre}" width="392" height="150" loading="lazy">` : ''}
          <span class="cbadge">${ev.cat}</span>
          <button class="cfav" aria-pressed="true" aria-label="Retirer des favoris ${ev.titre}" style="color:#E8501A">&#9829;</button>
        </div>
        <div class="card-body">
          <p class="cdate"><time>${ev.date}</time></p>
          <h3>${ev.titre}</h3>
          <address>${ev.lieu}</address>
        </div>
        <div class="card-footer">
          ${ev.gratuit ? '<span class="free">Gratuit</span>' : ev.prix ? `<span class="price">${ev.prix}</span>` : '<span></span>'}
          <a href="event-detail.html?id=${ev.uid}" class="btn-b">${ev.gratuit ? 'En savoir plus' : 'Reserver'}</a>
        </div>
      `;
      favorisGrid.appendChild(art);
    });
  }

  favorisGrid.addEventListener('click', e => {
    const btn  = e.target.closest('.cfav');
    if (!btn) return;
    const card = btn.closest('.card');
    const uid  = card?.dataset.uid;
    if (!uid) return;

    const favs = JSON.parse(localStorage.getItem('villenova_favoris') || '{}');
    delete favs[uid];
    localStorage.setItem('villenova_favoris', JSON.stringify(favs));
    card.remove();

    if (!favorisGrid.querySelector('.card')) {
      favorisGrid.innerHTML = '<p style="padding:2rem;grid-column:1/-1;color:#6B7280">Aucun favori pour l\'instant. Ajoutez des evenements depuis l\'<a href="index.html" style="color:#1A3A5C;text-decoration:underline">agenda</a>.</p>';
    }
  });
}

/* ---- INIT ---- */
if (document.getElementById('events-grid')) {
  document.addEventListener('DOMContentLoaded', () => charger(0));
}