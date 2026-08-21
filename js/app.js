// Application entry point: boot, hash routing, update prompt, connectivity.

import * as state from './state.js';
import { settings } from './settings.js';
import { DEFAULT_SURVEY_ID } from './seeder.js';
import { applyTheme, watchSystemTheme } from './theme.js';
import { toast, icon } from './ui.js';
import { paintNetworkPills } from './views/shell.js';
import { isSignedIn } from './auth.js';
import * as checklistView from './views/checklist.js';
import * as surveysView from './views/surveys.js';
import * as reportView from './views/report.js';
import * as settingsView from './views/settings.js';
import * as diagnosticsView from './views/diagnostics.js';
import * as loginView from './views/login.js';

const VIEWS = {
  surveys: surveysView,
  checklist: checklistView,
  report: reportView,
  settings: settingsView,
  diagnostics: diagnosticsView,
};

/** Routes that need a survey selected. */
const NEEDS_SURVEY = new Set(['checklist', 'report']);

const root = document.getElementById('app');
let currentRoute = null;
let teardown = null;

function routeFromHash() {
  const name = (location.hash.replace(/^#\/?/, '').split('/')[0] || '').toLowerCase();
  return VIEWS[name] ? name : 'checklist';
}

function navigate(hash) {
  if (location.hash === hash) paint();
  else location.hash = hash;
}

function paint() {
  try {
    teardown?.();
  } catch (e) {
    console.warn('View teardown failed', e);
  }

  // The sign-in gate replaces every screen until a session exists. Expiring
  // mid-job is safe: answers live in IndexedDB and are untouched by sign-out.
  if (!isSignedIn()) {
    currentRoute = 'login';
    teardown = loginView.render(root, navigate, () => paint()) ?? null;
    return;
  }

  let route = routeFromHash();
  // sections is never empty while a survey is selected - the safety section is
  // always prepended - so an empty list means the survey is gone or unset.
  if (NEEDS_SURVEY.has(route) && (!settings.currentSurveyId || state.state.sections.length === 0)) {
    route = 'surveys';
  }

  currentRoute = route;
  teardown = VIEWS[route].render(root, navigate) ?? null;
}

async function boot() {
  applyTheme();
  watchSystemTheme();

  try {
    await state.ensureDefaultSurvey();
    await state.loadSurveyList();
    if (!settings.currentSurveyId) {
      // Fresh install: preselect the built-in survey, as the Android app did.
      const hasDefault = state.state.surveys.some((s) => s.definition.id === DEFAULT_SURVEY_ID);
      if (hasDefault) settings.currentSurveyId = DEFAULT_SURVEY_ID;
    }
    await state.loadChecklist();
  } catch (e) {
    console.error('Startup failed', e);
    root.innerHTML = `<div class="screen"><main class="page">
      <h1 class="page__title">Site Reporter could not start</h1>
      <p class="page__sub">Local storage is unavailable, so answers could not be loaded.
      Nothing has been deleted. Close any private-browsing window, then reopen the app.</p>
      <pre class="reporttext">${String(e.message || e)}</pre>
    </main></div>`;
    return;
  }

  window.addEventListener('hashchange', paint);
  paint();

  // Coarse state changes (survey switched, checklist reloaded) repaint the
  // active view; per-question edits are patched by the view itself.
  state.subscribe((detail) => {
    if (detail.checklist || detail.section || (detail.surveys && currentRoute === 'surveys')) {
      paint();
    }
  });

  window.addEventListener('online', onConnectivityChange);
  window.addEventListener('offline', onConnectivityChange);
  paintNetworkPills();

  // Re-gate when the session lapses while the app sits in the background.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && currentRoute !== 'login' && !isSignedIn()) {
      paint();
    }
  });

  registerServiceWorker();
  requestPersistentStorage();
}

function onConnectivityChange() {
  paintNetworkPills();
  toast(navigator.onLine
    ? 'Back online. Everything you recorded while offline is already saved on this device.'
    : 'You are offline. The app keeps working and saves everything on this device.');
}

/**
 * Asks the browser not to evict our data under storage pressure. Without this,
 * a device low on space can silently drop unsynchronised field records.
 */
async function requestPersistentStorage() {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) {
      await navigator.storage.persist();
    }
  } catch (_) { /* best effort - diagnostics reports the outcome */ }
}

// ---------------------------------------------------------------------------
// Service worker + update prompt (spec section 9)
// ---------------------------------------------------------------------------

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  navigator.serviceWorker.register('sw.js').then((registration) => {
    // A worker already waiting means an update downloaded on a previous visit.
    if (registration.waiting && navigator.serviceWorker.controller) {
      showUpdateBanner(registration.waiting);
    }

    registration.addEventListener('updatefound', () => {
      const installing = registration.installing;
      installing?.addEventListener('statechange', () => {
        if (installing.state === 'installed' && navigator.serviceWorker.controller) {
          showUpdateBanner(installing);
        }
      });
    });

    // Check for a new release when the app is brought back to the foreground.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') registration.update().catch(() => {});
    });
  }).catch((e) => console.warn('Service worker registration failed', e));

  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading) return;
    reloading = true;
    location.reload();
  });
}

function showUpdateBanner(worker) {
  const banner = document.getElementById('update-banner');
  banner.innerHTML = `
    ${icon('refresh')}
    <span>A new version of Site Reporter is ready.</span>
    <button type="button" class="btn btn--filled btn--small" data-act="update">Update Now</button>
    <button type="button" class="btn btn--text btn--small" data-act="later">Later</button>`;
  banner.hidden = false;

  banner.querySelector('[data-act="update"]').addEventListener('click', () => {
    // Answers live in IndexedDB / localStorage, which the update never touches.
    banner.hidden = true;
    worker.postMessage({ type: 'SKIP_WAITING' });
  });
  banner.querySelector('[data-act="later"]').addEventListener('click', () => {
    banner.hidden = true;
  });
}

boot();
