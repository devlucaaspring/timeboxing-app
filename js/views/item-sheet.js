// Bearbeiten-Sheet: ein von unten einfahrendes Modal für To-dos, Routinen und Termine.
// Es nutzt das HTML-Element <dialog>. showModal() legt es über die Seite,
// sperrt den Rest für Klicks und schliesst es mit der Escape-Taste.

import {
  updateTodo, deleteTodo,
  createHabit, updateHabit, deleteHabit,
  createEvent, updateEvent, deleteEvent,
} from '../data.js';
import {
  todayString, slotTimes, formatTime, timeToMinutes, minutesToTime, WEEKDAYS,
} from '../date.js';

const DURATIONS = [15, 30, 45, 60, 90, 120];
const dialog = document.getElementById('sheet');

// Klick auf den abgedunkelten Hintergrund schliesst das Sheet.
dialog.addEventListener('click', (e) => {
  if (e.target === dialog) dialog.close();
});

// Ein Eingabefehler, der dem Nutzer als Hinweis im Sheet gezeigt wird.
class InputError extends Error {}

// ---------- Allgemeines Sheet ----------

// heading:     Überschrift
// fieldsHtml:  die Formularfelder (nur statisches HTML, Werte kommen über fill)
// isNew:       true = neu anlegen (Titel-Feld bekommt den Fokus, kein Löschen)
// fill(f):     Werte in die Felder schreiben
// read(f):     Felder auslesen, gibt die Daten zurück oder wirft InputError
// save(data):  speichern
// remove():    löschen (optional)
// setup(form): zusätzliche Event-Listener (optional)
function openSheet({
  heading, fieldsHtml, isNew = false, submitLabel = 'Speichern', deleteLabel,
  fill, read, save, remove, setup, onChange,
}) {
  dialog.innerHTML = `
    <form class="sheet-form form" novalidate>
      <h2 class="sheet-title" id="sheet-title" tabindex="-1" ${isNew ? '' : 'autofocus'}></h2>
      ${fieldsHtml}
      <p class="form-error" role="alert" hidden></p>
      <div class="sheet-actions">
        <button type="button" class="btn btn-secondary" data-action="cancel">Abbrechen</button>
        <button type="submit" class="btn btn-primary"></button>
      </div>
      ${remove ? `
        <div class="sheet-secondary-actions">
          <button type="button" class="btn btn-tertiary" data-action="delete"></button>
        </div>` : ''}
    </form>`;

  const form = dialog.querySelector('form');
  const fields = form.elements; // Formularfelder nach ihrem name-Attribut
  const error = form.querySelector('.form-error');

  form.querySelector('.sheet-title').textContent = heading;
  form.querySelector('[type="submit"]').textContent = submitLabel;
  if (isNew) fields.title.autofocus = true;
  fill?.(fields);
  setup?.(form);

  const showError = (text) => {
    error.textContent = text;
    error.hidden = false;
  };

  form.querySelector('[data-action="cancel"]').addEventListener('click', () => dialog.close());

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    error.hidden = true;

    let data;
    try {
      data = read(fields);
    } catch (err) {
      if (err instanceof InputError) return showError(err.message);
      throw err;
    }

    try {
      await save(data);
      dialog.close();
      onChange();
    } catch {
      showError('Speichern hat nicht geklappt. Prüfe deine Verbindung.');
    }
  });

  // Löschen in zwei Schritten: Der erste Tipp fragt nach, erst der zweite löscht.
  if (remove) {
    const deleteButton = form.querySelector('[data-action="delete"]');
    deleteButton.textContent = deleteLabel;
    deleteButton.addEventListener('click', async () => {
      if (!deleteButton.classList.contains('btn-danger')) {
        deleteButton.textContent = 'Wirklich löschen';
        deleteButton.classList.replace('btn-tertiary', 'btn-danger');
        return;
      }
      try {
        await remove();
        dialog.close();
        onChange();
      } catch {
        showError('Löschen hat nicht geklappt. Prüfe deine Verbindung.');
      }
    });
  }

  dialog.showModal();
}

// ---------- Listen-Sheet (Auswahl oder Aktionen) ----------

