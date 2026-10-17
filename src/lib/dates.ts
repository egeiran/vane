/**
 * Datoer som lokale nøkler på formen 'YYYY-MM-DD'.
 * All aritmetikk går via lokale Date-objekter, så sommertid ikke gir hull.
 */
export type DateKey = string;

export const WEEKDAY_LETTER = ['M', 'T', 'O', 'T', 'F', 'L', 'S'] as const;
export const WEEKDAY_SHORT = ['Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør', 'Søn'] as const;
export const WEEKDAY_LONG = ['mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lørdag', 'søndag'] as const;
export const MONTHS = [
  'januar', 'februar', 'mars', 'april', 'mai', 'juni',
  'juli', 'august', 'september', 'oktober', 'november', 'desember',
] as const;
export const MONTHS_SHORT = ['jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'des'] as const;

const pad = (n: number) => (n < 10 ? '0' : '') + n;

export function toKey(d: Date): DateKey {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fromKey(key: DateKey): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function todayKey(now: Date = new Date()): DateKey {
  return toKey(now);
}

export function addDays(key: DateKey, n: number): DateKey {
  const d = fromKey(key);
  return toKey(new Date(d.getFullYear(), d.getMonth(), d.getDate() + n));
}

/** Antall dager fra `a` til `b` (positivt når b er senere). */
export function daysBetween(a: DateKey, b: DateKey): number {
  const da = fromKey(a);
  const db = fromKey(b);
  const ua = Date.UTC(da.getFullYear(), da.getMonth(), da.getDate());
  const ub = Date.UTC(db.getFullYear(), db.getMonth(), db.getDate());
  return Math.round((ub - ua) / 86400000);
}

/** Ukedag med mandag = 0 … søndag = 6. */
export function weekdayIndex(key: DateKey): number {
  return (fromKey(key).getDay() + 6) % 7;
}

/** Mandagen i uka `key` ligger i. */
export function startOfWeek(key: DateKey): DateKey {
  return addDays(key, -weekdayIndex(key));
}

/** ISO-ukenummer. */
export function isoWeek(key: DateKey): number {
  const d = fromKey(key);
  const thursday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - weekdayIndex(key) + 3);
  const firstThursday = new Date(thursday.getFullYear(), 0, 4);
  const diff = daysBetween(toKey(firstThursday), toKey(thursday));
  return 1 + Math.round((diff - 3 + ((firstThursday.getDay() + 6) % 7)) / 7);
}

export function compareKeys(a: DateKey, b: DateKey): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** «Lørdag 17. oktober» */
export function formatLong(key: DateKey): string {
  const d = fromKey(key);
  const w = WEEKDAY_LONG[weekdayIndex(key)];
  return `${w[0].toUpperCase()}${w.slice(1)} ${d.getDate()}. ${MONTHS[d.getMonth()]}`;
}

/** «17. okt» */
export function formatShort(key: DateKey): string {
  const d = fromKey(key);
  return `${d.getDate()}. ${MONTHS_SHORT[d.getMonth()]}`;
}

/** «I dag», «I går» eller «Fredag 9. oktober». */
export function relativeDayName(key: DateKey, today: DateKey): string {
  const diff = daysBetween(key, today);
  if (diff === 0) return 'I dag';
  if (diff === 1) return 'I går';
  return formatLong(key);
}

export type Time = { hour: number; minute: number };

export function parseTime(value: string): Time {
  const [h, m] = value.split(':').map(Number);
  return { hour: Number.isFinite(h) ? h : 8, minute: Number.isFinite(m) ? m : 0 };
}

export function formatTime({ hour, minute }: Time): string {
  return `${pad(hour)}:${pad(minute)}`;
}

/** Legger til minutter på et klokkeslett innenfor døgnet (ikke over midnatt). */
export function shiftTime(value: string, minutes: number, min = 0, max = 23 * 60 + 45): string {
  const t = parseTime(value);
  const total = Math.min(max, Math.max(min, t.hour * 60 + t.minute + minutes));
  return formatTime({ hour: Math.floor(total / 60), minute: total % 60 });
}

/** Dato og klokkeslett som et lokalt Date-objekt. */
export function atTime(key: DateKey, value: string): Date {
  const d = fromKey(key);
  const t = parseTime(value);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), t.hour, t.minute);
}
