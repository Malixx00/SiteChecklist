// "Export Safety Checklist as PDF".
//
// The Android build rendered an A4 page with android.graphics.pdf.PdfDocument.
// Browsers have no equivalent drawing API, so this builds the same single-page
// A4 layout as HTML and hands it to the platform print dialog, where every
// target OS offers "Save as PDF" / "Print to PDF" (iOS: Share -> Save to Files).
// Same artefact, no PDF library in the bundle. See docs/FEATURE-MATRIX.md.

import { AnswerStatus } from './logic.js';
import { signatureSvg } from './components/signature.js';

const escapeHtml = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const STAMP = new Intl.DateTimeFormat(undefined, {
  day: 'numeric', month: 'short', year: 'numeric',
  hour: 'numeric', minute: '2-digit',
});

/** e.g. "Safety Checklist - Bay 3 - 2026-08-21" */
export function safetyExportName(siteId) {
  const date = new Date().toISOString().slice(0, 10);
  const site = (siteId || '').trim().replace(/[\\/:*?"<>|]/g, '-');
  return site ? `Safety Checklist - ${site} - ${date}` : `Safety Checklist - ${date}`;
}

function statusMark(status) {
  if (status === AnswerStatus.DONE) return '<span class="box tick"></span>';
  if (status === AnswerStatus.NOT_REQUIRED) return '<span class="box dash"></span>';
  return '<span class="box"></span>';
}

export function buildSafetyHtml(section, answers, inspectorName, siteId) {
  const signOff = section.questions.find((q) => q.isSignOff);
  const signOffAnswer = signOff ? answers[signOff.id] : null;

  const meta = [];
  if (siteId?.trim()) meta.push(`Site: ${escapeHtml(siteId)}`);
  if (inspectorName?.trim()) meta.push(`Inspector: ${escapeHtml(inspectorName)}`);
  meta.push(`Exported: ${escapeHtml(STAMP.format(new Date()))}`);

  const rows = [];
  for (const q of section.questions) {
    if (q.isSignOff) continue;

    if (q.isHeading) {
      // Heading descriptions are instructional prose, omitted to keep to one page.
      rows.push(`<h2>${escapeHtml(q.title.toUpperCase())}</h2>`);
      continue;
    }

    const a = answers[q.id];
    const status = a?.status ?? AnswerStatus.UNANSWERED;
    const label = status === AnswerStatus.NOT_REQUIRED && q.noButton ? q.noText : '';

    rows.push(
      `<div class="q">${statusMark(status)}` +
      `<span class="qt">${escapeHtml(q.title)}</span>` +
      (label ? `<span class="ql">${escapeHtml(label)}</span>` : '') +
      `</div>`,
    );

    const note = (a?.notes ?? '').trim();
    if (note) {
      const noteLabel = q.commentsLabel?.trim() || 'Note';
      rows.push(`<div class="note">${escapeHtml(noteLabel)}: ${escapeHtml(note)}</div>`);
    }

    const ticked = (a?.checkedOptions ?? '').split('|').filter(Boolean);
    if (ticked.length) {
      rows.push(`<div class="note">Ticked: ${escapeHtml(ticked.join(', '))}</div>`);
    }
  }

  let signBlock = '';
  if (signOff) {
    const name = (signOffAnswer?.notes || '').trim() || inspectorName || '';
    const signed = signOffAnswer?.signedAt
      ? STAMP.format(new Date(signOffAnswer.signedAt))
      : '________________';
    const statusText = signOffAnswer?.status === AnswerStatus.DONE ? 'Signed off' : 'Not signed off';
    signBlock = `
      <div class="signoff">
        <h2>SIGN-OFF</h2>
        <div class="signrow">
          <div class="sigbox">${signatureSvg(signOffAnswer?.signatureData, 300, 70)}</div>
          <div class="sigmeta">
            <div>Name: ${escapeHtml(name || '________________')}</div>
            <div>Signed: ${escapeHtml(signed)}</div>
            <div>Status: ${escapeHtml(statusText)}</div>
          </div>
        </div>
      </div>`;
  }

  // Brand colours and type per the Australian Turntables style guide. Fonts
  // are referenced from the app's own fonts/ directory; the print frame is
  // same-origin so they resolve offline.
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>${escapeHtml(safetyExportName(siteId))}</title>
<style>
  @font-face { font-family: 'Montserrat'; font-weight: 400;
    src: url('fonts/montserrat-400.woff2') format('woff2'); }
  @font-face { font-family: 'Montserrat'; font-weight: 700;
    src: url('fonts/montserrat-700.woff2') format('woff2'); }
  @font-face { font-family: 'Barlow Condensed'; font-style: italic; font-weight: 700;
    src: url('fonts/barlow-condensed-700-italic.woff2') format('woff2'); }

  @page { size: A4; margin: 11mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: 'Montserrat', -apple-system, "Segoe UI", Roboto, Arial, sans-serif;
         color: #1A232B; font-size: 7.8pt; line-height: 1.3; }
  .head { display: flex; align-items: flex-start; gap: 10pt; }
  .head img { width: 118pt; height: auto; }
  .head h1 { flex: 1; text-align: right;
         font-family: 'Acumin Variable Concept', 'Barlow Condensed', 'Montserrat', sans-serif;
         font-style: italic; font-weight: 700; text-transform: uppercase; letter-spacing: .4pt;
         font-size: 16pt; margin: 0; color: #425563; }
  .meta { font-size: 7.4pt; color: #5D6B76; margin: 2pt 0 4pt; }
  hr { border: 0; border-top: .7pt solid #0076A8; margin: 0 0 5pt; }
  h2 { font-family: 'Acumin Variable Concept', 'Barlow Condensed', 'Montserrat', sans-serif;
       font-style: italic; font-weight: 700; text-transform: uppercase; letter-spacing: .3pt;
       font-size: 9.5pt; margin: 6pt 0 2pt; color: #425563; }
  .q { display: flex; align-items: baseline; gap: 5pt; padding: .7pt 0 .7pt 4pt; }
  .qt { flex: 1; }
  .ql { color: #888B8D; font-size: 7pt; white-space: nowrap; }
  .box { flex: 0 0 auto; position: relative; width: 7.5pt; height: 7.5pt;
         border: .8pt solid #425563; border-radius: 1pt; display: inline-block; }
  .box.tick::after { content: ""; position: absolute; left: 1.2pt; top: .3pt;
         width: 3.4pt; height: 5.4pt; border-right: 1.2pt solid #0076A8;
         border-bottom: 1.2pt solid #0076A8; transform: rotate(40deg); }
  .box.dash::after { content: ""; position: absolute; left: 1.3pt; top: 3.2pt;
         width: 4.6pt; border-top: 1.2pt solid #888B8D; }
  .note { font-size: 7pt; font-style: italic; color: #5D6B76;
          padding-left: 19pt; padding-bottom: .5pt; }
  .signoff { margin-top: 8pt; page-break-inside: avoid; }
  .signrow { display: flex; gap: 12pt; align-items: flex-start; }
  .sigbox { width: 55%; height: 70px; border: .7pt solid #BCCED6; border-radius: 3pt;
            overflow: hidden; }
  .sigbox svg { width: 100%; height: 100%; }
  .sigmeta { font-size: 7.6pt; color: #425563; display: grid; gap: 5pt; padding-top: 4pt; }
</style></head>
<body>
  <div class="head">
    <img src="icons/at-logo.svg" alt="Australian Turntables">
    <h1>Take 5 Safety Checklist</h1>
  </div>
  <div class="meta">${meta.join('&nbsp;&nbsp;&nbsp;&nbsp;')}</div>
  <hr>
  ${rows.join('\n  ')}
  ${signBlock}
</body></html>`;
}

/**
 * Opens the platform print dialog with the safety checklist.
 * @returns {Promise<void>} resolves once the dialog has been dismissed
 */
export function printSafetyChecklist(section, answers, inspectorName, siteId) {
  const html = buildSafetyHtml(section, answers, inspectorName, siteId);

  return new Promise((resolve, reject) => {
    const frame = document.createElement('iframe');
    frame.setAttribute('aria-hidden', 'true');
    frame.style.cssText = 'position:fixed;left:-9999px;top:0;width:210mm;height:297mm;border:0;';
    frame.onload = () => {
      try {
        const win = frame.contentWindow;
        win.focus();
        win.print();
        // Give the print dialog time to take the document before we detach it.
        setTimeout(() => { frame.remove(); resolve(); }, 1000);
      } catch (e) {
        frame.remove();
        reject(e);
      }
    };
    document.body.appendChild(frame);
    frame.srcdoc = html;
  });
}
