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
import { listenToWidgetTaps, pullWidgetChanges, pushWidgets, schedulePushWidgets } from './widgetSync';

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

    // Hent eventuelle trykk fra widgeten først, så de ikke overskrives av appens tilstand.
    pullWidgetChanges().finally(() => {
      pushWidgets();
      requestPermission()
        .then(() => syncNotifications())
        .catch(() => {});
    });

    const unsubscribe = useStore.subscribe((state, prev) => {
      if (state.habits === prev.habits && state.logs === prev.logs && state.goals === prev.goals && state.settings === prev.settings) return;
      schedulePushWidgets();
      scheduleNotificationSync();
    });

    const appStateSub = AppState.addEventListener('change', (status) => {
      if (status !== 'active') return;
      pullWidgetChanges().finally(() => {
        pushWidgets();
        scheduleNotificationSync(0);
      });
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
