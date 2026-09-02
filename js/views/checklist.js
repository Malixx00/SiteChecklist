// Checklist screen. Port of com.sitereporter.ui.screens.ChecklistScreen
// plus SectionRibbon.

import * as state from '../state.js';
import { settings } from '../settings.js';
import {
  AnswerStatus, SectionStatus, sectionStatus, answeredCount, totalItems,
  sectionNotApplicable, canMarkSectionNotApplicable,
} from '../logic.js';
import { reasonsFor } from '../sectionNa.js';
import { SAFETY_SECTION_ID } from '../safety.js';
import { esc, icon, el, toast, menu, confirmDialog, reasonDialog } from '../ui.js';
import { topBar, bottomNav, paintNetworkPills } from './shell.js';
import { renderQuestionCard, teardownCard } from '../components/questionCard.js';
import { VoiceController, insertVoiceText } from '../voice.js';
import { printSafetyChecklist } from '../safetyPrint.js';

let voice = null;
let unsubscribe = null;

export function render(root, navigate) {
  voice?.cancel();
  voice = new VoiceController();
  // Cards subscribe to state only; failures are reported once for the screen
  // rather than once per card.
  voice.onError((message) => toast(message));

  const section = state.currentSection();
  const index = state.state.sections.findIndex((s) => s.id === state.state.currentSectionId);
  const hasPrev = index > 0;
  const hasNext = index >= 0 && index < state.state.sections.length - 1;

  root.innerHTML = `
    <div class="screen">
      ${topBar({
        title: 'Site Reporter',
        subtitle: section?.title ?? '',
        actions: `<button class="topbar__icon" data-act="overflow" aria-label="More options">${icon('more')}</button>`,
      })}
      <nav class="ribbon" data-ribbon aria-label="Sections"></nav>
      <div class="progress" data-progress></div>
      <main class="cards" data-cards></main>
      <div class="sectionnav">
        <button class="btn btn--outline" data-act="prev" ${hasPrev ? '' : 'disabled'}>Previous</button>
        <button class="btn btn--filled" data-act="next" ${hasNext ? '' : 'disabled'}>Next</button>
      </div>
      ${bottomNav('checklist')}
    </div>`;

  const cards = root.querySelector('[data-cards]');

  root.querySelector('[data-act="prev"]').addEventListener('click', () => {
    if (hasPrev) state.navigateToSection(state.state.sections[index - 1].id);
  });
  root.querySelector('[data-act="next"]').addEventListener('click', () => {
    if (hasNext) state.navigateToSection(state.state.sections[index + 1].id);
  });

  root.querySelector('[data-act="overflow"]').addEventListener('click', async (e) => {
    const choice = await menu(e.currentTarget, [
      { label: 'Change Survey', value: 'change' },
      { label: 'Reset checklist', value: 'reset', danger: true, icon: 'trash' },
    ]);
    if (choice === 'change') {
      state.clearCurrentSurvey();
      navigate('#/surveys');
    } else if (choice === 'reset') {
      await confirmReset();
    }
  });

  paintRibbon(root);
  paintProgress(root);
  paintCards(cards);
  paintNetworkPills();

  unsubscribe?.();
  unsubscribe = state.subscribe((detail) => {
    if (!document.body.contains(root)) return;
    if (detail.questionId) {
      replaceCard(cards, detail.questionId);
      paintRibbon(root);
      paintProgress(root);
    }
  });

  return () => {
    unsubscribe?.();
    unsubscribe = null;
    voice?.cancel();
    cards.querySelectorAll('[data-qid]').forEach(teardownCard);
  };
}

// ---------------------------------------------------------------------------
// Section ribbon
// ---------------------------------------------------------------------------

