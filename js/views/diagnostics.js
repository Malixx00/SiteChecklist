// Diagnostics screen (spec section 19). No Android equivalent.
//
// Everything shown here is safe to paste into a support ticket: this app holds
// no tokens, secrets or credentials, and the copy action deliberately excludes
// customer answer content.

import * as db from '../db.js';
import * as state from '../state.js';
import { settings } from '../settings.js';
import { esc, icon, toast, copyText } from '../ui.js';
import { topBar, bottomNav, paintNetworkPills } from './shell.js';
import { formatBytes } from '../images.js';
import { APP_NAME, APP_VERSION, BUILD } from '../version.js';
import { currentUser, sessionExpiresAt } from '../auth.js';

export function render(root, navigate) {
  root.innerHTML = `
    <div class="screen">
      ${topBar({ title: 'Diagnostics', back: true })}
      <main class="page page--settings">
        <div class="diag" data-diag><p class="empty">Collecting…</p></div>
        <button type="button" class="btn btn--outline btn--wide" data-act="copy">
          ${icon('copy')}<span>Copy Diagnostics</span>
        </button>
        <p class="page__note">Diagnostics contain no passwords or access tokens. Answer text and photos are never included.</p>
      </main>
      ${bottomNav('settings')}
    </div>`;

  root.querySelector('[data-act="back"]')?.addEventListener('click', () => navigate('#/settings'));

  let latest = [];
  collect().then((rows) => {
    latest = rows;
    root.querySelector('[data-diag]').innerHTML = rows.map((row) => `
      <div class="diag__row ${row.warn ? 'is-warn' : ''}">
        <span class="diag__key">${esc(row.key)}</span>
        <span class="diag__val">${esc(row.value)}</span>
      </div>`).join('');
  });

  root.querySelector('[data-act="copy"]').addEventListener('click', async () => {
    const text = latest.map((r) => `${r.key}: ${r.value}`).join('\n');
    const ok = await copyText(`${APP_NAME} diagnostics\n${'-'.repeat(28)}\n${text}\n`);
    toast(ok ? 'Diagnostics copied to clipboard'
      : 'Could not copy. Read the values above to support instead.', { tone: ok ? 'info' : 'error' });
  });

  paintNetworkPills();
  return () => {};
}

async function collect() {
  const rows = [];
  const add = (key, value, warn = false) => rows.push({ key, value: String(value), warn });

  add('Application', APP_NAME);
  add('Version', APP_VERSION);
  add('Build', BUILD);

  add('Inspector', settings.inspectorName || '(not set)');
  add('Site ID', settings.siteId || '(not set)');
  add('Signed in as', currentUser() ?? '(not signed in)');
  const expires = sessionExpiresAt();
  add('Session ends', expires ? new Date(expires).toLocaleString() : 'n/a');
  add('Sign-in type', 'Shared device credential (client-side gate)');

  add('Network', navigator.onLine ? 'Online' : 'Offline', !navigator.onLine);
  add('Backend', 'None configured — this app stores all data on this device');
  add('Pending synchronisation items', '0 (no backend configured)');
  add('Last local save', settings.lastSaved ? new Date(settings.lastSaved).toLocaleString() : 'Never');

  const [answers, photos, surveys] = await Promise.all([
    db.countAllAnswers().catch(() => 'unavailable'),
    db.countAllPhotos().catch(() => 'unavailable'),
    db.loadSurveys().then((s) => s.length).catch(() => 'unavailable'),
  ]);
  add('Saved answers', answers);
  add('Saved photos', photos);
  add('Surveys on device', surveys);
  add('Current survey', settings.currentSurveyId || '(none selected)');
  add('Sections loaded', state.state.sections.length);

  if (navigator.storage?.estimate) {
    try {
      const { usage, quota } = await navigator.storage.estimate();
      add('Storage used', `${formatBytes(usage)} of ${formatBytes(quota)}`);
    } catch (_) {
      add('Storage used', 'unavailable');
    }
  }
  if (navigator.storage?.persisted) {
    try {
      add('Storage persistence', (await navigator.storage.persisted()) ? 'Granted' : 'Best-effort');
    } catch (_) { /* not fatal */ }
  }

  const standalone = window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true;
  add('Launch mode', standalone ? 'Installed app (standalone)' : 'Browser tab');
  add('Service worker', 'serviceWorker' in navigator
    ? (navigator.serviceWorker.controller ? 'Active' : 'Registered, not yet controlling')
    : 'Not supported', !('serviceWorker' in navigator));

  add('Platform', `${navigator.platform || 'unknown'} · ${screen.width}x${screen.height} @${window.devicePixelRatio || 1}x`);
  add('Browser', navigator.userAgent);
  add('Language', navigator.language);

  add('Voice dictation', (window.SpeechRecognition || window.webkitSpeechRecognition)
    ? 'Supported' : 'Not supported on this browser');
  add('Camera capture', 'Supported (system camera via file input)');

  for (const name of ['microphone', 'camera']) {
    add(`Permission: ${name}`, await permissionState(name));
  }

  return rows;
}

async function permissionState(name) {
  if (!navigator.permissions?.query) return 'Unknown (browser cannot report it)';
  try {
    const status = await navigator.permissions.query({ name });
    return status.state; // granted | denied | prompt
  } catch (_) {
    return 'Unknown (browser cannot report it)';
  }
}