// items: [{ title, meta?, danger?, onSelect }]. Ein Tipp schliesst das Sheet und führt onSelect aus.
export function openListSheet({ heading, subtitle, items, emptyText }) {
  dialog.innerHTML = `
    <div class="sheet-form">
      <h2 class="sheet-title" id="sheet-title" tabindex="-1" autofocus></h2>
      <p class="subtitle sheet-subtitle" hidden></p>
      <div class="sheet-list"></div>
      <div class="sheet-actions sheet-actions-single">
        <button type="button" class="btn btn-secondary">Abbrechen</button>
      </div>
    </div>`;

  dialog.querySelector('.sheet-title').textContent = heading;
  if (subtitle) {
    const sub = dialog.querySelector('.sheet-subtitle');
    sub.textContent = subtitle;
    sub.hidden = false;
  }

  const list = dialog.querySelector('.sheet-list');
  if (!items.length) {
    const empty = document.createElement('p');
    empty.className = 'status-text';
    empty.textContent = emptyText;
    list.append(empty);
  }
  for (const item of items) {
    const row = document.createElement('button');
    row.type = 'button';
    row.className = item.danger ? 'list-row is-danger' : 'list-row';
    const title = document.createElement('span');
    title.className = 'list-row-title';
    title.textContent = item.title;
    row.append(title);
    if (item.meta) {
      const meta = document.createElement('span');
      meta.className = 'list-row-meta';
      meta.textContent = item.meta;
      row.append(meta);
    }
    row.addEventListener('click', () => {
      dialog.close();
      item.onSelect();
    });
    list.append(row);
  }

  dialog.querySelector('.sheet-actions button').addEventListener('click', () => dialog.close());
  dialog.showModal();
}

// ---------- Einplanen (Startzeit + Dauer) ----------

// start/duration in Minuten. save(startTime «HH:MM», duration) speichert,
// remove() nimmt den Block wieder aus dem Plan (optional).
export function openScheduleSheet({ heading, subtitle, start, duration, save, remove, removeLabel, onChange }) {
  const times = slotTimes();
  const current = minutesToTime(start);
  if (!times.includes(current)) {
    times.push(current);
    times.sort();
  }

  openSheet({
    heading,
    submitLabel: 'Einplanen',
    deleteLabel: removeLabel ?? 'Aus dem Plan nehmen',
    fieldsHtml: `
      ${subtitle ? '<p class="subtitle sheet-subtitle"></p>' : ''}
      <label>
        <span>Beginn</span>
        <select name="start_time">
          ${times.map((t) => `<option value="${t}" ${t === current ? 'selected' : ''}>${t}</option>`).join('')}
        </select>
      </label>
      ${durationField(duration)}`,
    setup(form) {
      if (subtitle) form.querySelector('.sheet-subtitle').textContent = subtitle;
    },
    read: (f) => ({ start: f.start_time.value, duration: Number(f.duration_min.value) }),
    save: ({ start: startTime, duration: minutes }) => save(startTime, minutes),
    remove,
    onChange,
  });
}

// ---------- Bausteine für Felder ----------

const titleField = () => `
  <label>
    <span>Titel</span>
    <input name="title" required maxlength="200" enterkeyhint="done">
  </label>`;

const goalField = () => `
  <label>
    <span>Fertig, wenn … (optional)</span>
    <input name="goal" placeholder="z. B. bis Kapitel 3" maxlength="120">
  </label>`;

const notesField = () => `
  <label>
    <span>Notizen (optional)</span>
    <textarea name="notes" rows="3"></textarea>
  </label>`;

function durationField(current) {
  const durations = DURATIONS.includes(current)
    ? DURATIONS
    : [...DURATIONS, current].sort((a, b) => a - b);
  return `
    <fieldset>
      <legend>Dauer in Minuten</legend>
      <div class="chips">
        ${durations.map((min) => `
          <label class="chip">
            <input type="radio" name="duration_min" value="${min}" ${min === current ? 'checked' : ''}>
            <span>${min}</span>
          </label>`).join('')}
      </div>
    </fieldset>`;
}

function readTitle(fields) {
  const title = fields.title.value.trim();
  if (!title) throw new InputError('Der Titel darf nicht leer sein.');
  return title;
}

const textOrNull = (field) => field.value.trim() || null;

// ---------- To-do ----------

export function openTodoSheet(todo, onChange) {
  openSheet({
    heading: 'Aufgabe bearbeiten',
    deleteLabel: 'Aufgabe löschen',
    fieldsHtml: `
      ${titleField()}
      ${goalField()}
      <label>
        <span>Deadline (optional)</span>
        <input name="due_date" type="date">
      </label>
      ${durationField(todo.duration_min)}
      ${notesField()}`,
    fill(f) {
      f.title.value = todo.title;
      f.goal.value = todo.goal ?? '';
      f.due_date.value = todo.due_date ?? '';
      f.notes.value = todo.notes ?? '';
    },
    read: (f) => ({
      title: readTitle(f),
      goal: textOrNull(f.goal),
      due_date: f.due_date.value || null,
      duration_min: Number(f.duration_min.value),
      notes: textOrNull(f.notes),
    }),
    save: (data) => updateTodo(todo.id, data),
    remove: () => deleteTodo(todo.id),
    onChange,
  });
}

