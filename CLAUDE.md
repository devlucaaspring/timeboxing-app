# CLAUDE.md – Time-Boxing-App

## 1. Projektüberblick

Eine sehr einfache To-do-App nach dem Time-Boxing-Prinzip in drei Schritten:

1. **Brain Dump** – alle To-dos ungefiltert in eine Liste schreiben.
2. **Top 3** – die drei wichtigsten Aufgaben des Tages auswählen.
3. **Tagesplan** – Aufgaben in ein Zeitraster mit 15-Minuten-Schritten legen.

Dazu kommen **Termine** und **Routinen**, damit der Tag eine Struktur bekommt, und ein **Dashboard («Heute»)**, das jederzeit zeigt, was gerade ansteht.

- **Nutzer:** nur eine Person (der Eigentümer). Es gibt keine Registrierung für andere.
- **Plattform:** Web-App, die per «Zum Home-Bildschirm hinzufügen» installiert wird (PWA). Mobile first, auf dem Desktop ebenfalls voll nutzbar.
- **Offline:** nicht nötig. Die App braucht eine Internetverbindung.
- **Sprache der UI:** Deutsch (Schweizer Schreibweise: «ss» statt «ß»).
- **Leitprinzip:** so einfach wie möglich. Lieber eine Funktion weglassen als den Ablauf verkomplizieren.

## 2. Arbeitsweise für Claude Code

- Der Eigentümer hat Grundkenntnisse in HTML, CSS und JavaScript. Erkläre neue Konzepte kurz und verständlich, wenn du sie einführst.
- **Vorschläge vor der Umsetzung absprechen:** Bei Unklarheiten oder Abweichungen von diesem Dokument zuerst fragen, nicht eigenständig entscheiden.
- In den Phasen aus Abschnitt 12 arbeiten. Nach jeder Phase kurz zusammenfassen, was fertig ist und wie man es testet.
- Keine neuen Abhängigkeiten ohne Rückfrage.
- Für jede UI-Arbeit gelten die Design-Prinzipien in `design-principles.md` (siehe Abschnitt 10).
- Git: kleine, verständliche Commits mit deutscher Commit-Message.

## 3. Tech-Stack

| Bereich | Wahl |
|---|---|
| Frontend | HTML, CSS, JavaScript (ES-Module), **kein Framework, kein Build-Tool** |
| Backend / DB / Auth | Supabase (Postgres + Auth + Row Level Security) |
| Supabase-Client | `@supabase/supabase-js` v2 als ES-Modul über ein CDN, **Version fest pinnen** |
| Hosting | Netlify, statisches Deployment ohne Build-Befehl, Publish-Verzeichnis = Projektwurzel |
| Schrift | Inter über Google Fonts |
| Zeitzone | `Europe/Zurich`; Datumswerte als lokale Datums-Strings `YYYY-MM-DD` |

Der Supabase-«anon key» darf im Frontend stehen. Die Sicherheit kommt ausschliesslich über RLS. Den `service_role`-Key **nie** im Frontend verwenden.

### Ordnerstruktur

```
/
├── index.html            # einzige HTML-Seite, alle Screens als <section>
├── manifest.webmanifest
├── icons/                # App-Icons 192, 512, apple-touch-icon 180
├── css/
│   └── styles.css        # Design-Tokens als CSS-Variablen + Komponenten
├── js/
│   ├── app.js            # Einstieg, Auth-Check, Router-Start
│   ├── config.js         # SUPABASE_URL, SUPABASE_ANON_KEY
│   ├── supabase.js       # Client-Instanz
│   ├── router.js         # Hash-Router (#/heute, #/dump, …)
│   ├── data.js           # alle DB-Zugriffe (CRUD-Funktionen)
│   ├── date.js           # Datums-/Zeit-Helfer (Slots, Wochentage)
│   ├── feedback.js       # Abhak-Animation + Vibration
│   └── views/
│       ├── login.js
│       ├── heute.js
│       ├── dump.js
│       ├── planen.js
│       ├── routinen.js
│       └── item-sheet.js # Bearbeiten-Sheet (Modal)
├── supabase/
│   └── schema.sql        # Tabellen, Indizes, RLS-Policies
└── netlify.toml
```

