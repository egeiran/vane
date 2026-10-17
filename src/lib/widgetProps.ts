import { getTheme } from '@/theme';
import type { LockWidgetMode, LockWidgetProps, TodayWidgetItem, TodayWidgetProps } from '@/widgets/types';

import { addDays, atTime, fromKey, todayKey, type DateKey } from './dates';
import { dailyHabitsOn, goalsOn, isDone, isWeekly, nextHabit, valueOn, weeklyHabitsOn } from './habits';
import type { Data } from './types';

/** Fram til dette klokkeslettet inviterer låseskjermen til å sette dagens mål. */
export const GOAL_PROMPT_UNTIL = '12:00';

function goalSummary(data: Data, day: DateKey) {
  const goals = goalsOn(data, day);
  const open = goals.filter((g) => !g.done);
  const done = goals.length - open.length;
  const first = open[0]?.text;
  const text = first ? (open.length > 1 ? `${first} + ${open.length - 1} til` : first) : `${done} av ${goals.length} mål gjort`;
  return { count: goals.length, done, text };
}

export function buildTodayProps(data: Data, day: DateKey): TodayWidgetProps {
  const light = getTheme(false).colors;
  const dark = getTheme(true).colors;
  const habits = [...dailyHabitsOn(data.habits, day), ...weeklyHabitsOn(data.habits, day)];
  const goals = goalSummary(data, day);
  const items: TodayWidgetItem[] = habits.map((h) => {
    const kind = h.type === 'count' && !isWeekly(h) ? 'count' : 'check';
    return {
      id: h.id,
      name: h.name,
      kind,
      target: kind === 'count' ? h.target : 1,
      value: valueOn(data, h.id, day),
      light: { solid: light[h.color].solid, soft: light[h.color].soft, ink: light[h.color].ink },
      dark: { solid: dark[h.color].solid, soft: dark[h.color].soft, ink: dark[h.color].ink },
    };
  });
  return {
    day,
    items,
    goalPrompt: goals.count === 0 && !data.goalsSkipped[day],
    goalLine: goals.count ? `Mål: ${goals.text} · ${goals.done} av ${goals.count}` : '',
    hasHabits: data.habits.length > 0,
  };
}

export function lockMode(data: Data, day: DateKey, at: Date): LockWidgetMode {
  if (goalsOn(data, day).length) return 'goals';
  if (!data.goalsSkipped[day] && at.getTime() < atTime(day, GOAL_PROMPT_UNTIL).getTime()) return 'prompt';
  return 'habits';
}

/** Hva låseskjermen viser på dagen `day`, sett fra tidspunktet `at`. */
export function buildLockProps(data: Data, day: DateKey, at: Date): LockWidgetProps {
  const daily = dailyHabitsOn(data.habits, day);
  const done = daily.filter((h) => isDone(h, valueOn(data, h.id, day))).length;
  const total = daily.length;
  const habitsText = total ? `${done} av ${total} vaner` : '';
  const mode = lockMode(data, day, at);
  const base = { day, mode, done, total };

  if (mode === 'goals') {
    const goals = goalSummary(data, day);
    return {
      ...base,
      title: 'DAGENS MÅL',
      line: goals.text,
      detail: habitsText,
      inline: total ? `${done}/${total} vaner · ${goals.done}/${goals.count} mål` : `${goals.done} av ${goals.count} mål`,
      url: 'vane://',
    };
  }

  if (mode === 'prompt') {
    return {
      ...base,
      title: 'GOD MORGEN',
      line: 'Hva vil du få til i dag?',
      detail: 'Trykk for å sette mål',
      inline: 'Sett dagens mål',
      url: 'vane://goals',
    };
  }

  const next = nextHabit(data, day);
  return {
    ...base,
    title: next ? 'NESTE' : 'I DAG',
    line: next ? `${next.name}${next.reminder ? ` · ${next.reminder}` : ''}` : total ? 'Alt er gjort i dag' : 'Legg til en vane i appen',
    detail: habitsText,
    inline: next ? `${done}/${total} · neste: ${next.name}` : total ? `${done}/${total} vaner` : 'Vane',
    url: 'vane://',
  };
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
