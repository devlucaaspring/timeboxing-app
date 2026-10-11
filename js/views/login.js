// Login-Screen: E-Mail + Passwort. Registrierung gibt es bewusst nicht.

import { supabase } from '../supabase.js';

export function initLogin() {
  const form = document.getElementById('login-form');
  const button = form.querySelector('button[type="submit"]');
  const error = document.getElementById('login-error');

  form.addEventListener('submit', async (e) => {
    e.preventDefault(); // verhindert, dass der Browser die Seite neu lädt
    error.hidden = true;
    button.disabled = true;

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: form.email.value.trim(),
      password: form.password.value,
    });

    button.disabled = false;
    if (authError) {
      error.textContent = authError.message === 'Invalid login credentials'
        ? 'E-Mail oder Passwort stimmt nicht.'
        : 'Anmelden hat nicht geklappt. Prüfe deine Verbindung.';
      error.hidden = false;
      return;
    }
    form.reset();
    // Den Wechsel zur App übernimmt onAuthStateChange in app.js.
  });
}

export async function logout() {
  await supabase.auth.signOut();
}
