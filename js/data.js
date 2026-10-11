// Alle Datenbank-Zugriffe. Die Views rufen nur diese Funktionen auf, nie Supabase direkt.
// Bei einem Fehler werfen die Funktionen ihn weiter, die View zeigt dann einen Hinweis.

import { supabase } from './supabase.js';
import { todayString, isoWeekday } from './date.js';

const TODO_FIELDS = 'id, title, notes, due_date, duration_min, goal, status, created_at';
const HABIT_FIELDS = 'id, title, weekdays, default_time, duration_min, goal, active, created_at';
const EVENT_FIELDS = 'id, title, notes, date, start_time, end_time';

// Supabase liefert { data, error } zurück. Das macht daraus «Ergebnis oder Fehler werfen».
function unwrap({ data, error }) {
  if (error) throw error;
  return data;
}

// ---------- To-dos ----------

// Dump = offene To-dos ohne Zeitblock und ohne Top-3-Eintrag ab heute.
// Sortierung: zuerst zeitkritische (nach Deadline), danach die übrigen (neueste zuerst).
export async function listDumpTodos() {
  const today = todayString();
  const [todos, blocks, priorities] = await Promise.all([
    supabase.from('todos').select(TODO_FIELDS).eq('status', 'open'),
    supabase.from('plan_blocks').select('todo_id').gte('date', today).not('todo_id', 'is', null),
    supabase.from('day_priorities').select('todo_id').gte('date', today),
  ]).then((results) => results.map(unwrap));

  const planned = new Set([...blocks, ...priorities].map((row) => row.todo_id));

  return todos
    .filter((todo) => !planned.has(todo.id))
    .sort((a, b) => {
      if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
      if (a.due_date) return -1;
      if (b.due_date) return 1;
      return b.created_at.localeCompare(a.created_at);
    });
}

export async function createTodo(title) {
  return unwrap(await supabase.from('todos').insert({ title }).select(TODO_FIELDS).single());
}

export async function updateTodo(id, fields) {
  return unwrap(await supabase.from('todos').update(fields).eq('id', id).select(TODO_FIELDS).single());
}

export async function deleteTodo(id) {
  unwrap(await supabase.from('todos').delete().eq('id', id));
}

export async function completeTodo(id) {
  return updateTodo(id, { status: 'done', done_at: new Date().toISOString() });
}

// ---------- Tagesplan ----------

// Alles, was der Planen-Screen für einen Tag braucht, in einem Aufruf.
export async function getPlanDay(date) {
  const [openTodos, blocks, priorities, events, habits] = await Promise.all([
    supabase.from('todos').select(TODO_FIELDS).eq('status', 'open'),
    supabase.from('plan_blocks').select('id, date, start_time, duration_min, todo_id, habit_id').eq('date', date),
    supabase.from('day_priorities').select('rank, todo_id').eq('date', date).order('rank'),
    supabase.from('events').select(EVENT_FIELDS).eq('date', date).order('start_time'),
    // Routinen des Tages: aktiv und der Wochentag ist in weekdays enthalten
    supabase.from('habits').select(HABIT_FIELDS).eq('active', true).contains('weekdays', [isoWeekday(date)]),
  ]).then((results) => results.map(unwrap));

  // Erledigte To-dos, die an diesem Tag noch in Top 3 oder im Plan stehen, ebenfalls laden.
  const known = new Set(openTodos.map((t) => t.id));
  const missing = [...blocks, ...priorities]
    .map((row) => row.todo_id)
    .filter((id) => id && !known.has(id));
  const doneTodos = missing.length
    ? unwrap(await supabase.from('todos').select(TODO_FIELDS).in('id', [...new Set(missing)]))
    : [];

  return { todos: [...openTodos, ...doneTodos], blocks, priorities, events, habits };
}

// Top 3 eines Tages komplett neu setzen (Reihenfolge = Rang 1–3).
// Erst löschen, dann neu einfügen, weil Rang und To-do eindeutig sein müssen.
export async function setPriorities(date, todoIds) {
  unwrap(await supabase.from('day_priorities').delete().eq('date', date));
  if (!todoIds.length) return;
  unwrap(await supabase.from('day_priorities')
    .insert(todoIds.map((todo_id, i) => ({ date, rank: i + 1, todo_id }))));
}

export async function createBlock(fields) {
  return unwrap(await supabase.from('plan_blocks').insert(fields).select().single());
}

export async function updateBlock(id, fields) {
  return unwrap(await supabase.from('plan_blocks').update(fields).eq('id', id).select().single());
}

export async function deleteBlock(id) {
  unwrap(await supabase.from('plan_blocks').delete().eq('id', id));
}

// ---------- Routinen ----------

// Aktive zuerst, dann nach Standardzeit (ohne Zeit am Ende), dann alphabetisch.
export async function listHabits() {
  const habits = unwrap(await supabase.from('habits').select(HABIT_FIELDS));
  return habits.sort((a, b) =>
    (b.active - a.active)
    || (a.default_time ?? '99').localeCompare(b.default_time ?? '99')
    || a.title.localeCompare(b.title, 'de-CH'));
}

export async function createHabit(fields) {
  return unwrap(await supabase.from('habits').insert(fields).select(HABIT_FIELDS).single());
}

export async function updateHabit(id, fields) {
  return unwrap(await supabase.from('habits').update(fields).eq('id', id).select(HABIT_FIELDS).single());
}

export async function deleteHabit(id) {
  unwrap(await supabase.from('habits').delete().eq('id', id));
}

// ---------- Termine ----------

// Kommende Termine ab heute, chronologisch. Vergangene Tage verschwinden.
export async function listUpcomingEvents() {
  return unwrap(await supabase.from('events').select(EVENT_FIELDS)
    .gte('date', todayString())
    .order('date')
    .order('start_time'));
}

export async function createEvent(fields) {
  return unwrap(await supabase.from('events').insert(fields).select(EVENT_FIELDS).single());
}

export async function updateEvent(id, fields) {
  return unwrap(await supabase.from('events').update(fields).eq('id', id).select(EVENT_FIELDS).single());
}

export async function deleteEvent(id) {
  unwrap(await supabase.from('events').delete().eq('id', id));
}
