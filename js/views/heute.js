// Screen «Heute» (Dashboard): zeigt jederzeit, was gerade ansteht.
//
// Reihenfolge: Begrüssung · Jetzt/Als Nächstes · Top 3 · Termine · Routinen ·
// weitere geplante Aufgaben · Fortschritt · ab 17:00 «Morgen planen».
// Abhaken ist ein einziger Tipp. Ein zweiter Tipp macht es wieder rückgängig.

import {
  getTodayDay, completeTodo, reopenTodo, logHabit, unlogHabit,
} from '../data.js';
import {
  todayString, nowMinutes, formatDateLong, formatDuration,
  timeToMinutes, minutesToTime,
} from '../date.js';
import { openTodoSheet, openEventSheet } from './item-sheet.js';

const EVENING_MIN = 17 * 60;      // ab hier die Karte «Morgen planen»
const REFRESH_MS = 60 * 1000;     // «Jetzt» und «in 25 min» jede Minute aktualisieren

let screenEl;
let root;                         // .screen-body des Heute-Screens
let state = null;
let loadCount = 0;

export function enter(screen) {
  if (!root) setup(screen);
  load();
}

function setup(screen) {
  screenEl = screen;
  root = screen.querySelector('.screen-body');

  // Jede Minute neu zeichnen, damit «Jetzt» stimmt. Nach Mitternacht neu laden.
  setInterval(() => {
    if (screenEl.hidden || !state) return;
    if (state.date !== todayString()) load();
    else render();
  }, REFRESH_MS);

  // Kehrt man in die App zurück (z. B. vom Home-Bildschirm), sind die Daten evtl. veraltet.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && !screenEl.hidden) load();
  });
}

async function load() {
  const current = ++loadCount;
  const date = todayString();
  renderHeader(date);
  if (!state) root.innerHTML = '<p class="status-text">Lädt …</p>';

  try {
    const data = await getTodayDay(date);
    if (current !== loadCount) return;
    state = buildState(date, data);
    render();
  } catch {
    if (current === loadCount) renderLoadError();
  }
}

// Bereitet die geladenen Daten so auf, dass das Rendern einfach bleibt.
function buildState(date, { todos, blocks, priorities, events, habits, doneHabitIds, tomorrowHasTop3 }) {
  const todoById = new Map(todos.map((t) => [t.id, t]));
  const blockByTodo = new Map();
  const blockByHabit = new Map();
  for (const block of blocks) {
    if (block.todo_id) blockByTodo.set(block.todo_id, block);
    if (block.habit_id) blockByHabit.set(block.habit_id, block);
  }
  const top3 = priorities.map((p) => todoById.get(p.todo_id)).filter(Boolean);
  const top3Ids = new Set(top3.map((t) => t.id));

  return {
    date, events, blockByTodo, blockByHabit, doneHabitIds, tomorrowHasTop3, top3,
    habits,
    // heute eingeplant, aber nicht Top 3
    others: blocks
      .filter((b) => b.todo_id && !top3Ids.has(b.todo_id) && todoById.has(b.todo_id))
      .map((b) => todoById.get(b.todo_id)),
  };
}

// ---------- Kleine Helfer ----------

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function section(label) {
  const box = el('section', 'heute-section');
  box.append(el('h2', 'list-label', label));
  return box;
}

const isDoneTodo = (todo) => todo.status === 'done';
const isDoneHabit = (habit) => state.doneHabitIds.has(habit.id);

// Zeitraum eines Blocks oder einer Routine in Minuten (oder null ohne Zeit).
function todoRange(todo) {
  const block = state.blockByTodo.get(todo.id);
  if (!block) return null;
  const start = timeToMinutes(block.start_time);
  return { start, end: start + block.duration_min };
}

function habitRange(habit) {
  const block = state.blockByHabit.get(habit.id);
  if (block) {
    const start = timeToMinutes(block.start_time);
    return { start, end: start + block.duration_min };
  }
  if (!habit.default_time) return null;
  const start = timeToMinutes(habit.default_time);
  return { start, end: start + habit.duration_min };
}

