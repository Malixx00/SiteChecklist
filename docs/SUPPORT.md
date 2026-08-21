# Administration and Support

Specification sections 18, 19, 20, 28.10.

## Getting information out of a device

**Settings → Diagnostics → Copy Diagnostics.** The technician pastes the result
into a message. It reports the version and build, inspector and site id,
connectivity, counts of saved answers and photos, storage used against quota,
storage persistence, launch mode (installed vs browser tab), service worker
state, platform, browser, and the microphone/camera permission states.

It deliberately contains **no** password, answer text or photos. It does report
which shared account is signed in and when that session ends, which is what
support needs. (The app holds no API tokens at all — it calls no services.)

## Sign-in

The app opens on a sign-in screen. The credentials are **shared across the whole
service team** and are the same on every device:

```text
Username: ATCUSER
Password: ATC1234
```

A session lasts 12 hours, then the app asks again. **Settings → Account** shows
who is signed in and when the session ends. Signing out clears only the
session — answers and photos stay on the device.

### What this gate does and does not do

It stops someone who is handed the URL from wandering into a live safety
checklist. It is **not** access control:

* The check runs in the browser, so anyone with developer tools can bypass it.
* The credential is shared, so it cannot tell you who completed a checklist,
  and it cannot be revoked for one person.
* Everyone must be told the same password, so it leaks by design over time.

The real control is the hosting gate in `DEPLOYMENT.md`, which authenticates
company accounts before the app is even served. Treat the sign-in screen as a
second, weaker door — useful, not sufficient. Raised again in
`FEATURE-MATRIX.md` section 5.

### Rotating the credentials

The password is not stored in the source; its SHA-256 hash is. To change it:

1. Generate the new hash:

   ```bash
   python -c "import hashlib;print(hashlib.sha256('NEWUSER:NEWPASS'.encode()).hexdigest())"
   ```

2. Put the result in `CREDENTIAL_HASH` in `js/auth.js`, and update
   `EXPECTED_USER` if the username changed.
3. Bump `APP_VERSION`/`BUILD` and `CACHE_VERSION` per `DEPLOYMENT.md`, then
   deploy.
4. Signed-in devices keep working until their 12-hour session lapses. To cut
   everyone off immediately, also change `SESSION_KEY` in `js/auth.js` — that
   invalidates every stored session at once.

Hashing only stops the password being read out of "view source". Anyone with
the file can still test guesses against it offline, so rotate on a schedule and
whenever someone leaves the service team.

## Common issues

**"The app won't install on my iPhone."**
Chrome and Firefox on iOS cannot install web apps. It must be Safari:
Share → Add to Home Screen.

**"It opens in a browser with an address bar."**
It was opened from a bookmark or a link rather than the Home Screen icon.
Reinstall per `INSTALL.md` and launch from the icon.

**"It keeps asking me to sign in."**
Sessions last 12 hours by design. If it is more often than that, the browser is
clearing site data between launches — check **Diagnostics → Storage
persistence** and whether they are launching from the Home Screen icon rather
than a private-browsing tab.

**"I signed out and lost my job."**
Signing out does not delete anything. Sign back in — **Diagnostics → Saved
answers** will confirm the records are still there.

**"My answers are gone."**
Check Diagnostics → *Saved answers*. If it is 0 on an iPhone that has not been
used for a week or more, iOS evicted the site data — see `FEATURE-MATRIX.md`
section 4. If *Launch mode* reads "Browser tab", the technician may be in a
different browser or a private window, which is a separate storage area.
Reset Checklist also clears everything, by design.

**"The mic button is greyed out."**
Diagnostics → *Voice dictation*. Firefox has no Web Speech support. If it reads
Supported but the button is still disabled, check
*Permission: microphone* — if "denied", the technician must re-enable it in the
browser's site settings; the app cannot re-prompt.

**"Dictation says it needs a connection."**
Most browsers do speech recognition in the cloud. Type the note when offline.

**"The PDF export just opens a print dialog."**
That is correct. Choose "Save as PDF" (Windows: Microsoft Print to PDF; iOS:
pinch out on the preview, then Share → Save to Files). Browsers have no PDF
writing API — see `FEATURE-MATRIX.md`.

**"Copy to Clipboard does nothing."**
Some browser policies block clipboard writes. Use **Save as .txt** instead, or
select the report text directly — it is selectable.

**"I'm not seeing the new version."**
The banner appears on the next launch or when the app returns to the
foreground. Force-quit and reopen. Confirm the deployment actually bumped
`CACHE_VERSION` in `sw.js` (see `DEPLOYMENT.md`).

**"A photo didn't save."**
The app says so explicitly when a write fails, and tells the technician the
photo was not recorded. Almost always device storage — check Diagnostics →
*Storage used*.

## Managing surveys

Surveys are per-device. There is no central library, because there is no
backend.

* The **Turntable Service Checklist** is built into the app and re-seeded on
  every launch. It cannot be deleted, and editing it means changing
  `js/seeder.js` and bumping `SEED_VERSION`.
* Any other survey is distributed as a CSV. Email it, or drop it on a share;
  each technician imports it via **Import Survey**.
* The 17-column format is documented by **Download CSV Template**, and is
  unchanged from the Android app — existing spreadsheets still work.
* The mandatory Take 5 safety section is **not** in the CSV and cannot be
  imported, exported, edited or skipped. It is prepended to every survey in
  code, on purpose.

## Error-message policy

Specification section 18. Every user-facing failure states what failed, whether
the data was kept, and what to do next. Never a bare "Error occurred". For
example:

> Could not save that photo on this device. It has NOT been recorded — check
> available storage and retake it.

If you find a message that does not meet that bar, treat it as a bug.

## Logging

Specification section 20. With no backend there is nowhere to ship logs, so
diagnostics are pull-based (Copy Diagnostics) rather than push-based.
Unexpected failures are written to the browser console with context, which is
readable over USB debugging on Android and via a Mac with Safari Web Inspector
on iOS.

If central logging becomes a requirement it needs the backend described in
`ARCHITECTURE.md` — at which point correlation ids, user ids, endpoints and
error categories should be added at the `js/api.js` seam.

## Onboarding a new technician

1. Confirm they have completed turntable service training. The sign-in gate
   assumes this check happened here, not in the app.
2. Send the production URL (or the printed QR code) and `INSTALL.md`.
3. Give them the shared credentials verbally or through the company password
   manager — not in the same message as the URL.
4. They install, open and sign in.
5. **Settings → Inspector name** — their name; **Site ID** as needed per job.
6. The Turntable Service Checklist is already selected; they can start.

## Offboarding

Revoke the company account in the identity platform fronting the host, **and
rotate the shared technician password** (above) — a departing technician knows
it, and it cannot be revoked per person. If the device is not being
returned, wipe it through MDM — the current job's answers and photos are the
only company data on it.
