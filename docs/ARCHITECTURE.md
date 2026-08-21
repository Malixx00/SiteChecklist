# Architecture

Specification sections 4, 5, 8, 9, 13, 21, 24.

## Shape

```text
                  Company HTTPS host (static files only)
                  + access gate (Entra ID / Cloudflare Access)
                                  |
                                HTTPS
                                  |
                        PWA (this folder)
                                  |
        +-------------------------+-------------------------+
        |                         |                         |
     Android                     iOS                    Windows / PC
     Chrome                  Safari / PWA              Edge / Chrome
        |                         |
   Home Screen               Home Screen
```

There is no backend. Every byte of user data stays on the device (see
`FEATURE-MATRIX.md` section 1 for why, and where a backend would attach).

## Module layout

```text
index.html               app shell: metadata, install hooks, mount points
manifest.webmanifest     name, icons, standalone display, scope, shortcuts
sw.js                    service worker: offline shell + versioned updates
css/app.css              all styling; brand tokens per BRAND-COMPLIANCE.md

js/
  app.js                 entry point: boot, sign-in gate, hash router, updates
  auth.js                shared-credential sign-in, 12-hour session (see below)
  version.js             APP_VERSION / BUILD, shown in Settings and Diagnostics
  theme.js               light / dark / system + sun mode

  -- business logic (no DOM, no browser APIs; unit tested) --
  logic.js               model factories, section status, progress counting
  safety.js              the mandatory Take 5 section, built in code
  seeder.js              the built-in Turntable Service Checklist
  report.js              plain-text draft report
  csv.js                 survey CSV parse / export / template

  -- platform + persistence --
  db.js                  IndexedDB: answers, surveys, questions, photos
  settings.js            localStorage preferences
  state.js               app state + every mutation; the only writer to db.js
  images.js              downscale captures before storage
  voice.js               Web Speech API wrapper
  safetyPrint.js         Take 5 A4 layout -> platform print dialog
  ui.js                  element helper, icons, snackbars, dialogs, menus, downloads

  views/
    login.js             sign-in landing page
    shell.js             top bar, bottom nav, connectivity pill
    surveys.js           survey selection, import, export, template
    checklist.js         ribbon, progress, question list, section navigation
    report.js            draft report, copy, save
    settings.js          appearance, inspector, data, about
    diagnostics.js       support and troubleshooting screen
  components/
    logo.js              Australian Turntables mark, colour and mono variants
    questionCard.js      the four question renderings
    signature.js         signature pad + serialisation + SVG rendering

fonts/                   self-hosted brand typefaces (latin subset)
icons/                   PWA icons plus the brand symbol and lockup SVGs

test/logic.test.mjs      runnable self-check for the ported logic
docs/                    this documentation set
```

The mapping to the specification's recommended structure:

| Specification layer | Here |
|---|---|
| User interface | `js/views/*`, `js/components/*`, `css/app.css` |
| Business logic | `js/logic.js`, `js/safety.js`, `js/seeder.js`, `js/report.js`, `js/csv.js` |
| API client | *absent by design* — see below |
| Authentication | `js/auth.js` + `js/views/login.js` (client-side gate only); real control is a hosting concern — see `FEATURE-MATRIX.md` |
| Offline storage | `js/db.js`, `js/settings.js` |
| Synchronisation engine | *absent by design* — see below |
| Service worker | `sw.js` |
| Device capability layer | `js/voice.js`, `js/images.js`, `js/safetyPrint.js`, the media rows in `questionCard.js` |

### Where a backend would attach

`js/state.js` is the only module that writes to `js/db.js`. Adding server
persistence means:

1. A new `js/api.js` holding the authenticated `fetch` calls.
2. A new `js/sync.js` that reads pending records from `db.js` and pushes them.
3. A `syncState` field per answer (`pending` / `synced` / `failed`) added in a
   bumped `DB_VERSION` in `db.js`.
4. Calls added to the mutators in `state.js` — no view changes, because views
   already re-render from state.

Answers already carry a stable unique id (the question id, scoped by survey id)
and a `timestamp`, so a retried upload is naturally idempotent, as
specification section 8 requires.

## No build step

Native ES modules, served as-is. There is no npm install, no bundler, no
transpiler, no `node_modules`, and no third-party runtime code of any kind —
the only vendored assets are two open-licence typefaces. Consequences:

