import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

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

  // Undersidene har den native headeren: stor tittel som krymper når man ruller, bare pil tilbake,
  // og knappene (+, Endre) til høyre. Tittel og knapper settes av skjermen selv med `ScreenHeader`.
  const pushed = {
    headerShown: true,
    headerBackButtonDisplayMode: 'minimal',
    headerTintColor: t.text,
    headerShadowVisible: false,
    headerLargeTitleShadowVisible: false,
  } as const;

  // Skjemaene har også native header, med Avbryt og Lagre (settes av skjermen med `ScreenHeader`).
  // Små skjemaer og loggearket er ark med høyder som kan dras (formSheet); store skjemaer åpner fullt.
  // Ugjennomsiktig header, så innholdet (som måltidsknappene i loggearket) starter under den.
  const form = { presentation: 'modal', headerShown: true, headerTransparent: false, headerTintColor: t.text, headerShadowVisible: false } as const;
  const sheet = (detents: number[]) =>
    ({ ...form, presentation: 'formSheet', sheetAllowedDetents: detents, sheetGrabberVisible: true, sheetInitialDetentIndex: 0 }) as const;

  const base = t.dark ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...base,
    colors: { ...base.colors, background: t.bg, card: t.bg, text: t.text, primary: t.text, border: t.hair },
  };

  // Gestene (sveip mellom dager, sveip på rader, dra for å flytte) trenger roten fra Gesture Handler.
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: t.bg }}>
      <ThemeProvider value={navTheme}>
        <StatusBar style="auto" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.bg } }}>
          {/* En ny bruker ser oppstarten først. Også en lenke fra en widget går dit. */}
          <Stack.Protected guard={!onboarding} redirectTo="/onboarding">
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="habit/[id]" options={pushed} />
            <Stack.Screen name="goals" options={sheet([0.6, 1])} />
            <Stack.Screen name="habit-form" options={form} />
            <Stack.Screen name="purchases" options={pushed} />
            <Stack.Screen name="categories" options={pushed} />
            {/* Et annet kjøp (eller et nytt) får sitt eget skjema, også når skjemaet allerede er åpent. */}
            <Stack.Screen name="purchase-form" options={form} getId={({ params }) => params?.id} />
            <Stack.Screen name="category-form" options={sheet([0.75, 1])} />
            <Stack.Screen name="currency" options={sheet([0.6, 1])} />
            <Stack.Screen name="recurring" options={pushed} />
            <Stack.Screen name="recurring-form" options={form} getId={({ params }) => params?.id ?? params?.merchant} />
            <Stack.Screen name="data" options={pushed} />
            {/* Et varsel for et annet måltid (eller en annen dag) åpner et nytt ark, med riktig måltid valgt. */}
            <Stack.Screen name="food-log" options={sheet([0.6, 1])} getId={({ params }) => `${params?.day ?? ''}:${params?.meal ?? ''}`} />
            <Stack.Screen name="food-entry" options={sheet([0.75, 1])} getId={({ params }) => params?.id} />
            <Stack.Screen name="food-goal" options={sheet([0.6, 1])} />
            <Stack.Screen name="foods" options={pushed} />
            <Stack.Screen name="food-form" options={form} getId={({ params }) => params?.id ?? params?.mvt} />
            <Stack.Screen name="dish-form" options={form} getId={({ params }) => params?.id} />
            <Stack.Screen name="meals" options={pushed} />
            <Stack.Screen name="meal-form" options={sheet([0.75, 1])} />
          </Stack.Protected>
          <Stack.Protected guard={onboarding}>
            <Stack.Screen name="onboarding" options={{ gestureEnabled: false, animation: 'fade' }} />
          </Stack.Protected>
          {/* Oppstarten åpner veiviseren for Apple Pay. */}
          <Stack.Screen name="money-setup" options={{ presentation: 'modal' }} />
        </Stack>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
