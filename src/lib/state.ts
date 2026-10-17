import type { DateKey } from './dates';
import { isWeekly } from './habits';
import type { Data, Goal, Habit, HabitInput, Settings } from './types';

/** Rene funksjoner som tar inn data og gir nye data tilbake. Lagringen ligger i store.ts. */

export function newId(prefix = ''): string {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/** Ukentlige vaner er alltid ja/nei, og ja/nei har alltid mål 1. */
export function normalizeHabit<T extends HabitInput>(input: T): T {
  const weekly = input.schedule.kind === 'weekly';
  const type = weekly ? 'check' : input.type;
  return {
    ...input,
    name: input.name.trim(),
    unit: input.unit.trim(),
    type,
    target: type === 'count' ? Math.max(2, Math.round(input.target)) : 1,
  };
}

export function addHabit(data: Data, input: HabitInput, today: DateKey, id = newId('h')): Data {
  const habit: Habit = { ...normalizeHabit(input), id, createdAt: today };
  return { ...data, habits: [...data.habits, habit] };
}

export function updateHabit(data: Data, id: string, input: HabitInput): Data {
  return {
    ...data,
    habits: data.habits.map((h) => (h.id === id ? { ...h, ...normalizeHabit(input) } : h)),
  };
}

export function deleteHabit(data: Data, id: string): Data {
  const logs: Data['logs'] = {};
  for (const [day, log] of Object.entries(data.logs)) {
    if (!(id in log)) {
      logs[day] = log;
      continue;
    }
    const { [id]: _removed, ...rest } = log;
    if (Object.keys(rest).length) logs[day] = rest;
  }
  return { ...data, habits: data.habits.filter((h) => h.id !== id), logs };
}

export function setValue(data: Data, habitId: string, day: DateKey, value: number): Data {
  const habit = data.habits.find((h) => h.id === habitId);
  if (!habit) return data;
  const max = habit.type === 'count' && !isWeekly(habit) ? habit.target : 1;
  const v = Math.max(0, Math.min(max, Math.round(value)));
  const log = { ...(data.logs[day] ?? {}) };
  if (v === 0) delete log[habitId];
  else log[habitId] = v;
  const logs = { ...data.logs };
  if (Object.keys(log).length) logs[day] = log;
  else delete logs[day];
  return { ...data, logs };
}

export function toggleHabit(data: Data, habitId: string, day: DateKey): Data {
  const current = data.logs[day]?.[habitId] ?? 0;
  return setValue(data, habitId, day, current >= 1 ? 0 : 1);
}

export function incrementHabit(data: Data, habitId: string, day: DateKey, delta: number): Data {
  const current = data.logs[day]?.[habitId] ?? 0;
  return setValue(data, habitId, day, current + delta);
}

/** Marker en vane som gjort (brukes fra varsler, der «Gjort» aldri skal angre). */
export function completeHabit(data: Data, habitId: string, day: DateKey): Data {
  const habit = data.habits.find((h) => h.id === habitId);
  if (!habit) return data;
  return setValue(data, habitId, day, habit.type === 'count' && !isWeekly(habit) ? habit.target : 1);
}

export function addGoal(data: Data, day: DateKey, text: string, id = newId('g')): Data {
  const t = text.trim();
  if (!t) return data;
  const goal: Goal = { id, text: t, done: false };
  return { ...data, goals: { ...data.goals, [day]: [...(data.goals[day] ?? []), goal] } };
}

export function toggleGoal(data: Data, day: DateKey, id: string): Data {
  const list = data.goals[day];
  if (!list) return data;
  return {
    ...data,
    goals: { ...data.goals, [day]: list.map((g) => (g.id === id ? { ...g, done: !g.done } : g)) },
  };
}

export function removeGoal(data: Data, day: DateKey, id: string): Data {
  const list = (data.goals[day] ?? []).filter((g) => g.id !== id);
  const goals = { ...data.goals };
  if (list.length) goals[day] = list;
  else delete goals[day];
  return { ...data, goals };
}

/** «Ikke i dag»: ingen mål denne dagen, og ingen flere spørsmål om det. */
export function skipGoals(data: Data, day: DateKey): Data {
  return { ...data, goalsSkipped: { ...data.goalsSkipped, [day]: true } };
}

export function updateSettings(data: Data, patch: Partial<Settings>): Data {
  return { ...data, settings: { ...data.settings, ...patch } };
}
