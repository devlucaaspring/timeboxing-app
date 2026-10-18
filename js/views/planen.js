// Screen «Planen»: Tagesleiste (heute + 6 Tage), Top-3-Auswahl und Zeitraster in 15-Minuten-Schritten.
//
// Bedienung:
// - Mobile (und überall): Aufgabe antippen → Sheet mit Beginn + Dauer → «Einplanen».
//   Oder einen leeren Platz im Raster antippen → Aufgabe aus einer Liste wählen.
// - Desktop (Maus): Aufgaben aus der Liste ins Raster ziehen und Blöcke verschieben.
//   Umgesetzt mit Pointer Events: pointerdown startet, pointermove bewegt, pointerup legt ab.

import {
  getPlanDay, setPriorities, createBlock, updateBlock, deleteBlock,
} from '../data.js';
import {
  todayString, addDays, nowMinutes, formatDateLong, formatDateShort, formatRelativeDate,
  formatDuration, formatTime, timeToMinutes, minutesToTime, isoWeekday, WEEKDAYS,
  DAY_START_MIN, DAY_END_MIN,
} from '../date.js';
import {
  openListSheet, openScheduleSheet, openEventSheet,
} from './item-sheet.js';

const SLOT_MIN = 15;
const SLOT_PX = 24;               // Höhe eines 15-Minuten-Slots, entspricht --space-5
const EVENING_MIN = 17 * 60;      // ab 17:00 steht standardmässig «Morgen» an
const DAYS_AHEAD = 7;             // Tagesleiste: heute und die nächsten 6 Tage
const OVERPLANNED_MIN = 8 * 60;   // ab hier der Hinweis «Das ist viel für einen Tag.»
const DRAG_THRESHOLD_PX = 4;      // erst ab dieser Bewegung gilt ein Klick als Ziehen

let offset = null;                // gewählter Tag: 0 = heute, 1 = morgen, … 6
let root;                         // .screen-body des Planen-Screens
let state = null;                 // Daten des aktuell angezeigten Tages
let loadCount = 0;
let scrollPending = true;         // beim Betreten zur passenden Uhrzeit scrollen

export function enter(screen) {
  // Ein Link wie #/planen?tag=morgen wählt den Tag direkt.
  const tag = new URLSearchParams(location.hash.split('?')[1] ?? '').get('tag');
  if (tag === 'heute') offset = 0;
  if (tag === 'morgen') offset = 1;
  if (offset === null) offset = nowMinutes() >= EVENING_MIN ? 1 : 0;

  if (!root) setup(screen);
  scrollPending = true;
  load();
}

function currentDate() {
  return addDays(todayString(), offset);
}

// ---------- Aufbau ----------

function setup(screen) {
  root = screen.querySelector('.screen-body');
  root.innerHTML = `
    <div class="day-strip" role="tablist" aria-label="Tag"></div>
    <p class="plan-date"></p>
    <p class="form-error plan-error" role="alert" hidden></p>
    <div class="plan-layout">
      <section class="plan-top3" aria-labelledby="plan-top3-title">
        <h2 class="list-label" id="plan-top3-title">Top 3</h2>
        <div class="top3"></div>
      </section>
      <section class="plan-main" aria-labelledby="plan-main-title">
        <h2 class="list-label" id="plan-main-title">Tagesplan</h2>
        <div class="plan-summary"></div>
        <div class="plan-untimed"></div>
        <div class="plan-scroll">
          <div class="plan-grid"></div>
        </div>
      </section>
      <section class="plan-tasks" aria-labelledby="plan-tasks-title">
        <h2 class="list-label" id="plan-tasks-title">Noch nicht eingeplant</h2>
        <div class="plan-task-list"></div>
      </section>
    </div>`;

  root.querySelector('.day-strip').addEventListener('click', (e) => {
    const button = e.target.closest('[data-offset]');
    if (!button || Number(button.dataset.offset) === offset) return;
    offset = Number(button.dataset.offset);
    scrollPending = true;
    load();
  });

  // Tipp auf einen leeren Platz im Raster
  root.querySelector('.plan-grid').addEventListener('click', (e) => {
    if (e.target.closest('.plan-block')) return;
    pickForSlot(minuteAtY(e.clientY));
  });
}

async function load() {
  const current = ++loadCount;
  const date = currentDate();

  renderDayStrip();
  root.querySelector('.plan-date').textContent = formatDateLong(date);

  try {
    const data = await getPlanDay(date);
    if (current !== loadCount) return;
    state = buildState(date, data);
    showError(null);
    render();
  } catch {
    if (current === loadCount) showError('Der Plan konnte nicht geladen werden. Prüfe deine Verbindung.');
  }
}

