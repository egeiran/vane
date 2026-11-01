import { tr } from '@/i18n';

import { addDays, compareKeys, daysBetween, startOfWeek, weekdayIndex, weekOrder, type DateKey, type WeekStart } from './dates';
import type { Data, Goal, Habit } from './types';

export const isWeekly = (h: Habit) => h.schedule.kind === 'weekly';

/** Fantes vanen denne dagen? */
export const existsOn = (h: Habit, day: DateKey) => compareKeys(day, h.createdAt) >= 0;

/** Skal vanen gjøres denne dagen? Ukentlige vaner kan gjøres hvilken som helst dag. */
export function isScheduled(h: Habit, day: DateKey): boolean {
  if (!existsOn(h, day)) return false;
  switch (h.schedule.kind) {
    case 'daily':
    case 'weekly':
      return true;
    case 'days':
      return !!h.schedule.days[weekdayIndex(day)];
  }
}

export function valueOn(data: Pick<Data, 'logs'>, habitId: string, day: DateKey): number {
  return data.logs[day]?.[habitId] ?? 0;
}

/** Andel gjort, 0–1. */
export function fractionFor(h: Habit, value: number): number {
  if (h.type === 'count' && !isWeekly(h)) return Math.min(value / Math.max(h.target, 1), 1);
  return value >= 1 ? 1 : 0;
}

export const isDone = (h: Habit, value: number) => fractionFor(h, value) >= 1;

/** Andel gjort for en vane en dag, eller null når vanen ikke gjaldt den dagen. */
export function fractionOn(data: Pick<Data, 'logs'>, h: Habit, day: DateKey): number | null {
  if (!isScheduled(h, day)) return null;
  return fractionFor(h, valueOn(data, h.id, day));
}

/** Daglige vaner (ikke ukentlige) som gjelder denne dagen. */
export function dailyHabitsOn(habits: Habit[], day: DateKey): Habit[] {
  return habits.filter((h) => !isWeekly(h) && isScheduled(h, day));
}

/** Daglige vaner som fantes, men ikke skal gjøres denne dagen (valgte ukedager). */
export function restingHabitsOn(habits: Habit[], day: DateKey): Habit[] {
  return habits.filter((h) => !isWeekly(h) && existsOn(h, day) && !isScheduled(h, day));
}

export function weeklyHabitsOn(habits: Habit[], day: DateKey): Habit[] {
  return habits.filter((h) => isWeekly(h) && existsOn(h, day));
}

/**
 * Hvor mange dager i uka som inneholder `day` vanen er gjort. Uka er mandag–søndag, eller
 * søndag–lørdag når den starter på søndag (se `weekStartOf`).
 */
export function weekCount(data: Pick<Data, 'logs'>, h: Habit, day: DateKey, weekStart: WeekStart = 'mon'): number {
  const first = startOfWeek(day, weekStart);
  let n = 0;
  for (let i = 0; i < 7; i++) {
    if (valueOn(data, h.id, addDays(first, i)) >= 1) n++;
  }
  return n;
}

export function weeklyTarget(h: Habit): number {
  return h.schedule.kind === 'weekly' ? h.schedule.times : 7;
}

export function goalsOn(data: Pick<Data, 'goals'>, day: DateKey): Goal[] {
  return data.goals[day] ?? [];
}

/** Daglige vaner som ikke er gjort, i den rekkefølgen de bør tas: de med påminnelse først, etter klokkeslett. */
export function openHabitsOn(data: Data, day: DateKey): Habit[] {
  const open = dailyHabitsOn(data.habits, day).filter((h) => !isDone(h, valueOn(data, h.id, day)));
  const timed = open.filter((h) => h.reminder).sort((a, b) => compareKeys(a.reminder!, b.reminder!));
  return [...timed, ...open.filter((h) => !h.reminder)];
}

/** Neste daglige vane som ikke er gjort. */
export function nextHabit(data: Data, day: DateKey): Habit | null {
  return openHabitsOn(data, day)[0] ?? null;
}

export type DayStats = { done: number; total: number; average: number | null };

/** Alt samlet for en dag: daglige vaner og dagens mål (ukentlige vaner holdes utenfor). */
export function dayStats(data: Data, day: DateKey): DayStats {
  const values: number[] = [];
  for (const h of dailyHabitsOn(data.habits, day)) values.push(fractionFor(h, valueOn(data, h.id, day)));
  for (const g of goalsOn(data, day)) values.push(g.done ? 1 : 0);
  const done = values.filter((v) => v >= 1).length;
  const average = values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
  return { done, total: values.length, average };
}

export type PeriodSummary =
  | { kind: 'new' }
  | { kind: 'days'; done: number; of: number }
  | { kind: 'times'; done: number }
  | { kind: 'amount'; sum: number; unit: string };

/** Oppsummering for de `n` siste dagene som slutter med `end`. */
export function periodSummary(data: Data, h: Habit, end: DateKey, n: number): PeriodSummary {
  if (daysBetween(h.createdAt, end) === 0) return { kind: 'new' };
  let done = 0;
  let of = 0;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const day = addDays(end, -i);
    if (!isScheduled(h, day)) continue;
    const v = valueOn(data, h.id, day);
    of++;
    if (isDone(h, v)) done++;
    sum += v;
  }
  if (isWeekly(h)) return { kind: 'times', done };
  if (h.type === 'count') return { kind: 'amount', sum, unit: h.unit };
  return { kind: 'days', done, of };
}

export function summaryText(s: PeriodSummary): string {
  switch (s.kind) {
    case 'new':
      return tr.habits.newToday;
    case 'days':
      return tr.habits.daysOf(s.done, s.of);
    case 'times':
      return tr.habits.times(s.done);
    case 'amount':
      return tr.habits.total(s.sum, s.unit || tr.habits.defaultUnit);
  }
}

/** Bare i dag og i går kan endres. */
export function isEditable(day: DateKey, today: DateKey): boolean {
  const diff = daysBetween(day, today);
  return diff === 0 || diff === 1;
}

/** «Hver dag», «3 ganger i uka» eller dagene i ukas rekkefølge: «Man, Ons, Fre» / «Søn, Man, Ons». */
export function frequencyText(h: Habit, weekStart: WeekStart = 'mon'): string {
  switch (h.schedule.kind) {
    case 'daily':
      return tr.habits.everyDay;
    case 'weekly':
      return tr.habits.perWeek(h.schedule.times);
    case 'days': {
      const days = h.schedule.days;
      const chosen = weekOrder(weekStart).filter((i) => days[i]).map((i) => tr.dates.weekdayShort[i]);
      if (chosen.length === 7) return tr.habits.everyDay;
      if (chosen.length === 0) return tr.habits.noDays;
      return chosen.join(', ');
    }
  }
}

export function amountText(h: Habit, value: number): string {
  return tr.habits.amount(value, h.target, h.unit || tr.habits.defaultUnit);
}
