// Datums- und Zeit-Helfer. Datumswerte sind immer lokale Strings «YYYY-MM-DD» (Zeitzone Zürich).

const TIME_ZONE = 'Europe/Zurich';

// Heutiges Datum in Zürich als «YYYY-MM-DD».
// Das Format «en-CA» liefert genau diese Schreibweise.
export function todayString(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(now);
}

// Rechnet mit UTC, damit Sommer-/Winterzeit keinen Tag verschiebt.
function toUtcDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function addDays(dateStr, days) {
  const date = toUtcDate(dateStr);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

// ISO-Wochentag eines Datums: 1 = Mo … 7 = So
export function isoWeekday(dateStr) {
  return toUtcDate(dateStr).getUTCDay() || 7;
}

// Aktuelle Uhrzeit in Zürich als Minuten seit Mitternacht
export function nowMinutes(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: TIME_ZONE, hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(now);
  const get = (type) => Number(parts.find((p) => p.type === type).value);
  return get('hour') * 60 + get('minute');
}

// «Freitag, 17. Oktober»
export function formatDateLong(dateStr) {
  return new Intl.DateTimeFormat('de-CH', {
    timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long',
  }).format(toUtcDate(dateStr));
}

// «Fr., 17. Okt.»
export function formatDateShort(dateStr) {
  return new Intl.DateTimeFormat('de-CH', {
    timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short',
  }).format(toUtcDate(dateStr));
}

// «heute», «morgen» oder «Fr., 17. Okt.»
export function formatRelativeDate(dateStr, today = todayString()) {
  if (dateStr === today) return 'heute';
  if (dateStr === addDays(today, 1)) return 'morgen';
  return formatDateShort(dateStr);
}

// ---------- Uhrzeiten ----------
// Postgres liefert Zeiten als «14:00:00». In der App rechnen wir mit Minuten seit Mitternacht.

export function timeToMinutes(time) {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

// 840 → «14:00»
export function minutesToTime(minutes) {
  const h = String(Math.floor(minutes / 60) % 24).padStart(2, '0');
  const m = String(minutes % 60).padStart(2, '0');
  return `${h}:${m}`;
}

// «14:00:00» → «14:00»
export function formatTime(time) {
  return time.slice(0, 5);
}

// Startzeiten im Raster: 05:00, 05:15, … 22:45
export const DAY_START_MIN = 5 * 60;
export const DAY_END_MIN = 23 * 60;

export function slotTimes() {
  const times = [];
  for (let m = DAY_START_MIN; m < DAY_END_MIN; m += 15) times.push(minutesToTime(m));
  return times;
}

// ---------- Wochentage (ISO: 1 = Mo … 7 = So) ----------

export const WEEKDAYS = [
  { iso: 1, short: 'Mo' }, { iso: 2, short: 'Di' }, { iso: 3, short: 'Mi' },
  { iso: 4, short: 'Do' }, { iso: 5, short: 'Fr' }, { iso: 6, short: 'Sa' },
  { iso: 7, short: 'So' },
];

// 30 → «30 min», 60 → «1 h», 90 → «1 h 30 min»
export function formatDuration(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
}