## 4. Die drei Aufgabentypen

| Typ | Beschreibung | Wiederkehrend | Feste Zeit |
|---|---|---|---|
| **To-do** (einmalig) | Aufgabe, die einmal erledigt wird | nein | optional über Tagesplan |
| **Termin** | Ereignis mit Datum und Uhrzeit | nein | ja (Pflicht) |
| **Routine** | Gewohnheit an festen Wochentagen | ja | optional (Standardzeit) |

Weitere Typen sind vorerst **nicht** vorgesehen.

### Felder

**To-do**
- `title` (Pflicht)
- `due_date` (optional), also eine Deadline. Ein To-do mit Deadline gilt als **zeitkritisch**.
- `target_amount` + `unit` (optional): geplante Menge, z. B. `20` + `Seiten`
- `duration_min` (optional, Standard 30): geschätzte Dauer, Vielfaches von 15
- `notes` (optional)

**Termin**
- `title`, `date`, `start_time` (Pflicht)
- `end_time` (optional, Standard: Start + 60 min)
- `notes` (optional)

**Routine**
- `title` (Pflicht)
- `weekdays`: Array mit ISO-Wochentagen 1–7 (Mo = 1). **Alle 7 = täglich.** Wöchentliche Routinen = einzelne feste Tage, z. B. `[1,3,5]` für Mo/Mi/Fr.
- `default_time` (optional), `duration_min` (Standard 15)
- `target_amount` + `unit` (optional), z. B. `10` + `Minuten`
- `active` (bool)

### Mengenfeld

Wenn ein To-do oder eine Routine eine Zielmenge hat, wird sie überall angezeigt («Buch lesen · 20 Seiten»). Beim Abhaken ist die Menge mit dem Zielwert vorbelegt und kann mit einem Tipp angepasst werden, bevor bestätigt wird: Feld mit `−`/`+`, dann «Erledigt». Gespeichert wird die tatsächliche Menge in `actual_amount`. Das Abhaken ohne Menge bleibt **ein einziger Tipp**.

## 5. Priorisierung

Keine Eisenhower-Matrix. Es gibt genau zwei Signale:

1. **Zeitkritisch:** Termine sind es immer. To-dos sind es, wenn sie eine Deadline haben. Im Dump stehen zeitkritische To-dos oben, sortiert nach Deadline. Überfällige werden dezent markiert (Text «überfällig», keine rote Alarmfarbe).
2. **Top 3:** pro Tag höchstens drei To-dos, bewusst ausgewählt. Sie sind die Prioritäten des Tages.

Alles andere ist «weitere Aufgaben». Das hält die Entscheidung einfach und entspricht dem GTD-Gedanken: zuerst alles erfassen, dann bewusst entscheiden.

## 6. Tagesablauf & Logik

### Brain Dump
- Schnelleingabe ganz oben: eine Zeile, `Enter` legt das To-do an, das Feld bleibt fokussiert für das nächste. **Keine Pflichtfelder ausser dem Titel.** Details (Deadline, Menge, Dauer) optional über das Bearbeiten-Sheet.
- Jederzeit möglich, typischerweise am Vorabend.
- Der Dump zeigt alle **offenen To-dos, die für heute oder später noch nicht eingeplant sind**.

### Planen (Top 3 + Tagesplan)
- Der Planen-Screen hat einen Umschalter **Heute / Morgen**. Ab 17:00 steht standardmässig «Morgen» an, damit die Planung am Vorabend natürlich passiert.
- Schritt 1: Top 3 aus den offenen To-dos wählen (maximal 3, Reihenfolge per Tipp änderbar).
- Schritt 2: Aufgaben ins Zeitraster legen.
  - Raster 06:00–23:00 in 15-Minuten-Slots, zur aktuellen Uhrzeit scrollen.
  - Termine erscheinen automatisch als fixe Blöcke.
  - Routinen des Tages mit `default_time` erscheinen automatisch, Routinen ohne Zeit in einer Leiste «Routinen ohne Zeit».
  - **Mehrere Aufgaben im selben Zeitraum sind erlaubt.** Überlappende Blöcke werden nebeneinander dargestellt (Spalten teilen sich die Breite).
  - **Bedienung Mobile (primär):** Aufgabe antippen → Sheet mit Startzeit (15-Minuten-Schritte) und Dauer (15/30/45/60/90/120 min) → «Einplanen». Alternativ zuerst einen leeren Slot antippen → Aufgabe aus Liste wählen.
  - **Bedienung Desktop (zusätzlich):** Drag-and-drop aus der Liste ins Raster und Verschieben von Blöcken, umgesetzt mit Pointer Events (nicht HTML5-Drag-and-drop), Einrasten auf 15 Minuten.
  - Oben eine Summenzeile: «Geplant: 5 h 30 min». Bei mehr als 8 h geplanter Aufgabenzeit (ohne Termine) ein ruhiger Hinweis: «Das ist viel für einen Tag. Pläne werden oft zu optimistisch.» Nur ein Hinweis, keine Sperre.
  - Top-3-Aufgaben, die noch keinen Zeitblock haben, werden markiert («noch nicht eingeplant»).