* Deployment is "copy the folder to a web server".
* The whole payload is roughly 500 KB: ~200 KB of application code and CSS,
  ~170 KB of brand typefaces (latin subset), ~85 KB of icons and logo. It is
  fetched once and then served from the service-worker cache, so it is well
  inside the mobile-network budget in specification section 21.
* There is no supply chain to audit or patch, and no recurring licence cost
  unless the Acumin substitution in `BRAND-COMPLIANCE.md` is taken up.
* The trade-off: no compile-time type checking. `test/logic.test.mjs` covers the
  logic that would otherwise rely on it, and the code is plain, commented ES2022.

If the project later grows enough to want a bundler, the business logic modules
are already DOM-free and import-clean, so they move without edits.

## Rendering model

No framework. Views own a DOM subtree and re-render it:

* Coarse changes (survey switched, checklist reloaded, section changed) —
  `app.js` re-renders the whole active view.
* Fine changes (one answer edited) — the checklist view replaces only that
  question's card.

A card is deliberately **not** replaced while it owns live state: a focused text
field, the sign-off card with its signature canvas, or a card holding a video
capture the technician has not saved. Those update their own DOM. This is the
one piece of intentional complexity in the UI layer and the comments in
`views/checklist.js` say why.

## Persistence

| Data | Store | Why |
|---|---|---|
| Answers (status, notes, ticks, signature, timestamps) | IndexedDB `answers`, keyed by question id | Structured, unbounded, must survive restarts |
| Surveys and their questions | IndexedDB `surveys`, `questions` (indexed by `surveyId`) | Mirrors the Room tables one-for-one |
| Photos | IndexedDB `photos` (indexed by `questionId`) | Binary blobs; IndexedDB is the only store that takes them |
| Preferences (theme, inspector, site id, current survey, seed version, last position) | localStorage | Tiny, synchronous read at first paint, the direct analogue of DataStore |

`DB_VERSION` is 1. Schema changes bump it and add an upgrade branch in
`js/db.js`; the comment there states the rule that no store may be dropped
without migrating its data out first. A service worker update never touches
either store, so a release cannot destroy field data.

`navigator.storage.persist()` is requested at start-up so the browser does not
evict records under storage pressure. Diagnostics reports the result.

## Offline behaviour

The app is offline-first, not offline-tolerant: nothing it does requires a
network. The service worker precaches the entire shell on install, then answers
navigations from cache. Launching with the radio off is identical to launching
online.

Because there is no server, the flow in specification section 8 collapses to its
right-hand branch — every operation is "store locally, mark complete". The UI
still shows connectivity state (an **Offline** pill in the top bar, and a
snackbar on transition) because technicians need to know, and Diagnostics
reports "Pending synchronisation items: 0 (no backend configured)" so the
number is explicit rather than missing.

## Updates

1. A release bumps `CACHE_VERSION` in `sw.js` and `BUILD` in `js/version.js`.
2. The browser fetches the new `sw.js`; it installs and precaches in the
   background, then waits.
3. `app.js` detects the waiting worker and shows an "Update Now / Later" banner.
4. "Update Now" posts `SKIP_WAITING`; the new worker activates, deletes old
   caches, claims clients, and the page reloads once.
5. IndexedDB and localStorage are untouched, so in-progress work survives.

The app also calls `registration.update()` whenever it returns to the
foreground, so an installed Home Screen app notices releases without being
force-quit.

## Security posture

* No API keys, tokens or connection strings exist in the source. The one
  confidential value is the SHA-256 of the shared sign-in credential in
  `js/auth.js`, committed by necessity because the check runs client-side. It is
  a deterrent, not a secret that holds under attack.
* The sign-in gate is enforced in `paint()` in `js/app.js` and can be bypassed
  by anyone with developer tools. It is documented as such everywhere it
  appears, so nobody plans around a guarantee it does not give.
* No data leaves the device, so there is no transport to intercept beyond the
  static asset download over HTTPS.
* No `eval`, no `innerHTML` of untrusted input: every value interpolated into
  markup goes through `esc()` in `js/ui.js`, including CSV-imported question
  text and technician notes.
* Lost or stolen device: local data is protected only by the device passcode and
  browser profile. Mitigations available without code changes — device
  encryption and MDM policy, and the hosting gate forcing re-authentication.
  Reset Checklist clears every answer and photo. There is no company data on the
  device beyond the current job.
* Departing employees: revoke the account in the identity platform fronting the
  host. The app itself grants no access to anything.
