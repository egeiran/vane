import { tr } from '@/i18n';

import { addDays, atTime, todayKey, type DateKey } from './dates';
import { isDone, isScheduled, isWeekly, valueOn, weekCount, weeklyTarget } from './habits';
import { weekStartOf } from './region';
import type { Data, Habit } from './types';

export const CATEGORY_CHECK = 'habit-check';
export const CATEGORY_COUNT = 'habit-count';
export const ACTION_DONE = 'done';
export const ACTION_INC = 'inc';
export const ACTION_SNOOZE = 'snooze';

/** Hvor mange dager fram påminnelser legges inn. Appen fyller på hver gang den åpnes. */
export const DAYS_AHEAD = 7;
/** iOS holder maks 64 planlagte varsler per app; morgenvarselet og «om 1 time» trenger også plass. */
export const MAX_REMINDERS = 56;

export type PlannedReminder = {
  id: string;
  date: Date;
  title: string;
  body: string;
  category: string;
  data: { kind: 'habit'; habitId: string; day: DateKey };
};

/** Morgenvarselet. Teksten leses når varselet legges inn, på språket appen har da. */
export const MORNING = {
  id: 'morning',
  get title() {
    return tr.notifications.morningTitle;
  },
  get body() {
    return tr.notifications.morningBody;
  },
};

function bodyFor(data: Data, h: Habit, day: DateKey): string {
  if (isWeekly(h)) return tr.notifications.weeklyBody(weekCount(data, h, day, weekStartOf(data.settings)), weeklyTarget(h));
  if (h.type === 'count') return tr.notifications.countBody(h.target, h.unit || tr.habits.defaultUnit);
  return tr.notifications.checkBody;
}

/**
 * Påminnelser for de neste dagene. Vaner som allerede er gjort (eller ukemål som er nådd)
 * får ingen påminnelse – varsler skal være en hjelp, ikke mas.
 */
export function planReminders(data: Data, now: Date = new Date()): PlannedReminder[] {
  if (!data.settings.remindersEnabled) return [];
  const today = todayKey(now);
  const out: PlannedReminder[] = [];
  for (let i = 0; i < DAYS_AHEAD; i++) {
    const day = addDays(today, i);
    for (const h of data.habits) {
      if (!h.reminder || !isScheduled(h, day)) continue;
      const date = atTime(day, h.reminder);
      if (date.getTime() <= now.getTime()) continue;
      if (isDone(h, valueOn(data, h.id, day))) continue;
      if (isWeekly(h) && weekCount(data, h, day, weekStartOf(data.settings)) >= weeklyTarget(h)) continue;
      out.push({
        id: `habit:${h.id}:${day}`,
        date,
        title: h.name,
        body: bodyFor(data, h, day),
        category: h.type === 'count' && !isWeekly(h) ? CATEGORY_COUNT : CATEGORY_CHECK,
        data: { kind: 'habit', habitId: h.id, day },
      });
    }
  }
  out.sort((a, b) => a.date.getTime() - b.date.getTime());
  return out.slice(0, MAX_REMINDERS);
}
