// Sign-in gate.
//
// ---------------------------------------------------------------------------
// READ THIS BEFORE RELYING ON IT
//
// This is a CLIENT-SIDE gate with a fixed shared credential. It stops an
// untrained person who reaches the URL from wandering into the checklist. It
// is NOT access control:
//
//   * The check runs in the browser, so anyone with developer tools can set
//     the session key directly and skip it.
//   * The credential is shared, so it cannot identify who did what, and
//     cannot be revoked for one person.
//   * Storing the hash below only stops the password being read straight out
//     of "view source". It does not make the gate secure - the hash is
//     verifiable offline by anyone who has the file.
//
// Specification sections 10 and 11 call for the company identity platform and
// no secrets in frontend JavaScript. The real control is the hosting gate
// described in docs/DEPLOYMENT.md; this sits in front of the app as a second,
// weaker door. See docs/SUPPORT.md for the credential and the rotation steps.
// ---------------------------------------------------------------------------

const SESSION_KEY = 'sitereporter.session';

/** How long a sign-in lasts. One shift, so a technician signs in once a day. */
const SESSION_HOURS = 12;

// SHA-256 of "ATCUSER:ATC1234". Rotate with the helper in docs/SUPPORT.md.
const CREDENTIAL_HASH = '5a54b463e94d4573a1e9dbfaacbea8973c7c48aec5474660ad87c4b3ab3c2761';

/** Username is shown back to the user, so it stays readable. */
export const EXPECTED_USER = 'ATCUSER';

async function sha256(text) {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * @returns {Promise<boolean>} true when the credentials match
 */
export async function signIn(username, password) {
  const supplied = `${(username || '').trim().toUpperCase()}:${password || ''}`;
  let hash;
  try {
    hash = await sha256(supplied);
  } catch (e) {
    // crypto.subtle needs a secure context (HTTPS or localhost).
    console.error('Cannot verify sign-in: WebCrypto unavailable', e);
    throw new Error('This browser cannot verify the sign-in. Open the app over HTTPS.');
  }
  if (hash !== CREDENTIAL_HASH) return false;

  writeSession();
  return true;
}

function writeSession() {
  const session = { at: Date.now(), user: EXPECTED_USER };
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch (e) {
    console.warn('Could not persist the session', e);
  }
}

/** True while a non-expired session exists. */
export function isSignedIn() {
  const session = readSession();
  if (!session) return false;
  const ageHours = (Date.now() - session.at) / 3_600_000;
  if (ageHours >= SESSION_HOURS || ageHours < 0) {
    signOut();
    return false;
  }
  return true;
}

function readSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    return typeof session?.at === 'number' ? session : null;
  } catch (_) {
    return null;
  }
}

export function currentUser() {
  return readSession()?.user ?? null;
}

/** When the active session expires, for the diagnostics screen. */
export function sessionExpiresAt() {
  const session = readSession();
  return session ? session.at + SESSION_HOURS * 3_600_000 : null;
}

/**
 * Ends the session. Checklist answers and photos are deliberately left in
 * place: a technician signing out mid-job must not lose field data, and the
 * next sign-in is the same shared account anyway.
 */
export function signOut() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch (_) { /* nothing useful to do */ }
}