### Tagesende / Übertrag
- **Keine Cron-Jobs nötig.** Alles wird beim Laden berechnet:
  - Ein To-do bleibt `open`, bis es erledigt ist. Zeitblöcke und Top-3-Einträge gehören zu einem Datum.
  - Ein offenes To-do, dessen Blöcke in der Vergangenheit liegen, erscheint dadurch automatisch **wieder im Dump**. Kein Dialog, keine Rückfrage.
  - Termine vergangener Tage verschwinden aus den Ansichten.
  - Routinen gelten nur für ihren Tag. Nicht erledigte Routinen werden nicht übertragen.

## 7. Screens (6)

Navigation über eine untere Tab-Leiste mit 4 Tabs: **Heute · Dump · Planen · Routinen**. Login und das Bearbeiten-Sheet liegen ausserhalb der Tabs.

1. **Login:** E-Mail + Passwort. In Supabase Signups deaktivieren und nur das eine Konto anlegen. Die Sitzung bleibt bestehen (`persistSession`).

2. **Heute (Dashboard):** Reihenfolge von oben nach unten:
   - Begrüssung + Datum («Guten Morgen» / «Guten Tag» / «Guten Abend»), Untertitel grau.
   - **Jetzt / Als Nächstes:** der aktuelle Zeitblock oder Termin; sonst der nächste mit verbleibender Zeit («in 25 min»).
   - **Top 3:** drei Karten mit Checkbox, Menge, geplanter Zeit. Leere Plätze zeigen «Top 3 wählen» → Planen.
   - **Termine heute:** kompakte Liste mit Uhrzeit.
   - **Routinen heute:** Abhak-Liste.
   - **Weitere geplante Aufgaben:** heute eingeplant, aber nicht Top 3.
   - **Fortschritt:** schlichte Zeile/Leiste «4 von 9 erledigt» (Top 3 + geplante To-dos + Routinen).
   - Ab 17:00, falls für morgen noch keine Top 3 gesetzt sind: dezente Karte «Morgen planen» → Planen (Morgen).

3. **Dump:** Schnelleingabe + Liste offener, nicht eingeplanter To-dos (zeitkritische oben). Tippen öffnet das Bearbeiten-Sheet. Wischen oder Long-Press: «Für heute einplanen», «Erledigt», «Löschen».

4. **Planen:** Umschalter Heute/Morgen, Top-3-Auswahl, Zeitraster (siehe Abschnitt 6).

5. **Routinen & Termine:** zwei Segmente.
   - Routinen: Liste mit Wochentags-Chips (Mo–So), Aktiv-Schalter, Anlegen/Bearbeiten.
   - Termine: kommende Termine chronologisch, Anlegen/Bearbeiten.

6. **Bearbeiten-Sheet (Modal):** von unten einfahrendes Sheet, die Felder hängen vom Typ ab. Speichern, Löschen, Abbrechen.

## 8. Belohnung & Feedback

Bewusst klein gehalten. **Keine Streaks, keine Punkte, keine Badges.**

