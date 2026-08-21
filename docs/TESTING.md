# Test Results and Remaining Test Plan

Specification section 25.

## Status summary

**Automated logic tests: pass. Desktop Chromium behavioural verification: pass.
Physical Android and iOS device testing: NOT DONE — it cannot be performed from
the development environment and is a release gate.**

Do not treat this build as accepted until the device matrix below is signed off
on real hardware.

## 1. Automated logic self-check — PASS

```bash
node test/logic.test.mjs
```

```text
  ok  section with only optional questions needs every question settled
  ok  required questions gate completion, optional ones do not
  ok  progress counts each photo and video requirement as its own item
  ok  safety section is built with the expected shape
  ok  default survey seeds unique ids and sane defaults
  ok  CSV export/import round-trips every field
  ok  CSV parser skips unusable rows and keeps blank-column defaults
  ok  template CSV parses back to two rows
  ok  report header reflects completion state
  ok  signature data round-trips
  ok  voice text inserts at the caret with single spaces
  ok  section titles come from the section id

12 checks passed
```

The CSV round trip runs the full 47-question built-in survey through
export → import and compares every field, which is what caught the multi-line
description bug carried over from the Android parser.

## 2. Desktop Chromium behavioural verification — PASS

Run against `http://localhost:8123`, 375 x 812 mobile viewport.

| Check | Result |
|---|---|
| Cold start seeds the default survey and renders 15 sections | Pass — Safety + 14 service sections |
| Safety section renders all 50 items (44 scored + headings + export button) | Pass |
| Section ribbon shows per-section badges (`0/44`, `0/6`, …) | Pass |
| Tapping **Done** selects, updates ribbon `3/44` and the progress bar | Pass |
| Bare checkbox tick rows toggle | Pass |
| **Mark Photo as Taken** flips to **Photo Taken** | Pass |
| Answers written to IndexedDB `answers` with correct status and flags | Pass — verified by reading the store back |
| Note typing persists (debounced write) | Pass |
| Section navigation switches content and top-bar subtitle | Pass |
| Export button appears **only** on the safety section | Pass |
| Draft report renders with correct status header and incomplete-section list | Pass |
| Report date format is `21 August 2026` regardless of browser locale | Pass |
| Incomplete banner counts mandatory sections only | Pass |
| Settings renders; Light/Dark/System switches `data-theme` | Pass |
| Sun mode forces light and sets `data-sun="on"` | Pass |
| Diagnostics collects 26 rows including storage, permissions, platform | Pass |
| Survey list shows the built-in survey; Delete correctly withheld from it | Pass |
| Overflow menu offers Change Survey / Reset checklist | Pass |
| Sign-off card renders name input, signature canvas, Set to Now, Sign Off | Pass |
| Take 5 print layout builds — title, 35 question rows, sign-off block | Pass |
| Export filename is `Safety Checklist - Bay 3 - 2026-08-21` | Pass |
| Photo pipeline: capture → downscale → store → thumbnail → delete button | Pass — a 3000x2000 capture compressed 137 KB → 20 KB JPEG |
| Service worker registers and takes control | Pass |
| Console errors during the full run | **None** |

### Brand and sign-in verification (added in 2.2.0)

| Check | Result |
|---|---|
| Montserrat 400/600 and Barlow Condensed 600/700 italic load from `fonts/` | Pass |
| Body text renders in Montserrat; buttons, headings and tabs in the display face, italic uppercase | Pass |
| Top bar and ribbon render Independence `#425563`; `theme-color` meta matches | Pass |
| Dark theme ground `#10181F`, bar `#16202A`; `theme-color` follows | Pass |
| Sun mode forces a white ground with black text | Pass |
| Brand symbol renders in the top bar (mono white) | Pass |
| Full lockup renders on the launch screen, reversed to white | Pass |
| Done button: CG Blue `#0076A8` unselected → Spiro `#22C4FB` + 2px border selected | Pass |
| Not-started ribbon badge uses Jet Stream, not Flame (contrast) | Pass |
| Completion tick is Spiro on a white tab label | Pass |
| PDF export header carries the real lockup and brand type | Pass |
| Contrast: every rendered colour pair measured at ≥4.5:1, or ≥3:1 for icons | Pass — table in `BRAND-COMPLIANCE.md` |
| Correct credentials sign in; session written | Pass |
| Username is case-insensitive (`atcuser` accepted) | Pass |
| Wrong password rejected with an actionable message; stays on the gate | Pass |
| Wrong username rejected | Pass |
| Password reveal toggle works both ways | Pass |
| Session survives a reload and a relaunch | Pass |
| Expired session (>12 h) rejected and cleared | Pass |
| Malformed session value rejected rather than trusted | Pass |
| Sign out returns to the gate and clears the session | Pass |
| **Answers, notes and photos survive sign-out and sign-in** | Pass |
| Survey selection survives sign-out | Pass |
| Diagnostics reports the signed-in account and session end | Pass |
| Service worker precaches all 41 shell files, fonts and logos included | Pass |

