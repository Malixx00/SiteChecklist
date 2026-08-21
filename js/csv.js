// Survey CSV import/export.
// Port of com.sitereporter.domain.SurveyCsvParser + SurveyCsvExporter.
// The column set and semantics are unchanged, so spreadsheets produced by the
// Android app import into the PWA and vice versa.

import { question } from './logic.js';

export const CSV_HEADER = [
  'id', 'section', 'is_heading', 'title', 'description',
  'yes_button', 'yes_text', 'no_button', 'no_text',
  'checkboxes', 'checkbox_options', 'photo', 'video',
  'comments', 'comments_label', 'sign_off', 'is_optional',
];

/**
 * Splits a whole CSV document into records of fields.
 *
 * Tokenising the entire text (rather than line by line) is what lets a quoted
 * field contain newlines - several seeded descriptions do. The Android parser
 * split on newlines first, so those rows failed to re-import; that is fixed
 * here and noted in docs/FEATURE-MATRIX.md.
 */
function parseCsvRecords(text) {
  const records = [];
  let record = [];
  let field = '';
  let inQuotes = false;

  const endField = () => { record.push(field); field = ''; };
  const endRecord = () => { endField(); records.push(record); record = []; };

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else field += c;
      continue;
    }
    if (c === '"') inQuotes = true;
    else if (c === ',') endField();
    else if (c === '\r') { if (text[i + 1] === '\n') i++; endRecord(); }
    else if (c === '\n') endRecord();
    else field += c;
  }
  if (field !== '' || record.length > 0) endRecord();

  return records;
}

/** @returns {{questions: Array, skippedRows: number}} */
export function parseSurveyCsv(text, surveyId) {
  const records = parseCsvRecords(text);
  if (records.length === 0) return { questions: [], skippedRows: 0 };

  const header = records[0].map((h) => h.trim().toLowerCase());
  const rows = records.slice(1);

  const questions = [];
  let skippedRows = 0;

  rows.forEach((cols, index) => {
    if (cols.every((c) => !c.trim())) return; // blank line
    if (cols.length < 4) { skippedRows++; return; }

    const col = (name) => (cols[header.indexOf(name)] ?? '').trim();
    const truthy = (v) => v === '1' || v.toLowerCase() === 'true' || v.toLowerCase() === 'yes';
    const bool = (name) => truthy(col(name));
    // Blank means "keep the default of true" for these three columns.
    const boolDefaultTrue = (name) => {
      const v = col(name);
      return v === '' ? true : (v === '1' || v.toLowerCase() === 'true');
    };

    const title = col('title');
    if (!title) { skippedRows++; return; }

    const options = col('checkbox_options');

    questions.push(question({
      id: col('id') || `${surveyId}_q${index}`,
      surveyId,
      sortOrder: questions.length,
      section: col('section') || 'general',
      isHeading: bool('is_heading'),
      title,
      description: col('description') || null,
      yesButton: boolDefaultTrue('yes_button'),
      yesText: col('yes_text') || 'Done',
      noButton: boolDefaultTrue('no_button'),
      noText: col('no_text') || 'N/A',
      checkboxes: bool('checkboxes'),
      checkboxOptions: options ? options.split('|') : [],
      photoRequired: bool('photo'),
      videoRequired: bool('video'),
      commentsShown: boolDefaultTrue('comments'),
      commentsLabel: col('comments_label') || 'Note',
      isSignOff: bool('sign_off'),
      isOptional: bool('is_optional'),
    }));
  });

  return { questions, skippedRows };
}

function escapeCsv(value) {
  const s = value ?? '';
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function exportSurveyCsv(questions) {
  const flag = (b) => (b ? '1' : '0');
  const lines = [CSV_HEADER.join(',')];
  for (const q of questions) {
    lines.push([
      q.id,
      q.section,
      flag(q.isHeading),
      q.title,
      q.description ?? '',
      flag(q.yesButton),
      q.yesText,
      flag(q.noButton),
      q.noText,
      flag(q.checkboxes),
      (q.checkboxOptions ?? []).join('|'),
      flag(q.photoRequired),
      flag(q.videoRequired),
      flag(q.commentsShown),
      q.commentsLabel,
      flag(q.isSignOff),
      flag(q.isOptional),
    ].map(escapeCsv).join(','));
  }
  return `${lines.join('\n')}\n`;
}

/** The two-row example spreadsheet offered as "Download CSV Template". */
export function templateCsv() {
  return exportSurveyCsv([
    question({
      id: 'example_q1', surveyId: 'template', sortOrder: 0, section: 'general',
      title: 'Example question', description: 'Optional description or hint',
      yesButton: true, yesText: 'Done', noButton: true, noText: 'N/A',
      commentsShown: true, commentsLabel: 'Note',
    }),
    question({
      id: 'example_h1', surveyId: 'template', sortOrder: 1, section: 'general',
      isHeading: true, title: 'Section Heading',
      yesButton: false, noButton: false, commentsShown: false,
    }),
  ]);
}
