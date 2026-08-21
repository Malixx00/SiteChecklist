// Settings screen. Port of com.sitereporter.ui.screens.SettingsScreen.

import { settings } from '../settings.js';
import { ThemeMode } from '../logic.js';
import { esc, icon, toast, promptDialog, confirmDialog } from '../ui.js';
import { currentUser, sessionExpiresAt, signOut } from '../auth.js';
import { topBar, bottomNav, paintNetworkPills } from './shell.js';
import { confirmReset } from './checklist.js';
import { applyTheme } from '../theme.js';
import { APP_VERSION, BUILD } from '../version.js';

const THEME_LABELS = { LIGHT: 'Light', DARK: 'Dark', SYSTEM: 'System' };

/** " - session ends 18:42", so a technician knows when to expect a re-prompt. */
function sessionNote() {
  const at = sessionExpiresAt();
  if (!at) return '';
  const time = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' })
    .format(new Date(at));
  return ` — session ends ${time}`;
}

export function render(root, navigate) {
  const paint = () => {
    root.innerHTML = markup();
    wire(root, navigate, paint);
    paintNetworkPills();
  };
  paint();
  return () => {};
}

function markup() {
  const theme = settings.themeMode;
  const modes = [ThemeMode.LIGHT, ThemeMode.DARK, ThemeMode.SYSTEM];

  return `
    <div class="screen">
      ${topBar({ title: 'Settings', back: true })}
      <main class="page page--settings">
        <h2 class="settings__header">Appearance</h2>

        <div class="settings__row settings__row--stack">
          <span class="settings__label">Display mode</span>
          <div class="segmented" role="group" aria-label="Display mode">
            ${modes.map((mode) => `
              <button type="button" class="segmented__item ${theme === mode ? 'is-selected' : ''}"
                data-theme="${mode}" aria-pressed="${theme === mode}">${THEME_LABELS[mode]}</button>`).join('')}
          </div>
        </div>

        <hr class="divider">

        <button type="button" class="settings__row settings__row--button" data-act="sun">
          <span class="settings__text">
            <span class="settings__label">Sun mode</span>
            <span class="settings__value">Forces a maximum-contrast white screen for direct sunlight</span>
          </span>
          <span class="switch ${settings.sunMode ? 'is-on' : ''}" role="switch"
            aria-checked="${settings.sunMode}"><span class="switch__knob"></span></span>
        </button>

        <hr class="divider">
        <h2 class="settings__header">Inspector</h2>

        <button type="button" class="settings__row settings__row--button" data-act="name">
          <span class="settings__text">
            <span class="settings__label">Inspector name</span>
            ${settings.inspectorName ? `<span class="settings__value">${esc(settings.inspectorName)}</span>` : ''}
          </span>
          ${icon('chevronRight', 'icon--muted')}
        </button>

        <hr class="divider">

        <button type="button" class="settings__row settings__row--button" data-act="site">
          <span class="settings__text">
            <span class="settings__label">Site ID</span>
            ${settings.siteId ? `<span class="settings__value">${esc(settings.siteId)}</span>` : ''}
          </span>
          ${icon('chevronRight', 'icon--muted')}
        </button>

        <hr class="divider">
        <h2 class="settings__header">Account</h2>

        <div class="settings__row">
          <span class="settings__text">
            <span class="settings__label">Signed in as</span>
            <span class="settings__value">${esc(currentUser() ?? 'Unknown')}${sessionNote()}</span>
          </span>
        </div>

        <hr class="divider">

        <button type="button" class="settings__row settings__row--button" data-act="signout">
          <span class="settings__text">
            <span class="settings__label">Sign out</span>
            <span class="settings__value">Your answers and photos stay saved on this device</span>
          </span>
          ${icon('chevronRight', 'icon--muted')}
        </button>

        <hr class="divider">
        <h2 class="settings__header">Data</h2>

        <button type="button" class="settings__row settings__row--button" data-act="reset">
          <span class="settings__text">
            <span class="settings__label is-danger">Reset Checklist</span>
            <span class="settings__value is-danger-muted">Permanently clears all answers and photos on this device — cannot be undone</span>
          </span>
        </button>

        <hr class="divider">
        <h2 class="settings__header">About</h2>

        <div class="settings__row">
          <span class="settings__label">Version</span>
          <span class="settings__value">${esc(APP_VERSION)}</span>
        </div>

        <hr class="divider">

        <div class="settings__row">
          <span class="settings__label">Build</span>
          <span class="settings__value">${esc(BUILD)}</span>
        </div>

        <hr class="divider">

        <a class="settings__row settings__row--button" href="#/diagnostics">
          <span class="settings__text">
            <span class="settings__label">Diagnostics</span>
            <span class="settings__value">Connectivity, storage, permissions and support details</span>
          </span>
          ${icon('chevronRight', 'icon--muted')}
        </a>

        <hr class="divider">
      </main>
      ${bottomNav('settings')}
    </div>`;
}

function wire(root, navigate, paint) {
  root.querySelector('[data-act="back"]')?.addEventListener('click', () => navigate('#/checklist'));

  root.querySelectorAll('[data-theme]').forEach((button) => {
    button.addEventListener('click', () => {
      settings.themeMode = button.dataset.theme;
      applyTheme();
      paint();
    });
  });

  root.querySelector('[data-act="sun"]').addEventListener('click', () => {
    settings.sunMode = !settings.sunMode;
    applyTheme();
    paint();
  });

  root.querySelector('[data-act="name"]').addEventListener('click', async () => {
    const value = await promptDialog({
      title: 'Inspector Name', label: 'Name', value: settings.inspectorName,
    });
    if (value === null) return;
    settings.inspectorName = value;
    paint();
  });

  root.querySelector('[data-act="site"]').addEventListener('click', async () => {
    const value = await promptDialog({
      title: 'Site ID', label: 'Site ID', value: settings.siteId,
    });
    if (value === null) return;
    settings.siteId = value;
    paint();
  });

  root.querySelector('[data-act="reset"]').addEventListener('click', async () => {
    if (await confirmReset()) navigate('#/checklist');
  });

  root.querySelector('[data-act="signout"]').addEventListener('click', async () => {
    const ok = await confirmDialog({
      title: 'Sign out',
      message: 'Sign out of Site Reporter? Your answers and photos stay saved on this device.',
      confirmLabel: 'Sign out',
    });
    if (!ok) return;
    signOut();
    // Re-entering the router lands on the sign-in gate.
    navigate('#/checklist');
    location.reload();
  });
}
