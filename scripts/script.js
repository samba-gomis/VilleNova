'use strict';

/* ---- CONFIGURATION API ---- */
const API_KEY    = '09fb77f6b09e4997b3132dcecdc78db0'; 
const AGENDA_ID  = '9571344';
const API_URL = `https://api.openagenda.com/v2/agendas/${AGENDA_ID}/events?key=${API_KEY}&limit=12`;
/* Mobile Menu */
(function initMenu() {
  var toggle = document.querySelector('.nav-toggle');
  var menu   = document.getElementById('nav-menu');

  if (!toggle || !menu) return;

  toggle.addEventListener('click', function () {
    var isOpen = menu.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(isOpen));
  });

  // Close menu when clicking outside
  document.addEventListener('click', function (e) {
    if (!toggle.contains(e.target) && !menu.contains(e.target)) {
      menu.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    }
  });
}());

/* Category chips */
(function initFiltres() {
  var chips   = document.querySelectorAll('.chip');
  var annonce = document.getElementById('annonce');

  chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      // Disactive all chips
      chips.forEach(function (c) {
        c.classList.remove('on');
        c.setAttribute('aria-pressed', 'false');
      });

      // Active chip when clicked
      chip.classList.add('on');
      chip.setAttribute('aria-pressed', 'true');

      var filtre = chip.dataset.filter;
      filtrerEvenements(filtre);

      // Screen announcer
      if (annonce) {
        annonce.textContent = 'Filtre applique : ' + chip.textContent.trim();
      }
    });
  });

  function filtrerEvenements(filtre) {
    var cartes = document.querySelectorAll('#events-grid .card');
    var nb = 0;

    cartes.forEach(function (carte) {
      if (filtre === 'tous' || carte.dataset.categorie === filtre) {
        carte.hidden = false;
        nb++;
      } else {
        carte.hidden = true;
      }
    });

    // Update results counter
    var compteur = document.getElementById('nb-resultats');
    if (compteur) {
      compteur.textContent = nb;
    }
  }
}());

/* Favorite Buttons */
(function initFavoris() {
  var grid = document.getElementById('events-grid');
  if (!grid) return;

  grid.addEventListener('click', function (e) {
    var btn = e.target.closest('.cfav');
    if (!btn) return;

    var actif = btn.getAttribute('aria-pressed') === 'true';
    var titre = btn.getAttribute('aria-label').replace('Ajouter ', '').replace(' aux favoris', '');

    if (actif) {
      btn.setAttribute('aria-pressed', 'false');
      btn.innerHTML = '&#9825;';
      btn.style.color = '';
      btn.setAttribute('aria-label', 'Ajouter ' + titre + ' aux favoris');
    } else {
      btn.setAttribute('aria-pressed', 'true');
      btn.innerHTML = '&#9829;';
      btn.style.color = '#E8501A';
      btn.setAttribute('aria-label', 'Retirer ' + titre + ' des favoris');
    }
  });
}());

/* CONNEXION API OPENAGENDA */
async function fetchEvenements() {
  var loading = document.getElementById('loading');
  var grid    = document.getElementById('events-grid');
  var annonce = document.getElementById('annonce');

  if (!grid) return;

  if (loading) loading.hidden = false;
  if (annonce) annonce.textContent = 'Chargement des evenements en cours...';

  try {
    var response = await fetch(API_URL);

    if (!response.ok) {
      throw new Error('Erreur reseau : ' + response.status);
    }

    var data   = await response.json();
    var events = data.events;

    // Reinitialize the grid before adding new cards
    grid.innerHTML = '';

    if (!events || events.length === 0) {
      afficherErreur('Aucun evenement disponible pour le moment.', grid);
      return;
    }

    events.forEach(function (event) {
      var carte = creerCarte(event);
      grid.appendChild(carte);
    });

    var compteur = document.getElementById('nb-resultats');
    if (compteur) compteur.textContent = events.length;

    if (annonce) {
      annonce.textContent = events.length + ' evenements charges.';
    }

  } catch (err) {
    console.error('Erreur API OpenAgenda :', err);
    afficherErreur('Impossible de charger les evenements. Veuillez reessayer.', grid);
  } finally {
    if (loading) loading.hidden = true;
  }
}

