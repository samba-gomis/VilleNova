'use strict';

const CATEGORY_COLORS = {
  concert:    '#E8501A',
  exposition: '#0D9488',
  spectacle:  '#7C3AED',
  cinema:     '#2563EB',
  danse:      '#DB2777',
  atelier:    '#16A34A'
};

function getCategoryColor(raw) {
  const normalized = (raw || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/s$/, '');
  const key = Object.keys(CATEGORY_COLORS).find(k => normalized.includes(k));
  return key ? CATEGORY_COLORS[key] : '#1A3A5C';
}

// Detect dark mode for tile layer
function isDark() {
  return document.documentElement.getAttribute('data-theme') === 'dark';
}

// Init map — center on France, will auto-fit to events
const map = L.map('map', {
  center: [46.6, 2.3],
  zoom: 6,
  zoomControl: true,
  attributionControl: true
});

let tileLayer;

function applyTiles() {
  if (tileLayer) map.removeLayer(tileLayer);
  if (isDark()) {
    tileLayer = L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      { attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com/">CARTO</a>', maxZoom: 19 }
    ).addTo(map);
  } else {
    tileLayer = L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      { attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors', maxZoom: 19 }
    ).addTo(map);
  }
}

applyTiles();

// Switch tiles when theme changes
const themeBtn = document.getElementById('theme-toggle');
if (themeBtn) {
  themeBtn.addEventListener('click', () => {
    setTimeout(applyTiles, 50);
  });
}

async function loadMapEvents() {
  const loadingEl = document.getElementById('map-loading');
  const errorEl   = document.getElementById('map-error');
  const countEl   = document.getElementById('map-count');

  try {
    const url = `https://api.openagenda.com/v2/agendas/${AGENDA_ID}/events?key=${API_KEY}&limit=50&detailed=1`;
    const res  = await fetch(url);
    const data = await res.json();
    const events = data.events || [];

    const bounds = [];
    let located  = 0;

    events.forEach(ev => {
      const lat = ev.location?.latitude;
      const lng = ev.location?.longitude;
      if (!lat || !lng) return;

      located++;
      bounds.push([lat, lng]);

      const title    = ev.title?.fr || 'Sans titre';
      const venue    = ev.location?.name || '';
      const addr     = [ev.location?.address, ev.location?.postalCode, ev.location?.city].filter(Boolean).join(', ');
      const category = (ev.keywords?.fr?.[0] || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/s$/, '');
      const color    = getCategoryColor(category);

      const conditions = typeof ev.conditions === 'string' ? ev.conditions : (ev.conditions?.fr || ev.conditions?.en || '');
      const isFree  = /gratuit|free|0\s*€/i.test(conditions.trim());

      const dateObj = ev.firstTiming?.begin ? new Date(ev.firstTiming.begin) : null;
      const dateStr = dateObj
        ? dateObj.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
        : '';

      let imageSrc = null;
      if (ev.image?.base && ev.image?.filename)     imageSrc = ev.image.base + ev.image.filename;
      else if (ev.image?.filename)                  imageSrc = 'https://cdn.openagenda.com/main/' + ev.image.filename;
      else if (typeof ev.image === 'string')         imageSrc = ev.image;

      // Custom square marker via divIcon
      const iconHtml = `<div style="
        width:20px;height:20px;border-radius:4px;
        background:${color};border:2.5px solid #fff;
        box-shadow:0 2px 8px rgba(0,0,0,.35);
        cursor:pointer;
      "></div>`;

      const marker = L.marker([lat, lng], {
        icon: L.divIcon({
          html: iconHtml,
          className: '',
          iconSize: [20, 20],
          iconAnchor: [10, 10],
          popupAnchor: [0, -14]
        })
      }).addTo(map);

      // Popup content
      const popup = L.popup({
        maxWidth: 260,
        minWidth: 240,
        className: 'map-leaflet-popup',
        closeButton: true,
        autoPan: true
      }).setContent(`
        ${imageSrc
          ? `<img src="${esc(imageSrc)}" alt="${esc(title)}" class="map-popup-img" loading="lazy">`
          : `<div class="map-popup-img map-popup-img--empty" style="background:linear-gradient(135deg,${color}55,${color})"></div>`
        }
        <div class="map-popup-body">
          ${category ? `<span class="map-popup-badge" style="background:${color}">${esc(category)}</span>` : ''}
          <h3 class="map-popup-title">${esc(title)}</h3>
          ${dateStr ? `<p class="map-popup-date">${esc(dateStr)}</p>` : ''}
          ${venue    ? `<p class="map-popup-venue">📍 ${esc(venue)}</p>` : ''}
          ${addr && addr !== venue ? `<p class="map-popup-venue" style="font-size:.72rem">${esc(addr)}</p>` : ''}
          ${isFree   ? '<span class="map-popup-free">Gratuit</span>' : ''}
          <a href="event-detail.html?id=${esc(ev.uid)}" class="map-popup-btn">Voir les détails →</a>
        </div>
      `);

      marker.bindPopup(popup);

      // Open on hover
      marker.on('mouseover', function () { this.openPopup(); });
    });

    if (countEl) countEl.textContent = located;

    if (bounds.length > 1) {
      map.fitBounds(bounds, { padding: [48, 48], maxZoom: 14 });
    } else if (bounds.length === 1) {
      map.setView(bounds[0], 14);
    }

    if (located === 0 && countEl) {
      countEl.textContent = '0';
      countEl.closest('.map-count').innerHTML += ' — <em>aucun événement géolocalisé pour cet agenda</em>';
    }

  } catch {
    if (errorEl) errorEl.hidden = false;
  } finally {
    if (loadingEl) {
      loadingEl.classList.add('hidden');
      setTimeout(() => loadingEl.remove(), 350);
    }
  }
}

loadMapEvents();
