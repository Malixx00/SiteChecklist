// Shared screen chrome: top bar, bottom navigation, connectivity pill.

import { esc, icon } from '../ui.js';
import { symbolSvg } from '../components/logo.js';

export const NAV_ITEMS = [
  { route: 'checklist', label: 'Checklist', icon: 'checklist' },
  { route: 'report', label: 'Draft Report', icon: 'fileText' },
  { route: 'settings', label: 'Settings', icon: 'settings' },
];

/**
 * @param {{title: string, subtitle?: string, back?: boolean, actions?: string}} o
 *   `actions` is raw markup for trailing buttons.
 */
export function topBar({ title, subtitle = '', back = false, actions = '' }) {
  return `
    <header class="topbar">
      ${back
        ? `<button class="topbar__icon" data-act="back" aria-label="Back">${icon('arrowLeft')}</button>`
        // Mono mark on the Independence bar, per style guide pages 5-6.
        : `<span class="topbar__brand">${symbolSvg('mono')}</span>`}
      <div class="topbar__title">
        <strong>${esc(title)}</strong>
        ${subtitle ? `<span class="topbar__sub">${esc(subtitle)}</span>` : ''}
      </div>
      <div class="topbar__actions">
        <span class="netpill" data-netpill hidden>${icon('wifiOff')}<span>Offline</span></span>
        ${actions}
      </div>
    </header>`;
}

export function bottomNav(active) {
  const items = NAV_ITEMS.map((item) => `
    <a class="bottomnav__item ${item.route === active ? 'is-active' : ''}" href="#/${item.route}"
       ${item.route === active ? 'aria-current="page"' : ''}>
      ${icon(item.icon)}<span>${esc(item.label)}</span>
    </a>`);
  return `<nav class="bottomnav">${items.join('')}</nav>`;
}

/** Keeps every rendered connectivity pill in step with navigator.onLine. */
export function paintNetworkPills() {
  const offline = !navigator.onLine;
  document.querySelectorAll('[data-netpill]').forEach((pill) => {
    pill.toggleAttribute('hidden', !offline);
  });
}
