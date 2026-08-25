// Question card. Port of com.sitereporter.ui.components.QuestionCard.
//
// Four renderings, chosen in the same order as the Compose original:
//   heading  -> organisational label, no controls
//   sign-off -> name + signature + timestamp + sign-off button
//   bare checkbox (checkboxes with no options) -> compact tick row
//   otherwise -> standard card (Yes/No, tick options, note, photo, video)

import { AnswerStatus } from '../logic.js';
import { esc, multiline, icon, el, toast, downloadBlob, confirmDialog } from '../ui.js';
import { attachSignaturePad } from './signature.js';
import { compressImage } from '../images.js';
import * as db from '../db.js';

const SIGNED_AT_FORMAT = new Intl.DateTimeFormat(undefined, {
  weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  hour: 'numeric', minute: '2-digit',
});

/**
 * @param {object} q question
 * @param {object} a answer
 * @param {object} ctx handlers + shared services (see checklist.js)
 * @returns {HTMLElement}
 */
export function renderQuestionCard(q, a, ctx) {
  if (q.isHeading) return renderHeading(q);
  if (q.isSignOff) return renderSignOff(q, a, ctx);
  if (q.checkboxes && q.checkboxOptions.length === 0) return renderTickRow(q, a, ctx);
  return renderStandard(q, a, ctx);
}

// ---------------------------------------------------------------------------
// Heading
// ---------------------------------------------------------------------------

function renderHeading(q) {
  return el(`
    <div class="heading" data-qid="${esc(q.id)}">
      <span class="heading__bar"></span>
      <div class="heading__text">
        <h3>${esc(q.title)}</h3>
        ${q.description ? `<p>${multiline(q.description)}</p>` : ''}
      </div>
    </div>`);
}

// ---------------------------------------------------------------------------
// Compact tick row (safety steps 2, 4, 5)
// ---------------------------------------------------------------------------

function renderTickRow(q, a, ctx) {
  const checked = a.status === AnswerStatus.DONE;
  const node = el(`
    <label class="tickrow ${q.isOptional ? '' : 'tickrow--required'}" data-qid="${esc(q.id)}">
      <input type="checkbox" ${checked ? 'checked' : ''}>
      <span>${esc(q.title)}</span>
    </label>`);
  node.querySelector('input').addEventListener('change', (e) => {
    ctx.onAnswer(q.id, e.target.checked ? AnswerStatus.DONE : AnswerStatus.UNANSWERED);
  });
  return node;
}

// ---------------------------------------------------------------------------
// Standard card
// ---------------------------------------------------------------------------

