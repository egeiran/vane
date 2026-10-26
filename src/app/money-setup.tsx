import { router } from 'expo-router';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { SFSymbol } from 'sf-symbols-typescript';

import { Icon } from '@/components/Icon';
import { IconButton, PrimaryButton, TextButton } from '@/components/ui';
import { useTheme } from '@/theme';

function close() {
  if (router.canGoBack()) router.back();
  else router.replace('/money');
}

const STEPS: { icon: SFSymbol; title: string; text: string }[] = [
  {
    icon: 'square.grid.2x2',
    title: 'Åpne Snarveier',
    text: 'Gå til Automatisering nederst, og trykk på + for å lage en ny.',
  },
  {
    icon: 'wallet.pass',
    title: 'Velg Transaksjon',
    text: 'Velg kortene du betaler med i Wallet. Velg at den skal kjøre med en gang, uten å spørre først, og skru av varsel når den kjører.',
  },
  {
    icon: 'plus.circle',
    title: 'Legg til «Registrer kjøp»',
    text: 'Trykk Neste og velg en ny, tom snarvei. Søk etter Vane, og velg Registrer kjøp.',
  },
  {
    icon: 'hand.tap',
    title: 'Fyll inn beløp og sted',
    text: 'Trykk på Beløp og velg Snarvei-input. Trykk på det du satte inn, og velg beløpet. Gjør det samme med Sted, og velg butikken (forhandleren).',
  },
  {
    icon: 'checkmark.circle',
    title: 'Ferdig',
    text: 'Neste gang du betaler med iPhone eller klokka, kommer et varsel fra Vane. Holder du inne varselet, kan du velge kategori uten å åpne appen.',
  },
];

/** Veiviser for automatiseringen i Snarveier som sender kjøp fra Apple Pay til Vane. */
export default function MoneySetupScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.bg }} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
      <View style={styles.top}>
        <View />
        <IconButton icon="xmark" label="Lukk" onPress={close} />
      </View>
      <Text style={[styles.title, { color: t.text }]} accessibilityRole="header">
        Kjøp fra Apple Pay
      </Text>
      <Text style={[styles.lead, { color: t.sub }]}>
        Med en automatisering i Snarveier spør Vane om kategori hver gang du betaler med Apple Pay. Det tar et par minutter, og du gjør
        det bare én gang.
      </Text>

      <View style={styles.steps}>
        {STEPS.map((s, i) => (
          <View key={s.title} style={styles.step}>
            <View style={[styles.badge, { backgroundColor: t.card }]}>
              <Icon name={s.icon} size={20} color={t.text} />
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={[styles.stepTitle, { color: t.text }]}>{`${i + 1}. ${s.title}`}</Text>
              <Text style={[styles.stepText, { color: t.sub }]}>{s.text}</Text>
            </View>
          </View>
        ))}
      </View>

      <Text style={[styles.note, { color: t.sub }]}>
        Det gjelder bare Apple Pay i butikk. Vipps, kontanter, nettkjøp og fysisk kort legger du inn selv med + på Penger.
      </Text>

      <View style={{ flex: 1, minHeight: 24 }} />
      <PrimaryButton label="Åpne Snarveier" onPress={() => Linking.openURL('shortcuts://').catch(() => {})} />
      <View style={{ alignItems: 'center', marginTop: 4 }}>
        <TextButton label="Ferdig" color={t.sub} onPress={close} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 20 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginRight: -6 },
  title: { fontSize: 34, lineHeight: 40, fontWeight: '700', letterSpacing: -0.5, marginTop: 12 },
  lead: { fontSize: 17, lineHeight: 24, marginTop: 8 },
  steps: { gap: 18, marginTop: 24 },
  step: { flexDirection: 'row', gap: 14 },
  badge: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  stepTitle: { fontSize: 16, fontWeight: '700' },
  stepText: { fontSize: 15, lineHeight: 21 },
  note: { fontSize: 14, lineHeight: 20, marginTop: 24 },
});
