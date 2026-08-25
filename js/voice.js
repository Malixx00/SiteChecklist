// Voice dictation for note fields, replacing Android SpeechRecognizer.
// Port of com.sitereporter.ui.voice.VoiceInputController.
//
// Web Speech API support: Chrome / Edge on Android, Windows and macOS, and
// Safari on iOS 14.5+. Where it is missing the mic button renders disabled
// rather than failing at tap time. See docs/FEATURE-MATRIX.md.

// Guarded so insertVoiceText() can be unit-tested outside a browser.
const Impl = typeof window === 'undefined'
  ? null
  : (window.SpeechRecognition || window.webkitSpeechRecognition || null);

export const VoiceState = {
  IDLE: 'IDLE',
  LISTENING: 'LISTENING',
  PROCESSING: 'PROCESSING',
  ERROR: 'ERROR',
  UNAVAILABLE: 'UNAVAILABLE',
};

const MESSAGES = {
  'not-allowed': 'Microphone permission is required to dictate comments.',
  'service-not-allowed': 'Microphone permission is required to dictate comments.',
  'no-speech': 'No speech was detected. Please try again.',
  'audio-capture': 'Audio recording failed. Please try again.',
  network: 'Voice recognition requires a network connection on this device.',
  aborted: null, // user-initiated stop - not an error worth showing
};

// Browsers expose SpeechRecognition on insecure origins but refuse the mic, so
// a plain-http LAN address fails as a bare permission error. Say what it is.
const INSECURE = 'Voice dictation needs a secure (HTTPS) connection to the app.';

function isInsecure() {
  return typeof window !== 'undefined' && window.isSecureContext === false;
}

export class VoiceController {
  constructor() {
    this.available = Impl !== null;
    this.state = this.available ? VoiceState.IDLE : VoiceState.UNAVAILABLE;
    this.partialText = '';
    /** Question id whose note field owns the current session. */
    this.activeTarget = null;

    this._onResult = null;
    this._userStopped = false;
    this._pending = null;
    this._listeners = new Set();
    this._errorListeners = new Set();
    this._recognition = null;
  }

  /** Subscribe to state changes; returns an unsubscribe function. */
  onChange(fn) {
    this._listeners.add(fn);
    return () => this._listeners.delete(fn);
  }

  /**
   * Subscribe to failures. Kept separate from onChange because every card
   * subscribes to state, and a shared failure must be reported once.
   */
  onError(fn) {
    this._errorListeners.add(fn);
    return () => this._errorListeners.delete(fn);
  }

  _emit() {
    this._listeners.forEach((fn) => fn(this));
  }

  _fail(message) {
    if (!message) return; // e.g. a user-initiated abort
    this._errorListeners.forEach((fn) => fn(message));
  }

  _set(state, partial = '') {
    this.state = state;
    this.partialText = partial;
    this._emit();
  }

  _build() {
    const rec = new Impl();
    rec.lang = navigator.language || 'en-AU';
    rec.continuous = false;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    // Aborting one session to start another leaves the old object still firing
    // onerror/onend afterwards. Without this guard those late events reset the
    // session that just replaced it, and the mic goes dead while it listens.
    const stale = () => this._recognition !== rec;

    rec.onstart = () => {
      if (stale()) return;
      this._set(VoiceState.LISTENING);
    };
    rec.onaudioend = () => {
      if (stale()) return;
      if (this.state === VoiceState.LISTENING) this._set(VoiceState.PROCESSING);
    };
    rec.onresult = (event) => {
      if (stale()) return;
      let finalText = '';
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else interim += r[0].transcript;
      }
      if (finalText.trim()) {
        const cb = this._onResult;
        this._onResult = null;
        this.activeTarget = null;
        this._set(VoiceState.IDLE);
        if (cb) cb(finalText.trim());
      } else if (interim !== this.partialText) {
        this._set(VoiceState.LISTENING, interim);
      }
    };
    rec.onerror = (event) => {
      if (stale()) return;
      // A queued start means the user tapped another card's mic - relaunch
      // instead of reporting an error.
      if (this._pending) {
        const next = this._pending;
        this._pending = null;
        this._start(next.target, next.onResult);
        return;
      }
      if (this._userStopped) {
        this._userStopped = false;
        this.activeTarget = null;
        this._set(VoiceState.IDLE);
        return;
      }
      this._onResult = null;
      this.activeTarget = null;
      const permissionError = event.error === 'not-allowed' || event.error === 'service-not-allowed';
      const message = permissionError && isInsecure()
        ? INSECURE
        : (event.error in MESSAGES
          ? MESSAGES[event.error]
          : 'Voice recognition failed. Please try again.');
      this.state = VoiceState.IDLE;
      this.partialText = '';
      this._emit();
      this._fail(message);
    };
    rec.onend = () => {
      if (stale()) return;
      if (this._pending) {
        const next = this._pending;
        this._pending = null;
        this._start(next.target, next.onResult);
        return;
      }
      if (this.state !== VoiceState.IDLE) {
        this.activeTarget = null;
        this._set(VoiceState.IDLE);
      }
    };
    return rec;
  }

  /**
   * Starts a session for `target` (a question id). If one is already running it
   * is cancelled and this request is queued.
   */
  start(target, onResult) {
    if (!this.available) {
      this._set(VoiceState.UNAVAILABLE);
      return;
    }
    if (this.state === VoiceState.LISTENING || this.state === VoiceState.PROCESSING) {
      this._pending = { target, onResult };
      this._userStopped = false;
      try { this._recognition?.abort(); } catch (_) { /* already stopped */ }
      return;
    }
    this._start(target, onResult);
  }

  _start(target, onResult) {
    this._userStopped = false;
    this._onResult = onResult;
    this.activeTarget = target;
    this._recognition = this._build();
    try {
      this._recognition.start();
      this._set(VoiceState.LISTENING);
    } catch (e) {
      this.activeTarget = null;
      this._onResult = null;
      this.state = VoiceState.IDLE;
      this.partialText = '';
      this._emit();
      this._fail(isInsecure() ? INSECURE : 'Voice recognition could not start. Please try again.');
    }
  }

  cancel() {
    this._pending = null;
    this._userStopped = true;
    this._onResult = null;
    this.activeTarget = null;
    try { this._recognition?.abort(); } catch (_) { /* already stopped */ }
    this._set(VoiceState.IDLE);
  }

  /** Per-card view of the shared session, so cards need not know about each other. */
  viewFor(questionId) {
    const mine = this.activeTarget === questionId;
    return {
      available: this.available,
      isListening: mine && this.state === VoiceState.LISTENING,
      isProcessing: mine && this.state === VoiceState.PROCESSING,
      partialText: mine && this.state === VoiceState.LISTENING ? this.partialText : '',
    };
  }
}

/**
 * Inserts recognised text at the caret, adding spaces only where needed.
 * Returns { text, caret }.
 */
export function insertVoiceText(text, selectionStart, selectionEnd, recognized) {
  const trimmed = recognized.trim();
  if (!trimmed) return { text, caret: selectionEnd };

  const before = text.slice(0, selectionStart);
  const after = text.slice(selectionEnd);
  const paddedBefore = before && !/\s$/.test(before) ? `${before} ` : before;
  const paddedAfter = after && !/^\s/.test(after) ? ` ${after}` : after;

  return {
    text: paddedBefore + trimmed + paddedAfter,
    caret: paddedBefore.length + trimmed.length,
  };
}