function eventRange(event) {
  const start = timeToMinutes(event.start_time);
  return { start, end: event.end_time ? timeToMinutes(event.end_time) : start + 60 };
}

const rangeText = ({ start, end }) => `${minutesToTime(start)}–${minutesToTime(end)}`;

// Offene Aufgaben zuerst, erledigte ans Ende. Innerhalb nach Uhrzeit (ohne Zeit zuletzt).
function byDoneThenTime(items, isDone, range) {
  return [...items].sort((a, b) =>
    (isDone(a) - isDone(b))
    || ((range(a)?.start ?? Infinity) - (range(b)?.start ?? Infinity))
    || a.title.localeCompare(b.title, 'de-CH'));
}

// ---------- Rendern ----------

function renderHeader(date) {
  const now = nowMinutes();
  let greeting = 'Guten Abend';
  if (now >= 5 * 60 && now < 11 * 60) greeting = 'Guten Morgen';
  else if (now >= 11 * 60 && now < 18 * 60) greeting = 'Guten Tag';
  screenEl.querySelector('.screen-header h1').textContent = greeting;
  screenEl.querySelector('.screen-header .subtitle').textContent = formatDateLong(date);
}

// focusKey: nach dem Neuzeichnen den Fokus wieder auf dieselbe Checkbox setzen.
function render(focusKey) {
  renderHeader(state.date);
  root.innerHTML = '<p class="form-error heute-error" role="alert" hidden></p>';

  root.append(renderNow(), renderTop3());
  if (state.events.length) root.append(renderEvents());
  if (state.habits.length) root.append(renderHabits());
  if (state.others.length) root.append(renderOthers());
  const progress = renderProgress();
  if (progress) root.append(progress);
  if (nowMinutes() >= EVENING_MIN && !state.tomorrowHasTop3) root.append(renderTomorrow());

  if (focusKey) root.querySelector(`[data-key="${focusKey}"]`)?.focus();
}

function showError(text) {
  const error = root.querySelector('.heute-error');
  error.textContent = text;
  error.hidden = false;
}

function renderLoadError() {
  root.innerHTML = `
    <div class="empty-state">
      <p class="empty-state-title">Der Tag konnte nicht geladen werden.</p>
      <p class="subtitle">Prüfe deine Verbindung und versuch es noch einmal.</p>
      <button type="button" class="btn btn-secondary">Erneut laden</button>
    </div>`;
  root.querySelector('button').addEventListener('click', load);
}

// ---------- Jetzt / Als Nächstes ----------

// Alles mit Uhrzeit, das heute noch nicht erledigt ist.
function timedItems() {
  const items = [];
  for (const event of state.events) items.push({ kind: 'Termin', title: event.title, ...eventRange(event) });
  for (const todo of state.top3) {
    const range = todoRange(todo);
    if (range && !isDoneTodo(todo)) items.push({ kind: 'Top 3', title: todo.title, goal: todo.goal, ...range });
  }
  for (const todo of state.others) {
    const range = todoRange(todo);
    if (range && !isDoneTodo(todo)) items.push({ kind: 'Aufgabe', title: todo.title, goal: todo.goal, ...range });
  }
  for (const habit of state.habits) {
    const range = habitRange(habit);
    if (range && !isDoneHabit(habit)) items.push({ kind: 'Routine', title: habit.title, goal: habit.goal, ...range });
  }
  return items.sort((a, b) => a.start - b.start || a.end - b.end);
}

