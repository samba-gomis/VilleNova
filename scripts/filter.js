'use strict';

// Show/hide cards based on the active category chip
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

// Category chip click — toggle active state and re-filter
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

// Search form submit — reload from offset 0 with the new query
document.querySelector('.search')?.addEventListener('submit', e => {
  e.preventDefault();
  offset = 0;
  loadEvents(0);
});