// Small key/value preferences, replacing Android DataStore.
// localStorage is the right fit: values are tiny, synchronous reads keep the
// first paint simple, and the data survives a service-worker update.

import { ThemeMode } from './logic.js';

const PREFIX = 'sitereporter.';

const KEYS = {
  currentSectionId: 'current_section_id',
  currentQuestionIndex: 'current_question_index',
  themeMode: 'theme_mode',
  sunMode: 'sun_mode_enabled',
  inspectorName: 'inspector_name',
  siteId: 'site_id',
  lastSaved: 'last_saved',
  currentSurveyId: 'current_survey_id',
  seededVersion: 'seeded_version',
};

function raw(key) {
  try {
    return localStorage.getItem(PREFIX + key);
  } catch (_) {
    return null; // private-mode / storage disabled
  }
}

function write(key, value) {
  try {
    if (value === null || value === undefined) localStorage.removeItem(PREFIX + key);
    else localStorage.setItem(PREFIX + key, String(value));
  } catch (e) {
    console.warn('Could not persist setting', key, e);
  }
  listeners.forEach((fn) => fn(key));
}

const listeners = new Set();

/** Notifies on any settings change; returns an unsubscribe function. */
export function onSettingsChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export const settings = {
  get themeMode() {
    const v = raw(KEYS.themeMode);
    return Object.prototype.hasOwnProperty.call(ThemeMode, v) ? v : ThemeMode.SYSTEM;
  },
  set themeMode(v) { write(KEYS.themeMode, v); },

  get sunMode() { return raw(KEYS.sunMode) === 'true'; },
  set sunMode(v) { write(KEYS.sunMode, v ? 'true' : 'false'); },

  get inspectorName() { return raw(KEYS.inspectorName) ?? ''; },
  set inspectorName(v) { write(KEYS.inspectorName, v ?? ''); },

  get siteId() { return raw(KEYS.siteId) ?? ''; },
  set siteId(v) { write(KEYS.siteId, v ?? ''); },

  get currentSectionId() { return raw(KEYS.currentSectionId) ?? 'safety'; },
  get currentQuestionIndex() { return Number(raw(KEYS.currentQuestionIndex) ?? 0) || 0; },

  setCurrentPosition(sectionId, questionIndex) {
    write(KEYS.currentSectionId, sectionId);
    write(KEYS.currentQuestionIndex, questionIndex);
    write(KEYS.lastSaved, Date.now());
  },

  get lastSaved() { return Number(raw(KEYS.lastSaved) ?? 0) || 0; },

  get currentSurveyId() { return raw(KEYS.currentSurveyId) ?? ''; },
  set currentSurveyId(v) { write(KEYS.currentSurveyId, v ?? ''); },

  get seededVersion() { return Number(raw(KEYS.seededVersion) ?? 0) || 0; },
  set seededVersion(v) { write(KEYS.seededVersion, v); },
};
