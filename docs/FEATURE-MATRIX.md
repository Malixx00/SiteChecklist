# Feature Compatibility Assessment

Specification section 3. Audit of `SiteReporter` (Android) against the PWA
replacement in this folder.

## 1. Existing application audit

| Aspect | Finding |
|---|---|
| Framework / language | Kotlin 1.9, Jetpack Compose (Material 3), `compileSdk` 34, `minSdk` 26 |
| Architecture | MVVM — Compose UI → ViewModel (`StateFlow`) → Repository → Room / DataStore |
| Dependency injection | Hilt |
| Backend services | **None.** No HTTP client, no API client, no server SDK anywhere in the source |
| APIs called | **None** |
| Database | Room (SQLite), DB `site_reporter.db` v3, tables `answers`, `surveys`, `survey_questions` |
| Authentication | **None.** The app opens straight into the checklist |
| Local storage | Room + Preferences DataStore (`site_reporter_prefs`) |
| External libraries | AndroidX Core/AppCompat/Activity, Compose BOM, Lifecycle, Navigation, Hilt, Room, DataStore, Coroutines — all first-party AndroidX/JetBrains |
| Third-party services | **None** |
| Declared permissions | `RECORD_AUDIO`; `WRITE_EXTERNAL_STORAGE` (maxSdk 28); optional camera feature |
| Android-specific APIs | `SpeechRecognizer`, `MediaStore`, `ACTION_IMAGE_CAPTURE` / `ACTION_VIDEO_CAPTURE` intents, `android.graphics.pdf.PdfDocument`, `ClipboardManager`, Storage Access Framework (`CreateDocument` / `OpenDocument`) |
| Hardware interfaces | Camera and microphone only |
| Network requirements | **None.** The app is fully functional with the radio off |
| Background processing | None. Coroutines scoped to the ViewModel; no `WorkManager`, no services |
| File system access | Via SAF document pickers only (CSV import/export, PDF export) |
| Camera usage | Launches the system camera app; writes to `MediaStore` `DCIM/SiteReporter`; only a boolean flag is stored on the record |
| Location / GPS | **Not used** |
| Bluetooth / BLE | **Not used** |
| NFC | **Not used** |
| USB / serial | **Not used** |
| Push notifications | **Not used** |
| PDF / document handling | Generates a one-page A4 "Take 5" PDF via `PdfDocument`; exports/imports survey CSV |
| Barcode / QR scanning | **Not used** |
| Integrations with other company systems | **None** |

### Consequence for specification sections 10 and 12

The Android app has no backend, no API and no authentication. There is nothing
to migrate onto an authenticated API, and no data leaves the device. Building a
backend, an Entra ID integration and a synchronisation engine would be new
product scope, not migration, so this delivery does **not** invent them.

What is delivered instead:

* The PWA is offline-first by design, exactly as the Android app was.
* A **client-side sign-in gate** with a shared hard-coded credential, added at
  the customer's request so only trained technicians reach the checklist. It is
  a deterrent, not access control — the check runs in the browser and developer
  tools bypass it. Detail and rotation in `docs/SUPPORT.md`.
* Access control proper remains a **hosting** decision. Publish the static site
  behind a gate that already authenticates company accounts — Entra ID
  Application Proxy, Azure Static Web Apps with Entra auth, Cloudflare Access,
  or an IIS/nginx site requiring Windows/SAML auth. No application code changes
  are required, because the app calls no APIs.
* `docs/ARCHITECTURE.md` marks the single seam where a future sync module would
  attach, so adding a backend later does not mean a rewrite.

**Decision required from the business:** confirm the hosting gate (section
"Open decisions" below) before production release. The in-app sign-in does not
satisfy specification section 10 on its own.

## 2. Compatibility matrix

Risk: **L**ow / **M**edium / **H**igh.