/* Create Event Card with API Data */
function creerCarte(event) {
  var titre     = (event.title && event.title.fr)         || 'Evenement sans titre';
  var lieu      = (event.location && event.location.name) || '';
  var dateDebut = event.firstTiming && event.firstTiming.begin
    ? new Date(event.firstTiming.begin).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
    : '';

  // CORRECTION : OpenAgenda peut renvoyer l'image sous plusieurs formats
  var image = null;
  if (event.image) {
    if (typeof event.image === 'string') {
      image = event.image;                                               // URL directe
    } else if (event.image.base) {
      image = event.image.base;                                          // Format { base: "url" }
    } else if (event.image.filename) {
      image = 'https://cibul.s3.amazonaws.com/' + event.image.filename; // Format S3
    } else if (event.image.url) {
      image = event.image.url;                                           // Format { url: "..." }
    }
  }

  var cat     = (event.keywords && event.keywords.fr && event.keywords.fr[0]) || 'Evenement';
  var gratuit = event.registration && event.registration.some(function (r) { return r.price && r.price === 0; });
  var prix    = !gratuit && event.registration && event.registration[0] && event.registration[0].price
    ? event.registration[0].price + ' €'
    : null;

  var article = document.createElement('article');
  article.className = 'card';
  article.dataset.categorie = cat.toLowerCase();

  // Zone image
  var divImg = document.createElement('div');
  divImg.className = 'card-img';

  if (image) {
    var picture = document.createElement('picture');
    var img     = document.createElement('img');
    img.src          = image;
    img.alt          = 'Affiche de ' + titre;
    img.width        = 392;
    img.height       = 150;
    img.loading      = 'lazy';
    img.style.width      = '100%';
    img.style.height     = '100%';
    img.style.objectFit  = 'cover';
    picture.appendChild(img);
    divImg.appendChild(picture);
  }

  var badge = document.createElement('span');
  badge.className = 'cbadge';
  badge.textContent = cat;
  badge.setAttribute('aria-label', 'Categorie : ' + cat);
  divImg.appendChild(badge);

  var btnFav = document.createElement('button');
  btnFav.className = 'cfav';
  btnFav.setAttribute('aria-pressed', 'false');
  btnFav.setAttribute('aria-label', 'Ajouter ' + titre + ' aux favoris');
  btnFav.innerHTML = '&#9825;';
  divImg.appendChild(btnFav);

  article.appendChild(divImg);

  // Cards body
  var body = document.createElement('div');
  body.className = 'card-body';

  var pDate = document.createElement('p');
  pDate.className = 'cdate';
  var time = document.createElement('time');
  time.textContent = dateDebut;
  pDate.appendChild(time);
  body.appendChild(pDate);

  var h3 = document.createElement('h3');
  h3.textContent = titre;
  body.appendChild(h3);

  var addr = document.createElement('address');
  addr.className = 'clieu';
  addr.setAttribute('aria-label', 'Lieu');
  addr.textContent = lieu;
  body.appendChild(addr);

  article.appendChild(body);

  // Cards footer
  var footer = document.createElement('div');
  footer.className = 'card-footer';

  if (gratuit) {
    var spanGratuit = document.createElement('span');
    spanGratuit.className = 'free';
    spanGratuit.setAttribute('aria-label', 'Entree gratuite');
    spanGratuit.textContent = 'Gratuit';
    footer.appendChild(spanGratuit);
  } else if (prix) {
    var spanPrix = document.createElement('span');
    spanPrix.className = 'price';
    spanPrix.setAttribute('aria-label', 'Tarif : ' + prix);
    spanPrix.textContent = prix;
    footer.appendChild(spanPrix);
  } else {
    footer.appendChild(document.createElement('span'));
  }

  var lienDetail = document.createElement('a');
  lienDetail.href      = 'event-detail.html?id=' + event.uid;
  lienDetail.className = 'btn-b';
  lienDetail.textContent = gratuit ? 'En savoir plus' : 'Reserver';
  footer.appendChild(lienDetail);

  article.appendChild(footer);

  return article;
}

/* Error Message Display */
function afficherErreur(message, conteneur) {
  conteneur.innerHTML = '';
  var div = document.createElement('div');
  div.setAttribute('role', 'alert');
  div.setAttribute('aria-live', 'assertive');
  div.style.cssText = 'text-align:center;padding:3rem;color:#DC2626;font-size:0.95rem;grid-column:1/-1;';
  div.textContent = message;
  conteneur.appendChild(div);
}

/* Navigation to Event Detail */
(function initNavigationCartes() {
  var grid = document.getElementById('events-grid');
  if (!grid) return;

  grid.addEventListener('click', function (e) {
    if (e.target.closest('button') || e.target.closest('a')) return;

    var carte = e.target.closest('.card');
    if (!carte) return;

    var lien = carte.querySelector('a.btn-b');
    if (lien) {
      window.location.href = lien.href;
    }
  });

  grid.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter') return;

    var carte = e.target.closest('.card');
    if (!carte) return;

    var lien = carte.querySelector('a.btn-b');
    if (lien) {
      window.location.href = lien.href;
    }
  });
}());

/* View More Button */
(function initVoirPlus() {
  var btn = document.getElementById('btn-load-more');
  if (!btn) return;

  btn.addEventListener('click', function () {
    console.log('Charger la page suivante via l\'API OpenAgenda');
  });
}());

document.addEventListener('DOMContentLoaded', function () {
  fetchEvenements();
});