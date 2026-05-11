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

/* ---- API OPENAGENDA ---- */
async function charger(off) {
  const loading = document.getElementById('loading');
  const grid    = document.getElementById('events-grid');

  loading.hidden = false;

  try {
    const res  = await fetch(`https://api.openagenda.com/v2/agendas/${AGENDA_ID}/events?key=${API_KEY}&limit=${LIMIT}&offset=${off}`);
    const data = await res.json();
    total      = data.total || 0;

    if (off === 0) grid.innerHTML = '';

    (data.events || []).forEach(e => grid.appendChild(creerCarte(e)));

    const nb = grid.querySelectorAll('.card').length;
    document.getElementById('nb-resultats').textContent = total;
    document.getElementById('compteur').textContent     = nb;

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
    if (typeof ev.image === 'string') image = ev.image;
    else if (ev.image.base)           image = ev.image.base;
    else if (ev.image.filename)       image = 'https://cibul.s3.amazonaws.com/' + ev.image.filename;
    else if (ev.image.url)            image = ev.image.url;
  }

  const gratuit = ev.registration?.some(r => r.price === 0);
  const prix    = !gratuit && ev.registration?.[0]?.price ? ev.registration[0].price + ' €' : null;

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