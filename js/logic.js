// Domain model + checklist status logic.
// Direct port of com.sitereporter.domain.model.* and ChecklistLogic.

export const AnswerStatus = {
  UNANSWERED: 'UNANSWERED',
  DONE: 'DONE',
  NOT_REQUIRED: 'NOT_REQUIRED',
};

export const SectionStatus = {
  NOT_STARTED: 'NOT_STARTED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETE: 'COMPLETE',
};

export const ThemeMode = { LIGHT: 'LIGHT', DARK: 'DARK', SYSTEM: 'SYSTEM' };

/** SurveyQuestion with the same defaults as the Kotlin data class. */
export function question(o) {
  return {
    id: o.id,
    surveyId: o.surveyId,
    sortOrder: o.sortOrder ?? 0,
    section: o.section,
    isHeading: o.isHeading ?? false,
    title: o.title,
    description: o.description ?? null,
    yesButton: o.yesButton ?? true,
    yesText: o.yesText ?? 'Done',
    noButton: o.noButton ?? true,
    noText: o.noText ?? 'N/A',
    checkboxes: o.checkboxes ?? false,
    checkboxOptions: o.checkboxOptions ?? [],
    photoRequired: o.photoRequired ?? false,
    videoRequired: o.videoRequired ?? false,
    commentsShown: o.commentsShown ?? true,
    commentsLabel: o.commentsLabel ?? 'Note',
    isSignOff: o.isSignOff ?? false,
    isOptional: o.isOptional ?? false,
  };
}

export function answer(questionId) {
  return {
    questionId,
    status: AnswerStatus.UNANSWERED,
    notes: '',
    photoTaken: false,
    videoTaken: false,
    timestamp: 0,
    signatureData: null,
    signedAt: null,
    checkedOptions: null,
  };
}

/** "gear_rack_and_pinion" -> "Gear Rack And Pinion" */
export function sectionTitleFromId(id) {
  return id
    .split('_')
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
}

const statusOf = (answers, q) => answers[q.id]?.status ?? AnswerStatus.UNANSWERED;
const isSettled = (s) => s === AnswerStatus.DONE || s === AnswerStatus.NOT_REQUIRED;

export function sectionStatus(section, answers) {
  const checkable = section.questions.filter((q) => !q.isHeading);
  const required = checkable.filter((q) => !q.isOptional);
  const anyAnswered = checkable.some((q) => statusOf(answers, q) !== AnswerStatus.UNANSWERED);

  // A section with no required questions only completes once EVERY question is settled.
  const allAnswered = required.length === 0
    ? checkable.length > 0 && checkable.every((q) => isSettled(statusOf(answers, q)))
    : required.every((q) => isSettled(statusOf(answers, q)));

  if (allAnswered) return SectionStatus.COMPLETE;
  if (anyAnswered) return SectionStatus.IN_PROGRESS;
  return SectionStatus.NOT_STARTED;
}

/** Sections made entirely of optional questions do not gate completion. */
export function isMandatorySection(section) {
  return section.questions.some((q) => !q.isHeading && !q.isOptional);
}

export function allRequiredComplete(sections, answers) {
  return sections
    .filter(isMandatorySection)
    .every((s) => sectionStatus(s, answers) === SectionStatus.COMPLETE);
}

/** Answered questions plus each satisfied photo/video requirement. */
export function answeredCount(section, answers) {
  let count = 0;
  for (const q of section.questions) {
    if (q.isHeading) continue;
    const a = answers[q.id];
    if ((a?.status ?? AnswerStatus.UNANSWERED) !== AnswerStatus.UNANSWERED) count++;
    if (q.photoRequired && a?.photoTaken) count++;
    if (q.videoRequired && a?.videoTaken) count++;
  }
  return count;
}

export function requiredCount(section) {
  return section.questions.filter((q) => !q.isOptional && !q.isHeading).length;
}

export function totalItems(section) {
  return section.questions
    .filter((q) => !q.isHeading)
    .reduce((sum, q) => sum + 1 + (q.photoRequired ? 1 : 0) + (q.videoRequired ? 1 : 0), 0);
}