function renderStandard(q, a, ctx) {
  const isDone = a.status === AnswerStatus.DONE;
  const isNotRequired = a.status === AnswerStatus.NOT_REQUIRED;
  const noteOpen = !!a.notes;
  const noteLabel = q.commentsLabel || 'Note';
  const placeholder = noteLabel !== 'Note'
    ? `Enter ${noteLabel.toLowerCase()}...`
    : 'Add a note...';

  const node = el(`
    <section class="card ${q.isOptional ? 'card--optional' : ''}" data-qid="${esc(q.id)}">
      <h3 class="card__title">${esc(q.title)}</h3>
      ${q.isOptional ? '<p class="card__optional">Optional</p>' : ''}
      ${q.description ? `<p class="card__desc">${multiline(q.description)}</p>` : ''}
      ${q.checkboxOptions.length ? renderOptions(q, a) : ''}

      <div class="answer-row">
        <button type="button" class="btn btn--done ${isDone ? 'is-selected' : ''}" data-act="yes"
          aria-pressed="${isDone}">
          ${icon(isDone ? 'checkCircle' : 'check')}<span>${esc(q.yesText)}</span>
        </button>
        ${q.noButton ? `
        <button type="button" class="btn btn--na ${isNotRequired ? 'is-selected' : ''}" data-act="no"
          aria-pressed="${isNotRequired}">
          <span>${esc(q.noText)}</span>
        </button>` : ''}
      </div>

      ${q.commentsShown ? `
      <button type="button" class="btn btn--text btn--note" data-act="toggle-note">
        ${icon('note')}<span>${noteOpen ? 'Hide' : 'Add'} ${esc(noteLabel)}</span>
      </button>
      <div class="note-wrap" ${noteOpen ? '' : 'hidden'}>
        <div class="note-field">
          <textarea class="input input--note" rows="2" placeholder="${esc(placeholder)}"
            aria-label="${esc(noteLabel)}">${esc(a.notes)}</textarea>
          <button type="button" class="mic" data-act="mic" aria-label="Start voice entry"></button>
        </div>
        <p class="note-partial" hidden></p>
        <p class="note-status" hidden></p>
      </div>` : ''}

      ${q.photoRequired ? renderMediaRow('photo', a.photoTaken) : ''}
      ${q.videoRequired ? renderMediaRow('video', a.videoTaken) : ''}
    </section>`);

  // ---- answer buttons ----
  node.querySelector('[data-act="yes"]')?.addEventListener('click', () => {
    ctx.onAnswer(q.id, AnswerStatus.DONE);
  });
  node.querySelector('[data-act="no"]')?.addEventListener('click', () => {
    ctx.onAnswer(q.id, AnswerStatus.NOT_REQUIRED);
  });

  // ---- tick options ----
  node.querySelectorAll('[data-option]').forEach((input) => {
    input.addEventListener('change', () => {
      const ticked = [...node.querySelectorAll('[data-option]')]
        .filter((i) => i.checked)
        .map((i) => i.dataset.option);
      ctx.onCheckedOptions(q.id, ticked.join('|'));
    });
  });

  // ---- note field ----
  if (q.commentsShown) {
    const wrap = node.querySelector('.note-wrap');
    const textarea = node.querySelector('textarea');
    const toggle = node.querySelector('[data-act="toggle-note"] span');

    node.querySelector('[data-act="toggle-note"]').addEventListener('click', () => {
      const hidden = wrap.hasAttribute('hidden');
      wrap.toggleAttribute('hidden', !hidden);
      toggle.textContent = `${hidden ? 'Hide' : 'Add'} ${noteLabel}`;
      if (hidden) textarea.focus();
    });

    // Persist as the technician types. Debounced so a long note is one write
    // per pause rather than one per keystroke.
    let timer = null;
    let queued = false;
    const schedule = (delay) => {
      clearTimeout(timer);
      queued = true;
      timer = setTimeout(() => {
        queued = false;
        ctx.onNote(q.id, textarea.value);
      }, delay);
    };

    textarea.addEventListener('input', () => schedule(250));
    // Blur schedules rather than writing inline. Blur runs before the click
    // that caused it, so writing here re-renders the card and detaches the
    // button being pressed - the tap is then swallowed. Deferring by a tick
    // lets the click land first, and the note is still written.
    textarea.addEventListener('blur', () => schedule(0));
    // A card can be detached with a write still queued; flush it rather than
    // lose what was typed.
    node._teardown = [...(node._teardown ?? []), () => {
      if (!queued) return;
      clearTimeout(timer);
      queued = false;
      ctx.onNote(q.id, textarea.value);
    }];

    wireMic(node, q, ctx, textarea);
  }

  if (q.photoRequired) wirePhotoRow(node, q, a, ctx);
  if (q.videoRequired) wireVideoRow(node, q, a, ctx);

  return node;
}

function renderOptions(q, a) {
  const ticked = new Set((a.checkedOptions ?? '').split('|').filter(Boolean));
  const rows = q.checkboxOptions.map((option) => `
    <label class="option">
      <input type="checkbox" data-option="${esc(option)}" ${ticked.has(option) ? 'checked' : ''}>
      <span>${esc(option)}</span>
    </label>`);
  return `<div class="options">${rows.join('')}</div>`;
}

// ---------------------------------------------------------------------------
// Voice
// ---------------------------------------------------------------------------

function wireMic(node, q, ctx, textarea) {
  const button = node.querySelector('[data-act="mic"]');
  if (!button) return;

  const paint = () => {
    const v = ctx.voice.viewFor(q.id);
    button.classList.toggle('is-listening', v.isListening);
    button.classList.toggle('is-processing', v.isProcessing);
    button.disabled = !v.available || v.isProcessing;
    button.innerHTML = v.available
      ? (v.isProcessing ? '<span class="spinner"></span>' : icon('mic'))
      : icon('micOff');
    button.setAttribute('aria-label', !v.available
      ? 'Voice recognition unavailable'
      : v.isListening ? 'Stop voice entry' : 'Start voice entry');

    const partial = node.querySelector('.note-partial');
    partial.textContent = v.partialText;
    partial.toggleAttribute('hidden', !(v.isListening && v.partialText));

    const status = node.querySelector('.note-status');
    status.textContent = v.isListening ? 'Listening…' : v.isProcessing ? 'Processing…' : '';
    status.classList.toggle('is-live', v.isListening);
    status.toggleAttribute('hidden', !(v.isListening || v.isProcessing));
  };

  const unsubscribe = ctx.voice.onChange(paint);
  // Detached cards must not keep repainting; the checklist view calls this.
  node._teardown = [...(node._teardown ?? []), unsubscribe];

  // Pressing the mic must not blur the note field. A blur flushes the note,
  // which re-renders the card and detaches this very button before the browser
  // can dispatch its click - the tap would silently do nothing. Keeping focus
  // in the textarea also preserves the caret that insertVoiceText writes at.
  button.addEventListener('pointerdown', (e) => e.preventDefault());
  button.addEventListener('mousedown', (e) => e.preventDefault());

  button.addEventListener('click', () => {
    const v = ctx.voice.viewFor(q.id);
    if (v.isListening) {
      ctx.voice.cancel();
      return;
    }
    if (!v.available) {
      toast('Voice recognition is not available on this device. Type the note instead.');
      return;
    }
    // The mic press deliberately did not move focus, so claim it here: the
    // caret is where recognised text lands, and a focused note field also stops
    // the checklist from rebuilding this card mid-session.
    if (document.activeElement !== textarea) {
      textarea.focus();
      const end = textarea.value.length;
      textarea.setSelectionRange(end, end);
    }

    ctx.voice.start(q.id, (text) => {
      const start = textarea.selectionStart ?? textarea.value.length;
      const end = textarea.selectionEnd ?? textarea.value.length;
      const { text: next, caret } = ctx.insertVoiceText(textarea.value, start, end, text);
      textarea.value = next;
      textarea.setSelectionRange(caret, caret);
      ctx.onNote(q.id, next);
    });
  });

  paint();
}