function renderNow() {
  const now = nowMinutes();
  const items = timedItems();
  const current = items.filter((i) => i.start <= now && now < i.end);
  const upcoming = items.filter((i) => i.start > now);

  const card = el('section', 'card now-card');
  card.setAttribute('aria-live', 'polite');

  if (current.length) {
    card.append(el('p', 'now-label', 'Jetzt'));
    for (const item of current) {
      card.append(nowItem(item, `noch ${formatDuration(item.end - now)}`));
    }
  } else if (upcoming.length) {
    // Alles, was zur selben nächsten Zeit beginnt
    const next = upcoming.filter((i) => i.start === upcoming[0].start);
    card.append(el('p', 'now-label', 'Als Nächstes'));
    for (const item of next) card.append(nowItem(item, `in ${formatDuration(item.start - now)}`));
  } else {
    const nothingPlanned = !state.events.length && !state.blockByTodo.size && !state.blockByHabit.size
      && !state.habits.some((h) => h.default_time);
    card.append(el('p', 'now-empty', nothingPlanned ? 'Noch nichts geplant.' : 'Für heute steht nichts mehr an.'));
    if (nothingPlanned) {
      const link = el('a', 'btn btn-secondary now-link', 'Tag planen');
      link.href = '#/planen?tag=heute';
      card.append(link);
    }
  }
  return card;
}

// Uhrzeit links, Titel und Details rechts. Mehrere Einträge trennt eine Linie.
function nowItem(item, remaining) {
  const box = el('div', 'now-item');
  const text = el('div', 'now-text');
  const title = el('p', 'now-title', item.title);
  if (item.goal) title.append(el('span', 'now-goal', ` · ${item.goal}`));
  text.append(title, el('p', 'now-meta', `${item.kind} · bis ${minutesToTime(item.end)} · ${remaining}`));
  box.append(el('span', 'now-time', minutesToTime(item.start)), text);
  return box;
}

// ---------- Abhaken ----------

const CHECK_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10.5"/><path d="M7.5 12.5l3 3 6-6.5"/></svg>';

function checkButton(key, title, checked, onToggle) {
  const button = el('button', 'check');
  button.type = 'button';
  button.dataset.key = key;
  button.setAttribute('role', 'checkbox');
  button.setAttribute('aria-checked', String(checked));
  button.setAttribute('aria-label', title);
  button.innerHTML = CHECK_ICON;
  button.addEventListener('click', onToggle);
  return button;
}

// Erst die Anzeige ändern (fühlt sich sofort an), dann speichern.
// Klappt das Speichern nicht, wird neu geladen und ein Hinweis gezeigt.
async function toggleTodo(todo, key) {
  const wasDone = isDoneTodo(todo);
  todo.status = wasDone ? 'open' : 'done';
  render(key);
  try {
    await (wasDone ? reopenTodo(todo.id) : completeTodo(todo.id));
  } catch {
    await load();
    showError('Speichern hat nicht geklappt. Prüfe deine Verbindung.');
  }
}

async function toggleHabit(habit, key) {
  const wasDone = isDoneHabit(habit);
  if (wasDone) state.doneHabitIds.delete(habit.id);
  else state.doneHabitIds.add(habit.id);
  render(key);
  try {
    await (wasDone ? unlogHabit(habit.id, state.date) : logHabit(habit.id, state.date));
  } catch {
    await load();
    showError('Speichern hat nicht geklappt. Prüfe deine Verbindung.');
  }
}

// ---------- Top 3 ----------

function renderTop3() {
  const box = section('Top 3');
  const cards = el('div', 'top3-cards');

  state.top3.forEach((todo) => {
    const key = `todo-${todo.id}`;
    const card = el('div', 'card top3-card');
    if (isDoneTodo(todo)) card.classList.add('is-done');

    const range = todoRange(todo);
    const meta = el('span', 'list-row-meta');
    const parts = [];
    if (todo.goal) parts.push(todo.goal);
    if (range) parts.push(rangeText(range));
    meta.textContent = parts.join(' · ');
    if (!range && !isDoneTodo(todo)) {
      if (parts.length) meta.append(' · ');
      meta.append(el('span', 'meta-strong', 'noch nicht eingeplant'));
    }

    const body = el('button', 'top3-card-body');
    body.type = 'button';
    body.append(el('span', 'list-row-title', todo.title));
    if (meta.childNodes.length) body.append(meta);
    body.addEventListener('click', () => openTodoSheet(todo, load));

    card.append(checkButton(key, todo.title, isDoneTodo(todo), () => toggleTodo(todo, key)), body);
    cards.append(card);
  });

  for (let i = state.top3.length; i < 3; i++) {
    const empty = el('a', 'card top3-card top3-card-empty', 'Top 3 wählen');
    empty.href = '#/planen?tag=heute';
    cards.append(empty);
  }

  box.append(cards);
  return box;
}

