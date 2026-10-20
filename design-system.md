# Design-System

Beschreibt den visuellen Stil, die Tokens und die Grundkomponenten. Gilt zusammen mit `design-principles.md`: Die Prinzipien sagen, **wie** gestaltet wird, dieses Dokument sagt, **womit** (konkrete Werte, Komponenten, Ton).

Projektunabhängig formuliert. Für ein neues Projekt beide Dateien in den Hauptordner kopieren und in der `CLAUDE.md` darauf verweisen, z. B.:

> Für jede UI-Arbeit gelten `design-principles.md` (Regeln) und `design-system.md` (Tokens, Komponenten, Ton). Werte nie frei wählen, sondern aus den Tokens nehmen. Bei Widersprüchen zuerst nachfragen.

---

## 1. Charakter

- **Ruhig, monochrom, viel Weissraum.** Die Oberfläche ist weitgehend schwarz-weiss mit kühlen Grautönen. Farbe ist die Ausnahme, nicht das Gestaltungsmittel.
- **Klare Karten** auf einem fast weissen Hintergrund, abgehoben durch einen feinen Schatten statt durch Rahmen.
- **Hierarchie über Gewicht, Grauton und Abstand**, nicht über Farbe. Hervorhebung durch einen dunklen Rahmen, eine dunkle Fläche oder einen dunklen Streifen.
- **Mobile first**, auf dem Desktop voll nutzbar. Inhalt hat eine maximale Breite, statt den Bildschirm zu füllen.
- **Ton:** ruhig, ehrlich, auf Augenhöhe, ohne Druck.

## 2. Tokens

Zentral als CSS-Variablen in `:root` definieren (bzw. in der Theme-Datei des jeweiligen Stacks). Im Code ausschliesslich diese Tokens verwenden. Fehlt ein Wert, die Skala bewusst erweitern und hier nachtragen.

```css
:root {
  /* ---------- Graustufen (kühl getönt, «Slate») ---------- */
  --gray-50:  #f8fafc;
  --gray-100: #f1f5f9;
  --gray-200: #e2e8f0;
  --gray-300: #cbd5e1;
  --gray-400: #94a3b8;
  --gray-500: #64748b;
  --gray-600: #475569;
  --gray-700: #334155;
  --gray-800: #1e293b;
  --gray-900: #0f172a;

  /* ---------- Rot (nur destruktiv/Fehler) ---------- */
  --red-50:  #fef2f2;
  --red-100: #fee2e2;
  --red-200: #fecaca;
  --red-300: #fca5a5;
  --red-400: #f87171;
  --red-500: #ef4444;
  --red-600: #dc2626;
  --red-700: #b91c1c;
  --red-800: #991b1b;
  --red-900: #7f1d1d;

  /* ---------- Farb-Rollen ---------- */
  --bg:             #fffdfd;          /* Seitenhintergrund */
  --surface:        #ffffff;          /* Karten, Sheets, Inputs */
  --surface-alt:    var(--gray-100);  /* Tab-Leiste, Segment-Hintergründe, Flächen ohne Schatten */
  --text:           var(--gray-900);  /* Primärtext und zugleich Akzentfarbe */
  --text-secondary: var(--gray-500);  /* Untertitel, Meta, inaktive Elemente (≥ 4.5:1) */
  --text-tertiary:  var(--gray-400);  /* nur Platzhalter, grosser Text, Dekoration (< 4.5:1) */
  --border:         var(--gray-200);  /* Trennlinien, Rahmen von Sekundär-Elementen */
  --done:           var(--gray-300);  /* erledigte / deaktivierte Markierungen */

  /* ---------- Abstände ---------- */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 24px;
  --space-6: 32px;
  --space-7: 48px;
  --space-8: 64px;
  --space-9: 96px;

  /* ---------- Grössen ---------- */
  --size-touch: 48px;      /* Mindesthöhe/-breite aller Bedienelemente */
  --size-icon: 24px;
  --width-form: 384px;     /* Login, schmale Formulare, Seitenspalten */
  --width-content: 640px;  /* Hauptinhalt */
  --width-wide: 1024px;    /* breite Desktop-Ansichten (zweispaltig) */

  /* ---------- Typografie ---------- */
  --font: 'Inter', system-ui, sans-serif;

  --text-xs:   12px;
  --text-sm:   14px;
  --text-base: 16px;
  --text-lg:   18px;
  --text-xl:   20px;
  --text-2xl:  24px;
  --text-3xl:  30px;

  --weight-normal: 400;
  --weight-strong: 600;

  --leading-tight:  1.25;  /* Headlines, kompakte Blöcke */
  --leading-normal: 1.5;   /* UI- und Fliesstext */

  /* ---------- Radien ---------- */
  --radius-sm:   4px;      /* kleine Chips, Segmente innen */
  --radius-md:   8px;      /* Buttons, Inputs */
  --radius-lg:   16px;     /* Karten, Listen, Sheets */
  --radius-full: 9999px;   /* Pillen, Kreise, Schalter */

  /* ---------- Rahmenbreiten ---------- */
  --border-1: 1px;
  --border-2: 2px;         /* Hervorhebung, Fokus */

  /* ---------- Schatten (5 Stufen, zweiteilig, Licht von oben) ---------- */
  --shadow-1: 0 1px 3px rgb(15 23 42 / 0.08), 0 1px 2px rgb(15 23 42 / 0.12);  /* Karten, Buttons */
  --shadow-2: 0 3px 6px rgb(15 23 42 / 0.10), 0 2px 4px rgb(15 23 42 / 0.08);
  --shadow-3: 0 10px 20px rgb(15 23 42 / 0.12), 0 3px 6px rgb(15 23 42 / 0.06); /* Dropdowns, Popover */
  --shadow-4: 0 15px 25px rgb(15 23 42 / 0.14), 0 5px 10px rgb(15 23 42 / 0.04); /* gezogene Elemente */
  --shadow-5: 0 20px 40px rgb(15 23 42 / 0.18);                                   /* Modals, Sheets */
  --shadow-inset: inset 0 1px 2px rgb(15 23 42 / 0.06);                           /* Inputs (vertieft) */
}
```

