# Design-Prinzipien für UI-Arbeit

Gilt für jede UI, die in diesem Projekt entsteht oder geändert wird, unabhängig vom Stack (Web, iOS, Android, Cross-Platform). Einheiten sind als logische Pixel angegeben (px / pt / dp). Sinngemäss übernommen aus «Refactoring UI» (Wathan & Schoger), als umsetzbare Regeln formuliert.

## 0. Grundhaltung

- Mit einem konkreten Feature beginnen, nicht mit der App-Hülle (Navigation, Sidebar, Header). Die Hülle ergibt sich erst, wenn mehrere Features existieren.
- Erst Struktur, dann Details. Layout und Hierarchie zuerst so bauen, dass sie ohne Farbe funktionieren (nur Grautöne, Abstand, Grösse, Gewicht). Farbe kommt danach.
- Die kleinste nutzbare Version eines Features bauen. Keine UI für Funktionen andeuten, die noch nicht implementiert sind.
- In kurzen Zyklen arbeiten: einfache Version bauen, real benutzen, Probleme am lauffähigen Interface beheben.
- Werte nie frei wählen. Jede Grösse, jeder Abstand, jede Farbe, jeder Schatten kommt aus einem vorab definierten Token-Set (Abschnitt 1). Fehlt ein Wert, das Token-Set bewusst erweitern statt einen Einzelwert zu setzen.

## 1. Design-Tokens (verbindlich)

Tokens zentral definieren (Theme-Datei, CSS-Variablen, Tailwind-Config, Swift/Kotlin-Konstanten o. Ä.) und ausschliesslich darüber referenzieren.

**Spacing & Sizing:** `4, 8, 12, 16, 24, 32, 48, 64, 96, 128, 192, 256, 384, 512, 640, 768`
Basis 16. Benachbarte Werte unterscheiden sich im unteren Bereich um ca. 25–50 %, darum ist die Skala nicht linear. Gilt für Padding, Margin, Gaps, Icon-Grössen, Breiten und Höhen.

**Schriftgrössen:** `12, 14, 16, 18, 20, 24, 30, 36, 48, 60, 72`
Keine anderen Grössen. Absolute bzw. root-relative Einheiten verwenden (Web: `px`/`rem`, nicht verschachtelte `em`), damit berechnete Grössen immer auf der Skala liegen.

**Schriftgewichte:** zwei reichen meist, nämlich normal (400 oder 500) und betont (600 oder 700). Gewichte unter 400 nur für sehr grosse Headlines, nie für UI-Text.

**Farben:**
- Grautöne: 8–10 Stufen (z. B. 50–900), von sehr dunklem Grau (kein reines Schwarz) bis Off-White.
- Primärfarbe(n): 1–2 Farben mit je 9 Stufen (100–900, 500 = Basis, z. B. Button-Hintergrund).
- Akzent-/Statusfarben: Rot (destruktiv/Fehler), Gelb (Warnung), Grün (Erfolg), ggf. Blau (Info) sowie eine Highlight-Farbe; jeweils mehrere Stufen.
- Alle Stufen fest definieren. Keine Laufzeit-Funktionen wie `lighten()`/`darken()` und keine Transparenz-Tricks, um neue Abstufungen zu erzeugen.

**Schatten / Elevation:** 5 Stufen, von klein und scharf bis gross und weich (siehe Abschnitt 6).

**Border-Radius:** eine kleine, bewusst gewählte Menge (z. B. `0, 4, 8, 16, full`). Durchgehend konsistent: nicht eckig und stark gerundet mischen.

**Weitere Systeme bei Bedarf:** Border-Breiten, Opazitäten, Line-Heights, maximale Breiten. Entscheidungen, die ein zweites Mal anstehen, werden zum Token.

**Auswahl innerhalb einer Skala:** Bei Unsicherheit einen Wert raten und die beiden Nachbarwerte vergleichen. Den deutlich besten wählen; liegt dieser am Rand, mit ihm als neuer Mitte wiederholen.

## 2. Visuelle Hierarchie