// Tagesleiste: wird bei jedem Laden neu gebaut, damit sie nach Mitternacht weiterrückt.
function renderDayStrip() {
  const strip = root.querySelector('.day-strip');
  strip.replaceChildren();
  const today = todayString();
  for (let i = 0; i < DAYS_AHEAD; i++) {
    const date = addDays(today, i);
    const button = el('button', 'day-strip-day');
    button.type = 'button';
    button.dataset.offset = i;
    button.setAttribute('role', 'tab');
    button.setAttribute('aria-selected', String(i === offset));
    button.setAttribute('aria-label', formatDateLong(date));
    const weekday = i === 0 ? 'Heute' : WEEKDAYS[isoWeekday(date) - 1].short;
    button.append(el('span', 'day-strip-weekday', weekday), el('span', 'day-strip-num', String(Number(date.slice(8)))));
    strip.append(button);
  }
}

// Bereitet die geladenen Daten so auf, dass das Rendern einfach bleibt.
function buildState(date, { todos, blocks, priorities, events, habits, plannedElsewhere }) {
  const todoById = new Map(todos.map((t) => [t.id, t]));
  const blockByTodo = new Map();
  const blockByHabit = new Map();
  for (const block of blocks) {
    if (block.todo_id) blockByTodo.set(block.todo_id, block);
    if (block.habit_id) blockByHabit.set(block.habit_id, block);
  }
  const top3 = priorities.map((p) => todoById.get(p.todo_id)).filter(Boolean);
  const top3Ids = new Set(top3.map((t) => t.id));
  const openTodos = sortTodos(todos.filter((t) => t.status === 'open'));

  return {
    date, todos, todoById, blocks, blockByTodo, blockByHabit, events, habits, top3, top3Ids,
    openTodos,
    // An anderen Tagen eingeplante To-dos gehören nicht in «Noch nicht eingeplant».
    unplanned: openTodos.filter((t) => !blockByTodo.has(t.id) && !top3Ids.has(t.id) && !plannedElsewhere.has(t.id)),
    untimedHabits: habits.filter((h) => !h.default_time && !blockByHabit.has(h.id)),
  };
}

// Zeitkritische zuerst (nach Deadline), danach die übrigen (neueste zuerst), wie im Dump.
function sortTodos(todos) {
  return [...todos].sort((a, b) => {
    if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
    if (a.due_date) return -1;
    if (b.due_date) return 1;
    return b.created_at.localeCompare(a.created_at);
  });
}

function render() {
  renderTop3();
  renderSummary();
  renderUntimed();
  renderGrid();
  renderTasks();
}

// ---------- Kleine Helfer ----------

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function iconButton(label, path, onClick) {
  const button = el('button', 'icon-btn');
  button.type = 'button';
  button.setAttribute('aria-label', label);
  button.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${path}"/></svg>`;
  button.addEventListener('click', onClick);
  return button;
}

function showError(text) {
  const error = root.querySelector('.plan-error');
  error.textContent = text ?? '';
  error.hidden = !text;
}

// Führt eine Speicher-Aktion aus, lädt danach neu und zeigt bei Fehlern einen Hinweis.
async function run(action) {
  try {
    await action();
    load();
  } catch {
    showError('Speichern hat nicht geklappt. Prüfe deine Verbindung.');
  }
}

function todoMeta(todo) {
  const parts = [];
  if (todo.due_date) {
    const today = todayString();
    parts.push(todo.due_date < today
      ? `überfällig seit ${formatDateShort(todo.due_date)}`
      : `bis ${formatRelativeDate(todo.due_date, today)}`);
  }
  if (todo.goal) parts.push(todo.goal);
  parts.push(formatDuration(todo.duration_min));
  return parts.join(' · ');
}

const blockTimeText = (block) => {
  const start = timeToMinutes(block.start_time);
  return `${minutesToTime(start)}–${minutesToTime(start + block.duration_min)}`;
};

// Vorschlag für den Beginn: heute die nächste Viertelstunde, morgen 08:00.
function defaultStart() {
  if (offset > 0) return 8 * 60;
  const next = Math.ceil(nowMinutes() / SLOT_MIN) * SLOT_MIN;
  return Math.min(Math.max(next, DAY_START_MIN), DAY_END_MIN - SLOT_MIN);
}

