// Plain-text draft report.
// Port of com.sitereporter.domain.ReportGenerator. The format matches the
// Android output line-for-line, with one addition: a "Ticked:" line listing
// checked options. The Android report captured those ticks but never printed
// them. Flagged in docs/FEATURE-MATRIX.md - delete the block below to revert.

import { AnswerStatus, SectionStatus, sectionStatus, isMandatorySection } from './logic.js';

// Formatted explicitly rather than through Intl: the report is a company
// document that must read the same on every technician's device, and the
// column alignment below assumes day-month-year ("21 August 2026").
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

const pad = (n) => String(n).padStart(2, '0');
const formatDate = (d) => `${pad(d.getDate())} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
const formatDateTime = (d) => `${formatDate(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;

export function generateReport(sections, answers, inspectorName, siteId) {
  const now = new Date();
  const out = [];
  const line = (s = '') => out.push(s);

  line('========================================');
  line('       TURNTABLE SERVICE REPORT');
  line('========================================');
  line(`Date:          ${formatDate(now)}`);
  if (inspectorName.trim()) line(`Inspector:     ${inspectorName}`);
  if (siteId.trim()) line(`Site ID:       ${siteId}`);
  line(`Generated:     ${formatDateTime(now)}`);
  line();

  const incomplete = sections
    .filter(isMandatorySection)
    .filter((s) => sectionStatus(s, answers) !== SectionStatus.COMPLETE);

  line('----------------------------------------');
  if (incomplete.length > 0) {
    line('  STATUS: INCOMPLETE');
    line('  The following required sections are not complete:');
    for (const section of incomplete) {
      const status = sectionStatus(section, answers);
      const label = status === SectionStatus.NOT_STARTED ? 'Not started' : 'In progress';
      line(`    - ${section.title} (${label})`);
    }
  } else {
    line('  STATUS: ALL REQUIRED SECTIONS COMPLETE');
  }
  line('----------------------------------------');
  line();

  for (const section of sections) {
    const status = sectionStatus(section, answers);
    const optionalSection = !isMandatorySection(section);
    const label = optionalSection ? 'OPTIONAL'
      : status === SectionStatus.COMPLETE ? 'COMPLETE' : 'INCOMPLETE';

    line(`--- ${section.title.toUpperCase()} --- [${label}]`);
    line();

    for (const q of section.questions.filter((x) => !x.isHeading)) {
      const a = answers[q.id];
      const s = a?.status ?? AnswerStatus.UNANSWERED;

      if (s === AnswerStatus.DONE) line(`  ${q.title}: ${q.yesText} ✓`);
      else if (s === AnswerStatus.NOT_REQUIRED) line(`  ${q.title}: — ${q.noText}`);
      else line(`  ${q.title}: [NOT ANSWERED]`);

      if (a?.notes && a.notes.trim()) line(`    ${q.commentsLabel}: ${a.notes}`);

      if (q.checkboxOptions?.length && a?.checkedOptions) {
        const ticked = a.checkedOptions.split('|').filter(Boolean);
        if (ticked.length) line(`    Ticked: ${ticked.join(', ')}`);
      }

      if (q.photoRequired) {
        line(a?.photoTaken ? '    (Photo taken)' : '    (Photo required - not confirmed)');
      }
      if (q.videoRequired) {
        line(a?.videoTaken ? '    (Video taken)' : '    (Video required - not confirmed)');
      }
    }

    line();
  }

  line('========================================');
  line('              END OF REPORT');
  line('========================================');

  return `${out.join('\n')}\n`;
}
