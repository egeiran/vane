import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';

import { useAppEffects } from '@/lib/effects';
import { getMoney } from '@/lib/moneyStore';
import { needsOnboarding } from '@/lib/onboarding';
import { getData, useStore } from '@/lib/store';
import { useTheme } from '@/theme';

SplashScreen.preventAutoHideAsync();

/**
 * Fanene ligger alltid nederst i stabelen. Åpnes appen fra en lenke (widgetene åpner
 * `vane://purchase-form` og `vane://goals`), legges skjermen oppå fanene. Uten dette blir et ark
 * den eneste skjermen og vises i full skjerm, med knappene under statuslinja der trykk ikke når fram.
 */
export const unstable_settings = { anchor: '(tabs)' };

export default function RootLayout() {
  const t = useTheme();
  useAppEffects();
  // Avgjøres når appen starter (dataene leses synkront). Vanene man legger til i oppstarten,
  // lukker den ikke. Det gjør `onboarded`, når man er ferdig eller hopper over.
  const [firstRun] = useState(() => needsOnboarding(getData(), getMoney()));
  const onboarded = useStore((s) => s.settings.onboarded);
  const onboarding = firstRun && !onboarded;

  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  const base = t.dark ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...base,
    colors: { ...base.colors, background: t.bg, card: t.bg, text: t.text, primary: t.text, border: t.hair },
  };

  return (
    <ThemeProvider value={navTheme}>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.bg } }}>
        {/* En ny bruker ser oppstarten først. Også en lenke fra en widget går dit. */}
        <Stack.Protected guard={!onboarding} redirectTo="/onboarding">
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="habit/[id]" />
          <Stack.Screen name="goals" options={{ presentation: 'modal' }} />
          <Stack.Screen name="habit-form" options={{ presentation: 'modal' }} />
          <Stack.Screen name="purchases" />
          <Stack.Screen name="categories" />
          {/* Et annet kjøp (eller et nytt) får sitt eget skjema, også når skjemaet allerede er åpent. */}
          <Stack.Screen name="purchase-form" options={{ presentation: 'modal' }} getId={({ params }) => params?.id} />
          <Stack.Screen name="category-form" options={{ presentation: 'modal' }} />
          <Stack.Screen name="currency" options={{ presentation: 'modal' }} />
          <Stack.Screen name="data" />
        </Stack.Protected>
        <Stack.Protected guard={onboarding}>
          <Stack.Screen name="onboarding" options={{ gestureEnabled: false, animation: 'fade' }} />
        </Stack.Protected>
        {/* Oppstarten åpner veiviseren for Apple Pay. */}
        <Stack.Screen name="money-setup" options={{ presentation: 'modal' }} />
      </Stack>
    </ThemeProvider>
  );
}
