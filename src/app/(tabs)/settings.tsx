import Constants from 'expo-constants';
import { useEffect, useState } from 'react';
import { Alert, AppState, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { Card, Row, SectionLabel, Stepper, SwitchRow } from '@/components/ui';
import { shiftTime } from '@/lib/dates';
import { hasPermission, requestPermission, sendTestNotification } from '@/lib/notifications';
import { useStore } from '@/lib/store';
import { useTheme } from '@/theme';

function usePermission() {
  const [granted, setGranted] = useState<boolean | null>(null);
  useEffect(() => {
    const check = () => hasPermission().then(setGranted);
    check();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && check());
    return () => sub.remove();
  }, []);
  return [granted, setGranted] as const;
}

export default function SettingsScreen() {
  const t = useTheme();
  const settings = useStore((s) => s.settings);
  const update = useStore((s) => s.updateSettings);
  const [granted, setGranted] = usePermission();

  const enable = async (patch: Parameters<typeof update>[0]) => {
    update(patch);
    if (Object.values(patch).includes(true)) setGranted(await requestPermission());
  };

  const test = async () => {
    const ok = await sendTestNotification();
    if (ok) Alert.alert('Testvarsel sendt', 'Lås telefonen – varselet kommer om fem sekunder.');
    else setGranted(false);
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.bg }} contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: t.text }]} accessibilityRole="header">
        Innstillinger
      </Text>

      {granted === false ? (
        <Pressable onPress={() => Linking.openSettings()} accessibilityRole="button" style={[styles.warning, { backgroundColor: t.card }]}>
          <Icon name="bell.slash" size={18} color={t.sub} />
          <Text style={{ flex: 1, fontSize: 14, lineHeight: 20, color: t.text }}>
            Varsler er skrudd av for Vane. Trykk for å åpne Innstillinger og slå dem på.
          </Text>
        </Pressable>
      ) : null}

      <View style={styles.section}>
        <SectionLabel>Morgen</SectionLabel>
        <Card style={{ overflow: 'hidden' }}>
          <SwitchRow first label="Morgenvarsel" value={settings.morningEnabled} onChange={(v) => enable({ morningEnabled: v })} />
          {settings.morningEnabled ? (
            <>
              <Row>
                <Text style={{ flex: 1, fontSize: 16, color: t.text }}>Tidspunkt</Text>
                <Stepper
                  value={settings.morningTime}
                  minWidth={60}
                  onDecrease={() => update({ morningTime: shiftTime(settings.morningTime, -15, 4 * 60, 12 * 60) })}
                  onIncrease={() => update({ morningTime: shiftTime(settings.morningTime, 15, 4 * 60, 12 * 60) })}
                  decreaseLabel="15 minutter tidligere"
                  increaseLabel="15 minutter senere"
                />
              </Row>
              <Text style={[styles.help, { color: t.sub, borderTopColor: t.border }]}>
                Hver morgen: «God morgen. Hva vil du få til i dag?»
              </Text>
            </>
          ) : null}
        </Card>
      </View>

      <View style={styles.section}>
        <SectionLabel>Vaner</SectionLabel>
        <Card style={{ overflow: 'hidden' }}>
          <SwitchRow first label="Påminnelser for vaner" value={settings.remindersEnabled} onChange={(v) => enable({ remindersEnabled: v })} />
        </Card>
        <Text style={[styles.footnote, { color: t.sub }]}>
          Påminnelser kommer bare for vaner som ikke er gjort ennå. Tidspunktet velger du på hver vane.
        </Text>
      </View>

      <View style={styles.section}>
        <Card style={{ overflow: 'hidden' }}>
          <Pressable onPress={test} accessibilityRole="button">
            <Row first>
              <Text style={{ flex: 1, fontSize: 16, color: t.text }}>Send testvarsel</Text>
              <Icon name="chevron.right" size={14} color={t.sub} />
            </Row>
          </Pressable>
        </Card>
      </View>

      <Text style={[styles.version, { color: t.sub }]}>Vane · versjon {Constants.expoConfig?.version ?? '1.0.0'}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 8, paddingBottom: 40 },
  title: { fontSize: 34, lineHeight: 40, fontWeight: '700', letterSpacing: -0.5, paddingHorizontal: 20, paddingBottom: 6 },
  warning: { marginHorizontal: 16, marginTop: 12, borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  section: { paddingHorizontal: 16, paddingTop: 20, gap: 8 },
  help: { fontSize: 14, lineHeight: 20, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 14, borderTopWidth: StyleSheet.hairlineWidth },
  footnote: { fontSize: 13, lineHeight: 18, paddingHorizontal: 4 },
  version: { textAlign: 'center', fontSize: 13, marginTop: 28 },
});
