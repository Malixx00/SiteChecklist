# Site Reporter — PWA (Version 2)

Progressive Web App replacement for the `SiteReporter` Android application.
Australian Turntables site inspection checklists for field technicians,
installable to the Home Screen on Android, iOS and Windows without Google Play
or the App Store.

Functional parity with the Android build, offline-first, zero runtime
dependencies, no build step, and styled to the 2025 Australian Turntables brand
guide.

## Quick start

```bash
cd "Version 2 PWA"
python -m http.server 8123
```

Open `http://localhost:8123` and sign in (credentials in
[docs/SUPPORT.md](docs/SUPPORT.md)). `localhost` is a secure context, so the
service worker, WebCrypto and the install prompt all work.

Run the logic self-check:

```bash
node test/logic.test.mjs
```

Nothing to install first — no npm, no bundler, no `node_modules`. Node is used
only to run the tests.

## Read next

| Document | Covers |
|---|---|
| [docs/FEATURE-MATRIX.md](docs/FEATURE-MATRIX.md) | Audit of the Android app, the compatibility matrix, deliberate deviations, Android/iOS differences, and the decisions the business still needs to make |
| [docs/BRAND-COMPLIANCE.md](docs/BRAND-COMPLIANCE.md) | How the app implements the brand style guide page by page, the two substitutions, and measured contrast |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Module layout, storage design, rendering model, update flow, security posture, and where a backend would attach |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Host requirements, IIS/nginx/Azure config, environments, access control, release procedure |
| [docs/INSTALL.md](docs/INSTALL.md) | End-user install and sign-in instructions — hand this to field staff |
| [docs/TESTING.md](docs/TESTING.md) | Test results so far, and the outstanding physical-device test plan |
| [docs/SUPPORT.md](docs/SUPPORT.md) | Admin and support runbook, credentials and rotation, survey distribution |

## Three things to know before signing this off

1. **The sign-in screen is a deterrent, not access control.** It checks a
   shared, hard-coded credential in the browser, so developer tools bypass it
   and it cannot say who completed a checklist. It keeps untrained people out of
   a live safety checklist, which is what it was asked to do. Real access
   control is the hosting gate in `DEPLOYMENT.md` and is still required before
   production.
2. **The Android app had no backend, no API and no authentication** — it is
   Room and DataStore, entirely on-device. So this PWA has no backend either.
   The reasoning is in `FEATURE-MATRIX.md` section 1.
3. **Physical Android and iOS device testing has not been done.** Automated
   logic tests and desktop Chromium verification pass. The device matrix in
   `TESTING.md` is a release gate, and the installed-on-a-real-iPhone case is
   the highest-risk gap.

Plus four brand items awaiting sign-off in `BRAND-COMPLIANCE.md` section 7 —
most importantly the **Acumin font licence**, since the app currently ships
Barlow Condensed Italic as a stand-in for the specified display face.

## What it does

* **Sign-in gate** — shared technician credential, 12-hour session, sign-out in
  Settings. Signing out never deletes field data.
* **Survey selection** — the built-in Turntable Service Checklist plus any
  surveys imported from CSV.
* **Mandatory Take 5 safety section** first on every survey, in code so it can
  never be imported away, edited out or skipped.
* **Question types** — headings, Pass/Issue and Done/N-A, done-only, tick rows,
  tick-option lists, and a sign-off card with a signature pad.
* **Per-section progress** and a status ribbon across all sections.
* **Notes** on any question, with voice dictation where the browser supports it.
* **Photos** captured with the system camera, downscaled and attached to the
  record, with thumbnails and delete.
* **Take 5 PDF export** via the platform print dialog, on brand letterhead.
* **Draft report** as plain text, copy to clipboard or save as `.txt`.
* **Survey CSV import / export** in the same 17-column format as the Android
  app, so existing spreadsheets keep working.
* **Diagnostics** screen with a Copy Diagnostics action for support.
* **Offline everything** — nothing the app does requires a network, brand fonts
  and logos included.
* **Automatic updates** with an in-app prompt; no reinstall, ever.

## Layout

```text
index.html               app shell
manifest.webmanifest     install metadata
sw.js                    offline cache + versioned updates
css/app.css              all styling, brand tokens at the top of the file
js/                      logic, persistence, views (see ARCHITECTURE.md)
fonts/                   self-hosted brand typefaces, latin subset
icons/                   PWA icons plus the brand symbol and lockup SVGs
test/logic.test.mjs      logic self-check
docs/                    documentation set
```

## Releasing

1. Bump `APP_VERSION` / `BUILD` in `js/version.js`.
2. Set `CACHE_VERSION` in `sw.js` to match `BUILD`.
3. Add any new `js/`, `css/`, `fonts/` or `icons/` file to the `SHELL` array in
   `sw.js`.
4. `node test/logic.test.mjs`.
5. Copy the folder to the HTTPS host.

Full detail, including the "why" for steps 2 and 3, in `docs/DEPLOYMENT.md`.

## Environment variables and third-party services

None. No API keys, no tokens, no connection strings, no SaaS. The one
confidential value in the repository is the SHA-256 of the sign-in credential in
`js/auth.js`, which has to be client-side for the gate to work — see
`docs/DEPLOYMENT.md`, "Secrets in source".
