// Einstiegspunkt: Auth-Guard und Router-Start.
// Ohne Sitzung ist nur der Login sichtbar, mit Sitzung die App mit Tab-Leiste.

import { supabase } from './supabase.js';
import { registerRoute, startRouter } from './router.js';
import { initLogin, logout } from './views/login.js';
import * as heute from './views/heute.js';
import * as dump from './views/dump.js';
import * as planen from './views/planen.js';
import * as routinen from './views/routinen.js';

registerRoute('heute', heute.enter);
registerRoute('dump', dump.enter);
registerRoute('planen', planen.enter);
registerRoute('routinen', routinen.enter);

initLogin();
document.getElementById('logout').addEventListener('click', logout);

const loginScreen = document.getElementById('login');
const app = document.getElementById('app');
const tabbar = document.querySelector('.tabbar');
let routerStarted = false;

function showApp(loggedIn) {
  loginScreen.hidden = loggedIn;
  app.hidden = !loggedIn;
  tabbar.hidden = !loggedIn;

  if (loggedIn && !routerStarted) {
    routerStarted = true;
    startRouter();
  }
}

// Läuft einmal beim Start (INITIAL_SESSION) und danach bei jedem An- und Abmelden.
supabase.auth.onAuthStateChange((_event, session) => {
  showApp(Boolean(session));
});
