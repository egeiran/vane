/**
 * Datoer som lokale nøkler på formen 'YYYY-MM-DD'.
 * All aritmetikk går via lokale Date-objekter, så sommertid ikke gir hull.
 */
import { tr } from '@/i18n';

export type DateKey = string;

/** Hvilken dag uka starter på. Ukedagene i dataene er alltid mandag = 0, uansett ukestart. */
export type WeekStart = 'mon' | 'sun';

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

/** Hvor mange dager `key` er etter første dag i uka. */
export function dayOfWeek(key: DateKey, weekStart: WeekStart = 'mon'): number {
  return weekStart === 'mon' ? weekdayIndex(key) : fromKey(key).getDay();
}

/** Første dag i uka `key` ligger i: mandagen, eller søndagen når uka starter på søndag. */
export function startOfWeek(key: DateKey, weekStart: WeekStart = 'mon'): DateKey {
  return addDays(key, -dayOfWeek(key, weekStart));
}

/** Ukedagene (mandag = 0) i den rekkefølgen de vises: mandag–søndag eller søndag–lørdag. */
export function weekOrder(weekStart: WeekStart): number[] {
  return weekStart === 'mon' ? [0, 1, 2, 3, 4, 5, 6] : [6, 0, 1, 2, 3, 4, 5];
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

/** «4. november 2026» / «November 4, 2026» */
export function formatFull(key: DateKey): string {
  const d = fromKey(key);
  return tr.dates.full(d.getDate(), tr.dates.months[d.getMonth()], d.getFullYear());
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

/** Ukestripa viser så mange dager bakover. Alle kan åpnes, men bare i dag og i går kan endres. */
export const STRIP_PAST_DAYS = 5;

/** I dag, i går eller en eldre dag (som bare kan leses). */
export type DayWhen = 'today' | 'yesterday' | 'older';

export function dayWhen(key: DateKey, today: DateKey): DayWhen {
  const diff = daysBetween(key, today);
  return diff <= 0 ? 'today' : diff === 1 ? 'yesterday' : 'older';
}

/**
 * Dagen som vises når `picked` er valgt i ukestripa. `null` er alltid i dag. En dag som har gått ut av
 * stripa (appen har ligget over midnatt), eller som ligger fram i tid, blir også i dag.
 */
export function pickedDay(picked: DateKey | null, today: DateKey): DateKey {
  if (picked === null) return today;
  const diff = daysBetween(picked, today);
  return diff >= 0 && diff <= STRIP_PAST_DAYS ? picked : today;
}

/** «i dag», «i går» eller ukedagen inne i en setning: «Ikke fredag». */
export function inlineDayName(key: DateKey, today: DateKey): string {
  const when = dayWhen(key, today);
  if (when === 'today') return tr.dates.todayInline;
  if (when === 'yesterday') return tr.dates.yesterdayInline;
  return tr.dates.weekdayInline(tr.dates.weekdayLong[weekdayIndex(key)]);
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

/** Klokkeslettet slik det lagres: «18:05». Bruk `displayTime` for å vise det. */
export function formatTime({ hour, minute }: Time): string {
  return `${pad(hour)}:${pad(minute)}`;
}

/** Et lagret klokkeslett slik det vises: «18:05», eller «6:05 PM» med 12-timersklokke. */
export function displayTime(value: string, clock24: boolean): string {
  const { hour, minute } = parseTime(value);
  if (clock24) return formatTime({ hour, minute });
  return tr.dates.time12(hour % 12 || 12, pad(minute), hour >= 12);
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
