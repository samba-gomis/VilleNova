# VilleNova

Official cultural agenda for the city of VilleNova — concerts, exhibitions, shows, cinema, dance and workshops all in one place.

Project built as part of the **Bachelor Software Developer program — La Plateforme (B1 G03)**.

---

## Overview

VilleNova is a static web application that centralises cultural events from a city using the [OpenAgenda](https://openagenda.com/) public API. The goal: make culture accessible to everyone, on every screen, with no technical overhead and a minimal environmental footprint.

---

## Features

### Agenda
- **Live event feed** — events fetched from the OpenAgenda API v2
- **Category filters** — Concerts, Exhibitions, Shows, Cinema, Dance, Workshops
- **Date filters** — This weekend / This week / This month
- **Full-text search** — live query sent to the API
- **Pagination** — Load more / Load less (6 events per page)
- **Skeleton loading** — 6 placeholder cards shown instantly while fetching
- **Color coding** — each category has its own gradient and badge color

### Event detail
- Full description, all scheduled dates, venue, address, price, online access link
- Dynamic page title updated from the API response

### Favorites
- Add / remove via the heart button on any card
- Persisted in `localStorage` — survives page refresh
- Dedicated favorites page with the same card layout

### Interactive map
- Full-viewport Leaflet map (OpenStreetMap / CARTO tiles)
- Square markers color-coded by category
- Hover a marker to see event image, date, venue and a link to the detail page
- Tiles switch automatically between light and dark theme

### Partners
- 14 real event industry companies across 4 categories (Ticketing, Venues, Production, Cultural Media)
- Each card links to the official website in a new tab
- Logos built from CSS initials only — zero image requests

### UX & accessibility
- Dark mode toggle (☀/☽) with `localStorage` persistence and automatic `prefers-color-scheme` detection
- Responsive hamburger menu with CSS-only ×-morph animation
- Escape key closes the mobile menu and returns focus to the toggle
- Active nav link underline indicator (`aria-current`)
- Skip link, ARIA roles, `aria-live`, `aria-pressed` throughout
- `prefers-reduced-motion` — all animations disabled for sensitive users
- Scroll-to-top button appearing after 400 px

### Eco-design
- CSS custom properties for the entire design system — zero hardcoded values
- Hero grain texture via inline SVG data-URI — zero network request
- Category placeholder backgrounds are CSS gradients — no fallback images
- `content-visibility: auto` on footer and newsletter sections
- `font-display: swap` on Google Fonts
- Leaflet (42 KB) instead of Google Maps SDK — open-source, no API key
- XSS protection via `esc()` on all API data injected into the DOM

---

## Pages

| File | Route | Description |
|---|---|---|
| `index.html` | `/` | Main agenda page |
| `html/about.html` | `/html/about.html` | Mission, values, key figures |
| `html/favorites.html` | `/html/favorites.html` | Saved events |
| `html/event-detail.html` | `/html/event-detail.html?id=…` | Event detail |
| `html/carte.html` | `/html/carte.html` | Interactive map |
| `html/partenaires.html` | `/html/partenaires.html` | Industry partners |

---

## Project structure

```
VilleNova/
├── index.html
├── html/
│   ├── about.html
│   ├── carte.html
│   ├── event-detail.html
│   ├── favorites.html
│   └── partenaires.html
├── scripts/
│   ├── utils.js        # API credentials, global state, esc() XSS guard
│   ├── theme.js        # Dark mode toggle + localStorage + prefers-color-scheme
│   ├── nav.js          # Hamburger menu, Escape key, scroll-to-top, filter shadow
│   ├── filter.js       # Category chips + search form submit
│   ├── card.js         # Card creation, favorites toggle (grid)
│   ├── api.js          # OpenAgenda fetch, skeleton loading, pagination
│   ├── detail.js       # Event detail page rendering
│   ├── favorites.js    # Favorites page rendering
│   └── map.js          # Leaflet map, markers, hover popups
├── scss/               # SCSS source (compiled manually to styles/)
│   ├── style.scss      # Entry point — imports all partials
│   ├── _variables.scss
│   ├── _mixins.scss
│   ├── _base.scss      # CSS custom properties, reset, dark mode tokens
│   ├── _nav.scss
│   ├── _hero.scss
│   ├── _filters.scss
│   ├── _cards.scss     # Cards + skeleton animation
│   ├── _detail.scss
│   ├── _about.scss
│   ├── _newsletter.scss
│   └── _footer.scss
├── styles/             # Compiled CSS — what the browser loads
│   ├── style.css
│   ├── about.css
│   ├── carte.css
│   ├── detail.css
│   └── partenaires.css
└── images/
    └── VilleNova.webp
```

> The SCSS files are the source of truth for style authoring, but the browser reads the compiled `styles/*.css` files directly. No build tool is required to run the project.

---

## Getting started

No installation required. Pure HTML / CSS / JS — no framework, no bundler.

**Option 1 — Open directly**

Double-click `index.html` in the file explorer.

> Some browsers block `fetch()` requests on `file://`. If events do not appear, use option 2.

**Option 2 — Local server (recommended)**

With the VS Code **Live Server** extension:

1. Open the `VilleNova/` folder in VS Code
2. Right-click `index.html` → **Open with Live Server**

With Python:

```bash
python -m http.server 8080
# then open http://localhost:8080
```

---

## API

| Parameter | Value |
|---|---|
| Base URL | `https://api.openagenda.com/v2/` |
| Agenda ID | `9571344` |
| API key | defined in `scripts/utils.js` |
| Page size | 6 events (agenda) / 50 events (map) |

Supported query parameters: `search`, `timings[gte]`, `timings[lte]`, `offset`, `detailed`.

---

## Tech stack

| Technology | Usage |
|---|---|
| HTML5 | Semantic, accessible structure |
| SCSS → CSS3 | Modular styles, compiled manually |
| JavaScript ES2020+ | DOM, fetch, localStorage, optional chaining |
| OpenAgenda API v2 | Live event data source |
| Leaflet 1.9 | Open-source interactive map |
| OpenStreetMap / CARTO | Map tiles (free, no API key) |
| Google Fonts | Syne (headings) + DM Sans (body) |
| localStorage | Favorites and theme persistence |

---

## Security

- All API data injected into the DOM is escaped through `esc()` in `scripts/utils.js` — prevents XSS
- External links (`onlineAccessLink`) are validated to allow `https://` only before rendering
- Partner cards use `rel="noopener noreferrer"` on all `target="_blank"` links

---

## Authors

Built by group **B1 G03** — La Plateforme (2026).
