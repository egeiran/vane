import * as Notifications from 'expo-notifications';
import { IosAuthorizationStatus } from 'expo-notifications';
import Storage from 'expo-sqlite/kv-store';
import { router } from 'expo-router';
import { Platform } from 'react-native';

import { parseTime } from './dates';
import { handlePurchaseResponse } from './purchases';
import {
  ACTION_DONE,
  ACTION_INC,
  ACTION_SNOOZE,
  CATEGORY_CHECK,
  CATEGORY_COUNT,
  MORNING,
  planReminders,
} from './reminders';
import { getData, useStore } from './store';

const supported = Platform.OS === 'ios' || Platform.OS === 'android';
const HANDLED_KEY = 'vane-handled-responses';

export function configureNotifications() {
  if (!supported) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
  const snooze = { identifier: ACTION_SNOOZE, buttonTitle: 'Om 1 time', options: { opensAppToForeground: false } };
  Notifications.setNotificationCategoryAsync(CATEGORY_CHECK, [
    { identifier: ACTION_DONE, buttonTitle: 'Gjort', options: { opensAppToForeground: false } },
    snooze,
  ]).catch(() => {});
  Notifications.setNotificationCategoryAsync(CATEGORY_COUNT, [
    { identifier: ACTION_INC, buttonTitle: '+1', options: { opensAppToForeground: false } },
    snooze,
  ]).catch(() => {});
}

function allowed(p: Notifications.NotificationPermissionsStatus): boolean {
  return p.granted || p.ios?.status === IosAuthorizationStatus.PROVISIONAL;
}

export async function hasPermission(): Promise<boolean> {
  if (!supported) return false;
  return allowed(await Notifications.getPermissionsAsync());
}

/** Spør om lov til varsler hvis vi ikke har spurt før. Returnerer om vi har lov. */
export async function requestPermission(): Promise<boolean> {
  if (!supported) return false;
  const current = await Notifications.getPermissionsAsync();
  if (allowed(current)) return true;
  if (!current.canAskAgain) return false;
  const res = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowSound: true, allowBadge: false },
  });
  return allowed(res);
}

let syncTimer: ReturnType<typeof setTimeout> | null = null;
let syncing: Promise<void> = Promise.resolve();

/** Planlegger varsler på nytt litt etter siste endring, så mange raske trykk gir én jobb. */
export function scheduleNotificationSync(delay = 800) {
  if (!supported) return;
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    syncTimer = null;
    syncing = syncing.then(syncNotifications).catch(() => {});
  }, delay);
}

/** Legger inn morgenvarselet og påminnelsene for de neste dagene på nytt. */
export async function syncNotifications(): Promise<void> {
  if (!(await hasPermission())) return;
  const data = getData();

  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => n.identifier === MORNING.id || n.identifier.startsWith('habit:'))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier))
  );

  if (data.settings.morningEnabled) {
    const { hour, minute } = parseTime(data.settings.morningTime);
    await Notifications.scheduleNotificationAsync({
      identifier: MORNING.id,
      content: { title: MORNING.title, body: MORNING.body, data: { kind: 'morning' } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute },
    });
  }

  for (const r of planReminders(data)) {
    await Notifications.scheduleNotificationAsync({
      identifier: r.id,
      content: { title: r.title, body: r.body, data: r.data, categoryIdentifier: r.category },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: r.date },
    });
  }
}

/** Et morgenvarsel om fem sekunder, så man kan se hvordan det ser ut. */
export async function sendTestNotification(): Promise<boolean> {
  if (!(await requestPermission())) return false;
  await Notifications.scheduleNotificationAsync({
    identifier: `test:${Date.now()}`,
    content: { title: MORNING.title, body: MORNING.body, data: { kind: 'morning' } },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 5 },
  });
  return true;
}

/** Et svar skal bare telle én gang, selv om appen startes på nytt rett etterpå. */
function markHandled(r: Notifications.NotificationResponse): boolean {
  const key = `${r.notification.request.identifier}|${r.actionIdentifier}|${r.notification.date}`;
  let handled: string[] = [];
  try {
    handled = JSON.parse(Storage.getItemSync(HANDLED_KEY) ?? '[]');
  } catch {
    handled = [];
  }
  if (handled.includes(key)) return false;
  Storage.setItemSync(HANDLED_KEY, JSON.stringify([...handled, key].slice(-40)));
  return true;
}

function navigate(href: '/goals' | '/') {
  // Ved kald oppstart er ikke navigasjonen alltid klar på første tikk.
  setTimeout(() => {
    try {
      router.navigate(href);
    } catch {
      // Ingen navigasjon tilgjengelig – appen åpner på I dag uansett.
    }
  }, 50);
}

type ResponseData = { kind?: string; habitId?: string; day?: string };

export function handleNotificationResponse(r: Notifications.NotificationResponse) {
  if (!markHandled(r)) return;
  if (handlePurchaseResponse(r)) return;
  const content = r.notification.request.content;
  const data = (content.data ?? {}) as ResponseData;
  const opened = r.actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER;

  if (data.kind === 'morning') {
    if (opened) navigate('/goals');
    return;
  }
  if (data.kind !== 'habit' || !data.habitId || !data.day) return;

  const store = useStore.getState();
  if (!store.habits.some((h) => h.id === data.habitId)) return;

  switch (r.actionIdentifier) {
    case ACTION_DONE:
      store.complete(data.habitId, data.day);
      break;
    case ACTION_INC:
      store.increment(data.habitId, data.day, 1);
      break;
    case ACTION_SNOOZE:
      Notifications.scheduleNotificationAsync({
        identifier: `snooze:${data.habitId}:${Date.now()}`,
        content: {
          title: content.title ?? '',
          body: content.body ?? '',
          data: content.data,
          categoryIdentifier: content.categoryIdentifier ?? CATEGORY_CHECK,
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 3600 },
      }).catch(() => {});
      break;
    default:
      if (opened) navigate('/');
  }
}
