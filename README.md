# VilleNova

Agenda culturel officiel de la ville de VilleNova — concerts, expositions, spectacles, cinéma, danse et ateliers réunis en un seul endroit.

Projet réalisé dans le cadre de la formation **Bachelor Développeur Logiciel — La Plateforme (B1 G03)**.

---

## Aperçu

VilleNova est une application web statique qui centralise les événements culturels d'une ville via l'API [OpenAgenda](https://openagenda.com/). L'objectif est de rendre la culture accessible à tous, sur tous les écrans, sans surcharge technique ni surcharge environnementale.

---

## Fonctionnalités

- **Agenda en temps réel** — événements chargés depuis l'API OpenAgenda
- **Filtres par catégorie** — Concerts, Expositions, Spectacles, Cinéma, Danse, Ateliers
- **Filtre par date** — Ce week-end, Cette semaine, Ce mois-ci
- **Recherche plein texte** — barre de recherche dans le hero
- **Pagination** — bouton Voir plus / Voir moins (6 événements par page)
- **Page de détail** — informations complètes, toutes les dates, lieu, tarif, accès en ligne
- **Favoris** — ajout/suppression via le bouton cœur, persistance en `localStorage`
- **Page Mes favoris** — liste personnelle consultable à tout moment
- **Page À propos** — mission, valeurs et piliers du projet
- **Newsletter** — formulaire d'inscription (UI)
- **Navigation responsive** — menu hamburger sur mobile
- **Accessibilité** — skip link, rôles ARIA, `aria-live`, `aria-pressed`, `aria-current`
- **Éco-responsabilité** — images lazy-loading, pages légères, aucune dépendance externe

---

## Structure du projet

```
VilleNova/
├── index.html              # Page principale — agenda
├── html/
│   ├── about.html          # Page À propos
│   ├── event-detail.html   # Page détail d'un événement
│   └── favorites.html      # Page Mes favoris
├── scripts/
│   ├── utils.js            # Constantes API, état global, fonction esc() anti-XSS
│   ├── nav.js              # Menu hamburger responsive
│   ├── filter.js           # Filtres catégorie + soumission recherche
│   ├── card.js             # Création des cartes + gestion favoris (grille)
│   ├── api.js              # Appels OpenAgenda, pagination
│   ├── detail.js           # Rendu de la page détail
│   └── favorites.js        # Rendu et gestion de la page favoris
├── scss/
│   ├── style.scss          # Point d'entrée SCSS (importe les partials)
│   ├── _variables.scss     # Variables de design (couleurs, typo, espacements)
│   ├── _mixins.scss        # Mixins réutilisables
│   ├── _base.scss          # Reset et styles globaux
│   ├── _nav.scss           # Navigation
│   ├── _hero.scss          # Section hero + barre de recherche
│   ├── _filters.scss       # Chips de filtres
│   ├── _cards.scss         # Cartes événements
│   ├── _detail.scss        # Page détail
│   ├── _about.scss         # Page à propos
│   ├── _newsletter.scss    # Section newsletter
│   └── _footer.scss        # Pied de page
├── styles/
│   ├── style.css           # CSS compilé depuis SCSS
│   ├── about.css           # CSS compilé pour la page about
│   └── detail.css          # CSS compilé pour la page détail
└── images/
    └── VilleNova.webp      # Logo du projet
```

---

## Lancer le projet

Aucune installation requise. Le projet est un site statique HTML/CSS/JS pur, sans framework ni bundler.

**Option 1 — Ouvrir directement**

Double-cliquer sur `index.html` dans l'explorateur de fichiers.

> Certains navigateurs bloquent les requêtes `fetch()` en `file://`. Si les événements n'apparaissent pas, utiliser l'option 2.

**Option 2 — Serveur local (recommandé)**

Avec l'extension VS Code **Live Server** :

1. Ouvrir le dossier `VilleNova/` dans VS Code
2. Clic droit sur `index.html` → **Open with Live Server**

Avec Python :

```bash
python -m http.server 8080
# puis ouvrir http://localhost:8080
```

---

## API

Le projet consomme l'API publique **OpenAgenda v2**.

| Paramètre   | Valeur                             |
|-------------|------------------------------------|
| Endpoint    | `https://api.openagenda.com/v2/`   |
| Agenda ID   | `9571344`                          |
| Clé API     | définie dans `scripts/utils.js`    |
| Limite      | 6 événements par requête           |

Les requêtes supportent la recherche textuelle (`search`), les filtres temporels (`timings[gte]` / `timings[lte]`) et le chargement paginé via `offset`.

---

## Technologies

| Technologie | Usage                              |
|-------------|------------------------------------|
| HTML5       | Structure sémantique et accessible |
| SCSS / CSS3 | Styles modulaires compilés         |
| JavaScript (ES6+) | Logique client, DOM, fetch    |
| OpenAgenda API v2 | Source de données événements  |
| localStorage | Persistance des favoris côté client |
| Google Fonts | Syne (titres) + DM Sans (corps)   |

---

## Sécurité

Toutes les données provenant de l'API sont échappées avant injection dans le DOM via la fonction `esc()` (`scripts/utils.js`), ce qui protège contre les attaques XSS.

Les liens externes (`onlineAccessLink`) sont validés pour n'autoriser que le protocole `https://` avant d'être affichés.

---

## Auteurs

Projet réalisé par le groupe **B1 G03** — La Plateforme (2026).
