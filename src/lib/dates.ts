/**
 * Datoer som lokale nøkler på formen 'YYYY-MM-DD'.
 * All aritmetikk går via lokale Date-objekter, så sommertid ikke gir hull.
 */
import { tr } from '@/i18n';

export type DateKey = string;

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

/** «Lørdag 17. oktober» / «Saturday, October 17» */
export function formatLong(key: DateKey): string {
  const d = fromKey(key);
  return tr.dates.long(tr.dates.weekdayLong[weekdayIndex(key)], d.getDate(), tr.dates.months[d.getMonth()]);
}

/** «17. okt» / «Oct 17» */
export function formatShort(key: DateKey): string {
  const d = fromKey(key);
  return tr.dates.short(d.getDate(), tr.dates.monthsShort[d.getMonth()]);
}

/** «I dag», «I går» eller «Fredag 9. oktober». */
export function relativeDayName(key: DateKey, today: DateKey): string {
  const diff = daysBetween(key, today);
  if (diff === 0) return tr.dates.today;
  if (diff === 1) return tr.dates.yesterday;
  return formatLong(key);
}

/** «I dag», «I går» eller bare ukedagen: «Fredag». */
export function relativeWeekday(key: DateKey, today: DateKey): string {
  const diff = daysBetween(key, today);
  if (diff === 0) return tr.dates.today;
  if (diff === 1) return tr.dates.yesterday;
  return tr.dates.weekday(tr.dates.weekdayLong[weekdayIndex(key)]);
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