- **Abhaken:** Der Kreis füllt sich, das Häkchen zeichnet sich (SVG `stroke-dashoffset`, ca. 350 ms), danach wird der Text leicht ausgegraut und die Karte rückt nach ca. 600 ms ans Listenende bzw. klappt zusammen.
- **Haptik:** `navigator.vibrate?.(15)`, nur wenn vorhanden. Auf iOS gibt es keine Vibration API, dort ohne Fehlermeldung einfach weglassen.
- **Alle Top 3 erledigt:** einmalig pro Tag ein kurzer ruhiger Hinweis oben auf «Heute», z. B. «Deine drei Prioritäten sind erledigt.», mit einer dezenten Einblend-Animation. Kein Konfetti-Overkill.
- **Rückgängig:** Nach jedem Abhaken 5 Sekunden lang ein Toast «Erledigt · Rückgängig».
- `prefers-reduced-motion` respektieren: Animationen dann auf Ein-/Ausblenden reduzieren.

## 9. Verhaltenswissenschaftliche Grundlagen (Begründung der Entscheidungen)

| Element | Prinzip | Umsetzung |
|---|---|---|
| Zeitblöcke | **Implementation Intentions** (Gollwitzer & Sheeran 2006: mittlerer bis grosser Effekt, d = 0.65): Wer festlegt, *wann* etwas passiert, setzt es deutlich häufiger um. | Jede Aufgabe kann einen konkreten Zeitpunkt bekommen; Top 3 ohne Zeitblock werden markiert. |
| Brain Dump + Plan | Unerledigte Ziele drängen sich in die Gedanken; ein konkreter Plan reduziert das (Masicampo & Baumeister 2011). | Schnelleingabe ohne Reibung, Planung am Vorabend. |
| Top 3 | Begrenzte Auswahl reduziert Entscheidungslast und lenkt den Fokus. | Hartes Maximum von 3. |
| Planungsfehlschluss | Menschen unterschätzen systematisch, wie lange Aufgaben dauern. | Summenzeile + Hinweis bei Überplanung. |
| Feedback | Unmittelbare, kleine Belohnung nach dem Verhalten verstärkt es (Fogg, *Tiny Habits*: Celebration). | Kurze Animation + Haptik direkt beim Abhaken. |
| Autonomie | Bevormundende Sprache erzeugt Reaktanz. | Hinweise statt Sperren, ruhiger Ton. |
| Keine Streaks | Bewusste Entscheidung des Eigentümers. | Kein Streak-Zähler. |

## 10. Design

**Verbindliche Grundlage:** [`design-principles.md`](design-principles.md). Jede UI-Änderung folgt diesen Prinzipien, inklusive der Token-Skalen (Abstände, Schriftgrössen, Radien, Schatten) und der Checkliste in Abschnitt 9 vor Abschluss einer UI-Änderung. Werte nie frei wählen, sondern aus den Tokens nehmen. Bei einem Widerspruch zwischen diesem Abschnitt und `design-principles.md` zuerst beim Eigentümer nachfragen.

Orientierung am Stil der früheren App des Eigentümers: ruhig, viel Weissraum, monochrom, klare Karten. **Daran angelehnt, aber nicht daran gebunden.**

### Tokens (CSS-Variablen in `:root`)

```css
--bg:          #fffdfd;   /* Hintergrund (vorgegeben) */
--surface:     #ffffff;   /* Karten */
--text:        #0f172a;   /* Text + Akzent (vorgegeben) */
--text-muted:  #94a3b8;   /* Untertitel, inaktive Tabs */
--border:      #e5e7eb;
--surface-alt: #f8fafc;   /* Tab-Leiste, Raster-Hintergrund */
--done:        #cbd5e1;   /* erledigte Einträge */

--font: 'Inter', system-ui, sans-serif;
--radius-card: 18px;
--radius-btn: 8px;
--shadow-card: 0 2px 10px rgba(15, 23, 42, 0.08);
--space: 8px;             /* Raster: Vielfache von 8 */
```

