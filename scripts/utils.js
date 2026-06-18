'use strict';

// API credentials
const API_KEY   = '3a0c95fcb5fa426fb34f9a49557dbc07';
const AGENDA_ID = '9571344';
const LIMIT     = 6;

// Mutable state shared across modules
let offset = 0;
let total  = 0;

// Prefix for links depending on whether we are in /html/ subfolder
const BASE = window.location.pathname.includes('/html/') ? '' : 'html/';

// Escape user-facing strings before injecting into innerHTML to prevent XSS
function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}