const dayLabel = () => (offset < 2 ? `${offset === 0 ? 'Heute' : 'Morgen'}, ` : '') + formatDateLong(state.date);

// ---------- Top 3 ----------

function renderTop3() {
  const box = root.querySelector('.top3');
  box.replaceChildren();
  const list = el('div', 'list top3-list');

  state.top3.forEach((todo, i) => {
    const row = el('div', 'list-row-split');
    if (todo.status === 'done') row.classList.add('is-done');

    const main = el('button', 'list-row top3-row');
    main.type = 'button';
    const text = el('span', 'top3-row-text');
    text.append(el('span', 'list-row-title', todo.title));
    const block = state.blockByTodo.get(todo.id);
    const meta = el('span', 'list-row-meta');
    if (todo.status === 'done') meta.textContent = 'erledigt';
    else if (block) meta.textContent = blockTimeText(block);
    else meta.append(el('span', 'meta-strong', 'noch nicht eingeplant'));
    text.append(meta);
    main.append(rankBadge(i + 1), text);
    main.addEventListener('click', () => scheduleTodo(todo));
    if (todo.status === 'open') makeDraggableToGrid(main, todo.title, (start) => dropTodo(todo, start));
    row.append(main);

    const ids = state.top3.map((t) => t.id);
    if (i > 0) {
      row.append(iconButton('Nach oben', 'M12 19V5M5 12l7-7 7 7', () => {
        [ids[i - 1], ids[i]] = [ids[i], ids[i - 1]];
        run(() => setPriorities(state.date, ids));
      }));
    }
    row.append(iconButton('Aus Top 3 entfernen', 'M6 6l12 12M18 6L6 18', () => {
      run(() => setPriorities(state.date, ids.filter((id) => id !== todo.id)));
    }));
    list.append(row);
  });

  // Freie Plätze
  for (let i = state.top3.length; i < 3; i++) {
    const empty = el('button', 'list-row top3-row top3-empty');
    empty.type = 'button';
    const badge = rankBadge(i + 1);
    badge.classList.add('is-empty');
    empty.append(badge, el('span', 'list-row-title', 'Top 3 wählen'));
    empty.addEventListener('click', pickTop3);
    list.append(empty);
  }
  box.append(list);
}

// Runde Nummer 1–3 vor jeder Top-3-Zeile
function rankBadge(rank) {
  const badge = el('span', 'rank', String(rank));
  badge.setAttribute('aria-hidden', 'true');
  return badge;
}

function pickTop3() {
  const candidates = state.openTodos.filter((t) => !state.top3Ids.has(t.id));
  openListSheet({
    heading: 'Top 3 wählen',
    subtitle: 'Was ist an diesem Tag am wichtigsten?',
    emptyText: 'Keine offenen Aufgaben. Leg im Dump neue an.',
    items: candidates.map((todo) => ({
      title: todo.title,
      meta: todoMeta(todo),
      onSelect: () => run(() => setPriorities(state.date, [...state.top3.map((t) => t.id), todo.id])),
    })),
  });
}

// ---------- Summe & Routinen ohne Zeit ----------

function plannedItems() {
  return layoutItems().filter((item) => item.kind !== 'event');
}

function renderSummary() {
  const box = root.querySelector('.plan-summary');
  box.replaceChildren();
  const total = plannedItems().reduce((sum, item) => sum + (item.end - item.start), 0);

  box.append(el('p', 'plan-total', total ? `Geplant: ${formatDuration(total)}` : 'Noch nichts geplant.'));
  if (total > OVERPLANNED_MIN) {
    box.append(el('p', 'plan-hint', 'Das ist viel für einen Tag. Pläne werden oft zu optimistisch.'));
  }
}

function renderUntimed() {
  const box = root.querySelector('.plan-untimed');
  box.replaceChildren();
  if (!state.untimedHabits.length) return;

  box.append(el('p', 'plan-untimed-label', 'Routinen ohne Zeit'));
  const chips = el('div', 'plan-untimed-chips');
  for (const habit of state.untimedHabits) {
    const chip = el('button', 'pill', habit.title);
    chip.type = 'button';
    chip.addEventListener('click', () => scheduleHabit(habit));
    makeDraggableToGrid(chip, habit.title, (start) => dropHabit(habit, start));
    chips.append(chip);
  }
  box.append(chips);
}

// ---------- Raster ----------

