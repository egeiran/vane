import Storage from 'expo-sqlite/kv-store';
import { addUserInteractionListener } from 'expo-widgets';
import { Platform } from 'react-native';

import { getTheme } from '@/theme';
import LockWidget from '@/widgets/LockWidget';
import TodayWidget from '@/widgets/TodayWidget';
import type { LockWidgetProps, TodayWidgetItem, TodayWidgetProps } from '@/widgets/types';

import { addDays, fromKey, todayKey, type DateKey } from './dates';
import { dailyHabitsOn, goalsOn, isDone, isEditable, isWeekly, valueOn, weeklyHabitsOn } from './habits';
import { getData, useStore } from './store';
import type { Data } from './types';

const supported = Platform.OS === 'ios';
/** Verdiene appen sist sendte til widgeten, per dag og vane. */
const PUSHED_KEY = 'vane-widget-pushed';

type Pushed = Record<DateKey, Record<string, number>>;

function readPushed(): Pushed {
  try {
    return JSON.parse(Storage.getItemSync(PUSHED_KEY) ?? '{}');
  } catch {
    return {};
  }
}

export function buildTodayProps(data: Data, day: DateKey): TodayWidgetProps {
  const light = getTheme(false).colors;
  const dark = getTheme(true).colors;
  const habits = [...dailyHabitsOn(data.habits, day), ...weeklyHabitsOn(data.habits, day)];
  const goals = goalsOn(data, day);
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
    goalsDone: goals.filter((g) => g.done).length,
    goalsTotal: goals.length,
    hasHabits: data.habits.length > 0,
  };
}

export function buildLockProps(data: Data, day: DateKey): LockWidgetProps {
  const daily = dailyHabitsOn(data.habits, day);
  const goals = goalsOn(data, day);
  const open = goals.filter((g) => !g.done);
  const first = (open[0] ?? goals[0])?.text;
  return {
    day,
    done: daily.filter((h) => isDone(h, valueOn(data, h.id, day))).length,
    total: daily.length,
    goalText: !first ? 'Ikke satt ennå' : goals.length > 1 ? `${first} + ${goals.length - 1} til` : first,
    goalsDone: goals.length - open.length,
    goalsTotal: goals.length,
  };
}

/** Sender dagens tilstand til widgetene, pluss et oppslag som tar over ved midnatt. */
export function pushWidgets() {
  if (!supported) return;
  const data = getData();
  const today = todayKey();
  const tomorrow = addDays(today, 1);
  const now = new Date();
  const midnight = fromKey(tomorrow);
  const todayProps = buildTodayProps(data, today);
  const tomorrowProps = buildTodayProps(data, tomorrow);
  try {
    TodayWidget.updateTimeline([
      { date: now, props: todayProps },
      { date: midnight, props: tomorrowProps },
    ]);
    LockWidget.updateTimeline([
      { date: now, props: buildLockProps(data, today) },
      { date: midnight, props: buildLockProps(data, tomorrow) },
    ]);
    const pushed: Pushed = {};
    for (const p of [todayProps, tomorrowProps]) {
      pushed[p.day] = Object.fromEntries(p.items.map((i) => [i.id, i.value]));
    }
    Storage.setItemSync(PUSHED_KEY, JSON.stringify(pushed));
  } catch (e) {
    console.warn('[vane] Kunne ikke oppdatere widgetene', e);
  }
}

let pushTimer: ReturnType<typeof setTimeout> | null = null;

/** Samler raske endringer til én oppdatering. */
export function schedulePushWidgets() {
  if (!supported) return;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushTimer = null;
    pushWidgets();
  }, 150);
}

/**
 * Leser trykk gjort i widgeten tilbake til appen. Bare verdier widgeten selv har endret
 * (forskjellig fra det appen sist sendte) tas inn, så nyere endringer i appen ikke overskrives.
 */
export async function pullWidgetChanges(): Promise<boolean> {
  if (!supported) return false;
  let entries: Awaited<ReturnType<typeof TodayWidget.getTimeline>>;
  try {
    entries = await TodayWidget.getTimeline();
  } catch {
    return false;
  }
  const pushed = readPushed();
  const today = todayKey();
  const store = useStore.getState();
  let changed = false;
  for (const entry of entries) {
    const props = entry.props;
    if (!props?.day || !isEditable(props.day, today)) continue;
    for (const item of props.items ?? []) {
      const sent = pushed[props.day]?.[item.id];
      if (sent === undefined || sent === item.value) continue;
      if (!store.habits.some((h) => h.id === item.id)) continue;
      store.setValue(item.id, props.day, item.value);
      changed = true;
    }
  }
  return changed;
}

/** Når appen kjører og noen trykker i widgeten: hent endringen og send oppdatert tilstand tilbake. */
export function listenToWidgetTaps() {
  if (!supported) return () => {};
  const sub = addUserInteractionListener((event) => {
    if (event.source !== 'TodayWidget') return;
    pullWidgetChanges().then(() => pushWidgets());
  });
  return () => sub.remove();
}
