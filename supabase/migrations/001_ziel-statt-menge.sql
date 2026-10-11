-- Migration: Menge (Zahl + Einheit) wird zu einem freien Zielfeld «Fertig, wenn …».
-- Einmal im Supabase-SQL-Editor ausführen. Bestehende Mengen werden ins neue Feld übernommen.
-- schema.sql enthält diesen Stand bereits (für eine neue, leere Datenbank).

alter table todos add column goal text;
update todos
  set goal = nullif(trim(concat_ws(' ', target_amount::text, unit)), '')
  where target_amount is not null or unit is not null;
alter table todos
  drop column target_amount,
  drop column unit,
  drop column actual_amount;

alter table habits add column goal text;
update habits
  set goal = nullif(trim(concat_ws(' ', target_amount::text, unit)), '')
  where target_amount is not null or unit is not null;
alter table habits
  drop column target_amount,
  drop column unit;

alter table habit_logs drop column actual_amount;
