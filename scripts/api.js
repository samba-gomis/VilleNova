'use strict';

// Build query string for date range based on the date select value
function buildDateParams() {
  const filter = document.getElementById('date')?.value;
  if (!filter) return '';

  const now = new Date();
  let gte, lte;

  if (filter === 'weekend') {
    const day = now.getDay(); // 0 = Sunday, 6 = Saturday
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

// Fetch events from OpenAgenda and render them into the grid
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
      const allLoaded = loaded >= total;
      btnMore.hidden       = allLoaded && total <= LIMIT;
      btnMore.textContent  = allLoaded ? 'Voir moins' : 'Voir plus';
      btnMore.dataset.mode = allLoaded ? 'moins' : 'plus';
      if (allLoaded && total > LIMIT) btnMore.hidden = false;
    }

  } catch {
    grid.innerHTML = '<p role="alert" class="card--error">Impossible de charger les événements.</p>';
  } finally {
    if (loading) loading.hidden = true;
  }
}

// Load more / load less pagination
document.getElementById('btn-more')?.addEventListener('click', () => {
  const btn = document.getElementById('btn-more');
  if (btn.dataset.mode === 'moins') { offset = 0; loadEvents(0); }
  else                              { offset += LIMIT; loadEvents(offset); }
});

// Entry point — only runs on the index page
if (document.getElementById('events-grid')) loadEvents(0);