| Existing feature | Current implementation | PWA supported | Changes required | Risk |
|---|---|---|---|---|
| Survey list, select, start | Compose + Room | Yes | IndexedDB `surveys` / `questions` stores | L |
| Built-in "Turntable Service Checklist" seed | `SurveySeeder` (Kotlin data) | Yes | Ported verbatim to `js/seeder.js`, same ids and `SEED_VERSION` | L |
| Mandatory Take 5 safety section | `SafetySection` (code, not DB) | Yes | Ported verbatim to `js/safety.js`, still prepended to every survey | L |
| Question types (heading, Yes/No, done-only, tick row, tick options, sign-off) | Compose `QuestionCard` | Yes | `js/components/questionCard.js` | L |
| Section status / progress rules | `ChecklistLogic` | Yes | Ported to `js/logic.js`, covered by `test/logic.test.mjs` | L |
| Section ribbon with per-section badges | Compose `SectionRibbon` | Yes | CSS scroller | L |
| Notes per question | Room `answers.notes` | Yes | IndexedDB, debounced write | L |
| Tick options persisted as pipe-separated string | Room `answers.checkedOptions` | Yes | Same encoding | L |
| Answer toggling (tap the selected state to clear) | ViewModel | Yes | Same behaviour | L |
| Signature capture | Compose `Canvas` + drag gestures | Yes | `<canvas>` + Pointer Events; **identical serialisation format** | L |
| Sign-off name + timestamp | Room | Yes | Same | L |
| Draft report generation | `ReportGenerator` | Yes | `js/report.js`; identical layout, plus a `Ticked:` line (see Deviations) | L |
| Copy report to clipboard | `ClipboardManager` | Yes | `navigator.clipboard`, with a `execCommand` fallback and a "Save as .txt" alternative | L |
| Reset checklist | Room delete-all | Yes | Clears `answers` **and** stored photos | L |
| Theme light / dark / system | DataStore + Material 3 | Yes | CSS custom properties on `<html data-theme>` | L |
| Sun mode | Existed in the data layer with **no UI** | Yes | Now a Settings toggle, and a maximum-contrast white ground rather than the old cream (see Deviations) | L |
| Inspector name, Site ID | DataStore | Yes | localStorage | L |
| Survey CSV import | SAF `OpenDocument` + `SurveyCsvParser` | Yes | `<input type="file">`; same 17 columns; multi-line-field bug fixed (see Deviations) | L |
| Survey CSV export / template download | SAF `CreateDocument` | Yes | `Blob` + `<a download>`. The OS chooses the folder rather than the user picking it up front | L |
| Camera capture | `ACTION_IMAGE_CAPTURE` → `MediaStore` | **Partial** | System camera via `<input capture>`. Cannot write to the device gallery; photos are instead **downscaled and stored with the record** in IndexedDB, with thumbnails and delete. Net improvement: evidence is attached, not just flagged | M |
| "Mark Photo/Video as Taken" flag | Room boolean | Yes | Retained, for technicians who shoot with the native camera app | L |
| Video capture | `ACTION_VIDEO_CAPTURE` → `MediaStore` | **Partial** | Opens the system camera and sets the flag. The clip is **not** copied into browser storage (one 1080p clip can exceed the whole storage quota); a "Save to device" button is offered instead | M |
| Voice dictation into notes | `SpeechRecognizer` (on-device where available) | **Partial** | Web Speech API. Chrome/Edge (Android, Windows, macOS) and Safari iOS 14.5+. Firefox has no support — the mic button renders disabled, typing is unaffected. Recognition is cloud-based on most browsers, so it needs a connection | M |
| Take 5 PDF export | `android.graphics.pdf.PdfDocument` | **Partial** | Browsers have no PDF drawing API. The same one-page A4 layout is rendered as HTML and sent to the platform print dialog, where every target OS offers Save/Print to PDF (iOS: Share → Save to Files). Filename must be confirmed in the print dialog rather than pre-filled | M |
| Android back button / nav graph | Navigation Compose | Yes | Hash routing; the hardware/browser Back button works | L |
| Install without app store | APK sideload | Yes | This is the point of the migration | L |
| Sign-in | **None** — the Android app opened straight into the checklist | **New** | Shared credential checked client-side, 12-hour session, sign-out in Settings. Weak by construction; see above | M |
| Brand identity | Material 3 Indigo, system fonts | **New** | Australian Turntables palette, typography and logo per the 2025 style guide. See `BRAND-COMPLIANCE.md` | L |
| Automatic updates | Manual APK | **New** | Service worker + in-app "Update Now" prompt | L |

### Not applicable (absent from the Android app)

Location/GPS, Bluetooth/BLE, NFC, USB/serial, background services, Wi-Fi
configuration, push notifications, barcode/QR scanning, Android Intents to other
apps, and any company-system integration. Specification sections 15, 16 and the
Bluetooth/NFC/USB parts of 17 therefore have nothing to migrate. Nothing in the
PWA needs to be retained as a native Android component — **no Category C
features exist**.

