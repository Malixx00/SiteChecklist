// Self-check for the ported business logic. Run: node test/logic.test.mjs
//
// Covers the rules that are easy to break and expensive to get wrong: section
// completion (including the optional-only case), progress counting, the CSV
// round trip, and the report's status header.

import assert from 'node:assert/strict';

import {
  AnswerStatus, SectionStatus, question, answer,
  sectionStatus, allRequiredComplete, answeredCount, totalItems,
  requiredCount, sectionTitleFromId, isMandatorySection,
} from '../js/logic.js';
import { buildSafetySection, SAFETY_SECTION_ID } from '../js/safety.js';
import { buildDefaultQuestions } from '../js/seeder.js';
import { parseSurveyCsv, exportSurveyCsv, templateCsv } from '../js/csv.js';
import { generateReport } from '../js/report.js';
import { serializeSignature, deserializeSignature } from '../js/components/signature.js';
import { insertVoiceText } from '../js/voice.js';

let checks = 0;
const check = (name, fn) => { fn(); checks++; console.log(`  ok  ${name}`); };

const section = (id, questions) => ({ id, title: id, questions });
const answered = (id, status, extra = {}) => [id, { ...answer(id), status, ...extra }];

// ---------------------------------------------------------------------------

check('section with only optional questions needs every question settled', () => {
  const s = section('opt', [
    question({ id: 'a', surveyId: 's', section: 'opt', title: 'A', isOptional: true }),
    question({ id: 'b', surveyId: 's', section: 'opt', title: 'B', isOptional: true }),
  ]);
  assert.equal(sectionStatus(s, {}), SectionStatus.NOT_STARTED);
  assert.equal(requiredCount(s), 0);

  const partial = Object.fromEntries([answered('a', AnswerStatus.DONE)]);
  assert.equal(sectionStatus(s, partial), SectionStatus.IN_PROGRESS);

  const all = Object.fromEntries([
    answered('a', AnswerStatus.DONE),
    answered('b', AnswerStatus.NOT_REQUIRED),
  ]);
  assert.equal(sectionStatus(s, all), SectionStatus.COMPLETE);
  // An all-optional section never gates overall completion.
  assert.equal(isMandatorySection(s), false);
  assert.equal(allRequiredComplete([s], {}), true);
});

check('required questions gate completion, optional ones do not', () => {
  const s = section('mix', [
    question({ id: 'h', surveyId: 's', section: 'mix', title: 'Heading', isHeading: true }),
    question({ id: 'r', surveyId: 's', section: 'mix', title: 'Required' }),
    question({ id: 'o', surveyId: 's', section: 'mix', title: 'Optional', isOptional: true }),
  ]);
  assert.equal(sectionStatus(s, Object.fromEntries([answered('o', AnswerStatus.DONE)])),
    SectionStatus.IN_PROGRESS);
  assert.equal(sectionStatus(s, Object.fromEntries([answered('r', AnswerStatus.DONE)])),
    SectionStatus.COMPLETE);
  assert.equal(allRequiredComplete([s], Object.fromEntries([answered('r', AnswerStatus.NOT_REQUIRED)])),
    true);
});

check('progress counts each photo and video requirement as its own item', () => {
  const s = section('media', [
    question({ id: 'p', surveyId: 's', section: 'media', title: 'Photo', photoRequired: true }),
    question({ id: 'v', surveyId: 's', section: 'media', title: 'Video', videoRequired: true }),
    question({ id: 'x', surveyId: 's', section: 'media', title: 'Plain' }),
  ]);
  assert.equal(totalItems(s), 5); // 3 answers + 1 photo + 1 video
  assert.equal(answeredCount(s, {}), 0);

  const partial = Object.fromEntries([answered('p', AnswerStatus.DONE, { photoTaken: true })]);
  assert.equal(answeredCount(s, partial), 2);
});

check('safety section is built with the expected shape', () => {
  const s = buildSafetySection('survey_x');
  assert.equal(s.id, SAFETY_SECTION_ID);
  assert.ok(s.questions.length > 40, 'safety section should carry the full Take 5');
  assert.ok(s.questions.some((q) => q.isSignOff), 'needs a sign-off question');
  // Steps 4 and 5 are mandatory ticks - isolation must never be optional.
  const isolation = s.questions.find((q) => q.id === 'safety_s4_q1');
  assert.equal(isolation.isOptional, false);
  assert.equal(isolation.checkboxes, true);
  // Every id is unique, or answers would collide.
  assert.equal(new Set(s.questions.map((q) => q.id)).size, s.questions.length);
  // Sort order is dense and ascending.
  s.questions.forEach((q, i) => assert.equal(q.sortOrder, i));
});

check('default survey seeds unique ids and sane defaults', () => {
  const qs = buildDefaultQuestions();
  assert.ok(qs.length > 40);
  assert.equal(new Set(qs.map((q) => q.id)).size, qs.length);
  const enclosure = qs.find((q) => q.id === 'svc_q003');
  assert.equal(enclosure.yesText, 'Pass');
  assert.equal(enclosure.noText, 'Issue');
  assert.equal(enclosure.checkboxes, true);
  assert.equal(enclosure.photoRequired, true);
  assert.equal(qs.find((q) => q.id === 'svc_q010').yesText, 'Done');
  // No safety questions leak into the database-backed survey.
  assert.equal(qs.filter((q) => q.section === SAFETY_SECTION_ID).length, 0);
});

