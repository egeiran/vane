import { tr } from '@/i18n';
import { getTheme } from '@/theme';
import type { LockWidgetMode, LockWidgetProps, PengerWidgetProps, TodayWidgetItem, TodayWidgetProps } from '@/widgets/types';

import { addDays, atTime, fromKey, todayKey, type DateKey } from './dates';
import { amountText, dailyHabitsOn, goalsOn, isDone, isEditable, isWeekly, openHabitsOn, valueOn, weeklyHabitsOn } from './habits';
import { setValue, toggleGoal } from './state';
import type { Data } from './types';

/** Fram til dette klokkeslettet inviterer widgetene til å sette dagens mål. */
export const GOAL_PROMPT_UNTIL = '12:00';

/**
 * Om widgetene skal spørre etter dagens mål (`prompt`), vise målene (`goals`) eller vanene (`habits`).
 * De spør bare om morgenen, og ikke når man har svart «Ikke i dag».
 */
export function lockMode(data: Data, day: DateKey, at: Date): LockWidgetMode {
  if (goalsOn(data, day).length) return 'goals';
  if (!data.goalsSkipped[day] && at.getTime() < atTime(day, GOAL_PROMPT_UNTIL).getTime()) return 'prompt';
  return 'habits';
}

/**
 * Det hjemskjerm-widgeten trenger for dagen `day`, sett fra tidspunktet `at`. Widgeten velger selv
 * hva den viser fram (målet, neste vane osv.), så den kan oppdatere seg etter trykk uten appen.
 * `waiting` er antall kjøp som venter på kategori.
 */
export function buildTodayProps(data: Data, day: DateKey, at: Date, waiting = 0): TodayWidgetProps {
  const light = getTheme(false).colors;
  const dark = getTheme(true).colors;
  const habits = [...dailyHabitsOn(data.habits, day), ...weeklyHabitsOn(data.habits, day)];
  const items: TodayWidgetItem[] = habits.map((h) => {
    const weekly = isWeekly(h);
    const kind = h.type === 'count' && !weekly ? 'count' : 'check';
    return {
      id: h.id,
      name: h.name,
      kind,
      target: kind === 'count' ? h.target : 1,
      value: valueOn(data, h.id, day),
      weekly,
      time: weekly ? '' : (h.reminder ?? ''),
      unit: kind === 'count' ? (h.unit ?? '') : '',
      light: { solid: light[h.color].solid, soft: light[h.color].soft, ink: light[h.color].ink },
      dark: { solid: dark[h.color].solid, soft: dark[h.color].soft, ink: dark[h.color].ink },
    };
  });
  return {
    day,
    items,
    goals: goalsOn(data, day).map((g) => ({ id: g.id, text: g.text, done: g.done })),
    goalPrompt: lockMode(data, day, at) === 'prompt',
    hasHabits: data.habits.length > 0,
    waiting,
    text: { ...tr.widgets.today },
  };
}

/** «Penger» på hjemskjermen: antall kjøp som venter, og teksten. */
export function buildPengerProps(waiting: number): PengerWidgetProps {
  return { waiting, text: { ...tr.widgets.money } };
}

