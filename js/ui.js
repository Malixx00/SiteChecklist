// Shared UI primitives: element building, icons, snackbars, dialogs, downloads.
// No framework - template strings plus a parse helper cover everything the
// Compose screens did, and keep the bundle at zero dependencies.

export const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/** Parses an HTML string into a single element. */
export function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

/** Preserves author line breaks in descriptions. */
export const multiline = (s) => esc(s).replace(/\n/g, '<br>');

// ---------------------------------------------------------------------------
// Icons - stroke-based 24x24, inherit currentColor
// ---------------------------------------------------------------------------

const PATHS = {
  check: 'M20 6L9 17l-5-5',
  checkCircle: 'M22 11.08V12a10 10 0 1 1-5.93-9.14|M22 4L12 14.01l-3-3',
  checklist: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  fileText: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z|M14 2v6h6|M16 13H8M16 17H8M10 9H8',
  settings: 'M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6',
  activity: 'M22 12h-4l-3 9L9 3l-3 9H2',
  more: 'M12 5h.01M12 12h.01M12 19h.01',
  camera: 'M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z|circle:12,13,4',
  video: 'M23 7l-7 5 7 5V7z|M14 5H3a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z',
  mic: 'M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z|M19 10v2a7 7 0 0 1-14 0v-2|M12 19v4M8 23h8',
  micOff: 'M1 1l22 22|M15 9.34V4a3 3 0 0 0-5.94-.6|M9 9v3a3 3 0 0 0 5.12 2.12|M19 10v2a7 7 0 0 1-11 5.7|M5 10v2a7 7 0 0 0 5 6.7|M12 19v4M8 23h8',
  warning: 'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z|M12 9v4M12 17h.01',
  copy: 'M20 9H11a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2z|M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1',
  play: 'M5 3l14 9-14 9V3z',
  plus: 'M12 5v14M5 12h14',
  trash: 'M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6',
  upload: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12',
  download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3',
  chevronRight: 'M9 18l6-6-6-6',
  arrowLeft: 'M19 12H5M12 19l-7-7 7-7',
  printer: 'M6 9V2h12v7|M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2|M6 14h12v8H6z',
  x: 'M18 6L6 18M6 6l12 12',
  note: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
  wifiOff: 'M1 1l22 22|M16.72 11.06A10.94 10.94 0 0 1 19 12.55|M5 12.55a10.94 10.94 0 0 1 5.17-2.39|M10.71 5.05A16 16 0 0 1 22.58 9|M1.42 9a15.91 15.91 0 0 1 4.7-2.88|M8.53 16.11a6 6 0 0 1 6.95 0|M12 20h.01',
  refresh: 'M23 4v6h-6M1 20v-6h6|M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15',
  sun: 'circle:12,12,5|M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42',
};

/** Inline SVG icon markup. `cls` is added to the <svg>. */
export function icon(name, cls = '') {
  const spec = PATHS[name];
  if (!spec) return '';
  const parts = spec.split('|').map((p) => {
    if (p.startsWith('circle:')) {
      const [cx, cy, r] = p.slice(7).split(',');
      return `<circle cx="${cx}" cy="${cy}" r="${r}"/>`;
    }
    return `<path d="${p}"/>`;
  });
  const round = name === 'more' ? ' stroke-width="2.6"' : '';
  return `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor"${round}
    stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${parts.join('')}</svg>`;
}

// ---------------------------------------------------------------------------
// Snackbar
// ---------------------------------------------------------------------------

/**
 * Shows a snackbar. Errors state what failed, whether data was kept and what
 * to do next - never a bare "Error occurred".
 * @param {string} message
 * @param {{actionLabel?: string, onAction?: Function, duration?: number, tone?: 'info'|'error'}} opts
 */
export function toast(message, opts = {}) {
  const host = document.getElementById('toast-host');
  const node = el(`
    <div class="toast ${opts.tone === 'error' ? 'toast--error' : ''}" role="status" aria-live="polite">
      <span class="toast__text">${esc(message)}</span>
      ${opts.actionLabel ? `<button class="toast__action" type="button">${esc(opts.actionLabel)}</button>` : ''}
    </div>`);
  const close = () => {
    node.classList.add('toast--out');
    setTimeout(() => node.remove(), 200);
  };
  node.querySelector('.toast__action')?.addEventListener('click', () => {
    close();
    opts.onAction?.();
  });
  host.appendChild(node);
  setTimeout(close, opts.duration ?? (opts.actionLabel ? 8000 : 4000));
}

// ---------------------------------------------------------------------------
// Dialogs
// ---------------------------------------------------------------------------

