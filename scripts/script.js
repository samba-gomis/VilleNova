'use strict';

const API_KEY   = '3a0c95fcb5fa426fb34f9a49557dbc07';
const AGENDA_ID = '9571344';
const LIMIT     = 12;
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
document.querySelectorAll('.chip').forEach(chip => {
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
document.getElementById('events-grid').addEventListener('click', e => {
  const btn = e.target.closest('.cfav');
  if (!btn) return;
  const on = btn.getAttribute('aria-pressed') === 'true';
  btn.setAttribute('aria-pressed', !on);
  btn.innerHTML  = on ? '&#9825;' : '&#9829;';
  btn.style.color = on ? '' : '#E8501A';
});

/* ---- RECHERCHE ---- */
function paramsDate() {
  const filtre = document.getElementById('date').value;
  if (!filtre) return '';

  const now = new Date();
  let gte, lte;

  if (filtre === 'weekend') {
    const day = now.getDay();
    const sam = new Date(now);
    if (day === 0) sam.setDate(now.getDate() - 1);
    else           sam.setDate(now.getDate() + (6 - day));
    sam.setHours(0, 0, 0, 0);
    const dim = new Date(sam);
    dim.setDate(sam.getDate() + 1);
    dim.setHours(23, 59, 59, 999);
    gte = sam; lte = dim;
  } else if (filtre === 'semaine') {
    gte = new Date(now);
    gte.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    gte.setHours(0, 0, 0, 0);
    lte = new Date(gte);
    lte.setDate(gte.getDate() + 6);
    lte.setHours(23, 59, 59, 999);
  } else if (filtre === 'mois') {
    gte = new Date(now.getFullYear(), now.getMonth(), 1);
    lte = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  }

  let extra = '';
  if (gte) extra += `&timings[gte]=${encodeURIComponent(gte.toISOString())}`;
  if (lte) extra += `&timings[lte]=${encodeURIComponent(lte.toISOString())}`;
  return extra;
}

document.querySelector('.search').addEventListener('submit', e => {
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

    const nb = grid.querySelectorAll('.card:not([hidden])').length;
    document.getElementById('nb-resultats').textContent = total;
    document.getElementById('compteur').textContent     = nb;

    if (!nb && off === 0) {
      grid.innerHTML = '<p style="padding:2rem;grid-column:1/-1">Aucun evenement trouve pour cette recherche.</p>';
    }

    const btnMore = document.getElementById('btn-more');
    btnMore.hidden = nb >= total;

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
  const cat   = ev.keywords?.fr?.[0] || 'evenement';

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
  art.className       = 'card';
  art.dataset.cat     = cat.toLowerCase();

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

/* ---- VOIR PLUS ---- */
document.getElementById('btn-more').addEventListener('click', () => {
  offset += LIMIT;
  charger(offset);
});

/* ---- INIT ---- */
document.addEventListener('DOMContentLoaded', () => charger(0));