// Checklist screen. Port of com.sitereporter.ui.screens.ChecklistScreen
// plus SectionRibbon.

import * as state from '../state.js';
import { settings } from '../settings.js';
import {
  SectionStatus, sectionStatus, answeredCount, totalItems,
} from '../logic.js';
import { SAFETY_SECTION_ID } from '../safety.js';
import { esc, icon, el, toast, menu, confirmDialog } from '../ui.js';
import { topBar, bottomNav, paintNetworkPills } from './shell.js';
import { renderQuestionCard, teardownCard } from '../components/questionCard.js';
import { VoiceController, insertVoiceText } from '../voice.js';
import { printSafetyChecklist } from '../safetyPrint.js';

let voice = null;
let unsubscribe = null;

export function render(root, navigate) {
  voice?.cancel();
  voice = new VoiceController();

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
    if (status === SectionStatus.COMPLETE) {
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

  const ctx = cardContext();
  const fragment = document.createDocumentFragment();
  for (const q of section.questions) {
    fragment.appendChild(renderQuestionCard(q, state.answerFor(q.id), ctx));
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
  if (isEditing || existing.matches('.card--signoff') || existing.dataset.lock === '1') return;

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