**Weitere Farben** (Gelb, Grün, Blau, eine Primärfarbe) erst ergänzen, wenn sie wirklich gebraucht werden, dann jeweils als volle Skala 50–900. Rot bleibt Destruktivem und Fehlern vorbehalten.

**Schrift einbinden** (Web):

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
```

## 3. Basis

```css
*, *::before, *::after { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; }

body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font-family: var(--font);
  font-size: var(--text-base);
  font-weight: var(--weight-normal);
  line-height: var(--leading-normal);
  -webkit-font-smoothing: antialiased;
}
```

- **Seitencontainer:** `max-width: var(--width-content)`, zentriert, seitlich `--space-4` Padding, oben `--space-5`. Safe Areas (`env(safe-area-inset-*)`) oben und unten einrechnen.
- **Breite Ansichten** (ab 1024px) dürfen auf `--width-wide` gehen und zweispaltig werden: schmale Spalte `--width-form`, Hauptbereich flexibel.
- **Kein horizontales Scrollen** auf 375px Breite.

## 4. Typografie

| Rolle | Grösse | Gewicht | Farbe | Zeilenhöhe |
|---|---|---|---|---|
| Screen-Titel (h1) | `--text-3xl` | normal | `--text` | tight |
| Sheet-/Dialog-Titel | `--text-xl` | normal | `--text` | tight |
| Hervorgehobener Inhalt (z. B. «Jetzt»-Karte) | `--text-xl` | normal / strong für Zahlen | `--text` | tight |
| Leerzustand-Titel | `--text-lg` | strong | `--text` | normal |
| Fliess- und UI-Text | `--text-base` | normal | `--text` | normal |
| Abschnitts-Label über Listen | `--text-sm` | strong | `--text-secondary` | normal |
| Meta-Zeile, Formular-Label, Hinweise | `--text-sm` | normal | `--text-secondary` | normal |
| Kleinstes (Tab-Labels, Chips, Zeitachsen) | `--text-xs` | normal | `--text-secondary` | normal |

- **Grosse Titel in normalem Gewicht**, die Hierarchie entsteht über die Grösse. Betontes Gewicht (`600`) für Werte, aktive Zustände, Uhrzeiten und Buttons.
- **Unter jedem Screen-Titel ein Untertitel** in `--text-secondary`, ein Satz, Abstand `--space-2`.
- **Abschnittstitel sind Labels:** klein, grau, betont, nicht gross.
- **Zahlen und Uhrzeiten** mit `font-variant-numeric: tabular-nums`, damit sie untereinander bündig stehen.
- **Inputs immer 16px**, sonst zoomt iOS beim Fokussieren hinein.
- Lange Titel mit `overflow-wrap: anywhere` umbrechen lassen, in engen Blöcken mit `text-overflow: ellipsis` kürzen.

## 5. Farbe & Hervorhebung

- Die App ist **monochrom**: Grautöne plus `--text` (fast Schwarz) als einzige Akzentfarbe.
- **Hervorheben ohne Farbe**, abgestuft nach Stärke:
  1. Gewicht `--weight-strong` oder Farbe `--text` statt `--text-secondary`
  2. dunkler Rahmen `--border-2` in `--text` (z. B. wichtigste Karten)
  3. dunkler Streifen links (`box-shadow: inset var(--space-1) 0 0 var(--text)`)
  4. dunkle Fläche `--text` mit weisser Schrift (aktive Chips, Rangnummern, fixe Blöcke)
- **Abschwächen** statt aufblasen: inaktive/erledigte Elemente in `--text-secondary`, erledigt zusätzlich durchgestrichen (nie nur über Farbe).
- **Rot** nur für Destruktives im Bestätigungskontext (`--red-600` als Fläche, `--red-700` als Text) und für Fehler.
- **Dezente Warnungen** als Text in `--text-secondary` (z. B. «überfällig»), keine Alarmfarben.
- **Overlay hinter Modals:** `rgb(15 23 42 / 0.4)`.

## 6. Trennung & Tiefe

- Reihenfolge der Mittel: **Abstand → Hintergrundwechsel → Schatten → Rahmen**. Nie Rahmen *und* Hintergrundwechsel doppelt.
- **Karten und Listen:** `--surface` + `--shadow-1` auf `--bg`, ohne Rahmen.
- **Flächen ohne Schatten** (Tab-Leiste, Segment-Umschalter, Hinweis-Karten, Rasterhintergrund): `--surface-alt`.
- **Zeilen innerhalb einer Liste:** 1px-Linie in `--border` zwischen den Zeilen.
- **Elevation:** Karten/Buttons = 1, Dropdowns = 3, gezogene Elemente = 4, Sheets/Modals = 5. Inputs vertieft mit `--shadow-inset`.

## 7. Komponenten

### Karte
```css
.card {
  background: var(--surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-1);
  padding: var(--space-5);
}
```
Hervorgehobene Karte: zusätzlich `border: var(--border-2) solid var(--text)`. Leerer Platzhalter: `border: var(--border-2) dashed var(--border)`, ohne Schatten und Hintergrund, Text in `--text-secondary`. Dezente Hinweis-Karte: `--surface-alt`, ohne Schatten.

### Buttons
```css
.btn {
  min-height: var(--size-touch);
  padding: 0 var(--space-4);
  border-radius: var(--radius-md);
  font: inherit;
  font-weight: var(--weight-strong);
  cursor: pointer;
}
.btn-primary   { background: var(--text);    color: var(--surface); border: var(--border-1) solid var(--text); }
.btn-secondary { background: var(--surface); color: var(--text);    border: var(--border-1) solid var(--border); }
.btn-tertiary  { background: none; border: var(--border-1) solid transparent; color: var(--text-secondary); font-weight: var(--weight-normal); }
.btn-danger    { background: var(--red-600); border: var(--border-1) solid var(--red-600); color: var(--surface); }
.btn:disabled  { opacity: 0.5; cursor: default; }
```
- Genau **eine Primäraktion** pro Ansicht.
- «Löschen» ausserhalb einer Bestätigung als Tertiär-Button, erst in der Bestätigung als `.btn-danger`.
- In Sheets: Aktionen als 2-spaltiges Grid (Abbrechen sekundär, Speichern primär), Löschen tertiär darunter zentriert.

### Icon-Button
48×48 Trefferfläche, kein Hintergrund, Icon 24px in `--text-secondary`, bei Hover (nur Maus) `--text`.

### Pille
Wie Sekundär-Button, aber `--radius-full` und normales Gewicht. Für kurze, gleichwertige Auswahlen in einer umbrechenden Reihe (`gap: var(--space-2)`).

### Formulare
```css
.form { display: flex; flex-direction: column; gap: var(--space-4); }  /* zwischen Feldern */
.form label {
  display: flex; flex-direction: column;
  gap: var(--space-1);                                                 /* Label ↔ Input: eng */
  font-size: var(--text-sm); color: var(--text-secondary);
}
.input {
  width: 100%;
  min-height: var(--size-touch);
  padding: 0 var(--space-3);
  border: var(--border-1) solid var(--border);
  border-radius: var(--radius-md);
  background: var(--surface);
  box-shadow: var(--shadow-inset);
  color: var(--text);
  font: inherit;
  font-size: var(--text-base);
}
.input::placeholder { color: var(--text-tertiary); }
.input:focus { outline: var(--border-2) solid var(--text); outline-offset: calc(var(--border-1) * -1); }
```
- Nur der Titel ist Pflicht, alles andere optional und ruhig.
- Zwei Felder nebeneinander (z. B. Beginn/Ende): Grid `1fr 1fr`, `gap: var(--space-3)`.
- Formulare und Login maximal `--width-form` breit.
- Fehlermeldungen klein (`--text-sm`) direkt am Ort des Fehlers.

### Auswahl-Chips (Radio/Checkbox als Tasten)
Gleich breite Tasten im Grid, `min-height: var(--size-touch)`, Rahmen `--border`, `--radius-md`. Gewählt: Fläche `--text`, weisse Schrift, betont. Das native Input bleibt unsichtbar im DOM (Zugänglichkeit), der Fokus wird am sichtbaren Element gezeigt.

### Segment-Umschalter / Tagesleiste
Hintergrund `--gray-100`, `padding: var(--space-1)`, `--radius-md`. Segmente ohne Hintergrund in `--text-secondary`; das aktive Segment `--surface` + `--shadow-1` + `--text` + betont, Radius `--radius-sm`. `aria-selected` für den Zustand.

### Schalter (Switch)
Spur 48×24, `--radius-full`, aus = `--gray-300`, an = `--text`. Knopf 16px weiss mit `--shadow-1`, gleitet in 150 ms. Gesamte Trefferfläche ≥ 48px.

### Checkbox zum Abhaken
Kreis (SVG, Stroke 1.75) 24px in einer 48px-Trefferfläche. Offen: Kreislinie in `--text-secondary`. Erledigt: Kreis gefüllt in `--text`, weisses Häkchen. Zustand über `aria-checked`.

### Listen
```css
.list {
  background: var(--surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-1);
  overflow: hidden;
}
.list-row {
  display: flex; flex-direction: column;
  min-height: var(--size-touch);
  padding: var(--space-3) var(--space-5);
  text-align: left;
}
.list-row + .list-row { border-top: var(--border-1) solid var(--border); }
.list-row-meta { font-size: var(--text-sm); color: var(--text-secondary); }
```
- Zeile = Titel + Meta-Zeile darunter. Label und Wert kombinieren («30 min · bis Kapitel 3») statt «Dauer: 30».
- Wichtiges in der Meta-Zeile mit `--text` + betont hervorheben.
- Abschnitts-Label über der Liste (`--text-sm`, betont, grau, `margin-bottom: var(--space-2)`); Abstand zwischen Listengruppen `--space-6`.
- Zeilen mit Aktionen rechts: Flex-Zeile, Hauptbereich `flex: 1`, rechts Icon-Button oder Schalter.
- Zeit vorne (Termine o. Ä.): Uhrzeit betont und tabellarisch, Titel daneben, an der Grundlinie ausgerichtet.

### Kleine Marker
- **Rangnummer:** Kreis 24px, `--text`-Fläche, weisse Ziffer `--text-xs` betont. Leer: 1px-Rahmen `--gray-300`, Ziffer grau. Erledigt: Fläche `--done`.
- **Wochentags-Chips (Anzeige):** 32×24, `--radius-sm`, `--gray-100` mit grauer Schrift; aktiv `--text` mit weisser Schrift.

### Fortschritt
Textzeile «4 von 9 erledigt» (`--text-sm`, grau) über einer Leiste: Höhe 8px, `--radius-full`, Spur `--gray-200`, Füllung `--text`, Breitenänderung 250 ms.

### Sheet (Modal von unten)
```css
.sheet {
  width: 100%;
  max-width: var(--width-content);
  max-height: 90dvh;
  margin: auto auto 0;
  padding: 0;
  border: none;
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  background: var(--surface);
  box-shadow: var(--shadow-5);
  overflow-y: auto;
}
.sheet::backdrop { background: rgb(15 23 42 / 0.4); }
.sheet[open] { animation: sheet-in 250ms ease-out; }
@keyframes sheet-in { from { transform: translateY(100%); } }
```
Als natives `<dialog>` umsetzen. Innen `padding: var(--space-5) var(--space-4)` plus Safe Area unten. Titel `--text-xl` normal.

### Tab-Leiste (unten)
Fixiert unten, Hintergrund `--surface-alt`, **kein Rahmen**, Höhe 64px plus `env(safe-area-inset-bottom)`. Jeder Tab: Icon 24px über Label `--text-xs`, `gap: var(--space-1)`. Inaktiv `--text-secondary`, aktiv `--text` + betont. Maximal 4–5 Tabs.

### Leer-, Lade- und Fehlerzustände
- **Leerzustand:** zentriert, `margin-top: var(--space-7)`, Titel `--text-lg` betont, ein erklärender Satz in `--text-secondary` (max. `--width-form`), darunter ein Button zur nächsten sinnvollen Aktion.
- **Laden:** kurzer grauer, zentrierter Text («Wird geladen …»), keine Spinner-Show.
- **Fehler:** sachlicher Satz am Ort des Problems, mit Möglichkeit zum erneuten Versuch.

## 8. Icons

- Linien-Icons als **inline SVG**, `viewBox="0 0 24 24"`, keine Icon-Bibliothek.
- `fill: none; stroke: currentColor; stroke-width: 1.75; stroke-linecap: round; stroke-linejoin: round;`
- Farbe kommt über `currentColor` vom Elternelement. Dekorative Icons mit `aria-hidden="true"`, Icon-Buttons mit `aria-label`.
- Grössen: 24px in Navigation und Checkboxen, 24px (`--space-5`) in Icon-Buttons.

## 9. Interaktion & Zugänglichkeit

- **Touch-Ziele mindestens 48px**, auch wenn das sichtbare Element kleiner ist (Trefferfläche über Padding oder negativen Margin vergrössern).
- **Hover nur auf Geräten mit Maus:** in `@media (hover: hover)` kapseln, sonst bleibt er auf dem Handy nach dem Tippen hängen. Hover-Fläche: `--gray-50`.
- **Fokus sichtbar** mit `:focus-visible`: `outline: var(--border-2) solid var(--text)`, Offset je nach Element nach innen (negativ) oder aussen.
- `-webkit-tap-highlight-color: transparent` auf antippbaren Flächen, dafür eigene Zustände.
- **Kontrast:** normaler Text ≥ 4.5:1. `--text-tertiary` nie für normalen Lesetext.
- **Information nie nur über Farbe:** erledigt = grau + durchgestrichen; aktiv = Farbe + Gewicht.
- Desktop-Drag-and-drop mit **Pointer Events** (nicht HTML5-Drag-and-drop); gezogene Elemente bekommen `--shadow-4`.

## 10. Bewegung & Feedback

- Kurz und funktional: Übergänge 150 ms (Schalter, Hover), 250 ms (Sheets, Fortschritt), Erfolgs-Animationen ca. 350 ms.
- `ease-out` für hereinkommende Elemente.
- **Abhaken:** Kreis füllt sich, Häkchen zeichnet sich (SVG `stroke-dashoffset`), danach wird der Eintrag ausgegraut und rückt nach ca. 600 ms weg.
- **Haptik** optional: `navigator.vibrate?.(15)`, ohne Fehler, wenn nicht vorhanden (iOS).
- **Rückgängig** statt Bestätigungsdialog, wo möglich: Toast für 5 Sekunden.
- Keine Konfetti, Punkte oder Streaks. Erfolg wird mit einem ruhigen Satz quittiert.
- **Reduzierte Bewegung respektieren:**
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

## 11. Ton & Sprache

- Deutsch, Schweizer Schreibweise («ss» statt «ß»), duzen.
- Ruhig, ehrlich, kompetent, auf Augenhöhe. Kurze Sätze.
- Die App **schlägt vor, sie schreibt nicht vor**: Hinweise statt Sperren.
- Keine Ausrufezeichen-Ketten, keine Emojis in der UI, kein Druck, keine Angst-Formulierungen.

| ✅ So | ❌ Nicht so |
|---|---|
| «Erledigt.» | «Super gemacht!!! 🎉» |
| «Noch nichts geplant.» | «Du hast noch nichts geplant!» |
| «Das ist viel für einen Tag.» | «Achtung: Überlastung!» |
| «überfällig» | «DRINGEND» in Rot |

## 12. PWA-Grundlagen (falls Web-App)

- `theme_color` und `background_color` = `--bg` (`#fffdfd`), `display: standalone`.
- `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">` und Safe Areas im Layout berücksichtigen.
- `apple-touch-icon` 180px, Manifest-Icons 192 und 512px; Icons für kleine Grössen vereinfacht gezeichnet.
- Dark Mode vorerst nicht. Falls später: alle Farb-Rollen in einem eigenen Block neu belegen, Komponenten bleiben unverändert.

## 13. Kurz-Checkliste

Zusätzlich zur Checkliste in `design-principles.md`:

1. Bleibt die Ansicht monochrom? Ist jede Farbe ausser Grau/Schwarz begründet?
2. Haben Karten Schatten statt Rahmen, und gibt es keine doppelte Trennung?
3. Sind alle Bedienelemente ≥ 48px und mit sichtbarem Fokus?
4. Ist Hover in `@media (hover: hover)` gekapselt?
5. Haben Screen-Titel einen Untertitel, und sind Abschnittstitel als kleine Labels gestaltet?
6. Klingt jeder Text ruhig und ohne Druck?
