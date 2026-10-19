import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';

import {
  configureNotifications,
  handleNotificationResponse,
  requestPermission,
  scheduleNotificationSync,
  syncNotifications,
} from './notifications';
import { useStore } from './store';
import { listenToWidgetTaps, scheduleSyncWidgets, syncWidgets } from './widgetSync';

/**
 * Alt som skjer i bakgrunnen mens appen kjører: varsler, svar på varsler og synk med widgetene.
 */
export function useAppEffects() {
  useEffect(() => {
    if (Platform.OS === 'web') return;

    configureNotifications();
    const responseSub = Notifications.addNotificationResponseReceivedListener(handleNotificationResponse);
    const last = Notifications.getLastNotificationResponse();
    if (last) {
      handleNotificationResponse(last);
      Notifications.clearLastNotificationResponse();
    }

    syncWidgets().finally(() => {
      requestPermission()
        .then(() => syncNotifications())
        .catch(() => {});
    });

    const unsubscribe = useStore.subscribe((state, prev) => {
      if (
        state.habits === prev.habits &&
        state.logs === prev.logs &&
        state.goals === prev.goals &&
        state.goalsSkipped === prev.goalsSkipped &&
        state.settings === prev.settings
      )
        return;
      scheduleSyncWidgets();
      scheduleNotificationSync();
    });

    const appStateSub = AppState.addEventListener('change', (status) => {
      if (status === 'active') {
        syncWidgets().finally(() => scheduleNotificationSync(0));
      } else if (status === 'background') {
        // Send siste endring før appen legges bort, så widgeten viser det du nettopp gjorde.
        syncWidgets();
      }
    });

    const stopWidgetTaps = listenToWidgetTaps();

    return () => {
      responseSub.remove();
      unsubscribe();
      appStateSub.remove();
      stopWidgetTaps();
    };
  }, []);
}
