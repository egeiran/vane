import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { useAppEffects } from '@/lib/effects';
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
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="habit/[id]" />
        <Stack.Screen name="goals" options={{ presentation: 'modal' }} />
        <Stack.Screen name="habit-form" options={{ presentation: 'modal' }} />
        <Stack.Screen name="purchases" />
        <Stack.Screen name="categories" />
        {/* Et annet kjøp (eller et nytt) får sitt eget skjema, også når skjemaet allerede er åpent. */}
        <Stack.Screen name="purchase-form" options={{ presentation: 'modal' }} getId={({ params }) => params?.id} />
        <Stack.Screen name="category-form" options={{ presentation: 'modal' }} />
        <Stack.Screen name="money-setup" options={{ presentation: 'modal' }} />
        <Stack.Screen name="currency" options={{ presentation: 'modal' }} />
      </Stack>
    </ThemeProvider>
  );
}