// ---------- Termine ----------

function renderEvents() {
  const box = section('Termine heute');
  const list = el('div', 'list');
  const now = nowMinutes();

  for (const event of state.events) {
    const range = eventRange(event);
    const row = el('button', 'list-row event-row');
    row.type = 'button';
    if (range.end <= now) row.classList.add('is-past');
    row.append(
      el('span', 'event-time', minutesToTime(range.start)),
      el('span', 'list-row-title', event.title),
    );
    row.addEventListener('click', () => openEventSheet(event, load));
    list.append(row);
  }
  box.append(list);
  return box;
}

// ---------- Routinen ----------

function renderHabits() {
  const box = section('Routinen heute');
  const list = el('div', 'list');

  for (const habit of byDoneThenTime(state.habits, isDoneHabit, habitRange)) {
    const key = `habit-${habit.id}`;
    const range = habitRange(habit);
    const parts = [];
    if (range) parts.push(minutesToTime(range.start));
    if (habit.goal) parts.push(habit.goal);
    list.append(checkRow(key, habit.title, parts.join(' · '), isDoneHabit(habit),
      () => toggleHabit(habit, key)));
  }
  box.append(list);
  return box;
}

// ---------- Weitere geplante Aufgaben ----------

function renderOthers() {
  const box = section('Weitere geplante Aufgaben');
  const list = el('div', 'list');

  for (const todo of byDoneThenTime(state.others, isDoneTodo, todoRange)) {
    const key = `todo-${todo.id}`;
    const parts = [rangeText(todoRange(todo))];
    if (todo.goal) parts.push(todo.goal);
    list.append(checkRow(key, todo.title, parts.join(' · '), isDoneTodo(todo),
      () => toggleTodo(todo, key), () => openTodoSheet(todo, load)));
  }
  box.append(list);
  return box;
}

// Listenzeile mit Checkbox links. onOpen (optional) öffnet beim Tipp auf den Text das Sheet,
// sonst hakt auch der Text ab.
function checkRow(key, title, metaText, checked, onToggle, onOpen) {
  const row = el('div', 'list-row-split check-row');
  if (checked) row.classList.add('is-done');

  const body = el('button', 'list-row');
  body.type = 'button';
  body.tabIndex = onOpen ? 0 : -1;  // ohne eigene Aktion nur einmal per Tastatur erreichbar
  body.append(el('span', 'list-row-title', title));
  if (metaText) body.append(el('span', 'list-row-meta', metaText));
  body.addEventListener('click', onOpen ?? onToggle);

  row.append(checkButton(key, title, checked, onToggle), body);
  return row;
}

// ---------- Fortschritt ----------

function renderProgress() {
  const todos = [...state.top3, ...state.others];
  const total = todos.length + state.habits.length;
  if (!total) return null;
  const done = todos.filter(isDoneTodo).length + state.habits.filter(isDoneHabit).length;

  const box = el('section', 'heute-section progress');
  box.append(el('p', 'progress-text', `${done} von ${total} erledigt`));
  const bar = el('div', 'progress-track');
  bar.setAttribute('role', 'progressbar');
  bar.setAttribute('aria-label', 'Fortschritt heute');
  bar.setAttribute('aria-valuemin', '0');
  bar.setAttribute('aria-valuemax', String(total));
  bar.setAttribute('aria-valuenow', String(done));
  const fill = el('div', 'progress-fill');
  fill.style.width = `${(done / total) * 100}%`;
  bar.append(fill);
  box.append(bar);
  return box;
}

// ---------- Morgen planen ----------

function renderTomorrow() {
  const card = el('a', 'card tomorrow-card');
  card.href = '#/planen?tag=morgen';
  card.append(
    el('span', 'tomorrow-title', 'Morgen planen'),
    el('span', 'list-row-meta', 'Wähle deine Top 3 für morgen.'),
  );
  return card;
}
