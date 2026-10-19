import Storage from 'expo-sqlite/kv-store';
import { addUserInteractionListener } from 'expo-widgets';
import { Platform } from 'react-native';

import LockWidget from '@/widgets/LockWidget';
import TodayWidget from '@/widgets/TodayWidget';

import { addDays, fromKey, todayKey } from './dates';
import { getData, useStore } from './store';
import { applyWidgetTaps, buildLockProps, buildTodayProps, lockEntryTimes, pushedValues, type Pushed } from './widgetProps';

const supported = Platform.OS === 'ios';
/** Verdiene appen sist sendte til hjemskjerm-widgeten (se `Pushed`). */
const PUSHED_KEY = 'vane-widget-pushed';

function readPushed(): Pushed {
  try {
    return JSON.parse(Storage.getItemSync(PUSHED_KEY) ?? '{}');
  } catch {
    return {};
  }
}

/** Leser trykk gjort i widgeten inn i appen. */
async function pull() {
  let entries: Awaited<ReturnType<typeof TodayWidget.getTimeline>>;
  try {
    entries = await TodayWidget.getTimeline();
  } catch {
    return;
  }
  const data = getData();
  const next = applyWidgetTaps(data, entries.map((e) => e.props ?? {}), readPushed(), todayKey());
  if (next !== data) useStore.setState(next);
}

/**
 * Sender dagens tilstand til widgetene, pluss oppslag som tar over senere: hjemskjermen bytter ved
 * midnatt, låseskjermen også kl. 12 (se `lockEntryTimes`).
 */
function push() {
  const data = getData();
  const now = new Date();
  const today = todayKey(now);
  const tomorrow = addDays(today, 1);
  const todayEntries = [
    { date: now, props: buildTodayProps(data, today, now) },
    { date: fromKey(tomorrow), props: buildTodayProps(data, tomorrow, fromKey(tomorrow)) },
  ];
  // Hver widget for seg, så en feil i den ene ikke stopper den andre.
  try {
    TodayWidget.updateTimeline(todayEntries);
    Storage.setItemSync(PUSHED_KEY, JSON.stringify(pushedValues(todayEntries.map((e) => e.props))));
  } catch (e) {
    console.warn('[vane] Kunne ikke oppdatere hjemskjerm-widgeten', e);
  }
  try {
    LockWidget.updateTimeline(lockEntryTimes(now).map((at) => ({ date: at, props: buildLockProps(data, todayKey(at), at) })));
  } catch (e) {
    console.warn('[vane] Kunne ikke oppdatere låseskjerm-widgeten', e);
  }
}

let queue: Promise<void> = Promise.resolve();
let timer: ReturnType<typeof setTimeout> | null = null;

/**
 * Synker med widgetene: leser først trykk fra widgeten, og sender så appens tilstand tilbake.
 * Alt går i kø, så appen aldri sender (og overskriver widgeten) før den har lest trykkene der.
 */
export function syncWidgets(): Promise<void> {
  if (!supported) return Promise.resolve();
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  queue = queue.then(pull).then(push, push);
  return queue;
}

/** Samler raske endringer i appen til én synk. */
export function scheduleSyncWidgets() {
  if (!supported) return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    syncWidgets();
  }, 100);
}

/** Når appen kjører og noen trykker i widgeten: hent endringen og send oppdatert tilstand tilbake. */
export function listenToWidgetTaps() {
  if (!supported) return () => {};
  const sub = addUserInteractionListener((event) => {
    if (event.source === 'TodayWidget') syncWidgets();
  });
  return () => sub.remove();
}
