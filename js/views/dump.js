// Screen «Dump»: Schnelleingabe und Liste der offenen, nicht eingeplanten To-dos.

import {
  listDumpTodos, createTodo, completeTodo, reopenTodo, deleteTodo, createBlock,
} from '../data.js';
import {
  todayString, nowMinutes, formatDateShort, formatRelativeDate, formatDuration, DAY_START_MIN, DAY_END_MIN,
} from '../date.js';
import {
  CHECK_ICON, CHECK_SETTLE_MS, vibrate, playCheck, showToast,
} from '../feedback.js';
import { openTodoSheet, openListSheet, openScheduleSheet } from './item-sheet.js';

let listEl;
let loadCount = 0; // verhindert, dass eine ältere, langsamere Antwort eine neuere überschreibt
let pendingChecks = 0; // abgehakte Aufgaben, die noch gespeichert werden bzw. noch stehen bleiben

export function enter(screen) {
  if (!listEl) setup(screen);
  load();
}

function setup(screen) {
  const body = screen.querySelector('.screen-body');
  body.innerHTML = `
    <form class="quick-add" autocomplete="off">
      <input class="input" name="title" placeholder="Neue Aufgabe …" aria-label="Neue Aufgabe"
             enterkeyhint="enter" maxlength="200">
      <p class="form-error" role="alert" hidden></p>
    </form>
    <div class="dump-list"></div>`;

  listEl = body.querySelector('.dump-list');
  const form = body.querySelector('.quick-add');
  const input = form.elements.title;
  const error = form.querySelector('.form-error');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = input.value.trim();
    if (!title) return;

    // Feld sofort leeren und fokussiert lassen, damit man direkt weiterschreiben kann.
    input.value = '';
    error.hidden = true;
    try {
      await createTodo(title);
      load();
    } catch {
      input.value = title;
      error.textContent = 'Speichern hat nicht geklappt. Prüfe deine Verbindung.';
      error.hidden = false;
    }
  });
}

async function load() {
  const current = ++loadCount;
  if (!listEl.children.length) listEl.innerHTML = '<p class="status-text">Lädt …</p>';

  try {
    const todos = await listDumpTodos();
    if (current === loadCount) render(todos);
  } catch {
    if (current === loadCount) renderError();
  }
}

function render(todos) {
  listEl.replaceChildren();

  if (!todos.length) {
    listEl.innerHTML = `
      <div class="empty-state">
        <p class="empty-state-title">Noch keine Aufgaben.</p>
        <p class="subtitle">Schreib oben alles auf, was dir durch den Kopf geht. Eine Zeile pro Aufgabe, Enter speichert.</p>
      </div>`;
    return;
  }

  const today = todayString();
  const urgent = todos.filter((t) => t.due_date);
  const others = todos.filter((t) => !t.due_date);

  // Gruppen-Labels nur, wenn es wirklich zwei Gruppen gibt.
  const showLabels = urgent.length > 0 && others.length > 0;
  if (urgent.length) listEl.append(renderGroup(showLabels ? 'Zeitkritisch' : null, urgent, today));
  if (others.length) listEl.append(renderGroup(showLabels ? 'Weitere Aufgaben' : null, others, today));

  const hint = document.createElement('p');
  hint.className = 'list-hint';
  // Mit Maus «Rechtsklick», auf Touch-Geräten «Lange drücken»
  const action = matchMedia('(hover: hover)').matches ? 'Rechtsklick' : 'Lange drücken';
  hint.textContent = `${action} für «Einplanen», «Erledigt» und «Löschen».`;
  listEl.append(hint);
}

function renderGroup(label, todos, today) {
  const group = document.createElement('section');
  group.className = 'list-group';

  if (label) {
    const heading = document.createElement('h2');
    heading.className = 'list-label';
    heading.textContent = label;
    group.append(heading);
  }

  const list = document.createElement('div');
  list.className = 'list';
  for (const todo of todos) list.append(renderRow(todo, today));
  group.append(list);
  return group;
}

// Zeilen werden mit textContent gebaut, damit Titel wie «<b>» als Text erscheinen und nicht als HTML.
// Links die Checkbox zum Abhaken, rechts davon der Text, der das Bearbeiten-Sheet öffnet.
function renderRow(todo, today) {
  const wrap = document.createElement('div');
  wrap.className = 'list-row-split check-row';

  const check = document.createElement('button');
  check.type = 'button';
  check.className = 'check';
  check.setAttribute('role', 'checkbox');
  check.setAttribute('aria-checked', 'false');
  check.setAttribute('aria-label', todo.title);
  check.innerHTML = CHECK_ICON;
  check.addEventListener('click', () => complete(todo, check));

  const row = document.createElement('button');
  row.type = 'button';
  row.className = 'list-row';
  wrap.append(check, row);

  const title = document.createElement('span');
  title.className = 'list-row-title';
  title.textContent = todo.title;
  row.append(title);

  const meta = document.createElement('span');
  meta.className = 'list-row-meta';
  const parts = [];

  if (todo.due_date) {
    if (todo.due_date < today) {
      const overdue = document.createElement('span');
      overdue.className = 'meta-strong';
      overdue.textContent = 'überfällig';
      const part = document.createDocumentFragment();
      part.append(overdue, ` seit ${formatDateShort(todo.due_date)}`);
      parts.push(part);
    } else {
      parts.push(`bis ${formatRelativeDate(todo.due_date, today)}`);
    }
  }
  if (todo.goal) parts.push(todo.goal);
  parts.push(formatDuration(todo.duration_min));

  parts.forEach((part, i) => {
    if (i > 0) meta.append(' · ');
    meta.append(part);
  });
  row.append(meta);

  row.addEventListener('click', () => {
    if (row.dataset.longPressed) {
      delete row.dataset.longPressed;
      return;
    }
    openTodoSheet(todo, load);
  });
  addLongPress(row, () => openActions(todo));
  return wrap;
}