## 3. Required device test matrix — OUTSTANDING

| Platform | Browser / mode | Required | Status |
|---|---|---|---|
| Android phone | Chrome browser | Yes | Not done |
| Android phone | Installed PWA | Yes | Not done |
| iPhone | Safari browser | Yes | Not done |
| iPhone | Home Screen PWA | Yes | Not done |
| Windows PC | Chrome | Yes | Not done |
| Windows PC | Edge | Yes | Not done |

Specification section 6 requires the installed Home Screen app to be tested on a
**physical iPhone**, not inferred from desktop Safari. That is the single highest
-risk gap in this delivery.

## 4. Scenario checklist for device testing

Work through this on each device in the matrix and record pass/fail.

**Sign-in**
1. Sign in with the shared credentials; confirm the app opens on the checklist.
2. Enter a wrong password; confirm the message is clear and nothing is lost.
3. Force-quit and relaunch; confirm you are still signed in.
4. Sign out from Settings, sign back in, and confirm a part-complete checklist
   is intact.
5. Leave the device overnight; confirm the app asks for sign-in again the next
   shift and that the previous job's data is still present.
6. Confirm **Settings → Account** shows the right account and session end time.

**Install and launch**
1. Install from the supplied URL following `INSTALL.md`.
2. Launch from the Home Screen icon — confirm no browser address bar
   (standalone mode).
3. Force-quit and relaunch — confirm the app returns to the same section.
4. Restart the device, relaunch — confirm answers are still present.

**Core capture**
5. Answer questions in the safety section; toggle a Done back off.
6. Enter a long note; confirm it survives leaving and returning to the section.
7. Tick checkbox options; confirm they appear in the draft report.
8. Draw a signature, set the timestamp, sign off; leave the section and return.
9. Complete every mandatory section; confirm the report header flips to
   ALL REQUIRED SECTIONS COMPLETE.

**Camera and voice**
10. Take a photo — confirm the thumbnail appears and survives a relaunch.
11. Take three photos on one question; delete one.
12. Deny the camera permission, then retry — confirm the message is actionable.
13. Dictate a note; confirm the text lands at the caret.
14. Deny the microphone permission — confirm the app explains it and typing
    still works.
15. Start dictation on one card, then tap the mic on another — confirm the
    session moves without an error toast.

**Offline and connectivity**
16. Enable flight mode, then cold-launch the app — confirm it opens normally.
17. Complete a full checklist entirely offline.
18. Confirm the orange **Offline** badge appears, and the snackbar on
    reconnection.
19. Restore the network, then restart the app — confirm nothing was lost.
20. Fill the checklist offline, force-quit mid-entry, relaunch — confirm the
    last answer is present.

**Export**
21. Export the Take 5 as PDF; save it and open the file.
22. Copy the draft report and paste it into email.
23. Save the report as `.txt`.
24. Export a survey to CSV, re-import it under a new name, confirm the question
    count matches.
25. Import a deliberately malformed CSV — confirm the error names the problem
    and changes nothing.

**Updates**
26. Deploy a build with a new `BUILD` / `CACHE_VERSION` while a checklist is
    part-complete.
27. Confirm the update banner appears; tap **Later**, keep working.
28. Tap **Update Now**; confirm the app reloads, **Settings → About** shows the
    new version, **and the part-complete checklist is intact**.

**Failure handling**
29. Take the web server offline and cold-launch the installed app — confirm it
    still opens from cache.
30. Fill the device storage close to full, then take a photo — confirm the
    failure message says the photo was not recorded.
31. Check **Diagnostics → Storage persistence** on each iPhone; anything other
    than "Granted" must be escalated (see `FEATURE-MATRIX.md` section 4).

**Brand rendering on device**
32. Confirm brand fonts load on the installed app with the device in flight
    mode — a system-font fallback means the `fonts/` cache did not populate.
33. Read the checklist in direct sunlight, with and without Sun mode, and
    confirm Done/N-A states are distinguishable at arm's length.
34. Ask a colour-blind technician (or use a simulator) to confirm answered vs
    unanswered is clear — every state has an icon, but verify it in practice.
35. Print the Take 5 to PDF and confirm the logo and headings render in brand
    type, not a fallback.

## 5. Field-user acceptance testing — OUTSTANDING

Specification section 26 stage 6. Release to a small group of technicians on the
test URL, over real jobs, and record bugs, performance problems, usability
problems, and iOS/Android-specific issues. Do not retire the Android APK until
this is signed off (stage 8).

Two questions to ask specifically, because both are judgement calls this build
made on the customer's behalf:

* Does **Spiro Disco Ball (cyan) reading as "done"** work for technicians used
  to green? The brand palette has no green — see `BRAND-COMPLIANCE.md`.
* Is the **12-hour sign-in session** the right length for real shifts?
