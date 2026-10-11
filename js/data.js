// Alle Datenbank-Zugriffe. Die Views rufen nur diese Funktionen auf, nie Supabase direkt.
// Bei einem Fehler werfen die Funktionen ihn weiter, die View zeigt dann einen Hinweis.

import { supabase } from './supabase.js';
import { todayString } from './date.js';

const TODO_FIELDS = 'id, title, notes, due_date, duration_min, target_amount, unit, status, created_at';

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