- Pro Ansicht klar festlegen, was primär, sekundär und tertiär ist. Nicht alles darf gleich laut sein.
- Hierarchie primär über **Gewicht und Farbe/Kontrast** steuern, nicht nur über Schriftgrösse. Primärtext lieber fetter als grösser, Sekundärtext lieber heller als winzig.
- Textfarben-Rollen: dunkel = primär, mittleres Grau = sekundär, helles Grau = tertiär.
- Um etwas hervorzuheben, oft die Konkurrenz **abschwächen** statt das Ziel weiter aufzublasen (z. B. inaktive Nav-Items dezenter, Sidebar ohne eigenen Hintergrund).
- Auf farbigen Hintergründen kein Grau und keine halbtransparente Weiss-Schrift für Sekundärtext. Stattdessen eine Farbe im **gleichen Farbton** wählen und Sättigung/Helligkeit anpassen.
- **Labels sind das letzte Mittel.** Datenformat oder Kontext reichen oft (E-Mail, Preis, Telefonnummer). Label und Wert kombinieren («3 Zimmer» statt «Zimmer: 3»). Wenn Labels nötig sind (z. B. Dashboards): Label klein, heller oder leichter; der Wert dominiert. Ausnahme: Spezifikationsseiten, wo Nutzer nach dem Label suchen, dort Label etwas dunkler als der Wert.
- **Semantik ≠ Optik:** Überschriften-Elemente (h1 etc.) bzw. Titel-Komponenten nach Bedeutung wählen, aber nach Hierarchie gestalten. Abschnittstitel in App-UIs sind oft eher Labels und dürfen klein sein.
- **Gewicht und Kontrast ausbalancieren:** Schwere Elemente (z. B. gefüllte Icons neben Text) mit weicherer Farbe entschärfen. Zu subtile Elemente (z. B. 1px-Linie in hellem Grau) über mehr Breite/Gewicht stärken statt über dunklere Farbe.
- **Aktionen nach Wichtigkeit gestalten:**
  - Primär (meist genau eine pro Ansicht): gefüllt, hoher Kontrast.
  - Sekundär: Outline oder kontrastarmer Hintergrund.
  - Tertiär: wie ein Link.
  - Destruktive Aktionen sind nicht automatisch gross und rot. Ausserhalb ihres Kontexts sekundär/tertiär gestalten; erst im Bestätigungsdialog, wo sie die Primäraktion sind, rot und prominent.

## 3. Layout & Abstände

- **Mit zu viel Weissraum starten und reduzieren**, nicht umgekehrt. Dichte Layouts (z. B. Dashboards) nur als bewusste Entscheidung.
- **Nicht den ganzen Bildschirm füllen.** Jedes Element bekommt die Breite, die es braucht. Formulare, Login-Karten und Textblöcke haben eine optimale Breite → `max-width` statt Prozentbreite. Nichts breiter machen, nur weil Nachbarelemente es sind.
- **Mobile zuerst** (ca. 400 breit) entwerfen, dann für grössere Screens nur das anpassen, was auf Mobile ein Kompromiss war.
- Wirkt eine schmale Komponente auf breiten Screens verloren: in **Spalten** aufteilen (z. B. Erklärtext neben dem Formular) statt sie zu verbreitern.
- **Grids nicht dogmatisch nutzen.** Sidebars und Komponenten mit inhaltlicher Idealbreite bekommen feste Breiten, der Hauptbereich füllt flexibel den Rest. Prozentuale Breiten nur, wenn das Element wirklich mitskalieren soll. Elemente erst schrumpfen, wenn der Platz tatsächlich fehlt.
- **Proportionen nicht starr koppeln.** Grosse Elemente müssen auf kleinen Screens stärker schrumpfen als kleine (Headline auf Mobile deutlich kleiner im Verhältnis zum Fliesstext). Innerhalb von Komponenten (z. B. Buttons) Padding pro Grösse einzeln festlegen statt rein relativ zur Schriftgrösse: grosse Buttons grosszügiger, kleine enger.
- **Keine mehrdeutigen Abstände.** Wo nur Abstand gruppiert: Abstand *zwischen* Gruppen immer deutlich grösser als *innerhalb* einer Gruppe. Gilt für Label/Input-Paare, Überschriften (mehr Abstand oberhalb als unterhalb), Listenpunkte und horizontale Anordnungen.

## 4. Typografie