check('CSV export/import round-trips every field', () => {
  const original = buildDefaultQuestions();
  const csv = exportSurveyCsv(original);
  const { questions: parsed, skippedRows } = parseSurveyCsv(csv, 'service_survey');
  assert.equal(skippedRows, 0);
  assert.equal(parsed.length, original.length);

  for (let i = 0; i < original.length; i++) {
    const a = original[i];
    const b = parsed[i];
    for (const key of ['id', 'section', 'isHeading', 'title', 'yesButton', 'yesText',
      'noButton', 'noText', 'checkboxes', 'photoRequired', 'videoRequired',
      'commentsShown', 'commentsLabel', 'isSignOff', 'isOptional']) {
      assert.deepEqual(b[key], a[key], `${a.id}.${key}`);
    }
    assert.deepEqual(b.checkboxOptions, a.checkboxOptions, `${a.id}.checkboxOptions`);
    // Multi-line descriptions with commas and quotes must survive quoting.
    // The parser trims surrounding whitespace, as the Android one did.
    assert.equal(b.description, a.description?.trim() ?? null, `${a.id}.description`);
  }
});

check('CSV parser skips unusable rows and keeps blank-column defaults', () => {
  const csv = [
    'id,section,is_heading,title,description,yes_button,yes_text,no_button,no_text,checkboxes,checkbox_options,photo,video,comments,comments_label,sign_off,is_optional',
    'q1,general,0,"Has a ""quoted"" title, with comma",,,,,,,,,,,,,',
    'q2,,,,,,,,,,,,,,,,',            // no title -> skipped
    'short,row',                      // too few columns -> skipped
    '',                               // blank -> ignored, not counted
    'q3,general,1,Heading,,0,,0,,,,,,0,,,1',
  ].join('\n');

  const { questions, skippedRows } = parseSurveyCsv(csv, 'imported');
  assert.equal(skippedRows, 2);
  assert.equal(questions.length, 2);
  assert.equal(questions[0].title, 'Has a "quoted" title, with comma');
  assert.equal(questions[0].yesButton, true, 'blank yes_button defaults to true');
  assert.equal(questions[0].noText, 'N/A');
  assert.equal(questions[0].commentsShown, true, 'blank comments defaults to true');
  assert.equal(questions[1].isHeading, true);
  assert.equal(questions[1].isOptional, true);
  assert.equal(questions[1].commentsShown, false);
});

check('template CSV parses back to two rows', () => {
  const { questions, skippedRows } = parseSurveyCsv(templateCsv(), 'template');
  assert.equal(skippedRows, 0);
  assert.equal(questions.length, 2);
});

check('report header reflects completion state', () => {
  const s = section('controls', [
    question({ id: 'r', surveyId: 's', section: 'controls', title: 'Check it', yesText: 'Pass' }),
  ]);
  s.title = 'Controls';

  const blank = generateReport([s], {}, 'A Tech', 'Bay 3');
  assert.match(blank, /STATUS: INCOMPLETE/);
  assert.match(blank, /- Controls \(Not started\)/);
  assert.match(blank, /Check it: \[NOT ANSWERED\]/);
  assert.match(blank, /Inspector:     A Tech/);
  assert.match(blank, /Site ID:       Bay 3/);

  const done = generateReport([s], Object.fromEntries([
    answered('r', AnswerStatus.DONE, { notes: 'all good' }),
  ]), '', '');
  assert.match(done, /STATUS: ALL REQUIRED SECTIONS COMPLETE/);
  assert.match(done, /Check it: Pass/);
  assert.match(done, /Note: all good/);
  assert.doesNotMatch(done, /Inspector:/, 'blank inspector is omitted');
});

check('signature data round-trips', () => {
  const strokes = [[{ x: 1.5, y: 2 }, { x: 3, y: 4.25 }], [{ x: 9, y: 9 }]];
  const data = serializeSignature(strokes);
  assert.equal(data, '1.5 2,3 4.25|9 9');
  assert.deepEqual(deserializeSignature(data), strokes);
  assert.deepEqual(deserializeSignature(''), []);
  assert.deepEqual(deserializeSignature('garbage'), []);
});

check('voice text inserts at the caret with single spaces', () => {
  assert.deepEqual(insertVoiceText('', 0, 0, ' hello '), { text: 'hello', caret: 5 });
  assert.deepEqual(insertVoiceText('abc', 3, 3, 'def'), { text: 'abc def', caret: 7 });
  assert.deepEqual(insertVoiceText('abc ', 4, 4, 'def'), { text: 'abc def', caret: 7 });
  assert.deepEqual(insertVoiceText('ab cd', 2, 5, 'XY'), { text: 'ab XY', caret: 5 });
  assert.deepEqual(insertVoiceText('hello', 5, 5, '   '), { text: 'hello', caret: 5 });
});

check('section titles come from the section id', () => {
  assert.equal(sectionTitleFromId('gear_rack_and_pinion'), 'Gear Rack And Pinion');
  assert.equal(sectionTitleFromId('controls'), 'Controls');
});

console.log(`\n${checks} checks passed`);
