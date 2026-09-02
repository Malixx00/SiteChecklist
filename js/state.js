// Application state and mutations. Replaces the Android ViewModels.
//
// One mutable `state` object plus subscribe/notify. Views read state and call
// the mutators here; nothing writes to the database directly except this module.

import * as db from './db.js';
import { settings } from './settings.js';
import {
  AnswerStatus, answer as newAnswer, sectionTitleFromId, allRequiredComplete, sectionNaKey,
} from './logic.js';
import { buildSafetySection, SAFETY_SECTION_ID } from './safety.js';
import {
  DEFAULT_SURVEY_ID, DEFAULT_SURVEY_NAME, DEFAULT_SURVEY_DESCRIPTION,
  SEED_VERSION, buildDefaultQuestions,
} from './seeder.js';

export const state = {
  /** [{ definition, questionCount }] */
  surveys: [],
  /** Sections for the current survey, safety first. */
  sections: [],
  currentSectionId: SAFETY_SECTION_ID,
  /** { questionId: answer } */
  answers: {},
  isAllRequiredComplete: false,
  ready: false,
};

const listeners = new Set();

/** Subscribe to state changes. Returns an unsubscribe function. */
export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify(detail = {}) {
  listeners.forEach((fn) => fn(detail));
}

// ---------------------------------------------------------------------------
// Seeding
// ---------------------------------------------------------------------------

let seeding = null;

/**
 * Ensures the built-in default survey is present and current. Re-seeds when the
 * survey is missing (fresh install, or the user deleted it) or when SEED_VERSION
 * has moved past what is on disk. Imported surveys are never touched.
 */
export function ensureDefaultSurvey() {
  if (seeding) return seeding;
  seeding = (async () => {
    const questions = buildDefaultQuestions();
    const onDisk = await db.countQuestions(DEFAULT_SURVEY_ID);
    if (onDisk === questions.length && settings.seededVersion >= SEED_VERSION) return;

    await db.putSurvey({
      id: DEFAULT_SURVEY_ID,
      name: DEFAULT_SURVEY_NAME,
      description: DEFAULT_SURVEY_DESCRIPTION,
      createdAt: Date.now(),
    });
    await db.replaceQuestions(DEFAULT_SURVEY_ID, questions);
    settings.seededVersion = SEED_VERSION;
  })();
  return seeding;
}

// ---------------------------------------------------------------------------
// Loading
// ---------------------------------------------------------------------------

export async function loadSurveyList() {
  const definitions = await db.loadSurveys();
  state.surveys = await Promise.all(definitions.map(async (definition) => ({
    definition,
    questionCount: await db.countQuestions(definition.id),
  })));
  notify({ surveys: true });
}

/**
 * Sections for the current survey, always led by the mandatory safety section.
 * Safety lives in code, not the database, so it is never imported or exported.
 */
export async function loadChecklist() {
  const surveyId = settings.currentSurveyId;
  state.answers = await db.loadAnswers();

  if (!surveyId) {
    state.sections = [];
  } else {
    const questions = await db.loadQuestions(surveyId);
    const bySection = new Map();
    for (const q of questions) {
      if (q.section === SAFETY_SECTION_ID) continue;
      if (!bySection.has(q.section)) bySection.set(q.section, []);
      bySection.get(q.section).push(q);
    }
    state.sections = [
      buildSafetySection(surveyId),
      ...[...bySection.entries()].map(([id, qs]) => ({
        id, title: sectionTitleFromId(id), questions: qs,
      })),
    ];
  }

  const restored = settings.currentSectionId;
  state.currentSectionId = state.sections.some((s) => s.id === restored)
    ? restored
    : (state.sections[0]?.id ?? SAFETY_SECTION_ID);

  recomputeCompletion();
  state.ready = true;
  notify({ checklist: true });
}

function recomputeCompletion() {
  state.isAllRequiredComplete = allRequiredComplete(state.sections, state.answers);
}

export function currentSection() {
  return state.sections.find((s) => s.id === state.currentSectionId) ?? null;
}