function openDialog(innerHtml, wire) {
  const host = document.getElementById('dialog-host');
  const scrim = el(`<div class="scrim"><div class="dialog" role="dialog" aria-modal="true">${innerHtml}</div></div>`);
  host.appendChild(scrim);
  const dialog = scrim.querySelector('.dialog');

  return new Promise((resolve) => {
    const done = (value) => {
      scrim.remove();
      document.removeEventListener('keydown', onKey);
      resolve(value);
    };
    const onKey = (e) => { if (e.key === 'Escape') done(null); };
    document.addEventListener('keydown', onKey);
    scrim.addEventListener('click', (e) => { if (e.target === scrim) done(null); });
    wire(dialog, done);
  });
}

/** @returns {Promise<boolean|null>} true on confirm, null on dismiss */
export function confirmDialog({ title, message, confirmLabel = 'OK', cancelLabel = 'Cancel', destructive = false }) {
  return openDialog(`
    <h2 class="dialog__title">${esc(title)}</h2>
    <p class="dialog__body">${esc(message)}</p>
    <div class="dialog__actions">
      <button class="btn btn--text" data-act="cancel" type="button">${esc(cancelLabel)}</button>
      <button class="btn ${destructive ? 'btn--danger' : 'btn--filled'}" data-act="ok" type="button">${esc(confirmLabel)}</button>
    </div>`, (dialog, done) => {
    dialog.querySelector('[data-act="cancel"]').addEventListener('click', () => done(null));
    dialog.querySelector('[data-act="ok"]').addEventListener('click', () => done(true));
  });
}

/** @returns {Promise<string|null>} trimmed value, or null on dismiss */
export function promptDialog({ title, message = '', label = '', value = '', placeholder = '', confirmLabel = 'Save', required = false }) {
  return openDialog(`
    <h2 class="dialog__title">${esc(title)}</h2>
    ${message ? `<p class="dialog__body">${esc(message)}</p>` : ''}
    <label class="field">
      ${label ? `<span class="field__label">${esc(label)}</span>` : ''}
      <input class="input" type="text" value="${esc(value)}" placeholder="${esc(placeholder)}">
    </label>
    <div class="dialog__actions">
      <button class="btn btn--text" data-act="cancel" type="button">Cancel</button>
      <button class="btn btn--filled" data-act="ok" type="button">${esc(confirmLabel)}</button>
    </div>`, (dialog, done) => {
    const input = dialog.querySelector('input');
    const ok = dialog.querySelector('[data-act="ok"]');
    const sync = () => { ok.disabled = required && !input.value.trim(); };
    input.addEventListener('input', sync);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !ok.disabled) done(input.value.trim());
    });
    sync();
    dialog.querySelector('[data-act="cancel"]').addEventListener('click', () => done(null));
    ok.addEventListener('click', () => done(input.value.trim()));
    setTimeout(() => input.focus(), 50);
  });
}

// ---------------------------------------------------------------------------
// Menus
// ---------------------------------------------------------------------------

/**
 * Anchored dropdown menu.
 * @param {HTMLElement} anchor
 * @param {Array<{label: string, value: string, danger?: boolean, icon?: string}>} items
 * @returns {Promise<string|null>} chosen value
 */
export function menu(anchor, items) {
  const host = document.getElementById('dialog-host');
  const rect = anchor.getBoundingClientRect();
  const scrim = el(`<div class="menu-scrim"><div class="menu" role="menu"></div></div>`);
  const list = scrim.querySelector('.menu');
  list.style.top = `${rect.bottom + 4}px`;
  list.style.right = `${Math.max(8, window.innerWidth - rect.right)}px`;
  for (const item of items) {
    const button = el(`<button class="menu__item ${item.danger ? 'menu__item--danger' : ''}" role="menuitem" type="button">
      ${item.icon ? icon(item.icon) : ''}<span>${esc(item.label)}</span></button>`);
    button.dataset.value = item.value;
    list.appendChild(button);
  }
  host.appendChild(scrim);

  return new Promise((resolve) => {
    const done = (value) => { scrim.remove(); resolve(value); };
    scrim.addEventListener('click', (e) => {
      const button = e.target.closest('.menu__item');
      done(button ? button.dataset.value : null);
    });
  });
}

// ---------------------------------------------------------------------------
// Files
// ---------------------------------------------------------------------------

/** Saves text as a file. */
export function downloadText(filename, text, mime = 'text/plain;charset=utf-8') {
  downloadBlob(filename, new Blob([text], { type: mime }));
}

export function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

/** Opens the system file picker. @returns {Promise<File|null>} */
export function pickFile(accept) {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.style.display = 'none';
    document.body.appendChild(input);
    const done = (file) => { input.remove(); resolve(file); };
    input.addEventListener('change', () => done(input.files?.[0] ?? null));
    // Not fired by every browser; where it is missing a cancelled picker simply
    // leaves the promise unsettled, which is harmless - nothing is awaiting it.
    input.addEventListener('cancel', () => done(null));
    input.click();
  });
}

/** Copies text, falling back to a hidden textarea where the async API is blocked. */
export async function copyText(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (_) { /* fall through to the legacy path */ }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;left:-9999px;top:0;';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch (_) {
    return false;
  }
}
