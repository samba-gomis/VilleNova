'use strict';

// Build an <article> card element from an OpenAgenda event object
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
    ? ev.conditions : (ev.conditions?.fr || ev.conditions?.en || '');
  const isFree = /gratuit|free|0\s*€/i.test(conditions.trim());
  const price  = !isFree && conditions ? conditions : null;

  const article = document.createElement('article');
  article.className        = 'card';
  article.dataset.category = category;
  article.dataset.uid      = ev.uid;
  article.dataset.event    = JSON.stringify({ uid: ev.uid, title, location, date, category, image, isFree, price });

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

// Restore heart state for cards already saved in localStorage
function restoreFavorites() {
  const favorites = JSON.parse(localStorage.getItem('villenova_favorites') || '{}');
  document.querySelectorAll('#events-grid .card').forEach(card => {
    if (!card.dataset.uid || !favorites[card.dataset.uid]) return;
    const btn = card.querySelector('.card-fav');
    if (!btn) return;
    btn.setAttribute('aria-pressed', 'true');
    btn.setAttribute('aria-label', 'Retirer des favoris : ' + (favorites[card.dataset.uid].title || ''));
    btn.innerHTML = '&#9829;';
    btn.classList.add('card-fav--on');
  });
}

// Toggle favorite heart on the agenda grid
document.getElementById('events-grid')?.addEventListener('click', e => {
  const btn = e.target.closest('.card-fav');
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

// Navigate to the detail page when clicking anywhere on a card
['events-grid', 'favorites-grid'].forEach(id => {
  document.getElementById(id)?.addEventListener('click', e => {
    if (e.target.closest('.card-fav') || e.target.closest('.btn-b')) return;
    const card = e.target.closest('.card');
    if (!card?.dataset.uid) return;
    window.location.href = `${BASE}event-detail.html?id=${card.dataset.uid}`;
  });
});