// ---------------------------------------------------------------------------
// Media
// ---------------------------------------------------------------------------

function renderMediaRow(kind, isTaken) {
  const Label = kind === 'photo' ? 'Photo' : 'Video';
  const accept = kind === 'photo' ? 'image/*' : 'video/*';
  const multiple = kind === 'photo' ? 'multiple' : '';
  return `
    <div class="media" data-media="${kind}">
      <label class="btn btn--media ${isTaken ? 'is-taken' : ''}">
        ${icon(isTaken ? 'checkCircle' : (kind === 'photo' ? 'camera' : 'video'))}
        <span>${isTaken ? `Take more ${Label}s` : `Take ${Label}`}</span>
        <input type="file" accept="${accept}" capture="environment" ${multiple} hidden>
      </label>
      ${kind === 'photo' ? '<div class="thumbs"></div>' : '<div class="media-note"></div>'}
      <button type="button" class="btn btn--toggle ${isTaken ? 'is-taken' : ''}" data-act="mark">
        ${isTaken ? icon('checkCircle') : ''}<span>${isTaken ? `${Label} Taken` : `Mark ${Label} as Taken`}</span>
      </button>
    </div>`;
}

function wirePhotoRow(node, q, a, ctx) {
  const row = node.querySelector('[data-media="photo"]');
  const thumbs = row.querySelector('.thumbs');
  const input = row.querySelector('input[type="file"]');
  const urls = [];

  async function paintThumbs() {
    urls.forEach(URL.revokeObjectURL);
    urls.length = 0;
    const photos = await db.loadPhotos(q.id);
    thumbs.innerHTML = '';
    for (const photo of photos) {
      const url = URL.createObjectURL(photo.blob);
      urls.push(url);
      const thumb = el(`
        <div class="thumb">
          <img src="${url}" alt="Photo for ${esc(q.title)}" loading="lazy">
          <button type="button" class="thumb__del" aria-label="Delete photo">${icon('x')}</button>
        </div>`);
      thumb.querySelector('img').addEventListener('click', () => window.open(url, '_blank'));
      thumb.querySelector('.thumb__del').addEventListener('click', async () => {
        const ok = await confirmDialog({
          title: 'Delete photo',
          message: 'Remove this photo from the record? This cannot be undone.',
          confirmLabel: 'Delete',
          destructive: true,
        });
        if (!ok) return;
        await db.deletePhoto(photo.id);
        paintThumbs();
      });
      thumbs.appendChild(thumb);
    }
  }

  node._teardown = [...(node._teardown ?? []), () => urls.forEach(URL.revokeObjectURL)];

  input.addEventListener('change', async () => {
    const files = [...(input.files ?? [])];
    input.value = '';
    if (!files.length) return;
    let stored = 0;
    for (const file of files) {
      try {
        const blob = await compressImage(file);
        await db.addPhoto(q.id, blob);
        stored++;
      } catch (e) {
        console.error('Photo save failed', e);
        toast('Could not save that photo on this device. It has NOT been recorded — check available storage and retake it.',
          { tone: 'error', duration: 9000 });
      }
    }
    if (stored) {
      await ctx.onPhotoStored(q.id);
      paintThumbs();
    }
  });

  row.querySelector('[data-act="mark"]').addEventListener('click', () => ctx.onPhotoToggle(q.id));

  paintThumbs();
}