function paintRibbon(root) {
  const ribbon = root.querySelector('[data-ribbon]');
  const { sections, answers, currentSectionId } = state.state;

  ribbon.innerHTML = sections.map((section) => {
    const status = sectionStatus(section, answers);
    const active = section.id === currentSectionId;
    const answered = answeredCount(section, answers);
    const total = totalItems(section);

    let badge = '';
    if (status === SectionStatus.NOT_APPLICABLE) {
      // Deliberately not the green tick: nothing here was inspected.
      badge = '<span class="tab__badge tab__badge--na">N/A</span>';
    } else if (status === SectionStatus.COMPLETE) {
      badge = `<span class="tab__done" aria-label="Complete">${icon('checkCircle')}</span>`;
    } else if (status === SectionStatus.IN_PROGRESS) {
      badge = `<span class="tab__badge tab__badge--progress">${answered}/${total}</span>`;
    } else if (total > 0) {
      badge = `<span class="tab__badge tab__badge--todo">0/${total}</span>`;
    }

    return `<button type="button" class="tab ${active ? 'is-active' : ''} ${status === SectionStatus.COMPLETE ? 'is-complete' : ''}"
      data-section="${esc(section.id)}" ${active ? 'aria-current="true"' : ''}>
      <span class="tab__label">${esc(section.title)}</span>${badge}</button>`;
  }).join('');

  ribbon.querySelectorAll('[data-section]').forEach((tab) => {
    tab.addEventListener('click', () => state.navigateToSection(tab.dataset.section));
  });

  ribbon.querySelector('.is-active')?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
}

function paintProgress(root) {
  const host = root.querySelector('[data-progress]');
  const section = state.currentSection();
  if (!section) { host.innerHTML = ''; return; }

  // "0 / 3" under a section declared not applicable reads as outstanding work.
  if (sectionNotApplicable(section, state.state.answers)) {
    host.innerHTML = ''; host.hidden = true; return;
  }

  const answered = answeredCount(section, state.state.answers);
  const total = totalItems(section);
  if (total === 0) { host.innerHTML = ''; host.hidden = true; return; }
  host.hidden = false;

  const pct = Math.min(100, Math.round((answered / total) * 100));
  host.innerHTML = `
    <div class="progress__row">
      <span>Section progress</span><strong>${answered} / ${total}</strong>
    </div>
    <div class="progress__track" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100">
      <div class="progress__bar ${pct >= 100 ? 'is-complete' : ''}" style="width:${pct}%"></div>
    </div>`;
}

// ---------------------------------------------------------------------------
// Cards
// ---------------------------------------------------------------------------

function cardContext() {
  return {
    voice,
    insertVoiceText,
    inspectorNameHint: settings.inspectorName,
    onAnswer: (id, status) => state.answerQuestion(id, status),
    onNote: (id, note) => state.updateNote(id, note),
    onCheckedOptions: (id, options) => state.updateCheckedOptions(id, options),
    onSignature: (id, data) => state.updateSignature(id, data),
    onSignedAt: (id, ts) => state.setSignedAt(id, ts),
    onPhotoToggle: (id) => state.togglePhotoTaken(id),
    onVideoToggle: (id) => state.toggleVideoTaken(id),
    onPhotoStored: (id) => state.setPhotoTaken(id, true),
    onVideoCaptured: (id) => state.setVideoTaken(id, true),
  };
}

function paintCards(cards) {
  const section = state.currentSection();
  cards.querySelectorAll('[data-qid]').forEach(teardownCard);
  cards.innerHTML = '';

  if (!section) {
    cards.innerHTML = '<p class="empty">No section selected</p>';
    return;
  }

  const naReason = sectionNotApplicable(section, state.state.answers);
  const offerNa = canMarkSectionNotApplicable(section);
  const fragment = document.createDocumentFragment();

  // The banner goes after the section's own heading card, because that heading
  // ("Complete for systems fitted with...") is the text that tells the
  // technician whether the section applies at all.
  const headingIndex = section.questions.findIndex((q) => q.isHeading);
  let bannerPlaced = false;
  const placeBanner = () => {
    if (bannerPlaced || !offerNa) return;
    bannerPlaced = true;
    fragment.appendChild(sectionNaBanner(section, naReason));
  };
  if (headingIndex === -1) placeBanner();

  const ctx = cardContext();
  for (const [i, q] of section.questions.entries()) {
    const card = renderQuestionCard(q, state.answerFor(q.id), ctx);
    // Left visible but inert, so the technician can still see what is being
    // skipped rather than the section simply vanishing.
    if (naReason && !q.isHeading) {
      card.classList.add('card--na');
      card.querySelectorAll('button, input, textarea, select, a')
        .forEach((c) => { c.disabled = true; c.tabIndex = -1; });
    }
    fragment.appendChild(card);
    if (i === headingIndex) placeBanner();
  }

  // The safety section carries its own export action at the end of the list.
  if (section.id === SAFETY_SECTION_ID) {
    const button = el(`<button type="button" class="btn btn--filled btn--wide export-safety">
      ${icon('printer')}<span>Export Safety Checklist as PDF</span></button>`);
    button.addEventListener('click', () => exportSafety(section));
    fragment.appendChild(button);
  }

  cards.appendChild(fragment);
  cards.scrollTop = 0;
}