- **Schrift:** für UI eine neutrale, gut lesbare Sans-Serif oder den System-Font-Stack der Plattform. Familien mit mindestens 5 Schnitten bevorzugen. Keine schmalen Schriften mit kleiner x-Höhe für Fliess-/UI-Text. Persönlichkeit über Schriftwahl nur bewusst (Serif = klassisch/elegant, gerundet = verspielt, neutral = sachlich).
- **Zeilenlänge:** Fliesstext 45–75 Zeichen pro Zeile (Web: ca. 20–35 `em` Breite). Auch in breiten Content-Bereichen den Absatz begrenzen, selbst wenn Bilder daneben breiter sind.
- **Zeilenhöhe:** umgekehrt proportional zur Schriftgrösse. Kleiner Text höher (ca. 1.5–1.75), grosse Headlines enger (bis 1.0–1.25). Breitere Textspalten brauchen mehr Zeilenhöhe (bis ca. 2).
- **Baseline statt Mitte:** Texte unterschiedlicher Grösse in einer Zeile an der Grundlinie ausrichten, nicht vertikal zentrieren.
- **Ausrichtung:** Text linksbündig (bzw. in Leserichtung der Sprache). Zentriert nur für Headlines und kurze Blöcke bis 2–3 Zeilen; zu lange zentrierte Texte kürzen. Zahlen in Tabellen rechtsbündig. Blocksatz nur mit aktivierter Silbentrennung.
- **Links:** im Fliesstext klar als Link erkennbar. In UIs, wo fast alles klickbar ist, dezenter (Gewicht oder dunklere Farbe). Nebensächliche Links erst bei Hover/Fokus hervorheben.
- **Laufweite:** grundsätzlich unverändert lassen. Ausnahmen: Headlines in einer Textschrift leicht enger setzen; Text in Grossbuchstaben leicht weiter setzen.

## 5. Farbe

- Farben in einem wahrnehmungsnahen Modell denken und definieren (HSL, auf Plattformen mit Unterstützung gerne OKLCH), nicht in Hex/RGB tüfteln.
- **Palette aufbauen:** Basisfarbe (taugt als Button-Hintergrund) → dunkelste Stufe (taugt als Textfarbe) → hellste Stufe (taugt als getönter Hintergrund, z. B. Alert) → Lücken schrittweise füllen (erst 700/300, dann 800/600/400/200). Mit dem Auge nachjustieren, danach aber keine neuen Stufen nebenbei hinzufügen.
- **Sättigung an den Rändern erhöhen:** Je weiter eine Stufe von mittlerer Helligkeit entfernt ist, desto mehr Sättigung braucht sie, sonst wirkt sie ausgewaschen.
- **Helligkeit über Farbton verschieben:** Für hellere Stufen den Hue leicht Richtung Gelb/Cyan/Magenta drehen, für dunklere Richtung Rot/Grün/Blau. Maximal 20–30°. Besonders bei Gelb: dunkle Stufen Richtung Orange drehen, damit sie nicht bräunlich werden.
- **Grautöne leicht tönen:** kühl (Richtung Blau) oder warm (Richtung Gelb/Orange), passend zur Persönlichkeit. Helle und dunkle Graustufen etwas stärker sättigen.
- **Barrierefreiheit:** Kontrast mindestens 4.5:1 für normalen Text, 3:1 für grossen Text (ab ca. 18 bold / 24 regular). Wenn weisser Text auf Farbe zu dunkle Hintergründe erzwingt: umkehren, also dunkle farbige Schrift auf hellem farbigem Hintergrund. Für Sekundärtext auf dunklen Farbflächen den Hue Richtung hellerer Farbtöne drehen, statt nur Richtung Weiss aufzuhellen.
- **Nie nur Farbe** als Informationsträger: zusätzlich Icon, Text, Form oder Helligkeitsunterschied (z. B. Trend-Pfeile, in Diagrammen Hell/Dunkel statt nur verschiedener Farbtöne).

## 6. Tiefe & Elevation

- **Licht kommt von oben.** Erhöhte Elemente: obere Kante minimal heller (Top-Border oder Inset-Schatten nach unten versetzt), darunter ein kleiner, scharfer, dunkler Schatten mit leichtem Y-Versatz. Vertiefte Elemente (Inputs, Checkboxen, Wells): unten heller Rand, oben innen ein kleiner dunkler Schatten. Hellere Kanten als feste Farbe wählen, nicht halbtransparentes Weiss. Dezent bleiben, kein Fotorealismus.
- **Schatten = Position auf der Z-Achse.** Erst entscheiden, wie «nah» ein Element sein soll, dann die Stufe wählen:
  - klein: Buttons, Karten
  - mittel: Dropdowns, Popover
  - gross: Modals, Dialoge