/** Hva låseskjermen viser på dagen `day`, sett fra tidspunktet `at`. Ringen viser daglige vaner gjort. */
export function buildLockProps(data: Data, day: DateKey, at: Date): LockWidgetProps {
  const daily = dailyHabitsOn(data.habits, day);
  const total = daily.length;
  const done = daily.filter((h) => isDone(h, valueOn(data, h.id, day))).length;
  const mode = lockMode(data, day, at);
  const L = tr.widgets.lock;
  const base = { day, mode, done, total, short: L.goalsShort, url: 'vane://' };

  if (mode === 'prompt') {
    return {
      ...base,
      main: L.setGoal,
      sub: total ? L.habitsToday(total) : L.prompt,
      inline: L.setGoal,
      url: 'vane://goals',
    };
  }

  const goals = goalsOn(data, day);
  const openGoal = goals.find((g) => !g.done);
  if (openGoal) {
    const goalsDone = goals.filter((g) => g.done).length;
    return {
      ...base,
      main: openGoal.text,
      sub: L.goalsOf(goalsDone, goals.length),
      inline: total ? `${openGoal.text} · ${done}/${total}` : openGoal.text,
    };
  }

  // Målene er gjort (eller finnes ikke): vis det som er igjen av vanene.
  const open = openHabitsOn(data, day);
  if (open.length > 1) {
    const names = open.map((h) => h.name).join(', ');
    return { ...base, main: L.left(open.length), sub: names, inline: L.leftList(open.length, names) };
  }
  if (open.length === 1) {
    const h = open[0];
    const sub = h.type === 'count' ? amountText(h, valueOn(data, h.id, day)) : h.reminder ? tr.dates.at(h.reminder) : L.last;
    return { ...base, main: h.name, sub, inline: L.leftOne(h.name) };
  }
  if (total || goals.length) {
    const parts = [total ? tr.habits.count(total) : '', goals.length ? L.goals(goals.length) : ''].filter(Boolean);
    return { ...base, main: L.allDone, sub: parts.join(L.and), inline: L.allDoneToday };
  }
  return { ...base, main: 'Vane', sub: L.addHabit, inline: 'Vane' };
}

/**
 * Tidspunktene låseskjermen skal bytte innhold: nå, kl. 12 i dag (når invitasjonen til mål går over
 * i «neste vane»), midnatt og kl. 12 i morgen. Hjemskjerm-widgeten bytter bare ved midnatt, så
 * trykk der aldri havner i et oppslag som senere byttes ut.
 */
export function lockEntryTimes(now: Date): Date[] {
  const today = todayKey(now);
  const tomorrow = addDays(today, 1);
  const times = [now];
  const noon = atTime(today, GOAL_PROMPT_UNTIL);
  if (now.getTime() < noon.getTime()) times.push(noon);
  times.push(fromKey(tomorrow), atTime(tomorrow, GOAL_PROMPT_UNTIL));
  return times;
}

/** Verdiene appen sist sendte til hjemskjerm-widgeten, per dag: vane-id → verdi, `goal:<id>` → 1 eller 0. */
export type Pushed = Record<DateKey, Record<string, number>>;

const goalKey = (id: string) => `goal:${id}`;

export function pushedValues(entries: TodayWidgetProps[]): Pushed {
  const pushed: Pushed = {};
  for (const p of entries) {
    pushed[p.day] = Object.fromEntries([
      ...p.items.map((i) => [i.id, i.value]),
      ...p.goals.map((g) => [goalKey(g.id), g.done ? 1 : 0]),
    ]);
  }
  return pushed;
}

/**
 * Tar inn trykk gjort i widgeten. Bare det widgeten selv har endret siden appen sist sendte
 * (`pushed`) tas med, og som en endring oppå appens verdi: har vannet gått fra 5 til 6 i widgeten
 * og fra 5 til 6 i et varsel, blir det 7. Bare i dag og i går kan endres.
 */
export function applyWidgetTaps(data: Data, entries: Partial<TodayWidgetProps>[], pushed: Pushed, today: DateKey): Data {
  let next = data;
  for (const props of entries) {
    if (!props.day || !isEditable(props.day, today)) continue;
    const day = props.day;
    const sent = pushed[day] ?? {};
    for (const item of props.items ?? []) {
      const before = sent[item.id];
      if (before === undefined || before === item.value) continue;
      next = setValue(next, item.id, day, valueOn(next, item.id, day) + item.value - before);
    }
    for (const goal of props.goals ?? []) {
      const before = sent[goalKey(goal.id)];
      if (before === undefined || before === (goal.done ? 1 : 0)) continue;
      const current = goalsOn(next, day).find((g) => g.id === goal.id);
      if (current && current.done !== goal.done) next = toggleGoal(next, day, goal.id);
    }
  }
  return next;
}
