# Installing Site Reporter

Specification section 23. Hand this page to field staff.

> **Application address:** `https://fieldapp.company.com`
> *(placeholder — replace with the production URL before distributing, and
> regenerate the QR code below)*

## Android phone or tablet

1. Open the link above in **Chrome**.
2. Tap **Install app** when Chrome offers it — or open the **⋮** menu and choose
   **Add to Home screen**.
3. Confirm.
4. Open **Site Reporter** from your Home Screen.
5. Sign in (see **Signing in** below).
6. Set your name: **Settings → Inspector name**.

## iPhone or iPad

You must use **Safari**. Chrome on iOS cannot install web apps.

1. Open the link above in **Safari**.
2. Tap the **Share** button (the square with an arrow).
3. Scroll down and tap **Add to Home Screen**.
4. Tap **Add**.
5. Open **Site Reporter** from your Home Screen.
6. Sign in (see **Signing in** below).
7. Set your name: **Settings → Inspector name**.

Open the app at least once a week. If an iPhone is left unused for a long
period, iOS can clear stored app data.

## Windows PC or laptop

1. Open the link above in **Microsoft Edge** or **Google Chrome**.
2. Click the install icon in the address bar (or **⋯ → Apps → Install this
   site as an app**).
3. The app opens in its own window and appears in the Start menu.

You can also just use it in the browser tab — everything works the same.

## QR code

Generate one once the production URL is fixed. Any of these work:

* Edge / Chrome: open the site, then **⋯ → Share → QR code**, and save the image.
* PowerShell, no internet required:

  ```powershell
  Install-Module QRCodeGenerator -Scope CurrentUser
  New-PSOneQRCodeURI -URI 'https://fieldapp.company.com' -OutPath .\site-reporter-qr.png
  ```

Print it on the inside of the service-van toolbox lid and on the induction
sheet. Store the final image next to this file as `install-qr.png`.

## Signing in

The app asks for a username and password. Your Team Leader will give you the
shared technician credentials — they are the same on every device.

* The username is not case sensitive.
* You stay signed in for **12 hours**, so you sign in once per shift.
* Signing out never deletes your work. Answers and photos stay on the device.

**Only sign in if you have completed turntable service training.** Do not share
the credentials outside the service team.

## First run

The **Turntable Service Checklist** is built in and already selected — you can
start work immediately. The **Safety** (Take 5) section always comes first and
must be completed before service work begins.

## Working offline

The app works with no signal. Everything you enter is saved on the device the
moment you enter it. An orange **Offline** badge appears in the title bar so you
know the state; nothing else changes.

Voice dictation is the one feature that usually needs a connection — type the
note instead when you have no signal.

## Updates

Updates arrive by themselves. When a new version is ready a bar appears at the
bottom: tap **Update Now**. Your current checklist is not affected. You never
need to reinstall.

## If something goes wrong

Go to **Settings → Diagnostics**, tap **Copy Diagnostics**, and paste it into
your message to engineering. It contains no passwords and none of your answer
text.
