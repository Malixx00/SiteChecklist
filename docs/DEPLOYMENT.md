# Deployment and Operations

Specification sections 22, 24, 28.

## What gets deployed

The contents of this folder, as static files. No build, no server runtime, no
database and no environment variables. The one confidential value is the
credential hash in `js/auth.js` — see **Secrets in source** below.

```text
index.html  manifest.webmanifest  sw.js  css/  js/  icons/  fonts/
```

`docs/` and `test/` may be deployed or omitted; they contain nothing sensitive.

## Requirements of the host

| Requirement | Why |
|---|---|
| **HTTPS** (or `localhost`) | Service workers, and therefore offline mode and updates, do not run on plain HTTP |
| Serves `.js` as `text/javascript` | ES modules are rejected under the wrong MIME type |
| Serves `.webmanifest` as `application/manifest+json` | Chrome install prompt |
| `sw.js` served from the **site root of the app scope** | A worker cannot control paths above its own directory |
| `sw.js` and `index.html` sent with `Cache-Control: no-cache` | Otherwise a CDN can pin users to an old release for its TTL |
| Long cache lifetime for `css/`, `js/`, `icons/`, `fonts/` is fine | The service worker's versioned cache is the real cache |
| Serves `.woff2` as `font/woff2` | Brand typefaces are self-hosted |
| Serves `.svg` as `image/svg+xml` | The brand logo assets are SVG |

### IIS

Add to `web.config` in the app folder:

```xml
<configuration>
  <system.webServer>
    <staticContent>
      <remove fileExtension=".webmanifest" />
      <mimeMap fileExtension=".webmanifest" mimeType="application/manifest+json" />
      <remove fileExtension=".mjs" />
      <mimeMap fileExtension=".mjs" mimeType="text/javascript" />
      <remove fileExtension=".woff2" />
      <mimeMap fileExtension=".woff2" mimeType="font/woff2" />
    </staticContent>
    <httpProtocol>
      <customHeaders>
        <add name="X-Content-Type-Options" value="nosniff" />
        <add name="Referrer-Policy" value="same-origin" />
      </customHeaders>
    </httpProtocol>
    <location path="sw.js">
      <system.webServer>
        <httpProtocol>
          <customHeaders><add name="Cache-Control" value="no-cache" /></customHeaders>
        </httpProtocol>
      </system.webServer>
    </location>
  </system.webServer>
</configuration>
```

### nginx

```nginx
location = /sw.js       { add_header Cache-Control "no-cache"; }
location = /index.html  { add_header Cache-Control "no-cache"; }
location ~* \.webmanifest$ { types { application/manifest+json webmanifest; } }
```

### Azure Static Web Apps

Works with no configuration beyond `staticwebapp.config.json` for the
`Cache-Control` headers above. This is also the shortest path to the
authentication gate — Entra ID is a built-in provider, so the access
requirement in specification section 10 is satisfied by configuration rather
than code.

## Access control

The app ships an in-app sign-in screen with a **shared, hard-coded technician
credential** (`js/auth.js`, credential in `SUPPORT.md`). Understand what it is
before relying on it: the check runs in the browser, so it is a "keep untrained
people out" gate, not access control. Developer tools bypass it in seconds, and
a shared credential cannot identify or be revoked per person.

**It is not a substitute for the hosting gate.** The specification requires that
knowing the URL is not enough, and that means authenticating before the app is
served. Put the site behind one of:

* **Azure Static Web Apps + Entra ID** — simplest; `allowedRoles` on the route.
* **Entra ID Application Proxy** in front of an internal IIS site.
* **Cloudflare Access** with the company identity provider.
* An internal-only site requiring Windows Integrated Authentication.

All are configuration. Revoking a departing employee's company account revokes
app access with no deployment.

With a hosting gate in place, the in-app sign-in becomes a second door: useful
on a shared device left signed in to Windows, redundant otherwise. It can be
removed by deleting the `isSignedIn()` branch in `js/app.js`.

### Secrets in source

`js/auth.js` contains a SHA-256 hash of the shared credential. That is a
deliberate, documented exception to "no secrets in frontend JavaScript"
(specification section 11), made because the customer asked for a hard-coded
login. Nothing else in the repository is confidential: no API keys, no tokens,
no connection strings. Rotation steps are in `SUPPORT.md`.

## Environments

| Environment | URL | Notes |
|---|---|---|
| Development | `https://fieldapp-dev.company.com` | Or just `python -m http.server` locally |
| Testing / staging | `https://fieldapp-test.company.com` | Used for field trials, specification section 26 stage 6 |
| Production | `https://fieldapp.company.com` | |

Each origin has its own IndexedDB and localStorage, so a test environment
cannot touch production data — browser origin isolation enforces this, there is
no shared database to misconfigure.

## Local development

```bash
cd "Version 2 PWA"
python -m http.server 8123
```

Then open `http://localhost:8123`. `localhost` counts as a secure context, so
the service worker and install prompt both work.

**While editing**, the service worker will serve cached files and hide your
changes. In DevTools → Application → Service Workers, tick **Update on reload**
and **Bypass for network**. Or run this once in the console:

```js
(async () => {
  for (const r of await navigator.serviceWorker.getRegistrations()) await r.unregister();
  for (const k of await caches.keys()) await caches.delete(k);
  location.reload();
})();
```

Run the logic self-check before every commit:

```bash
node test/logic.test.mjs
```

## Releasing

1. Update `APP_VERSION` and/or `BUILD` in `js/version.js`.
2. Set `CACHE_VERSION` in `sw.js` to the same value as `BUILD`.
3. If you added or renamed a file under `js/`, `css/` or `icons/`, add it to the
   `SHELL` array in `sw.js` — otherwise it will not be available offline.
4. `node test/logic.test.mjs`.
5. Copy the folder to the host.
6. Verify: open the app, confirm the update banner appears, tap **Update Now**,
   and check **Settings → About** shows the new version.

Steps 1–3 are the only manual coupling in the project. The comment at the top of
`js/version.js` states it, and step 6 catches a miss immediately.

## Database migrations

There is no server database. The client schema is `DB_VERSION` in `js/db.js`
(currently 1). To change it: bump the number, add an `if (event.oldVersion < n)`
branch in `onupgradeneeded`, and never drop a store without first migrating its
records. Preferences are schemaless key/value in localStorage.

## Third-party dependencies and recurring costs

**No recurring cost, no runtime dependency.** No npm packages, no CDN, no
webfont service, no analytics, no SDKs, no telemetry.

Two open-licence typefaces are vendored into `fonts/` (Montserrat and Barlow
Condensed, both SIL OFL 1.1 — redistribution permitted). If the company's Adobe
licence is used to substitute the specified Acumin face, that subscription
becomes the one recurring cost; see `BRAND-COMPLIANCE.md` section 4.

The only other recurring costs are the HTTPS hosting and the identity platform
the company already pays for.

This also means there is no dependency-patching treadmill: the app's attack
surface is the browser and the web server.

## Source control

Commit this folder as-is: no `.env`, no API keys, no generated artefacts to
exclude, no `node_modules` to ignore.

The exception is the credential hash in `js/auth.js`, which is committed
because the app has to check it client-side. Treat the repository as
need-to-know, and rotate the credential if repository access widens.
