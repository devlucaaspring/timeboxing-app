-- Schema der Time-Boxing-App
-- Im Supabase-Dashboard unter «SQL Editor» einfügen und einmal ausführen.

-- ---------- Tabellen ----------

-- Einmalige To-dos
create table todos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users,
  title text not null,
  notes text,
  due_date date,
  duration_min int not null default 30 check (duration_min % 15 = 0),
  goal text,                             -- «Fertig, wenn …», Freitext
  status text not null default 'open' check (status in ('open','done')),
  done_at timestamptz,
  created_at timestamptz not null default now()
);

-- Termine
create table events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users,
  title text not null,
  notes text,
  date date not null,
  start_time time not null,
  end_time time,
  created_at timestamptz not null default now()
);

-- Routinen
create table habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users,
  title text not null,
  weekdays smallint[] not null,          -- ISO 1=Mo … 7=So
  default_time time,
  duration_min int not null default 15 check (duration_min % 15 = 0),
  goal text,                             -- «Fertig, wenn …», Freitext
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Erledigte Routinen pro Tag
create table habit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users,
  habit_id uuid not null references habits on delete cascade,
  date date not null,
  done_at timestamptz not null default now(),
  unique (habit_id, date)
);

-- Zeitblöcke im Tagesplan (mehrere pro Zeitraum erlaubt)
create table plan_blocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users,
  date date not null,
  start_time time not null,              -- auf 15 min gerundet
  duration_min int not null check (duration_min % 15 = 0),
  todo_id uuid references todos on delete cascade,
  habit_id uuid references habits on delete cascade,
  check (num_nonnulls(todo_id, habit_id) = 1)
);

-- Top 3 pro Tag
create table day_priorities (
  user_id uuid not null default auth.uid() references auth.users,
  date date not null,
  rank smallint not null check (rank between 1 and 3),
  todo_id uuid not null references todos on delete cascade,
  primary key (user_id, date, rank),
  unique (user_id, date, todo_id)
);

-- ---------- Indizes ----------

create index on todos (user_id, status);
create index on events (user_id, date);
create index on habits (user_id);
create index on habit_logs (user_id, date);
create index on plan_blocks (user_id, date);
create index on plan_blocks (todo_id);
create index on plan_blocks (habit_id);
create index on day_priorities (todo_id);

-- ---------- Zugriffsrechte ----------
-- Nur angemeldete Nutzer dürfen überhaupt auf die Tabellen zugreifen,
-- und RLS beschränkt sie zusätzlich auf ihre eigenen Zeilen.

grant select, insert, update, delete
  on todos, events, habits, habit_logs, plan_blocks, day_priorities
  to authenticated;

-- ---------- Row Level Security ----------
-- «for all» gilt für select, insert, update und delete.
-- using = welche Zeilen man sehen/ändern darf, with check = welche Zeilen man schreiben darf.

alter table todos          enable row level security;
alter table events         enable row level security;
alter table habits         enable row level security;
alter table habit_logs     enable row level security;
alter table plan_blocks    enable row level security;
alter table day_priorities enable row level security;

create policy "Eigene Zeilen" on todos for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "Eigene Zeilen" on events for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "Eigene Zeilen" on habits for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "Eigene Zeilen" on habit_logs for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "Eigene Zeilen" on plan_blocks for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "Eigene Zeilen" on day_priorities for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