// Alle Einträge des Tages mit Beginn/Ende in Minuten.
function layoutItems() {
  const items = [];

  for (const event of state.events) {
    const start = timeToMinutes(event.start_time);
    const end = event.end_time ? timeToMinutes(event.end_time) : start + 60;
    items.push({ kind: 'event', start, end, title: event.title, event });
  }

  for (const block of state.blocks) {
    const start = timeToMinutes(block.start_time);
    const item = { start, end: start + block.duration_min, block };
    if (block.todo_id) {
      const todo = state.todoById.get(block.todo_id);
      if (!todo) continue;
      items.push({ ...item, kind: 'todo', title: todo.title, todo });
    } else {
      const habit = state.habits.find((h) => h.id === block.habit_id);
      if (!habit) continue;
      items.push({ ...item, kind: 'habit', title: habit.title, habit });
    }
  }

  // Routinen mit Standardzeit erscheinen automatisch, solange sie keinen eigenen Block haben.
  for (const habit of state.habits) {
    if (!habit.default_time || state.blockByHabit.has(habit.id)) continue;
    const start = timeToMinutes(habit.default_time);
    items.push({ kind: 'habit', start, end: start + habit.duration_min, title: habit.title, habit, virtual: true });
  }
  return items;
}

// Überlappende Einträge nebeneinander: Jeder Eintrag bekommt eine Spalte,
// und alle Einträge einer zusammenhängenden Gruppe teilen sich die Breite.
function assignColumns(items) {
  const sorted = [...items].sort((a, b) => a.start - b.start || b.end - a.end);
  let group = [];
  let columns = [];   // Ende-Zeit des letzten Eintrags je Spalte
  let groupEnd = -1;

  const closeGroup = () => {
    for (const item of group) item.cols = columns.length;
    group = [];
    columns = [];
  };

  for (const item of sorted) {
    if (item.start >= groupEnd) closeGroup();
    let col = columns.findIndex((end) => end <= item.start);
    if (col === -1) col = columns.length;
    columns[col] = item.end;
    item.col = col;
    group.push(item);
    groupEnd = Math.max(groupEnd, item.end);
  }
  closeGroup();
  return sorted;
}

const minuteToY = (minute) => ((minute - DAY_START_MIN) / SLOT_MIN) * SLOT_PX;

// Bildschirm-Y → Minute, auf 15 Minuten eingerastet und auf das Raster begrenzt.
function minuteAtY(clientY) {
  const grid = root.querySelector('.plan-grid');
  const y = clientY - grid.getBoundingClientRect().top;
  const minute = DAY_START_MIN + Math.floor(y / SLOT_PX) * SLOT_MIN;
  return Math.min(Math.max(minute, DAY_START_MIN), DAY_END_MIN - SLOT_MIN);
}

function renderGrid() {
  const grid = root.querySelector('.plan-grid');
  grid.replaceChildren();
  grid.style.height = `${minuteToY(DAY_END_MIN)}px`;

  // Stundenlinien mit Beschriftung
  for (let minute = DAY_START_MIN; minute <= DAY_END_MIN; minute += 60) {
    const line = el('div', 'plan-hour');
    line.style.top = `${minuteToY(minute)}px`;
    line.append(el('span', 'plan-hour-label', minutesToTime(minute)));
    grid.append(line);
  }

  const lanes = el('div', 'plan-lanes');
  for (const item of assignColumns(layoutItems())) {
    lanes.append(renderBlock(item));
  }
  grid.append(lanes);

  // Linie für die aktuelle Uhrzeit
  const now = nowMinutes();
  if (offset === 0 && now >= DAY_START_MIN && now <= DAY_END_MIN) {
    const line = el('div', 'plan-now');
    line.style.top = `${minuteToY(now)}px`;
    line.setAttribute('aria-hidden', 'true');
    grid.append(line);
  }

  if (scrollPending) {
    scrollPending = false;
    const firstItem = Math.min(...layoutItems().map((i) => i.start), 8 * 60);
    const target = offset === 0 ? now : firstItem;
    // eine Stunde Vorlauf über dem Ziel
    root.querySelector('.plan-scroll').scrollTop = Math.max(minuteToY(target - 60), 0);
  }
}

