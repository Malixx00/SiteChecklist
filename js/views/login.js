// Sign-in landing page.
//
// Shown instead of any other screen until a session exists. Brand treatment
// follows style guide page 14: Dark Gunmetal ground, outline symbol as a large
// background element, display type in condensed italic capitals.

import { signIn, EXPECTED_USER } from '../auth.js';
import { esc, icon } from '../ui.js';
import { lockupImg, symbolSvg } from '../components/logo.js';
import { APP_VERSION } from '../version.js';

export function render(root, navigate, onSignedIn) {
  root.innerHTML = `
    <div class="login">
      <div class="login__watermark" aria-hidden="true">${symbolSvg('mono')}</div>

      <main class="login__panel">
        <div class="login__brand">${lockupImg('brandlockup--login')}</div>

        <h1 class="login__title">Site Reporter</h1>
        <p class="login__intro">
          Turntable service and safety checklists. Authorised, trained
          technicians only.
        </p>

        <form class="login__form" novalidate>
          <label class="field">
            <span class="field__label">Username</span>
            <input class="input" name="username" type="text" autocomplete="username"
              autocapitalize="characters" spellcheck="false" required
              placeholder="${esc(EXPECTED_USER)}">
          </label>

          <label class="field">
            <span class="field__label">Password</span>
            <span class="login__password">
              <input class="input" name="password" type="password"
                autocomplete="current-password" required>
              <button class="login__reveal" type="button" data-act="reveal"
                aria-label="Show password">${icon('sun')}</button>
            </span>
          </label>

          <p class="login__error" role="alert" hidden></p>

          <button class="btn btn--filled btn--wide" type="submit">
            <span>Sign In</span>
          </button>
        </form>

        <p class="login__note">
          If you have not completed turntable service training, do not use this
          application. Contact your Team Leader.
        </p>
      </main>

      <footer class="login__foot">
        <span>Australian Turntables</span>
        <span>Version ${esc(APP_VERSION)}</span>
      </footer>
    </div>`;

  const form = root.querySelector('.login__form');
  const error = root.querySelector('.login__error');
  const submit = form.querySelector('button[type="submit"]');
  const username = form.elements.username;
  const password = form.elements.password;

  const reveal = root.querySelector('[data-act="reveal"]');
  reveal.addEventListener('click', () => {
    const shown = password.type === 'text';
    password.type = shown ? 'password' : 'text';
    reveal.setAttribute('aria-label', shown ? 'Show password' : 'Hide password');
    reveal.classList.toggle('is-on', !shown);
    password.focus();
  });

  const fail = (message) => {
    error.textContent = message;
    error.hidden = false;
    password.select();
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    error.hidden = true;

    if (!username.value.trim() || !password.value) {
      fail('Enter both your username and password.');
      return;
    }

    submit.disabled = true;
    submit.innerHTML = '<span class="spinner"></span><span>Checking</span>';
    try {
      const ok = await signIn(username.value, password.value);
      if (ok) {
        onSignedIn();
        return;
      }
      fail('That username or password is not correct. Nothing has been changed — check your details and try again.');
    } catch (e) {
      fail(e.message);
    } finally {
      submit.disabled = false;
      submit.innerHTML = '<span>Sign In</span>';
    }
  });

  setTimeout(() => username.focus(), 80);
  return () => {};
}
