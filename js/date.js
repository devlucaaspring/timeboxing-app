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

// 30 → «30 min», 60 → «1 h», 90 → «1 h 30 min»
export function formatDuration(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
}
