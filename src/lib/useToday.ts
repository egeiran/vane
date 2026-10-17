import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { todayKey, type DateKey } from './dates';

/** Dagens dato, som oppdaterer seg ved midnatt og når appen kommer i forgrunnen. */
export function useToday(): DateKey {
  const [today, setToday] = useState(todayKey);

  useEffect(() => {
    const refresh = () => setToday(todayKey());
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') refresh();
    });
    const now = new Date();
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 5);
    const timer = setTimeout(refresh, midnight.getTime() - now.getTime());
    return () => {
      sub.remove();
      clearTimeout(timer);
    };
  }, [today]);

  return today;
}
