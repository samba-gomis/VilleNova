'use strict';

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
        renderDetail(data.event, detailContainer);
      })
      .catch(() => {
        detailContainer.innerHTML = '<div class="w" style="padding:2rem"><p class="card--error">Impossible de charger cet événement.</p><a href="../index.html" class="btn-l" style="margin-top:1rem;display:inline-block">Retour à l\'agenda</a></div>';
      });
  }
}

function renderDetail(ev, container) {
  const title      = ev.title?.fr || 'Sans titre';
  const desc       = ev.longDescription?.fr || ev.description?.fr || '';
  const conditions = typeof ev.conditions === 'string' ? ev.conditions : (ev.conditions?.fr || ev.conditions?.en || '');
  const isFree     = /gratuit|free|0\s*€/i.test(conditions.trim());
  const category   = (ev.keywords?.fr?.[0] || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/s$/, '');
  const venue      = ev.location || {};
  const address    = [venue.address, venue.postalCode, venue.city].filter(Boolean).join(', ');
  const safeLink   = ev.onlineAccessLink?.startsWith('https://') ? ev.onlineAccessLink : null;

  let imageSrc = null;
  if (ev.image?.base && ev.image?.filename) imageSrc = ev.image.base + ev.image.filename;

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
          ${start ? `<div class="detail-info-block">
            <p class="detail-info-label">Date</p>
            <p class="detail-info-value">${fmtDate(start)}</p>
            ${end ? `<p class="detail-info-sub">${fmtTime(start)} – ${fmtTime(end)}</p>` : ''}
          </div>` : ''}
          ${venue.name ? `<div class="detail-info-block">
            <p class="detail-info-label">Lieu</p>
            <p class="detail-info-value">${esc(venue.name)}</p>
            ${address ? `<p class="detail-info-sub">${esc(address)}</p>` : ''}
          </div>` : ''}
          ${timings.length > 1 ? `<div class="detail-info-block">
            <p class="detail-info-label">Toutes les dates (${timings.length})</p>
            <ul class="detail-timings">
              ${timings.slice(0, 8).map(t => {
                const d = new Date(t.begin);
                return `<li>${d.toLocaleDateString('fr-FR', {weekday:'short',day:'numeric',month:'short'})} · ${fmtTime(d)}</li>`;
              }).join('')}
              ${timings.length > 8 ? `<li class="detail-info-sub">+ ${timings.length - 8} autres dates</li>` : ''}
            </ul>
          </div>` : ''}
          ${ev.age?.min != null || ev.age?.max != null ? `<div class="detail-info-block">
            <p class="detail-info-label">Public</p>
            <p class="detail-info-value">${ev.age?.min != null ? 'Dès ' + ev.age.min + ' ans' : ''}${ev.age?.max != null ? (ev.age?.min != null ? ' — ' : '') + "jusqu'à " + ev.age.max + ' ans' : ''}</p>
          </div>` : ''}
          ${ev.imageCredits ? `<div class="detail-info-block">
            <p class="detail-info-label">Crédit photo</p>
            <p class="detail-info-sub">${esc(ev.imageCredits)}</p>
          </div>` : ''}
        </aside>
      </div>
    </div>
  `;
}