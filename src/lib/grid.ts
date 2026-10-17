import { addDays, compareKeys, fromKey, MONTHS_SHORT, startOfWeek, weekdayIndex, type DateKey } from './dates';

/** `n` uker som rader (mandag–søndag). Siste rad er uka `today` ligger i. */
export function weekRows(today: DateKey, n: number): DateKey[][] {
  const monday = startOfWeek(today);
  return Array.from({ length: n }, (_, w) => {
    const start = addDays(monday, -(n - 1 - w) * 7);
    return Array.from({ length: 7 }, (_, d) => addDays(start, d));
  });
}

/** `n` uker som kolonner (eldst først), hver med mandag–søndag. */
export function weekColumns(today: DateKey, n: number): DateKey[][] {
  return weekRows(today, n);
}

export const isFuture = (day: DateKey, today: DateKey) => compareKeys(day, today) > 0;

/** Antall dager fra og med mandag for `n` uker siden til og med i dag. */
export function daysInRange(today: DateKey, weeks: number): number {
  return (weeks - 1) * 7 + weekdayIndex(today) + 1;
}

/** Månedsetiketter for kolonnene: kolonnen som inneholder den 1. i en måned får navnet. */
export function monthLabels(columns: DateKey[][]): { index: number; label: string }[] {
  const out: { index: number; label: string }[] = [];
  columns.forEach((col, i) => {
    const first = col.find((d) => fromKey(d).getDate() === 1);
    if (first) out.push({ index: i, label: MONTHS_SHORT[fromKey(first).getMonth()] });
  });
  return out;
}
