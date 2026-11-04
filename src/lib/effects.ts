import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';

import {
  configureNotifications,
  handleNotificationResponse,
  scheduleNotificationSync,
  syncNotifications,
} from './notifications';
import { useMoney } from './moneyStore';
import { dismissResolvedNotifications, syncPurchaseNative, usePurchaseIntents } from './purchases';
import { cancelReviewCheck, noteActivity, scheduleReviewCheck } from './reviewPrompt';
import { useStore } from './store';
import { listenToWidgetTaps, scheduleSyncWidgets, syncWidgets } from './widgetSync';

/**
 * Alt som skjer i bakgrunnen mens appen kjører: varsler, svar på varsler, kjøp fra Snarveier og
 * synk med widgetene.
 */
export function useAppEffects() {
  usePurchaseIntents();

  useEffect(() => {
    if (Platform.OS === 'web') return;

    configureNotifications();
    syncPurchaseNative();
    const responseSub = Notifications.addNotificationResponseReceivedListener(handleNotificationResponse);
    const last = Notifications.getLastNotificationResponse();
    if (last) {
      // Åpnet fra et varsel: brukeren er midt i noe, så vi spør ikke om en vurdering nå.
      noteActivity();
      handleNotificationResponse(last);
      Notifications.clearLastNotificationResponse();
    }

    // Appen spør ikke om lov til varsler her. Det gjør oppstarten, etter en forklaring, eller
    // Innstillinger når et varsel slås på.
    syncWidgets().finally(() => {
      syncNotifications().catch(() => {});
    });
    scheduleReviewCheck();

    const unsubscribe = useStore.subscribe((state, prev) => {
      if (state.journal !== prev.journal) noteActivity();
      if (
        state.habits === prev.habits &&
        state.logs === prev.logs &&
        state.goals === prev.goals &&
        state.goalsSkipped === prev.goalsSkipped &&
        state.settings === prev.settings
      )
        return;
      noteActivity();
      scheduleSyncWidgets();
      scheduleNotificationSync();
      // Penger slått av eller på: Swift skal vite om det skal sendes kjøpsvarsler.
      if (state.settings.modules !== prev.settings.modules) syncPurchaseNative();
    });

    const unsubscribeMoney = useMoney.subscribe((state, prev) => {
      // Swift trenger kategoriene, stedene og hovedvalutaen for å lage kjøpsvarselet.
      if (state.categories !== prev.categories || state.merchants !== prev.merchants || state.currency !== prev.currency) {
        syncPurchaseNative();
      }
      if (state.purchases !== prev.purchases) {
        noteActivity();
        dismissResolvedNotifications(prev, state);
        scheduleSyncWidgets();
      }
    });

    let appState = AppState.currentState;
    const appStateSub = AppState.addEventListener('change', (status) => {
      const fromBackground = appState === 'background';
      appState = status;
      if (status === 'active') {
        syncWidgets().finally(() => scheduleNotificationSync(0));
        // Bare når appen åpnes igjen, ikke etter en systemdialog eller Kontrollsenter.
        if (fromBackground) scheduleReviewCheck();
      } else if (status === 'background') {
        cancelReviewCheck();
        // Send siste endring før appen legges bort, så widgeten viser det du nettopp gjorde.
        syncWidgets();
      }
    });

    const stopWidgetTaps = listenToWidgetTaps();

    return () => {
      responseSub.remove();
      unsubscribe();
      unsubscribeMoney();
      appStateSub.remove();
      stopWidgetTaps();
    };
  }, []);
}
