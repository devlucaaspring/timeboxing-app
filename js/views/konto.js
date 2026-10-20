// Screen «Konto»: Passwort ändern und Abmelden.

import { supabase } from '../supabase.js';
import { logout } from './login.js';

let emailEl;

export function enter(screen) {
  if (!emailEl) setup(screen);
  showEmail();
}

function setup(screen) {
  const body = screen.querySelector('.screen-body');
  body.innerHTML = `
    <h2 class="list-label" id="konto-password-title">Passwort ändern</h2>
    <form class="card form konto-form" aria-labelledby="konto-password-title">
      <!-- verstecktes Benutzerfeld, damit Passwort-Manager wissen, zu welchem Konto das Passwort gehört -->
      <input name="username" type="email" autocomplete="username" hidden>
      <label>
        <span>Aktuelles Passwort</span>
        <input name="current" type="password" autocomplete="current-password" required>
      </label>
      <label>
        <span>Neues Passwort</span>
        <input name="password" type="password" autocomplete="new-password" minlength="6" required>
      </label>
      <label>
        <span>Neues Passwort wiederholen</span>
        <input name="repeat" type="password" autocomplete="new-password" minlength="6" required>
      </label>
      <p class="form-error" role="alert" hidden></p>
      <p class="form-success" role="status" hidden>Passwort geändert.</p>
      <button type="submit" class="btn btn-primary">Passwort ändern</button>
    </form>
    <button type="button" class="btn btn-secondary konto-logout" data-action="logout">Abmelden</button>`;

  emailEl = screen.querySelector('.subtitle');
  const form = body.querySelector('form');
  form.addEventListener('submit', (e) => changePassword(e, form));
  body.querySelector('[data-action="logout"]').addEventListener('click', logout);
}

async function showEmail() {
  const { data } = await supabase.auth.getUser();
  const email = data.user?.email;
  emailEl.textContent = email ? `Angemeldet als ${email}.` : 'Dein Zugang zur App.';
  document.querySelector('.konto-form [name="username"]').value = email ?? '';
}

async function changePassword(e, form) {
  e.preventDefault(); // verhindert, dass der Browser die Seite neu lädt
  const button = form.querySelector('button[type="submit"]');
  const error = form.querySelector('.form-error');
  const success = form.querySelector('.form-success');
  error.hidden = true;
  success.hidden = true;

  const fail = (message) => {
    error.textContent = message;
    error.hidden = false;
    button.disabled = false;
  };

  if (form.password.value !== form.repeat.value) {
    fail('Die beiden neuen Passwörter stimmen nicht überein.');
    return;
  }

  button.disabled = true;

  // Zuerst das aktuelle Passwort prüfen, indem wir uns damit neu anmelden.
  // So kann niemand an einem offen liegenden Gerät einfach das Passwort ändern.
  const { data } = await supabase.auth.getUser();
  const { error: checkError } = await supabase.auth.signInWithPassword({
    email: data.user?.email ?? '',
    password: form.current.value,
  });
  if (checkError) {
    fail(checkError.code === 'invalid_credentials'
      ? 'Das aktuelle Passwort stimmt nicht.'
      : 'Das hat nicht geklappt. Prüfe deine Verbindung.');
    return;
  }

  const { error: updateError } = await supabase.auth.updateUser({ password: form.password.value });
  if (updateError) {
    const messages = {
      same_password: 'Das neue Passwort ist dasselbe wie das aktuelle.',
      weak_password: 'Das neue Passwort ist zu schwach. Nimm ein längeres.',
    };
    fail(messages[updateError.code] ?? 'Das hat nicht geklappt. Prüfe deine Verbindung.');
    return;
  }

  form.reset();
  button.disabled = false;
  success.hidden = false;
  showEmail(); // reset() leert auch das versteckte Benutzerfeld
}