function wireVideoRow(node, q, a, ctx) {
  const row = node.querySelector('[data-media="video"]');
  const input = row.querySelector('input[type="file"]');
  const info = row.querySelector('.media-note');

  // Videos are not copied into browser storage - a single 1080p clip can be
  // larger than the whole storage quota. The capture is offered for saving to
  // the device, matching the Android behaviour of writing to the gallery.
  input.addEventListener('change', () => {
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    ctx.onVideoCaptured(q.id);
    info.innerHTML = '';
    // Locked so a state repaint cannot discard the capture before it is saved.
    node.dataset.lock = '1';
    const save = el(`<button type="button" class="btn btn--text">${icon('download')}<span>Save "${esc(file.name || 'video')}" to device</span></button>`);
    save.addEventListener('click', () => {
      downloadBlob(file.name || `video_${Date.now()}.mp4`, file);
      info.innerHTML = '<span class="media-note__saved">Saved to your device downloads.</span>';
      delete node.dataset.lock;
    });
    info.appendChild(save);
  });

  row.querySelector('[data-act="mark"]').addEventListener('click', () => ctx.onVideoToggle(q.id));
}

// ---------------------------------------------------------------------------
// Sign-off
// ---------------------------------------------------------------------------

function renderSignOff(q, a, ctx) {
  const isDone = a.status === AnswerStatus.DONE;
  const name = a.notes || ctx.inspectorNameHint || '';
  const signedText = a.signedAt ? SIGNED_AT_FORMAT.format(new Date(a.signedAt)) : 'Not set';

  const node = el(`
    <section class="card card--signoff" data-qid="${esc(q.id)}">
      <label class="field">
        <span class="field__label">Inspector Name</span>
        <input class="input" type="text" value="${esc(name)}" placeholder="Enter inspector name"
          autocapitalize="words">
      </label>

      <div class="field">
        <span class="field__label">Signature</span>
        <div class="sigpad is-empty">
          <canvas aria-label="Signature pad"></canvas>
          <span class="sigpad__hint">Sign here</span>
        </div>
        <button type="button" class="btn btn--text sigpad__clear" data-act="clear-sig">Clear Signature</button>
      </div>

      <div class="field">
        <span class="field__label">Date &amp; Time</span>
        <div class="signrow">
          <span class="signrow__value ${a.signedAt ? '' : 'is-muted'}">${esc(signedText)}</span>
          <button type="button" class="btn btn--outline" data-act="now">Set to Now</button>
        </div>
      </div>

      <hr class="divider">

      <button type="button" class="btn btn--done ${isDone ? 'is-selected' : ''}" data-act="signoff"
        aria-pressed="${isDone}">
        ${icon(isDone ? 'checkCircle' : 'check')}<span>${isDone ? 'Signed Off' : 'Sign Off'}</span>
      </button>
    </section>`);

  const nameInput = node.querySelector('input[type="text"]');
  let timer = null;
  nameInput.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => ctx.onNote(q.id, nameInput.value), 250);
  });
  nameInput.addEventListener('blur', () => {
    clearTimeout(timer);
    ctx.onNote(q.id, nameInput.value);
  });

  const canvas = node.querySelector('canvas');
  const clearButton = node.querySelector('[data-act="clear-sig"]');
  const pad = attachSignaturePad(canvas, a.signatureData ?? '', (data) => {
    ctx.onSignature(q.id, data);
    clearButton.hidden = !data;
  });
  clearButton.hidden = !a.signatureData;
  clearButton.addEventListener('click', () => {
    pad.clear();
    clearButton.hidden = true;
  });
  node._teardown = [...(node._teardown ?? []), () => pad.destroy()];

  // The sign-off card is never re-rendered from state (it holds the live
  // signature canvas), so it updates its own display here.
  const value = node.querySelector('.signrow__value');
  node.querySelector('[data-act="now"]').addEventListener('click', () => {
    const now = Date.now();
    value.textContent = SIGNED_AT_FORMAT.format(new Date(now));
    value.classList.remove('is-muted');
    ctx.onSignedAt(q.id, now);
  });

  const signButton = node.querySelector('[data-act="signoff"]');
  signButton.addEventListener('click', () => {
    const nowSelected = !signButton.classList.contains('is-selected');
    signButton.classList.toggle('is-selected', nowSelected);
    signButton.setAttribute('aria-pressed', String(nowSelected));
    signButton.innerHTML = `${icon(nowSelected ? 'checkCircle' : 'check')}<span>${nowSelected ? 'Signed Off' : 'Sign Off'}</span>`;
    ctx.onAnswer(q.id, AnswerStatus.DONE);
  });

  return node;
}

/** Releases listeners and blob URLs held by a card that is being replaced. */
export function teardownCard(node) {
  node?._teardown?.forEach((fn) => {
    try { fn(); } catch (_) { /* nothing useful to do */ }
  });
}
