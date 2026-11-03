import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, AppState, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { Card, Row, SectionLabel, Segmented, Stepper, SwitchRow } from '@/components/ui';
import { tr } from '@/i18n';
import { shiftTime } from '@/lib/dates';
import { mainCurrency } from '@/lib/money';
import { useMoney } from '@/lib/moneyStore';
import { permissionStatus, requestPermission, scheduleNotificationSync, sendTestNotification, type PermissionStatus } from '@/lib/notifications';
import { showTime } from '@/lib/region';
import { useStore } from '@/lib/store';
import { useTheme } from '@/theme';

function usePermission() {
  const [status, setStatus] = useState<PermissionStatus | null>(null);
  useEffect(() => {
    const check = () => permissionStatus().then(setStatus);
    check();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && check());
    return () => sub.remove();
  }, []);
  return [status, () => permissionStatus().then(setStatus)] as const;
}

export default function SettingsScreen() {
  const t = useTheme();
  const settings = useStore((s) => s.settings);
  const update = useStore((s) => s.updateSettings);
  const currency = useMoney((s) => mainCurrency(s));
  const [permission, recheck] = usePermission();
  // Banneret vises bare når et varsel er slått på, men ikke kan komme.
  const wantsNotifications = settings.morningEnabled || settings.remindersEnabled || settings.modules.money;

  const enable = async (patch: Parameters<typeof update>[0]) => {
    update(patch);
    if (Object.values(patch).includes(true)) {
      await requestPermission();
      recheck();
    }
  };

  const test = async () => {
    const ok = await sendTestNotification();
    if (ok) Alert.alert(tr.settings.testSent, tr.settings.testSentBody);
    else recheck();
  };

  // Har iOS ikke spurt ennå (for eksempel etter «Ikke nå» i oppstarten), spør vi her. Har brukeren
  // sagt nei, finnes bryteren bare i Innstillinger på telefonen.
  const fixPermission = async () => {
    if (permission === 'ask') {
      if (await requestPermission()) scheduleNotificationSync(0);
      recheck();
    } else Linking.openSettings();
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.bg }} contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: t.text }]} accessibilityRole="header">
        {tr.settings.title}
      </Text>

      {(permission === 'ask' || permission === 'denied') && wantsNotifications ? (
        <Pressable onPress={fixPermission} accessibilityRole="button" style={[styles.warning, { backgroundColor: t.card }]}>
          <Icon name="bell.slash" size={18} color={t.sub} />
          <Text style={{ flex: 1, fontSize: 14, lineHeight: 20, color: t.text }}>
            {permission === 'ask' ? tr.settings.notificationsAsk : tr.settings.notificationsOff}
          </Text>
        </Pressable>
      ) : null}

      <View style={styles.section}>
        <SectionLabel>{tr.settings.morning}</SectionLabel>
        <Card style={{ overflow: 'hidden' }}>
          <SwitchRow first label={tr.settings.morningNotification} value={settings.morningEnabled} onChange={(v) => enable({ morningEnabled: v })} />
          {settings.morningEnabled ? (
            <>
              <Row>
                <Text style={{ flex: 1, fontSize: 16, color: t.text }}>{tr.settings.time}</Text>
                <Stepper
                  value={showTime(settings.morningTime)}
                  minWidth={60}
                  onDecrease={() => update({ morningTime: shiftTime(settings.morningTime, -15, 4 * 60, 12 * 60) })}
                  onIncrease={() => update({ morningTime: shiftTime(settings.morningTime, 15, 4 * 60, 12 * 60) })}
                  decreaseLabel={tr.common.earlier15}
                  increaseLabel={tr.common.later15}
                />
              </Row>
              <Text style={[styles.help, { color: t.sub, borderTopColor: t.border }]}>{tr.settings.morningHelp}</Text>
            </>
          ) : null}
        </Card>
      </View>

      <View style={styles.section}>
        <SectionLabel>{tr.settings.habits}</SectionLabel>
        <Card style={{ overflow: 'hidden' }}>
          <SwitchRow first label={tr.settings.reminders} value={settings.remindersEnabled} onChange={(v) => enable({ remindersEnabled: v })} />
          <View style={[styles.block, { borderTopColor: t.border }]}>
            <Text style={{ fontSize: 16, color: t.text }}>{tr.settings.weekStart}</Text>
            <Segmented
              label={tr.settings.weekStart}
              value={settings.weekStart ?? 'phone'}
              onChange={(v) => update({ weekStart: v === 'phone' ? null : v })}
              options={[
                { value: 'phone', label: tr.settings.phone },
                { value: 'mon', label: tr.settings.monday },
                { value: 'sun', label: tr.settings.sunday },
              ]}
            />
          </View>
        </Card>
        <Text style={[styles.footnote, { color: t.sub }]}>{tr.settings.remindersHelp}</Text>
      </View>

      <View style={styles.section}>
        <SectionLabel>{tr.settings.modules}</SectionLabel>
        <Card style={{ overflow: 'hidden' }}>
          <SwitchRow first label={tr.settings.moneyModule} value={settings.modules.money} onChange={(money) => update({ modules: { ...settings.modules, money } })} />
        </Card>
        <Text style={[styles.footnote, { color: t.sub }]}>{tr.settings.modulesHelp}</Text>
      </View>

      {settings.modules.money ? (
        <View style={styles.section}>
          <SectionLabel>{tr.settings.money}</SectionLabel>
          <Card style={{ overflow: 'hidden' }}>
            <Pressable onPress={() => router.push('/categories')} accessibilityRole="button">
              <Row first>
                <Text style={{ flex: 1, fontSize: 16, color: t.text }}>{tr.settings.categories}</Text>
                <Icon name="chevron.right" size={14} color={t.sub} />
              </Row>
            </Pressable>
            <Pressable onPress={() => router.push('/currency')} accessibilityRole="button" accessibilityLabel={`${tr.settings.currency}: ${currency}`}>
              <Row>
                <Text style={{ flex: 1, fontSize: 16, color: t.text }}>{tr.settings.currency}</Text>
                <Text style={{ fontSize: 16, color: t.sub }}>{currency}</Text>
                <Icon name="chevron.right" size={14} color={t.sub} />
              </Row>
            </Pressable>
            <Pressable onPress={() => router.push('/money-setup')} accessibilityRole="button">
              <Row>
                <Text style={{ flex: 1, fontSize: 16, color: t.text }}>{tr.settings.applePay}</Text>
                <Icon name="chevron.right" size={14} color={t.sub} />
              </Row>
            </Pressable>
          </Card>
        </View>
      ) : null}

      <View style={styles.section}>
        <Card style={{ overflow: 'hidden' }}>
          <Pressable onPress={test} accessibilityRole="button">
            <Row first>
              <Text style={{ flex: 1, fontSize: 16, color: t.text }}>{tr.settings.sendTest}</Text>
              <Icon name="chevron.right" size={14} color={t.sub} />
            </Row>
          </Pressable>
        </Card>
      </View>

      <Text style={[styles.version, { color: t.sub }]}>{tr.settings.version(Constants.expoConfig?.version ?? '1.0.0')}</Text>
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
  block: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 14, gap: 10, borderTopWidth: StyleSheet.hairlineWidth },
  version: { textAlign: 'center', fontSize: 13, marginTop: 28 },
});
