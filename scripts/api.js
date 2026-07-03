'use strict';

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

function showSkeletons(grid, count = 6) {
  grid.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const art = document.createElement('article');
    art.className = 'card card--skeleton';
    art.innerHTML = `
      <div class="card-img skeleton"></div>
      <div class="card-body">
        <div class="skeleton" style="height:.7rem;width:60%;margin-bottom:.75rem;"></div>
        <div class="skeleton" style="height:1rem;width:90%;margin-bottom:.4rem;"></div>
        <div class="skeleton" style="height:1rem;width:75%;margin-bottom:.9rem;"></div>
        <div class="skeleton" style="height:.7rem;width:50%;"></div>
      </div>
      <div class="card-footer">
        <div class="skeleton" style="height:1.5rem;width:60px;border-radius:9999px;"></div>
        <div class="skeleton" style="height:1.8rem;width:80px;border-radius:6px;"></div>
      </div>`;
    grid.appendChild(art);
  }
}

async function loadEvents(off) {
  const grid = document.getElementById('events-grid');
  if (!grid) return;

  if (off === 0) showSkeletons(grid, LIMIT);

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

    const loaded       = grid.querySelectorAll('.card:not(.card--skeleton)').length;
    const visibleCount = grid.querySelectorAll('.card:not([hidden]):not(.card--skeleton)').length;
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
    grid.innerHTML = '<p role="alert" class="card--error">Impossible de charger les événements. Vérifiez votre connexion.</p>';
  }
}

document.getElementById('btn-more')?.addEventListener('click', () => {
  const btn = document.getElementById('btn-more');
  if (btn.dataset.mode === 'moins') { offset = 0; loadEvents(0); }
  else                              { offset += LIMIT; loadEvents(offset); }
});

if (document.getElementById('events-grid')) loadEvents(0);