export function questionById(id) {
  for (const section of state.sections) {
    const q = section.questions.find((x) => x.id === id);
    if (q) return q;
  }
  return null;
}

export function answerFor(questionId) {
  return state.answers[questionId] ?? newAnswer(questionId);
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

async function patch(questionId, changes) {
  const updated = { ...answerFor(questionId), ...changes, timestamp: Date.now() };
  state.answers[questionId] = updated;
  recomputeCompletion();
  notify({ questionId });
  // Persist after notifying so the UI stays responsive; a rejected write is
  // surfaced rather than swallowed, because losing field data is not acceptable.
  await db.putAnswer(updated);
  return updated;
}

/** Tapping the currently selected status clears it, matching the Android app. */
export function answerQuestion(questionId, status) {
  const current = state.answers[questionId]?.status;
  return patch(questionId, { status: current === status ? AnswerStatus.UNANSWERED : status });
}

export function togglePhotoTaken(questionId) {
  return patch(questionId, { photoTaken: !answerFor(questionId).photoTaken });
}

export function toggleVideoTaken(questionId) {
  return patch(questionId, { videoTaken: !answerFor(questionId).videoTaken });
}

export function setPhotoTaken(questionId, taken) {
  if (answerFor(questionId).photoTaken === taken) return Promise.resolve();
  return patch(questionId, { photoTaken: taken });
}

export function setVideoTaken(questionId, taken) {
  if (answerFor(questionId).videoTaken === taken) return Promise.resolve();
  return patch(questionId, { videoTaken: taken });
}

/**
 * Declares a whole section inapplicable, with the technician's reason.
 * Notifies as a section change so the screen rebuilds rather than patching
 * one card - every card in the section changes appearance.
 */
export async function setSectionNotApplicable(sectionId, reason) {
  const record = {
    ...newAnswer(sectionNaKey(sectionId)),
    status: AnswerStatus.NOT_REQUIRED,
    notes: reason,
    timestamp: Date.now(),
  };
  state.answers[record.questionId] = record;
  recomputeCompletion();
  notify({ section: true });
  await db.putAnswer(record);
  return record;
}

/** Reverses the above; the section's own answers are left untouched. */
export async function clearSectionNotApplicable(sectionId) {
  const key = sectionNaKey(sectionId);
  delete state.answers[key];
  recomputeCompletion();
  notify({ section: true });
  await db.deleteAnswer(key);
}

export function updateNote(questionId, note) {
  // The debounced input handler and the blur handler both write, so the same
  // text usually arrives twice. Notifying a second time rebuilds the card and
  // pulls the note field out from under whatever the technician is doing.
  const current = answerFor(questionId);
  if (current.notes === note) return Promise.resolve(current);
  return patch(questionId, { notes: note });
}

export function updateSignature(questionId, data) {
  return patch(questionId, { signatureData: data ? data : null });
}

export function setSignedAt(questionId, timestamp) {
  return patch(questionId, { signedAt: timestamp });
}

export function updateCheckedOptions(questionId, options) {
  return patch(questionId, { checkedOptions: options ? options : null });
}

export function navigateToSection(sectionId) {
  state.currentSectionId = sectionId;
  settings.setCurrentPosition(sectionId, 0);
  notify({ section: true });
}

export async function selectSurvey(surveyId) {
  // Starting a survey always begins at the safety section.
  settings.setCurrentPosition(SAFETY_SECTION_ID, 0);
  settings.currentSurveyId = surveyId;
  await loadChecklist();
}

export function clearCurrentSurvey() {
  settings.currentSurveyId = '';
  state.sections = [];
  notify({ checklist: true });
}

export async function resetChecklist() {
  await db.clearAnswers();
  state.answers = {};
  const first = state.sections[0]?.id ?? SAFETY_SECTION_ID;
  state.currentSectionId = first;
  settings.setCurrentPosition(first, 0);
  recomputeCompletion();
  notify({ checklist: true });
}

export async function deleteSurvey(surveyId) {
  await db.deleteSurvey(surveyId);
  if (settings.currentSurveyId === surveyId) clearCurrentSurvey();
  await loadSurveyList();
}
