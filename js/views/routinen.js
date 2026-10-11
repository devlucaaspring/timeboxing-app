// Screen «Routinen & Termine»: zwei Segmente zum Verwalten beider Typen.

import { listHabits, updateHabit, listUpcomingEvents } from '../data.js';
import { todayString, formatRelativeDate, formatTime, formatDuration, WEEKDAYS } from '../date.js';
import { openHabitSheet, openEventSheet } from './item-sheet.js';

const SEGMENTS = {
  routinen: { newLabel: 'Neue Routine', load: loadHabits, create: () => openHabitSheet(null, reload) },
  termine: { newLabel: 'Neuer Termin', load: loadEvents, create: () => openEventSheet(null, reload) },
};

let segment = 'routinen';
let contentEl;
let newButton;
let loadCount = 0; // verhindert, dass eine ältere, langsamere Antwort eine neuere überschreibt

export function enter(screen) {
  if (!contentEl) setup(screen);
  reload();
}

function setup(screen) {
  const body = screen.querySelector('.screen-body');
  body.innerHTML = `
    <div class="segmented" role="tablist" aria-label="Ansicht">
      <button type="button" role="tab" data-segment="routinen">Routinen</button>
      <button type="button" role="tab" data-segment="termine">Termine</button>
    </div>
    <button type="button" class="btn btn-primary btn-block" data-action="new"></button>
    <p class="form-error" role="alert" hidden></p>
    <div class="segment-content"></div>`;

  contentEl = body.querySelector('.segment-content');
  newButton = body.querySelector('[data-action="new"]');

  body.querySelectorAll('[data-segment]').forEach((button) => {
    button.addEventListener('click', () => {
      segment = button.dataset.segment;
      contentEl.replaceChildren();
      reload();
    });
  });
  newButton.addEventListener('click', () => SEGMENTS[segment].create());
}

function reload() {
  document.querySelectorAll('.segmented [data-segment]').forEach((button) => {
    button.setAttribute('aria-selected', String(button.dataset.segment === segment));
  });
  newButton.textContent = SEGMENTS[segment].newLabel;
  showError(null);
  load(SEGMENTS[segment].load);
}

async function load(loader) {
  const current = ++loadCount;
  if (!contentEl.children.length) contentEl.innerHTML = '<p class="status-text">Lädt …</p>';

  try {
    const render = await loader();
    if (current === loadCount) {
      contentEl.replaceChildren();
      render();
    }
  } catch {
    if (current === loadCount) renderLoadError();
  }
}

// Kleiner Helfer: Element mit Klasse und reinem Text (nie HTML) erzeugen.
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function showError(text) {
  const error = document.querySelector('[data-route="routinen"] .form-error');
  error.textContent = text ?? '';
  error.hidden = !text;
}

function renderEmpty(title, text) {
  const box = el('div', 'empty-state');
  box.append(el('p', 'empty-state-title', title), el('p', 'subtitle', text));
  contentEl.append(box);
}

function renderLoadError() {
  contentEl.replaceChildren();
  renderEmpty('Konnte nicht geladen werden.', 'Prüfe deine Verbindung und versuch es noch einmal.');
  const retry = el('button', 'btn btn-secondary', 'Erneut laden');
  retry.type = 'button';
  retry.addEventListener('click', reload);
  contentEl.querySelector('.empty-state').append(retry);
}

// ---------- Routinen ----------

async function loadHabits() {
  const habits = await listHabits();
  return () => {
    if (!habits.length) {
      renderEmpty('Noch keine Routinen.',
        'Routinen sind Gewohnheiten an festen Wochentagen, zum Beispiel Sport am Montag, Mittwoch und Freitag.');
      return;
    }
    const list = el('div', 'list');
    for (const habit of habits) list.append(renderHabitRow(habit));
    contentEl.append(list);
  };
}

function renderHabitRow(habit) {
  const row = el('div', 'list-row-split');
  if (!habit.active) row.classList.add('is-inactive');

  const main = el('button', 'list-row');
  main.type = 'button';
  main.append(el('span', 'list-row-title', habit.title));

  const meta = [
    habit.default_time ? formatTime(habit.default_time) : 'ohne feste Zeit',
    formatDuration(habit.duration_min),
  ];
  if (habit.goal) meta.push(habit.goal);
  main.append(el('span', 'list-row-meta', meta.join(' · ')));
  main.append(renderWeekdays(habit.weekdays));
  main.addEventListener('click', () => openHabitSheet(habit, reload));

  // Aktiv-Schalter: eine Checkbox, die wie ein Schalter aussieht.
  const toggle = el('label', 'switch');
  const input = el('input');
  input.type = 'checkbox';
  input.setAttribute('role', 'switch');
  input.setAttribute('aria-label', `${habit.title} aktiv`);
  input.checked = habit.active;
  toggle.append(input, el('span', 'switch-track'));

  input.addEventListener('change', async () => {
    showError(null);
    row.classList.toggle('is-inactive', !input.checked);
    try {
      await updateHabit(habit.id, { active: input.checked });
      habit.active = input.checked;
    } catch {
      input.checked = habit.active;
      row.classList.toggle('is-inactive', !habit.active);
      showError('Ändern hat nicht geklappt. Prüfe deine Verbindung.');
    }
  });

  row.append(main, toggle);
  return row;
}

function renderWeekdays(weekdays) {
  const days = el('span', 'weekday-chips');
  const active = WEEKDAYS.filter((d) => weekdays.includes(d.iso));
  days.setAttribute('aria-label', active.length === 7 ? 'täglich' : active.map((d) => d.short).join(', '));
  for (const day of WEEKDAYS) {
    const chip = el('span', 'weekday-chip', day.short);
    chip.setAttribute('aria-hidden', 'true');
    if (weekdays.includes(day.iso)) chip.classList.add('is-on');
    days.append(chip);
  }
  return days;
}

// ---------- Termine ----------

async function loadEvents() {
  const events = await listUpcomingEvents();
  return () => {
    if (!events.length) {
      renderEmpty('Keine kommenden Termine.', 'Termine haben ein festes Datum und eine Uhrzeit und erscheinen automatisch im Tagesplan.');
      return;
    }

    // Nach Datum gruppieren. Die Liste kommt bereits sortiert aus der Datenbank.
    const today = todayString();
    const byDate = new Map();
    for (const event of events) {
      if (!byDate.has(event.date)) byDate.set(event.date, []);
      byDate.get(event.date).push(event);
    }
    for (const [date, dayEvents] of byDate) {
      const group = el('section', 'list-group');
      const label = formatRelativeDate(date, today);
      group.append(el('h2', 'list-label', label[0].toUpperCase() + label.slice(1)));

      const list = el('div', 'list');
      for (const event of dayEvents) list.append(renderEventRow(event));
      group.append(list);
      contentEl.append(group);
    }
  };
}

function renderEventRow(event) {
  const row = el('button', 'list-row');
  row.type = 'button';
  row.append(el('span', 'list-row-title', event.title));
  const time = event.end_time
    ? `${formatTime(event.start_time)}–${formatTime(event.end_time)}`
    : formatTime(event.start_time);
  row.append(el('span', 'list-row-meta', time));
  row.addEventListener('click', () => openEventSheet(event, reload));
  return row;
}
