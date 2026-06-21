'use strict';

const EMPTY_MSG = `<p style="padding:2rem;grid-column:1/-1;color:#6B7280">Aucun favori pour l'instant. Ajoutez des événements depuis l'<a href="index.html" style="color:#1A3A5C;text-decoration:underline">agenda</a>.</p>`;

const favoritesGrid = document.getElementById('favorites-grid');
if (favoritesGrid) {
  const favorites = JSON.parse(localStorage.getItem('villenova_favorites') || '{}');
  const events    = Object.values(favorites);

  if (!events.length) {
    favoritesGrid.innerHTML = EMPTY_MSG;
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

  // Remove a favorite when clicking the heart button
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

    if (!favoritesGrid.querySelector('.card')) favoritesGrid.innerHTML = EMPTY_MSG;
  });
}