// Bearbeiten-Sheet: ein von unten einfahrendes Modal.
// Es nutzt das HTML-Element <dialog>. showModal() legt es über die Seite,
// sperrt den Rest für Klicks und schliesst es mit der Escape-Taste.
// Vorerst nur für To-dos. Termine und Routinen folgen in Phase 4.

import { updateTodo, deleteTodo } from '../data.js';

const DURATIONS = [15, 30, 45, 60, 90, 120];
const dialog = document.getElementById('sheet');

// Klick auf den abgedunkelten Hintergrund schliesst das Sheet.
dialog.addEventListener('click', (e) => {
  if (e.target === dialog) dialog.close();
});

export function openTodoSheet(todo, onChange) {
  const durations = DURATIONS.includes(todo.duration_min)
    ? DURATIONS
    : [...DURATIONS, todo.duration_min].sort((a, b) => a - b);

  dialog.innerHTML = `
    <form class="sheet-form form" novalidate>
      <h2 class="sheet-title" id="sheet-title" tabindex="-1" autofocus>Aufgabe bearbeiten</h2>

      <label>
        <span>Titel</span>
        <input name="title" required maxlength="200">
      </label>

      <label>
        <span>Deadline (optional)</span>
        <input name="due_date" type="date">
      </label>

      <fieldset>
        <legend>Menge (optional)</legend>
        <div class="amount-row">
          <input name="target_amount" inputmode="decimal" placeholder="20" aria-label="Menge">
          <input name="unit" placeholder="Seiten" aria-label="Einheit" maxlength="40">
        </div>
      </fieldset>

      <fieldset>
        <legend>Dauer in Minuten</legend>
        <div class="chips">
          ${durations.map((min) => `
            <label class="chip">
              <input type="radio" name="duration_min" value="${min}">
              <span>${min}</span>
            </label>`).join('')}
        </div>
      </fieldset>

      <label>
        <span>Notizen (optional)</span>
        <textarea name="notes" rows="3"></textarea>
      </label>

      <p class="form-error" role="alert" hidden></p>

      <div class="sheet-actions">
        <button type="button" class="btn btn-secondary" data-action="cancel">Abbrechen</button>
        <button type="submit" class="btn btn-primary">Speichern</button>
      </div>
      <div class="sheet-secondary-actions">
        <button type="button" class="btn btn-tertiary" data-action="delete">Aufgabe löschen</button>
      </div>
    </form>`;

  const form = dialog.querySelector('form');
  const fields = form.elements; // Formularfelder nach ihrem name-Attribut
  const error = form.querySelector('.form-error');

  // Werte über .value setzen statt ins HTML schreiben: So bleibt jeder Titel reiner Text.
  fields.title.value = todo.title;
  fields.due_date.value = todo.due_date ?? '';
  fields.target_amount.value = todo.target_amount ?? '';
  fields.unit.value = todo.unit ?? '';
  fields.notes.value = todo.notes ?? '';
  form.querySelector(`input[name="duration_min"][value="${todo.duration_min}"]`).checked = true;

  const showError = (text) => {
    error.textContent = text;
    error.hidden = false;
  };

  form.querySelector('[data-action="cancel"]').addEventListener('click', () => dialog.close());

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    error.hidden = true;

    const title = fields.title.value.trim();
    if (!title) return showError('Der Titel darf nicht leer sein.');

    const amountText = fields.target_amount.value.trim().replace(',', '.');
    const amount = amountText === '' ? null : Number(amountText);
    if (amount !== null && (Number.isNaN(amount) || amount < 0)) {
      return showError('Die Menge muss eine Zahl sein, z. B. 20.');
    }

    try {
      await updateTodo(todo.id, {
        title,
        due_date: fields.due_date.value || null,
        target_amount: amount,
        unit: fields.unit.value.trim() || null,
        duration_min: Number(fields.duration_min.value),
        notes: fields.notes.value.trim() || null,
      });
      dialog.close();
      onChange();
    } catch {
      showError('Speichern hat nicht geklappt. Prüfe deine Verbindung.');
    }
  });

  // Löschen in zwei Schritten: Der erste Tipp fragt nach, erst der zweite löscht.
  const deleteButton = form.querySelector('[data-action="delete"]');
  deleteButton.addEventListener('click', async () => {
    if (!deleteButton.classList.contains('btn-danger')) {
      deleteButton.textContent = 'Wirklich löschen';
      deleteButton.classList.replace('btn-tertiary', 'btn-danger');
      return;
    }
    try {
      await deleteTodo(todo.id);
      dialog.close();
      onChange();
    } catch {
      showError('Löschen hat nicht geklappt. Prüfe deine Verbindung.');
    }
  });

  dialog.showModal();
}