- **Zweiteilige Schatten:** ein grosser, weicher Schatten mit deutlichem Versatz (direktes Licht) plus ein kleiner, dunkler, enger (Umgebungslicht). Je höher die Elevation, desto schwächer der kleine Schatten, bei der höchsten Stufe fast unsichtbar.
- **Schatten für Interaktion:** angehobenes Element beim Ziehen = grösserer Schatten; gedrückter Button = kleinerer oder kein Schatten.
- **Tiefe ohne Schatten (Flat):** hellere Fläche als der Hintergrund wirkt erhöht, dunklere vertieft. Alternativ kurze, unscharfe Volltonschatten mit Y-Versatz.
- **Überlappung erzeugt Ebenen:** z. B. Karte über einen Hintergrundwechsel ragen lassen. Überlappende Bilder mit einem Rand in Hintergrundfarbe trennen.

## 7. Bilder & Icons

- Nur hochwertige Fotos (professionell oder gute Stockfotos). Keine Platzhalter, die «später» ersetzt werden sollen.
- **Text auf Bildern** braucht gleichmässigen Kontrast: halbtransparentes Overlay, Bildkontrast senken, Bild einfärben (entsättigen + Farbfläche multiplizieren) oder dezenter Text-Glow (grosser Blur, kein Versatz).
- **Alles hat eine Zielgrösse:** Icons nicht stark hoch- oder herunterskalieren. Kleine Icons für grosse Flächen in eine farbige Form (Kreis/Quadrat) setzen. Screenshots nicht stark verkleinern, sondern kleinere Viewports, Ausschnitte oder vereinfachte UI-Skizzen verwenden. App-Icons/Favicons für kleine Grössen eigens vereinfacht zeichnen.
- **Nutzer-Uploads:** in Container mit festem Seitenverhältnis zuschneiden («cover»-Verhalten). Gegen Verschmelzen mit dem Hintergrund einen subtilen Inset-Schatten oder halbtransparenten Innenrand verwenden statt eines harten Borders.

## 8. Feinschliff

- **Standard-Elemente aufwerten statt Neues hinzufügen:** Aufzählungspunkte durch passende Icons ersetzen, Zitatzeichen bei Testimonials als grafisches Element, eigene Checkbox-/Radio-Stile in Markenfarbe, Links mit individueller Unterstreichung.
- **Akzent-Borders** für Farbe ohne Grafikaufwand: oben an Karten, an aktiven Nav-Items, seitlich an Alerts, kurz unter Headlines, oben über dem ganzen Layout.
- **Hintergründe beleben:** Abschnitte farblich absetzen, dezente Verläufe (zwei Hues max. ca. 30° auseinander), Muster oder einzelne Formen; immer mit niedrigem Kontrast zum Inhalt.
- **Leere Zustände sind Priorität**, kein Nachgedanke: Illustration oder Bild, klare Erklärung, prominenter Call-to-Action. Tabs, Filter und Sortierungen ausblenden, solange keine Inhalte existieren.
- **Weniger Rahmen:** Trennung bevorzugt über (1) mehr Abstand, (2) unterschiedliche Hintergrundfarben, (3) dezenten Schatten. Border nur, wenn diese nicht reichen; nicht Border *und* Hintergrundwechsel doppelt verwenden.
- **Komponenten neu denken:** Dropdowns dürfen Sektionen, Spalten, Icons und Beschreibungen haben. Tabellenspalten, die nicht sortierbar sein müssen, dürfen zusammengelegt werden und eine eigene Hierarchie bekommen (Bild, Untertitel, farbige Badges). Wichtige Radio-Auswahlen als auswählbare Karten.
- **Sprache ist Teil des Designs:** Tonalität der UI-Texte passend zur gewählten Persönlichkeit, konsistent über die ganze App.

## 9. Checkliste vor Abschluss einer UI-Änderung

1. Stammen alle Abstände, Grössen, Schriftgrössen, Farben, Radien und Schatten aus den Tokens?
2. Funktioniert die Hierarchie auch in Graustufen? Gibt es genau eine klare Primäraktion?
3. Ist der Abstand zwischen Gruppen grösser als innerhalb?
4. Hat jedes Element eine sinnvolle (Max-)Breite, statt den Platz bloss zu füllen? Liegt die Zeilenlänge bei 45–75 Zeichen?
5. Erfüllen alle Texte die Kontrastanforderungen? Wird keine Information nur über Farbe vermittelt?
6. Sind Labels nur dort, wo nötig, und visuell untergeordnet?
7. Sind überflüssige Rahmen entfernt?
8. Sind Leer-, Lade- und Fehlerzustände gestaltet?
9. Funktioniert die Ansicht auf Mobile ebenso wie auf grossen Screens?
