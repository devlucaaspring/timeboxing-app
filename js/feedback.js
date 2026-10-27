// Kleines Feedback beim Abhaken: Häkchen-Animation, Vibration und ein Toast mit «Rückgängig».
//
// Die Animation selbst steckt im CSS (.check). Hier wird sie nur ausgelöst.

export const CHECK_SETTLE_MS = 600;   // so lange bleibt ein abgehakter Eintrag stehen, bevor er wegrückt
const TOAST_MS = 5000;
const TOAST_LEAVE_MS = 200;           // Dauer des Ausblendens (siehe .toast.is-leaving)

// Kreis mit Häkchen für Checkboxen (Heute, Dump).
// pathLength="1": Das Häkchen gilt als 1 lang, so kann das CSS es mit stroke-dashoffset von 1 auf 0 zeichnen.
export const CHECK_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10.5"/><path d="M7.5 12.5l3 3 6-6.5" pathLength="1"/></svg>';

let regionEl = null;
let toastEl = null;
let toastTimer = null;

// Kurzes Antippen spürbar machen. iOS kennt keine Vibration API, dort passiert einfach nichts.
export function vibrate() {
  navigator.vibrate?.(15);
}

// Setzt die Checkbox auf «erledigt». Das CSS füllt dann den Kreis und zeichnet das Häkchen.
export function playCheck(button) {
  button.setAttribute('aria-checked', 'true');
  vibrate();
}

// Zeigt unten einen Toast, z. B. «Erledigt · Rückgängig». Ein neuer Toast ersetzt den alten.
export function showToast(text, { actionLabel, onAction } = {}) {
  hideToast({ immediately: true });

  const toast = document.createElement('div');
  toast.className = 'toast';
  const label = document.createElement('span');
  label.textContent = text;
  toast.append(label);

  if (actionLabel) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'toast-action';
    button.textContent = actionLabel;
    button.addEventListener('click', () => {
      hideToast();
      onAction();
    });
    toast.append(button);
  }

  toastRegion().append(toast);
  toastEl = toast;
  toastTimer = setTimeout(hideToast, TOAST_MS);
}

function hideToast({ immediately = false } = {}) {
  clearTimeout(toastTimer);
  const toast = toastEl;
  toastEl = null;
  if (!toast) return;
  if (immediately) {
    toast.remove();
    return;
  }
  toast.classList.add('is-leaving');
  setTimeout(() => toast.remove(), TOAST_LEAVE_MS);
}

// Ein fester Bereich mit aria-live, damit Screenreader den Toast vorlesen.
function toastRegion() {
  if (!regionEl) {
    regionEl = document.createElement('div');
    regionEl.className = 'toast-region';
    regionEl.setAttribute('aria-live', 'polite');
    document.body.append(regionEl);
  }
  return regionEl;
}