/**
 * The "whole section does not apply" control that sits above the questions.
 * Only reached for sections with nothing mandatory in them.
 */
function sectionNaBanner(section, reason) {
  if (reason) {
    const node = el(`
      <div class="nabanner nabanner--on">
        <div class="nabanner__text">
          <strong>Marked not applicable</strong>
          <span>${esc(reason)}</span>
        </div>
        <button type="button" class="btn btn--outline btn--small" data-act="na-undo">This section applies</button>
      </div>`);
    node.querySelector('[data-act="na-undo"]').addEventListener('click', async () => {
      await state.clearSectionNotApplicable(section.id);
      toast(`${section.title} is back in the checklist.`);
    });
    return node;
  }

  const node = el(`
    <div class="nabanner">
      <div class="nabanner__text">
        <strong>Does this section apply?</strong>
        <span>If not, record why once instead of every question.</span>
      </div>
      <button type="button" class="btn btn--outline btn--small" data-act="na-set">Not applicable</button>
    </div>`);
  node.querySelector('[data-act="na-set"]').addEventListener('click', () => markSectionNotApplicable(section));
  return node;
}

async function markSectionNotApplicable(section) {
  // Answering questions then waving the section off would silently bury real
  // findings, so make that a deliberate choice.
  const answered = section.questions.filter((q) => !q.isHeading
    && (state.state.answers[q.id]?.status ?? AnswerStatus.UNANSWERED) !== AnswerStatus.UNANSWERED);
  if (answered.length > 0) {
    const ok = await confirmDialog({
      title: 'Answers already recorded',
      message: `${answered.length} ${answered.length === 1 ? 'question has' : 'questions have'} been answered in this section. `
        + 'Marking it not applicable will hide those answers from the report. Continue?',
      confirmLabel: 'Continue',
      destructive: true,
    });
    if (!ok) return;
  }

  const reason = await reasonDialog({
    title: `${section.title}: not applicable`,
    message: 'Recorded in the report so a later reader knows this was a decision, not an omission.',
    options: reasonsFor(section.id),
    confirmLabel: 'Mark not applicable',
  });
  if (!reason) return;

  await state.setSectionNotApplicable(section.id, reason);
  toast(`${section.title} marked not applicable.`);
}

function replaceCard(cards, questionId) {
  const existing = cards.querySelector(`[data-qid="${cssEscape(questionId)}"]`);
  if (!existing) return;
  const q = state.questionById(questionId);
  if (!q) return;

  // Never replace a card that owns live state: a focused text field would lose
  // the caret mid-sentence, the sign-off card would lose an in-progress
  // signature, and a locked card is holding a capture the user has not saved
  // yet. Those cards update their own DOM instead.
  const active = document.activeElement;
  const isEditing = active && existing.contains(active)
    && (active.tagName === 'TEXTAREA' || (active.tagName === 'INPUT' && active.type === 'text'));
  const isDictating = voice?.activeTarget === questionId;
  if (isEditing || isDictating
    || existing.matches('.card--signoff') || existing.dataset.lock === '1') return;

  teardownCard(existing);
  const fresh = renderQuestionCard(q, state.answerFor(questionId), cardContext());
  existing.replaceWith(fresh);
}

const cssEscape = (s) => (window.CSS?.escape ? CSS.escape(s) : s.replace(/["\\]/g, '\\$&'));

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

async function exportSafety(section) {
  try {
    await printSafetyChecklist(
      section,
      state.state.answers,
      settings.inspectorName,
      settings.siteId,
    );
  } catch (e) {
    console.error('Safety export failed', e);
    toast('Unable to open the print dialog for the safety checklist. Your answers are saved on this device — try again, or use your browser\'s Print option.',
      { tone: 'error', duration: 9000 });
  }
}

export async function confirmReset() {
  const ok = await confirmDialog({
    title: 'Reset Checklist',
    message: 'Are you sure? You will not be able to recover this checklist.',
    confirmLabel: 'Reset',
    destructive: true,
  });
  if (!ok) return false;
  await state.resetChecklist();
  toast('Checklist reset. All answers and photos were cleared.');
  return true;
}
