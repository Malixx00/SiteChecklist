// Theme application. Port of SiteReporterTheme + LocalSunMode.
//
// Sun mode always forces light regardless of the system or stored preference,
// and swaps background/surface for a warm yellow-white so the screen stays
// readable in direct sunlight.

import { settings } from './settings.js';
import { ThemeMode } from './logic.js';

// Matches --chrome in css/app.css: Independence in light and sun mode, a
// darkened gunmetal in dark mode.
const CHROME = { light: '#425563', dark: '#16202A' };

export function applyTheme() {
  const sun = settings.sunMode;
  const mode = settings.themeMode;
  const dark = sun ? false
    : mode === ThemeMode.DARK ? true
    : mode === ThemeMode.LIGHT ? false
    : window.matchMedia('(prefers-color-scheme: dark)').matches;

  const root = document.documentElement;
  root.dataset.theme = dark ? 'dark' : 'light';
  root.dataset.sun = sun ? 'on' : 'off';

  // The status bar / title bar of the installed app follows the top bar.
  document.querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', dark ? CHROME.dark : CHROME.light);
}

/** Follows the OS setting while the app is on ThemeMode.SYSTEM. */
export function watchSystemTheme() {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (settings.themeMode === ThemeMode.SYSTEM && !settings.sunMode) applyTheme();
  });
}