function renderBlock(item) {
  // Ausserhalb des Rasters liegende Teile abschneiden, aber mindestens einen Slot zeigen.
  const start = Math.min(Math.max(item.start, DAY_START_MIN), DAY_END_MIN - SLOT_MIN);
  const end = Math.max(Math.min(item.end, DAY_END_MIN), start + SLOT_MIN);

  const block = el('button', `plan-block kind-${item.kind}`);
  block.type = 'button';
  if (item.todo && state.top3Ids.has(item.todo.id)) block.classList.add('is-top3');
  if (item.todo?.status === 'done') block.classList.add('is-done');
  const height = minuteToY(end) - minuteToY(start);
  if (height < 2 * SLOT_PX) block.classList.add('is-short');

  block.style.top = `${minuteToY(start)}px`;
  block.style.height = `${height}px`;
  block.style.left = `${(item.col / item.cols) * 100}%`;
  block.style.width = `${100 / item.cols}%`;

  block.append(el('span', 'plan-block-title', item.title));
  block.append(el('span', 'plan-block-time', `${minutesToTime(item.start)}–${minutesToTime(item.end)}`));

  block.addEventListener('click', () => {
    if (block.dataset.dragged) {
      delete block.dataset.dragged;
      return;
    }
    if (item.kind === 'event') openEventSheet(item.event, load);
    else if (item.kind === 'todo') scheduleTodo(item.todo);
    else scheduleHabit(item.habit);
  });

  // Termine sind fix. Erledigte Aufgaben werden nicht mehr verschoben.
  if (item.kind !== 'event' && item.todo?.status !== 'done') makeBlockMovable(block, item);
  return block;
}

// ---------- Liste «Noch nicht eingeplant» ----------

function renderTasks() {
  const box = root.querySelector('.plan-task-list');
  box.replaceChildren();

  if (!state.unplanned.length) {
    box.append(el('p', 'status-text', 'Alle offenen Aufgaben sind eingeplant oder in den Top 3.'));
    return;
  }

  const list = el('div', 'list');
  for (const todo of state.unplanned) {
    const row = el('button', 'list-row');
    row.type = 'button';
    row.append(el('span', 'list-row-title', todo.title), el('span', 'list-row-meta', todoMeta(todo)));
    row.addEventListener('click', () => scheduleTodo(todo));
    makeDraggableToGrid(row, todo.title, (start) => dropTodo(todo, start));
    list.append(row);
  }
  box.append(list);
}

// ---------- Einplanen per Sheet ----------

function scheduleTodo(todo, start) {
  if (todo.status === 'done') return;
  const block = state.blockByTodo.get(todo.id);
  openScheduleSheet({
    heading: todo.title,
    subtitle: dayLabel(),
    start: start ?? (block ? timeToMinutes(block.start_time) : defaultStart()),
    duration: block?.duration_min ?? todo.duration_min,
    save: (start_time, duration_min) => (block
      ? updateBlock(block.id, { start_time, duration_min })
      : createBlock({ date: state.date, start_time, duration_min, todo_id: todo.id })),
    remove: block ? () => deleteBlock(block.id) : null,
    onChange: load,
  });
}

function scheduleHabit(habit, start) {
  const block = state.blockByHabit.get(habit.id);
  const defaultTime = habit.default_time ? timeToMinutes(habit.default_time) : null;
  openScheduleSheet({
    heading: habit.title,
    subtitle: `Routine · ${dayLabel()}`,
    start: start ?? (block ? timeToMinutes(block.start_time) : defaultTime ?? defaultStart()),
    duration: block?.duration_min ?? habit.duration_min,
    save: (start_time, duration_min) => (block
      ? updateBlock(block.id, { start_time, duration_min })
      : createBlock({ date: state.date, start_time, duration_min, habit_id: habit.id })),
    // Ein eigener Block überschreibt die Standardzeit. Entfernen setzt sie wieder ein.
    remove: block ? () => deleteBlock(block.id) : null,
    removeLabel: habit.default_time ? `Zurück auf ${formatTime(habit.default_time)}` : undefined,
    onChange: load,
  });
}

// Tipp auf einen leeren Platz: Aufgabe oder Routine ohne Zeit auswählen.
function pickForSlot(start) {
  const unplannedTop3 = state.top3.filter((t) => t.status === 'open' && !state.blockByTodo.has(t.id));
  const items = [
    ...unplannedTop3.map((todo) => ({ title: todo.title, meta: `Top 3 · ${todoMeta(todo)}`, onSelect: () => scheduleTodo(todo, start) })),
    ...state.unplanned.map((todo) => ({ title: todo.title, meta: todoMeta(todo), onSelect: () => scheduleTodo(todo, start) })),
    ...state.untimedHabits.map((habit) => ({ title: habit.title, meta: 'Routine', onSelect: () => scheduleHabit(habit, start) })),
  ];
  openListSheet({
    heading: `Ab ${minutesToTime(start)} einplanen`,
    emptyText: 'Alles ist schon eingeplant.',
    items,
  });
}

