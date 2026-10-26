import { requireOptionalNativeModule } from 'expo';
import * as AppIntents from 'expo-app-intents';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';

import { isPending, nativePurchaseConfig, visibleCategories } from './money';
import { getMoney, useMoney } from './moneyStore';
import {
  ACTION_APPROVE,
  ACTION_LATER,
  ACTION_PICK,
  applyInvocation,
  approveFromNotification,
  importFromNotification,
  NOTIFICATION_NEW,
  NOTIFICATION_SUGGEST,
  purchaseNotificationId,
  readNotificationData,
  suggestedCategoryOf,
} from './purchaseIntents';
import type { MoneyData } from './types';

/**
 * Kjøp fra Apple Pay: køen fra Swift, knappene i varselet og det Swift trenger å vite for å
 * foreslå kategori. Se `purchaseIntents.ts` og `app-intents/`.
 */

const supported = Platform.OS === 'ios';

/** Inline-modulen i `app-intents/AppIntentsSetup.swift`. Finnes ikke før appen er bygget med den. */
type SetupModule = { setPurchaseConfig(json: string): void };
const setup = supported ? requireOptionalNativeModule<SetupModule>('AppIntentsSetup') : null;

let registered = '';

/** Knappene i kjøpsvarslene. Én varselkategori per kategori, så forslaget kan stå på knappen. */
async function registerNotificationCategories() {
  const categories = visibleCategories(getMoney());
  const signature = categories.map((c) => `${c.id}=${c.name}`).join('|');
  if (signature === registered) return;
  registered = signature;
  const pick = (buttonTitle: string) => ({ identifier: ACTION_PICK, buttonTitle, options: { opensAppToForeground: true } });
  const later = { identifier: ACTION_LATER, buttonTitle: 'Senere', options: { opensAppToForeground: false } };
  await Notifications.setNotificationCategoryAsync(NOTIFICATION_NEW, [pick('Velg kategori …'), later]);
  for (const c of categories) {
    await Notifications.setNotificationCategoryAsync(NOTIFICATION_SUGGEST + c.id, [
      { identifier: ACTION_APPROVE, buttonTitle: `${c.name} ✓`, options: { opensAppToForeground: false } },
      pick('Annen kategori …'),
      later,
    ]);
  }
}

let sentConfig = '';

/** Sender kategoriene og stedene til Swift, og registrerer knappene på nytt når de endres. */
export function syncPurchaseNative() {
  if (!supported) return;
  const json = JSON.stringify(nativePurchaseConfig(getMoney()));
  if (setup && json !== sentConfig) {
    try {
      setup.setPurchaseConfig(json);
      sentConfig = json;
    } catch (e) {
      console.warn('[vane] Kunne ikke sende kategoriene til Swift', e);
    }
  }
  registerNotificationCategories().catch(() => {
    registered = '';
  });
}

/** Kjøp som har fått kategori, trenger ikke varselet sitt lenger. */
export function dismissResolvedNotifications(prev: MoneyData, next: MoneyData) {
  if (!supported) return;
  for (const p of prev.purchases) {
    if (p.source !== 'applepay' || !isPending(p)) continue;
    const now = next.purchases.find((q) => q.id === p.id);
    if (now && isPending(now)) continue;
    Notifications.dismissNotificationAsync(purchaseNotificationId(p.id)).catch(() => {});
  }
}

export function openPurchase(id: string) {
  // Ved kald oppstart er ikke navigasjonen alltid klar på første tikk.
  setTimeout(() => {
    try {
      router.navigate({ pathname: '/purchase-form', params: { id } });
    } catch {
      // Ingen navigasjon tilgjengelig – kjøpet ligger uansett under Venter.
    }
  }, 50);
}

/**
 * Svar på et kjøpsvarsel som kom fram til appen. Kjøpet tas inn fra varselet med en gang, i
 * tilfelle køen ikke er lest ennå. Gir false hvis det ikke var et kjøpsvarsel.
 */
export function handlePurchaseResponse(r: Notifications.NotificationResponse): boolean {
  const content = r.notification.request.content;
  const n = readNotificationData(content.data);
  if (!n) return false;
  const { apply } = useMoney.getState();
  apply((d) => importFromNotification(d, n));
  if (r.actionIdentifier === ACTION_APPROVE) {
    // Swift har lagt det samme i køen. Det gjør ikke noe om begge kommer fram.
    const categoryId = suggestedCategoryOf(content.categoryIdentifier);
    if (categoryId) apply((d) => approveFromNotification(d, n.purchaseId, categoryId));
  } else if (r.actionIdentifier === ACTION_PICK || r.actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER) {
    openPurchase(n.purchaseId);
  }
  return true;
}

/** Hvert kall fjernes først når det er lagret, og det samme kallet gjør ingenting to ganger. */
async function takeInvocations(pending: AppIntents.AppIntentInvocation[]) {
  for (const invocation of pending) {
    try {
      useMoney.getState().apply((d) => applyInvocation(d, invocation));
      await AppIntents.removePendingInvocationAsync(invocation.id);
    } catch (e) {
      console.warn('[vane] Kjøpet fra Snarveier venter til neste gang', invocation.id, e);
    }
  }
}

/**
 * Tar inn det Swift har lagt i køen: nye kjøp fra Snarveier og svar på forslag i varselet. Køen
 * leses når appen starter, når noe nytt kommer mens den kjører, og når den kommer i forgrunnen.
 */
export function usePurchaseIntents() {
  AppIntents.useAppIntents(takeInvocations);
  useEffect(() => {
    if (!supported) return;
    const sub = AppState.addEventListener('change', (status) => {
      if (status === 'active') AppIntents.getPendingInvocationsAsync().then(takeInvocations).catch(() => {});
    });
    return () => sub.remove();
  }, []);
}
