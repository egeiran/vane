import { addDays, compareKeys, daysBetween, startOfWeek, weekdayIndex, type DateKey } from './dates';
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

/** Hvor mange dager i uka (mandag–søndag) som inneholder `day` vanen er gjort. */
export function weekCount(data: Pick<Data, 'logs'>, h: Habit, day: DateKey): number {
  const monday = startOfWeek(day);
  let n = 0;
  for (let i = 0; i < 7; i++) {
    if (valueOn(data, h.id, addDays(monday, i)) >= 1) n++;
  }
  return n;
}

export function weeklyTarget(h: Habit): number {
  return h.schedule.kind === 'weekly' ? h.schedule.times : 7;
}

export function goalsOn(data: Pick<Data, 'goals'>, day: DateKey): Goal[] {
  return data.goals[day] ?? [];
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
  if (h.type === 'count') return { kind: 'amount', sum, unit: h.unit || 'ganger' };
  return { kind: 'days', done, of };
}

export function summaryText(s: PeriodSummary): string {
  switch (s.kind) {
    case 'new':
      return 'Ny i dag';
    case 'days':
      return `${s.done} av ${s.of} dager`;
    case 'times':
      return `${s.done} ${s.done === 1 ? 'gang' : 'ganger'}`;
    case 'amount':
      return `${s.sum} ${s.unit} totalt`;
  }
}

/** Bare i dag og i går kan endres. */
export function isEditable(day: DateKey, today: DateKey): boolean {
  const diff = daysBetween(day, today);
  return diff === 0 || diff === 1;
}

export function frequencyText(h: Habit): string {
  switch (h.schedule.kind) {
    case 'daily':
      return 'Hver dag';
    case 'weekly':
      return `${h.schedule.times} ${h.schedule.times === 1 ? 'gang' : 'ganger'} i uka`;
    case 'days': {
      const names = ['Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør', 'Søn'];
      const chosen = names.filter((_, i) => (h.schedule as { days: boolean[] }).days[i]);
      if (chosen.length === 7) return 'Hver dag';
      if (chosen.length === 0) return 'Ingen dager valgt';
      return chosen.join(', ');
    }
  }
}

export function amountText(h: Habit, value: number): string {
  return `${value} av ${h.target} ${h.unit || 'ganger'}`;
}