// ---------- Drag-and-drop (nur Maus) ----------

function dropTodo(todo, start) {
  const start_time = minutesToTime(start);
  const block = state.blockByTodo.get(todo.id);
  run(() => (block
    ? updateBlock(block.id, { start_time })
    : createBlock({ date: state.date, start_time, duration_min: todo.duration_min, todo_id: todo.id })));
}

function dropHabit(habit, start) {
  const start_time = minutesToTime(start);
  const block = state.blockByHabit.get(habit.id);
  run(() => (block
    ? updateBlock(block.id, { start_time })
    : createBlock({ date: state.date, start_time, duration_min: habit.duration_min, habit_id: habit.id })));
}

// Ein Element (Listenzeile, Chip) lässt sich mit der Maus ins Raster ziehen.
// Eine Kopie («Ghost») folgt dem Mauszeiger und zeigt die eingerastete Startzeit.
function makeDraggableToGrid(source, title, onDrop) {
  source.addEventListener('pointerdown', (down) => {
    if (down.pointerType !== 'mouse' || down.button !== 0) return;
    source.setPointerCapture(down.pointerId);
    let ghost = null;

    const move = (e) => {
      if (!ghost) {
        if (Math.hypot(e.clientX - down.clientX, e.clientY - down.clientY) < DRAG_THRESHOLD_PX) return;
        ghost = el('div', 'drag-ghost');
        ghost.append(el('span', 'plan-block-title', title), el('span', 'plan-block-time'));
        document.body.append(ghost);
      }
      ghost.style.transform = `translate(${e.clientX + 12}px, ${e.clientY + 12}px)`;
      ghost.querySelector('.plan-block-time').textContent =
        overGrid(e) ? `ab ${minutesToTime(minuteAtY(e.clientY))}` : 'ins Raster ziehen';
    };

    const up = (e) => {
      source.removeEventListener('pointermove', move);
      source.removeEventListener('pointerup', up);
      source.removeEventListener('pointercancel', up);
      if (!ghost) return;
      ghost.remove();
      // Der Browser löst nach dem Loslassen noch einen Klick aus. Den einmal ignorieren.
      source.addEventListener('click', (c) => c.stopImmediatePropagation(), { capture: true, once: true });
      if (e.type === 'pointerup' && overGrid(e)) onDrop(minuteAtY(e.clientY));
    };

    source.addEventListener('pointermove', move);
    source.addEventListener('pointerup', up);
    source.addEventListener('pointercancel', up);
  });
}

function overGrid(e) {
  const rect = root.querySelector('.plan-scroll').getBoundingClientRect();
  return e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
}

// Ein Block im Raster lässt sich mit der Maus nach oben/unten verschieben, eingerastet auf 15 Minuten.
function makeBlockMovable(blockEl, item) {
  blockEl.addEventListener('pointerdown', (down) => {
    if (down.pointerType !== 'mouse' || down.button !== 0) return;
    blockEl.setPointerCapture(down.pointerId);
    const duration = item.end - item.start;
    const maxStart = DAY_END_MIN - duration;
    let newStart = item.start;
    let dragging = false;

    const move = (e) => {
      const dy = e.clientY - down.clientY;
      if (!dragging && Math.abs(dy) < DRAG_THRESHOLD_PX) return;
      dragging = true;
      blockEl.classList.add('is-dragging');
      const snapped = item.start + Math.round(dy / SLOT_PX) * SLOT_MIN;
      newStart = Math.min(Math.max(snapped, DAY_START_MIN), maxStart);
      blockEl.style.top = `${minuteToY(newStart)}px`;
      blockEl.querySelector('.plan-block-time').textContent =
        `${minutesToTime(newStart)}–${minutesToTime(newStart + duration)}`;
    };

    const up = () => {
      blockEl.removeEventListener('pointermove', move);
      blockEl.removeEventListener('pointerup', up);
      blockEl.removeEventListener('pointercancel', up);
      if (!dragging) return;
      blockEl.dataset.dragged = '1';
      blockEl.classList.remove('is-dragging');
      if (newStart === item.start) return;

      const start_time = minutesToTime(newStart);
      if (item.block) run(() => updateBlock(item.block.id, { start_time }));
      else run(() => createBlock({ date: state.date, start_time, duration_min: duration, habit_id: item.habit.id }));
    };

    blockEl.addEventListener('pointermove', move);
    blockEl.addEventListener('pointerup', up);
    blockEl.addEventListener('pointercancel', up);
  });
}