## 3. Deliberate deviations from the Android build

All are additions or bug fixes, never removals. Each is reversible.

1. **Photos are attached to the record.** Android saved captures to the gallery
   and stored only a boolean. A browser cannot write to the gallery, so the
   photo would otherwise be unrecoverable. Photos are downscaled (1600 px,
   JPEG q0.8, ~20–600 KB) and stored in IndexedDB against the question.
   Specification section 14 requires exactly this.
2. **`Ticked:` line in the draft report.** The Android report captured checkbox
   ticks but never printed them, losing field observations. Remove the block in
   `js/report.js` marked in the header comment to revert.
3. **Multi-line CSV fields now re-import.** The Android parser split on
   newlines before handling quotes, so any exported row whose description
   contained a newline failed to re-import. `js/csv.js` tokenises the whole
   document. Verified by a full export→import round trip in the test suite.
4. **Sun mode has a UI, and a new palette.** The setting existed in
   `SettingsRepository` and the theme but no screen exposed it. Specification
   section 7 requires outdoor readability, so it is now a Settings toggle. The
   ground changed from cream `#FFFDE7` to pure white with black text, which is
   both brand-compliant and higher contrast in direct sun.
5. **Diagnostics screen** (specification section 19) — new, no Android
   equivalent.
6. **"Save as .txt" for the report** — a fallback for the case where clipboard
   access is blocked by browser policy.
7. **Report date format is fixed to `21 August 2026`.** Android used the device
   locale, so the same report read differently on a US-locale phone. The report
   is a company document; the format is now deterministic.

## 4. Known platform differences (specification section 28.14)

| Behaviour | Android / Chrome | iPhone / iPad (Safari Home Screen) | Windows desktop |
|---|---|---|---|
| Install | Chrome offers "Install app" | Share → Add to Home Screen (manual; no prompt) | Edge/Chrome install button in the address bar |
| Voice dictation | Supported | Supported (iOS 14.5+); may require a connection | Supported in Chrome/Edge, not Firefox |
| Camera capture | Opens the camera app | Opens Camera / Photo Library sheet | Opens file picker; webcam via the OS camera app |
| PDF export | Print dialog → Save as PDF | Print sheet → pinch out → Share → Save to Files | Print dialog → Microsoft Print to PDF |
| Saving CSV / txt | Goes to Downloads | Downloads to Files app | Goes to Downloads |
| Storage eviction | Persistent storage usually granted | **iOS may evict site data after ~7 days of no use** — see below | Persistent storage usually granted |
| Update prompt | Works | Works, but a Home Screen app may need to be reopened to notice | Works |

### iOS storage eviction — the one real risk to field data

Safari can clear a Home Screen web app's storage after roughly seven days
without use. The app calls `navigator.storage.persist()` at start-up, which
Apple grants to installed Home Screen apps in current iOS versions, and
Diagnostics reports whether it was granted. Mitigations to enforce
operationally:

* Technicians should complete and export a job in the same session — the app
  never needs to hold a job open for days.
* Diagnostics shows **Storage persistence**; if it reads "Best-effort" on an
  iPhone, treat that device as session-only and escalate.
* Include "open the app at least weekly" in the field instructions.

This is documented rather than solved because no client-side API can override
it. A backend would remove the risk entirely — that is the strongest technical
argument for adding one later.

## 5. Open decisions for the business

1. **Hosting gate / authentication.** Which platform fronts the site (Entra ID
   App Proxy, Azure Static Web Apps + Entra, Cloudflare Access, internal IIS)?
   Required before production release.
2. **Photo retention.** Photos now live on the device until the checklist is
   reset. Confirm whether the business wants them uploaded somewhere — that
   requires a backend.
3. **Report `Ticked:` line.** Approve or revert (deviation 2).
4. **Android APK retirement.** Per specification section 26 stage 8, keep it
   installed until field acceptance is signed off.
5. **Sign-in model.** The shared credential cannot say who completed a
   checklist. If per-technician attribution is an audit requirement, that needs
   the identity platform and a backend. Today the report carries whatever the
   technician typed into "Inspector name", which is unverified.
6. **Brand sign-off.** Four items in `BRAND-COMPLIANCE.md` section 7 need the
   brand team: the Acumin licence, two accessibility shades, the status-colour
   convention, and the application name.