// ---------- Routine ----------

// habit = null legt eine neue Routine an.
export function openHabitSheet(habit, onChange) {
  const isNew = !habit;
  const h = habit ?? { weekdays: [1, 2, 3, 4, 5, 6, 7], default_time: null, duration_min: 15 };

  // Liegt eine gespeicherte Zeit nicht im Raster, wird sie trotzdem angeboten.
  const times = slotTimes();
  const current = h.default_time ? formatTime(h.default_time) : null;
  if (current && !times.includes(current)) {
    times.push(current);
    times.sort();
  }

  openSheet({
    heading: isNew ? 'Neue Routine' : 'Routine bearbeiten',
    isNew,
    deleteLabel: 'Routine löschen',
    fieldsHtml: `
      ${titleField()}
      <fieldset>
        <legend>Wochentage</legend>
        <div class="chips chips-7">
          ${WEEKDAYS.map((d) => `
            <label class="chip">
              <input type="checkbox" name="weekdays" value="${d.iso}" ${h.weekdays.includes(d.iso) ? 'checked' : ''}>
              <span>${d.short}</span>
            </label>`).join('')}
        </div>
      </fieldset>
      <label>
        <span>Uhrzeit (optional)</span>
        <select name="default_time">
          <option value="">Keine feste Zeit</option>
          ${times.map((t) => `<option value="${t}" ${t === current ? 'selected' : ''}>${t}</option>`).join('')}
        </select>
      </label>
      ${durationField(h.duration_min)}
      ${goalField()}`,
    fill(f) {
      f.title.value = h.title ?? '';
      f.goal.value = h.goal ?? '';
    },
    read(f) {
      const weekdays = [...f.weekdays].filter((box) => box.checked).map((box) => Number(box.value));
      if (!weekdays.length) throw new InputError('Wähle mindestens einen Wochentag.');
      return {
        title: readTitle(f),
        weekdays,
        default_time: f.default_time.value || null,
        duration_min: Number(f.duration_min.value),
        goal: textOrNull(f.goal),
      };
    },
    save: (data) => (isNew ? createHabit(data) : updateHabit(habit.id, data)),
    remove: isNew ? null : () => deleteHabit(habit.id),
    onChange,
  });
}

// ---------- Termin ----------

// event = null legt einen neuen Termin an.
export function openEventSheet(event, onChange) {
  const isNew = !event;

  openSheet({
    heading: isNew ? 'Neuer Termin' : 'Termin bearbeiten',
    isNew,
    deleteLabel: 'Termin löschen',
    fieldsHtml: `
      ${titleField()}
      <label>
        <span>Datum</span>
        <input name="date" type="date" required>
      </label>
      <div class="field-row">
        <label>
          <span>Beginn</span>
          <input name="start_time" type="time" required>
        </label>
        <label>
          <span>Ende</span>
          <input name="end_time" type="time">
        </label>
      </div>
      ${notesField()}`,
    fill(f) {
      f.title.value = event?.title ?? '';
      f.date.value = event?.date ?? todayString();
      f.start_time.value = event ? formatTime(event.start_time) : '';
      f.end_time.value = event?.end_time ? formatTime(event.end_time) : '';
      f.notes.value = event?.notes ?? '';
    },
    // Ende standardmässig 60 Minuten nach Beginn, solange man es nicht selbst geändert hat.
    setup(form) {
      const { start_time: start, end_time: end } = form.elements;
      let endTouched = Boolean(end.value);
      end.addEventListener('input', () => { endTouched = Boolean(end.value); });
      start.addEventListener('input', () => {
        if (endTouched || !start.value) return;
        end.value = minutesToTime(Math.min(timeToMinutes(start.value) + 60, 23 * 60 + 59));
      });
    },
    read(f) {
      if (!f.date.value) throw new InputError('Gib ein Datum an.');
      if (!f.start_time.value) throw new InputError('Gib eine Startzeit an.');
      if (f.end_time.value && f.end_time.value <= f.start_time.value) {
        throw new InputError('Das Ende muss nach dem Beginn liegen.');
      }
      return {
        title: readTitle(f),
        date: f.date.value,
        start_time: f.start_time.value,
        end_time: f.end_time.value || null,
        notes: textOrNull(f.notes),
      };
    },
    save: (data) => (isNew ? createEvent(data) : updateEvent(event.id, data)),
    remove: isNew ? null : () => deleteEvent(event.id),
    onChange,
  });
}
