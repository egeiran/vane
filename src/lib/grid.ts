import { tr } from '@/i18n';

import { addDays, compareKeys, dayOfWeek, daysBetween, formatShort, fromKey, startOfWeek, type DateKey, type WeekStart } from './dates';

/** `n` uker som rader (mandag–søndag eller søndag–lørdag). Siste rad er uka `today` ligger i. */
export function weekRows(today: DateKey, n: number, weekStart: WeekStart = 'mon'): DateKey[][] {
  const first = startOfWeek(today, weekStart);
  return Array.from({ length: n }, (_, w) => {
    const start = addDays(first, -(n - 1 - w) * 7);
    return Array.from({ length: 7 }, (_, d) => addDays(start, d));
  });
}

/** `n` uker som kolonner (eldst først), hver med ukas sju dager. */
export function weekColumns(today: DateKey, n: number, weekStart: WeekStart = 'mon'): DateKey[][] {
  return weekRows(today, n, weekStart);
}

export const isFuture = (day: DateKey, today: DateKey) => compareKeys(day, today) > 0;

/** Antall dager fra og med første dag i uka for `n` uker siden til og med i dag. */
export function daysInRange(today: DateKey, weeks: number, weekStart: WeekStart = 'mon'): number {
  return (weeks - 1) * 7 + dayOfWeek(today, weekStart) + 1;
}

/** Månedsetiketter for kolonnene: kolonnen som inneholder den 1. i en måned får navnet. */
export function monthLabels(columns: DateKey[][]): { index: number; label: string }[] {
  const out: { index: number; label: string }[] = [];
  columns.forEach((col, i) => {
    const first = col.find((d) => fromKey(d).getDate() === 1);
    if (first) out.push({ index: i, label: tr.dates.monthsShort[fromKey(first).getMonth()] });
  });
  return out;
}

/**
 * Siste dag i perioden `offset` perioder tilbake, der en periode er `weeks` uker. 0 er perioden som
 * slutter i dag. Rutenettet viser ukene som slutter med uka denne dagen ligger i.
 */
export function periodEnd(today: DateKey, weeks: number, offset: number): DateKey {
  return offset <= 0 ? today : addDays(today, -offset * weeks * 7);
}

/** Hvor mange perioder man kan bla tilbake før perioden ligger helt før `first`. */
export function periodsBack(first: DateKey, today: DateKey, weeks: number, weekStart: WeekStart = 'mon'): number {
  const span = daysBetween(startOfWeek(first, weekStart), startOfWeek(today, weekStart)) / 7;
  return Math.max(0, Math.floor(span / weeks));
}

/** Overskriften for en eldre periode i Oversikt: «12. okt – 8. nov», eller årene for et år. */
export function periodText(rows: DateKey[][], year: boolean): string {
  const a = rows[0][0];
  const b = rows[rows.length - 1][6];
  if (year) return a.slice(0, 4) === b.slice(0, 4) ? a.slice(0, 4) : `${a.slice(0, 4)}–${b.slice(0, 4)}`;
  return tr.overview.span(formatShort(a), formatShort(b));
}