### Stilregeln
- **Überschriften:** grosse Screen-Titel in normaler Stärke (400–500, ca. 28px), darunter ein grauer Untertitel in einem Satz.
- **Karten:** weiss, `--radius-card`, weicher Schatten, grosszügiges Padding (20–24px).
- **Primärbutton:** gefüllt in `--text`, weisse Schrift, Halbfett, `--radius-btn`. **Sekundärbutton:** weiss mit 1px-Rahmen.
- **Icons:** Linien-Icons (Stroke ca. 1.75px), inline SVG, keine Icon-Bibliothek nötig.
- **Tab-Leiste:** Hintergrund `--surface-alt`, Icon + Label. Aktiv = `--text`, inaktiv = `--text-muted`. Unten `env(safe-area-inset-bottom)` beachten.
- **Farbe** sparsam einsetzen. Die App bleibt weitgehend schwarz-weiss. Top-3-Karten heben sich durch einen 2px-Rahmen in `--text` ab, nicht durch Farbe.
- **Touch-Ziele** mindestens 44×44 px. Kein horizontales Scrollen auf 375px Breite.
- **Dark Mode:** vorerst nicht.

### Ton & Sprache
Ruhig, ehrlich, kompetent, auf Augenhöhe. Duzen. Keine übermotivierten oder bevormundenden Formulierungen, keine Ausrufezeichen-Ketten. Die Autonomie respektieren: Die App schlägt vor, sie schreibt nicht vor.

Beispiele:
- ✅ «Erledigt.» · «Noch nichts geplant.» · «Das ist viel für einen Tag.»
- ❌ «Super gemacht!!! 🎉» · «Du musst jetzt planen!» · «Verpasse nicht …»

### PWA
- `manifest.webmanifest`: `name`, `short_name`, `display: standalone`, `start_url: "/#/heute"`, `background_color` und `theme_color` = `#fffdfd`, Icons 192/512.
- In `index.html`: `<link rel="apple-touch-icon">`, `<meta name="apple-mobile-web-app-capable" content="yes">`, `viewport-fit=cover`.
- **Kein Service Worker**, da offline nicht benötigt wird.

## 11. Datenmodell (Supabase)

Alle Tabellen haben `user_id uuid references auth.users not null default auth.uid()` und RLS mit der Policy `user_id = auth.uid()` für select/insert/update/delete.

```sql
-- Einmalige To-dos
create table todos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users,
  title text not null,
  notes text,
  due_date date,
  duration_min int not null default 30 check (duration_min % 15 = 0),
  target_amount numeric,
  unit text,
  status text not null default 'open' check (status in ('open','done')),
  actual_amount numeric,
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
  target_amount numeric,
  unit text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Erledigte Routinen pro Tag
create table habit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users,
  habit_id uuid not null references habits on delete cascade,
  date date not null,
  actual_amount numeric,
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
```

Abgeleitete Abfragen (in `data.js`):
- **Dump** = `todos` mit `status='open'`, die keinen `plan_block` und keinen `day_priorities`-Eintrag mit `date >= heute` haben.
- **Routinen eines Tages** = `habits` mit `active` und `extract(isodow from date) = any(weekdays)`.

Schema als `supabase/schema.sql` ablegen, damit es im Supabase-SQL-Editor ausgeführt werden kann.

## 12. Umsetzungsphasen

1. **Grundgerüst:** Ordnerstruktur, `styles.css` mit Tokens, Hash-Router, Tab-Leiste, leere Screens, `netlify.toml`, Manifest.
2. **Supabase:** `schema.sql`, Client, Login/Logout, Auth-Guard.
3. **Dump:** Schnelleingabe, Liste, Bearbeiten-Sheet für To-dos (inkl. Menge, Deadline, Dauer).
4. **Routinen & Termine:** Verwaltung beider Typen.
5. **Planen:** Top-3-Auswahl, Zeitraster mit Tipp-Bedienung, Überlappungen, Summenzeile. Danach Drag-and-drop für Desktop.
6. **Heute:** Dashboard mit allen Abschnitten, Abhaken inkl. Mengen-Bestätigung.
7. **Feedback:** Animationen, Vibration, Rückgängig-Toast, Top-3-Hinweis, reduzierte Bewegung.
8. **Feinschliff & Deploy:** Tests auf iPhone (Safari, Home-Bildschirm) und Desktop-Browser, Deployment auf Netlify.

## 13. Bewusst nicht enthalten (vorerst)

Unteraufgaben · Streaks/Punkte · Push-Benachrichtigungen · Offline-Modus · Mehrbenutzer · Projekte/Tags · Kalender-Sync · Dark Mode · Statistiken.
