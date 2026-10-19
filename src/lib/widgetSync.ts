import Storage from 'expo-sqlite/kv-store';
import { addUserInteractionListener } from 'expo-widgets';
import { Platform } from 'react-native';

import LockWidget from '@/widgets/LockWidget';
import TodayWidget from '@/widgets/TodayWidget';

import { addDays, fromKey, todayKey, type DateKey } from './dates';
import { isEditable } from './habits';
import { getData, useStore } from './store';
import { buildLockProps, buildTodayProps, lockEntryTimes } from './widgetProps';

const supported = Platform.OS === 'ios';
/** Verdiene appen sist sendte til widgeten, per dag: vane-id → verdi og `goal:<id>` → 1 eller 0. */
const PUSHED_KEY = 'vane-widget-pushed';

type Pushed = Record<DateKey, Record<string, number>>;

const goalKey = (id: string) => `goal:${id}`;

function readPushed(): Pushed {
  try {
    return JSON.parse(Storage.getItemSync(PUSHED_KEY) ?? '{}');
  } catch {
    return {};
  }
}

/**
 * Sender dagens tilstand til widgetene, pluss oppslag som tar over senere: hjemskjermen bytter ved
 * midnatt, låseskjermen også kl. 12 (se `lockEntryTimes`).
 */
export function pushWidgets() {
  if (!supported) return;
  const data = getData();
  const now = new Date();
  const today = todayKey(now);
  const tomorrow = addDays(today, 1);
  const todayProps = buildTodayProps(data, today, now);
  const tomorrowProps = buildTodayProps(data, tomorrow, fromKey(tomorrow));
  try {
    TodayWidget.updateTimeline([
      { date: now, props: todayProps },
      { date: fromKey(tomorrow), props: tomorrowProps },
    ]);
    LockWidget.updateTimeline(
      lockEntryTimes(now).map((at) => ({ date: at, props: buildLockProps(data, todayKey(at), at) }))
    );
    const pushed: Pushed = {};
    for (const p of [todayProps, tomorrowProps]) {
      pushed[p.day] = Object.fromEntries([
        ...p.items.map((i) => [i.id, i.value]),
        ...p.goals.map((g) => [goalKey(g.id), g.done ? 1 : 0]),
      ]);
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
    for (const goal of props.goals ?? []) {
      const sent = pushed[props.day]?.[goalKey(goal.id)];
      if (sent === undefined || sent === (goal.done ? 1 : 0)) continue;
      const current = store.goals[props.day]?.find((g) => g.id === goal.id);
      if (!current || current.done === goal.done) continue;
      store.toggleGoal(props.day, goal.id);
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