// ---------- Long-Press-Menü ----------

const LONG_PRESS_MS = 500;
const MOVE_TOLERANCE_PX = 8;

// Langes Drücken (Touch) oder Rechtsklick (Maus) öffnet das Aktionsmenü.
// iOS kennt kein «contextmenu»-Event bei langem Drücken, darum zusätzlich ein eigener Timer.
function addLongPress(row, onLongPress) {
  let timer = null;
  let startX = 0;
  let startY = 0;
  const cancel = () => clearTimeout(timer);
  const sheetOpen = () => document.getElementById('sheet').open;

  row.addEventListener('pointerdown', (e) => {
    delete row.dataset.longPressed;
    if (e.pointerType === 'mouse') return;
    startX = e.clientX;
    startY = e.clientY;
    timer = setTimeout(() => {
      row.dataset.longPressed = '1'; // den Klick nach dem Loslassen ignorieren
      if (sheetOpen()) return;
      vibrate();
      onLongPress();
    }, LONG_PRESS_MS);
  });
  row.addEventListener('pointermove', (e) => {
    if (Math.hypot(e.clientX - startX, e.clientY - startY) > MOVE_TOLERANCE_PX) cancel();
  });
  row.addEventListener('pointerup', cancel);
  row.addEventListener('pointercancel', cancel);

  row.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    cancel();
    row.dataset.longPressed = '1';
    if (!sheetOpen()) onLongPress();
  });
}

function openActions(todo) {
  openListSheet({
    heading: todo.title,
    items: [
      { title: 'Für heute einplanen', onSelect: () => scheduleToday(todo) },
      { title: 'Erledigt', onSelect: () => complete(todo) },
      { title: 'Löschen', onSelect: () => confirmDelete(todo) },
    ],
  });
}

function confirmDelete(todo) {
  openListSheet({
    heading: 'Aufgabe löschen?',
    subtitle: todo.title,
    items: [{ title: 'Löschen', danger: true, onSelect: () => run(() => deleteTodo(todo.id)) }],
  });
}

function scheduleToday(todo) {
  const next = Math.ceil(nowMinutes() / 15) * 15;
  openScheduleSheet({
    heading: todo.title,
    subtitle: 'Heute',
    start: Math.min(Math.max(next, DAY_START_MIN), DAY_END_MIN - 15),
    duration: todo.duration_min,
    save: (start_time, duration_min) =>
      createBlock({ date: todayString(), start_time, duration_min, todo_id: todo.id }),
    onChange: load,
  });
}

// Abhaken per Checkbox (check) oder über das Aktionsmenü (ohne check).
// Mit Checkbox bleibt die Zeile kurz abgehakt stehen, damit man das Häkchen sieht.
// Hakt man mehrere schnell nacheinander ab, wird erst am Schluss neu geladen.
async function complete(todo, check) {
  if (check) {
    if (check.getAttribute('aria-checked') === 'true') return;
    playCheck(check);
    check.closest('.check-row').classList.add('is-done');
  } else {
    vibrate();
  }

  pendingChecks++;
  const wait = new Promise((resolve) => setTimeout(resolve, check ? CHECK_SETTLE_MS : 0));
  let ok = true;
  try {
    await Promise.all([completeTodo(todo.id), wait]);
  } catch {
    ok = false;
    showError();
  }
  if (--pendingChecks === 0) load();

  if (ok) {
    showToast('Erledigt', { actionLabel: 'Rückgängig', onAction: () => run(() => reopenTodo(todo.id)) });
  }
}

// Führt eine Aktion aus und lädt danach neu.
async function run(action) {
  try {
    await action();
    load();
  } catch {
    showError();
  }
}

function showError() {
  const error = document.querySelector('.quick-add .form-error');
  error.textContent = 'Das hat nicht geklappt. Prüfe deine Verbindung.';
  error.hidden = false;
}

function renderError() {
  listEl.innerHTML = `
    <div class="empty-state">
      <p class="empty-state-title">Die Aufgaben konnten nicht geladen werden.</p>
      <p class="subtitle">Prüfe deine Verbindung und versuch es noch einmal.</p>
      <button type="button" class="btn btn-secondary">Erneut laden</button>
    </div>`;
  listEl.querySelector('button').addEventListener('click', load);
}
