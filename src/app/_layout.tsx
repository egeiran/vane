import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { useAppEffects } from '@/lib/effects';
import { useTheme } from '@/theme';

SplashScreen.preventAutoHideAsync();

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
      </Stack>
    </ThemeProvider>
  );
}
