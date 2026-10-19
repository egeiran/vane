import { getTheme } from '@/theme';
import type { LockWidgetMode, LockWidgetProps, TodayWidgetItem, TodayWidgetProps } from '@/widgets/types';

import { addDays, atTime, fromKey, todayKey, type DateKey } from './dates';
import { amountText, dailyHabitsOn, goalsOn, isDone, isWeekly, openHabitsOn, valueOn, weeklyHabitsOn } from './habits';
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
 */
export function buildTodayProps(data: Data, day: DateKey, at: Date): TodayWidgetProps {
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
      time: weekly ? null : h.reminder,
      unit: kind === 'count' ? h.unit : '',
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
  };
}

const vaner = (n: number) => `${n} ${n === 1 ? 'vane' : 'vaner'}`;

/** Hva låseskjermen viser på dagen `day`, sett fra tidspunktet `at`. Ringen viser daglige vaner gjort. */
export function buildLockProps(data: Data, day: DateKey, at: Date): LockWidgetProps {
  const daily = dailyHabitsOn(data.habits, day);
  const total = daily.length;
  const done = daily.filter((h) => isDone(h, valueOn(data, h.id, day))).length;
  const mode = lockMode(data, day, at);
  const base = { day, mode, done, total, url: 'vane://' };

  if (mode === 'prompt') {
    return {
      ...base,
      main: 'Sett dagens mål',
      sub: total ? `${vaner(total)} i dag` : 'Hva vil du få til i dag?',
      inline: 'Sett dagens mål',
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
      sub: `${goalsDone} av ${goals.length} mål`,
      inline: total ? `${openGoal.text} · ${done}/${total}` : openGoal.text,
    };
  }

  // Målene er gjort (eller finnes ikke): vis det som er igjen av vanene.
  const open = openHabitsOn(data, day);
  if (open.length > 1) {
    const names = open.map((h) => h.name).join(', ');
    return { ...base, main: `${open.length} igjen`, sub: names, inline: `${open.length} igjen: ${names}` };
  }
  if (open.length === 1) {
    const h = open[0];
    const sub = h.type === 'count' ? amountText(h, valueOn(data, h.id, day)) : h.reminder ? `kl. ${h.reminder}` : 'Den siste i dag';
    return { ...base, main: h.name, sub, inline: `Igjen: ${h.name}` };
  }
  if (total || goals.length) {
    const parts = [total ? vaner(total) : '', goals.length ? `${goals.length} mål` : ''].filter(Boolean);
    return { ...base, main: 'Alt er gjort', sub: parts.join(' og '), inline: 'Alt er gjort i dag' };
  }
  return { ...base, main: 'Vane', sub: 'Legg til en vane i appen', inline: 'Vane' };
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
