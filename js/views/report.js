// Draft report screen. Port of com.sitereporter.ui.screens.ReportScreen.

import * as state from '../state.js';
import { settings } from '../settings.js';
import { SectionStatus, sectionStatus, isMandatorySection } from '../logic.js';
import { generateReport } from '../report.js';
import { esc, icon, toast, copyText, downloadText } from '../ui.js';
import { topBar, bottomNav, paintNetworkPills } from './shell.js';
import { confirmReset } from './checklist.js';

export function render(root, navigate) {
  const text = generateReport(
    state.state.sections,
    state.state.answers,
    settings.inspectorName,
    settings.siteId,
  );

  const incomplete = state.state.sections
    .filter(isMandatorySection)
    .filter((s) => sectionStatus(s, state.state.answers) !== SectionStatus.COMPLETE)
    .length;

  root.innerHTML = `
    <div class="screen">
      ${topBar({ title: 'Draft Report', back: true })}
      ${incomplete > 0 ? `
        <div class="banner banner--warn">
          ${icon('warning')}
          <span>${incomplete} mandatory ${incomplete === 1 ? 'section' : 'sections'} incomplete</span>
        </div>` : ''}
      <main class="page page--report">
        <pre class="reporttext">${esc(text)}</pre>
      </main>
      <div class="actionbar">
        <button type="button" class="btn btn--filled btn--wide" data-act="copy">
          ${icon('copy')}<span>Copy to Clipboard</span>
        </button>
        <div class="actionbar__row">
          <button type="button" class="btn btn--outline" data-act="save">
            ${icon('download')}<span>Save as .txt</span>
          </button>
          <button type="button" class="btn btn--text btn--danger-text" data-act="reset">Reset Checklist</button>
        </div>
      </div>
      ${bottomNav('report')}
    </div>`;

  root.querySelector('[data-act="back"]')?.addEventListener('click', () => navigate('#/checklist'));

  root.querySelector('[data-act="copy"]').addEventListener('click', async () => {
    const ok = await copyText(text);
    if (ok) toast('Report copied to clipboard');
    else toast('Could not copy the report. The text above is selectable — copy it manually, or use "Save as .txt".',
      { tone: 'error', duration: 9000 });
  });

  root.querySelector('[data-act="save"]').addEventListener('click', () => {
    const site = (settings.siteId || '').trim().replace(/[\\/:*?"<>|]/g, '-');
    const date = new Date().toISOString().slice(0, 10);
    downloadText(`Service Report${site ? ` - ${site}` : ''} - ${date}.txt`, text);
    toast('Report saved to your downloads.');
  });

  root.querySelector('[data-act="reset"]').addEventListener('click', async () => {
    if (await confirmReset()) navigate('#/checklist');
  });

  paintNetworkPills();
  return () => {};
}
