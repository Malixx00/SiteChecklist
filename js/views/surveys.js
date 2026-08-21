// Survey selection screen. Port of com.sitereporter.ui.screens.SurveyListScreen.

import * as state from '../state.js';
import * as db from '../db.js';
import { esc, icon, el, toast, menu, confirmDialog, promptDialog, downloadText, pickFile } from '../ui.js';
import { topBar, paintNetworkPills } from './shell.js';
import { lockupImg } from '../components/logo.js';
import { parseSurveyCsv, exportSurveyCsv, templateCsv } from '../csv.js';
import { DEFAULT_SURVEY_ID } from '../seeder.js';

export function render(root, navigate) {
  root.innerHTML = `
    <div class="screen">
      ${topBar({ title: 'Site Reporter' })}
      <main class="page">
        <div class="page__brand">${lockupImg()}</div>
        <h1 class="page__title">Select a Survey</h1>
        <p class="page__sub">Choose which survey to complete</p>
        <div class="surveylist" data-list></div>
        <button type="button" class="btn btn--outline btn--wide" data-act="template">
          ${icon('download')}<span>Download CSV Template</span>
        </button>
      </main>
      <div class="fab-bar">
        <button type="button" class="fab" data-act="import">${icon('plus')}<span>Import Survey</span></button>
      </div>
    </div>`;

  const list = root.querySelector('[data-list]');

  if (state.state.surveys.length === 0) {
    list.innerHTML = '<p class="empty">No surveys yet.<br>Import a CSV to get started.</p>';
  } else {
    for (const survey of state.state.surveys) {
      list.appendChild(renderSurveyCard(survey, navigate));
    }
  }

  root.querySelector('[data-act="template"]').addEventListener('click', () => {
    downloadText('survey_template.csv', templateCsv(), 'text/csv;charset=utf-8');
    toast('Template saved to your downloads.');
  });

  root.querySelector('[data-act="import"]').addEventListener('click', importSurvey);

  paintNetworkPills();
  return () => {};
}

function renderSurveyCard(survey, navigate) {
  const { definition, questionCount } = survey;
  const node = el(`
    <article class="surveycard">
      <div class="surveycard__text">
        <h2>${esc(definition.name)}</h2>
        ${definition.description ? `<p>${esc(definition.description)}</p>` : ''}
        <p class="surveycard__count">${questionCount} questions</p>
      </div>
      <button type="button" class="btn btn--filled" data-act="start">${icon('play')}<span>Start</span></button>
      <button type="button" class="topbar__icon" data-act="more" aria-label="Survey options">${icon('more')}</button>
    </article>`);

  node.querySelector('[data-act="start"]').addEventListener('click', async () => {
    await state.selectSurvey(definition.id);
    navigate('#/checklist');
  });

  node.querySelector('[data-act="more"]').addEventListener('click', async (e) => {
    // The built-in survey is re-seeded on every launch, so deleting it would
    // only appear to work.
    const items = [{ label: 'Export CSV', value: 'export', icon: 'upload' }];
    if (definition.id !== DEFAULT_SURVEY_ID) {
      items.push({ label: 'Delete', value: 'delete', danger: true, icon: 'trash' });
    }
    const choice = await menu(e.currentTarget, items);

    if (choice === 'export') {
      const questions = await db.loadQuestions(definition.id);
      downloadText(`${definition.name}.csv`, exportSurveyCsv(questions), 'text/csv;charset=utf-8');
      toast(`Exported ${questions.length} questions.`);
    } else if (choice === 'delete') {
      const ok = await confirmDialog({
        title: 'Delete Survey',
        message: `Delete "${definition.name}"? This cannot be undone.`,
        confirmLabel: 'Delete',
        destructive: true,
      });
      if (!ok) return;
      await state.deleteSurvey(definition.id);
      toast('Survey deleted');
    }
  });

  return node;
}

async function importSurvey() {
  const file = await pickFile('.csv,text/csv,text/plain');
  if (!file) return;

  const name = await promptDialog({
    title: 'Survey Name',
    message: 'Enter a name for the imported survey:',
    placeholder: 'e.g. Service Survey 2025',
    confirmLabel: 'Import',
    required: true,
  });
  if (!name) return;

  try {
    const text = await file.text();
    const slug = name.toLowerCase().replace(/ /g, '_');
    const result = parseSurveyCsv(text, slug);

    if (result.questions.length === 0) {
      toast('No valid questions found in that file. Nothing was imported — check the file has a header row and a "title" column.',
        { tone: 'error', duration: 9000 });
      return;
    }

    const surveyId = `${slug}_${Date.now()}`;
    await db.putSurvey({ id: surveyId, name, description: '', createdAt: Date.now() });
    await db.replaceQuestions(surveyId, result.questions.map((q) => ({
      ...q, id: `${surveyId}_${q.id}`, surveyId,
    })));
    await state.loadSurveyList();

    const skipped = result.skippedRows > 0 ? ` (${result.skippedRows} rows skipped)` : '';
    toast(`Imported ${result.questions.length} questions${skipped}`);
  } catch (e) {
    console.error('Survey import failed', e);
    toast(`Unable to import that survey file. Nothing was changed on this device. (${e.message})`,
      { tone: 'error', duration: 9000 });
  }
}
