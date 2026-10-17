import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card, Row, Segmented, Stepper, SwitchRow, TextButton } from '@/components/ui';
import { shiftTime, WEEKDAY_LETTER, WEEKDAY_LONG } from '@/lib/dates';
import { useStore } from '@/lib/store';
import type { ColorKey, Habit, HabitInput, Schedule } from '@/lib/types';
import { useToday } from '@/lib/useToday';
import { COLOR_KEYS, useTheme } from '@/theme';

type Freq = Schedule['kind'];

function initialForm(h?: Habit) {
  return {
    name: h?.name ?? '',
    color: (h?.color ?? 'salvie') as ColorKey,
    type: h?.type ?? ('check' as Habit['type']),
    target: h?.type === 'count' ? h.target : 8,
    unit: h?.unit ?? 'glass',
    freq: (h?.schedule.kind ?? 'daily') as Freq,
    days: h?.schedule.kind === 'days' ? h.schedule.days : [true, false, true, false, true, false, false],
    times: h?.schedule.kind === 'weekly' ? h.schedule.times : 3,
    reminderOn: !!h?.reminder,
    reminder: h?.reminder ?? '08:00',
  };
}

function close() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

/** Ny vane eller endre en eksisterende (?id=…). */
export default function HabitFormScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const today = useToday();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const existing = useStore((s) => s.habits.find((h) => h.id === id));
  const addHabit = useStore((s) => s.addHabit);
  const updateHabit = useStore((s) => s.updateHabit);
  const [f, setF] = useState(() => initialForm(existing));
  const set = (patch: Partial<typeof f>) => setF((prev) => ({ ...prev, ...patch }));

  const c = t.colors[f.color];
  const canSave = f.name.trim().length > 0 && (f.freq !== 'days' || f.days.some(Boolean));

  const save = () => {
    if (!canSave) return;
    const schedule: Schedule =
      f.freq === 'daily' ? { kind: 'daily' } : f.freq === 'days' ? { kind: 'days', days: f.days } : { kind: 'weekly', times: f.times };
    const input: HabitInput = {
      name: f.name,
      color: f.color,
      type: f.freq === 'weekly' ? 'check' : f.type,
      target: f.target,
      unit: f.type === 'count' ? f.unit : '',
      schedule,
      reminder: f.reminderOn ? f.reminder : null,
    };
    if (existing) updateHabit(existing.id, input);
    else addHabit(input, today);
    close();
  };

  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1, backgroundColor: t.bg }}>
      <View style={styles.bar}>
        <TextButton label="Avbryt" onPress={close} />
        <Text style={[styles.barTitle, { color: t.text }]} accessibilityRole="header">
          {existing ? 'Endre vane' : 'Ny vane'}
        </Text>
        <TextButton label={existing ? 'Lagre' : 'Legg til'} bold onPress={save} disabled={!canSave} />
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
        <Card style={styles.card}>
          <Text style={[styles.label, { color: t.sub }]} nativeID="name-label">
            Navn
          </Text>
          <TextInput
            value={f.name}
            onChangeText={(name) => set({ name })}
            placeholder="F.eks. Gå en tur"
            placeholderTextColor={t.faint}
            autoFocus={!existing}
            returnKeyType="done"
            accessibilityLabelledBy="name-label"
            style={[styles.input, { backgroundColor: t.field, color: t.text }]}
          />
          <Text style={[styles.label, { color: t.sub, marginTop: 6 }]}>Farge</Text>
          <View style={styles.swatches} accessibilityRole="radiogroup" accessibilityLabel="Farge">
            {COLOR_KEYS.map((k) => {
              const on = k === f.color;
              return (
                <Pressable
                  key={k}
                  onPress={() => set({ color: k })}
                  accessibilityRole="radio"
                  accessibilityLabel={t.colors[k].label}
                  accessibilityState={{ selected: on }}
                  style={styles.swatchHit}>
                  <View
                    style={[
                      styles.swatch,
                      { backgroundColor: t.colors[k].solid },
                      on && { borderWidth: 3, borderColor: t.card, outlineWidth: 2, outlineColor: t.colors[k].solid },
                    ]}
                  />
                </Pressable>
              );
            })}
          </View>
        </Card>

        <Card style={styles.card}>
          <Text style={[styles.label, { color: t.sub }]}>Hvor ofte</Text>
          <Segmented
            label="Hvor ofte"
            value={f.freq}
            onChange={(freq) => set({ freq })}
            options={[
              { value: 'daily', label: 'Hver dag' },
              { value: 'days', label: 'Velg dager' },
              { value: 'weekly', label: 'Per uke' },
            ]}
          />
          {f.freq === 'days' ? (
            <View style={styles.days}>
              {WEEKDAY_LETTER.map((l, i) => {
                const on = f.days[i];
                return (
                  <Pressable
                    key={i}
                    onPress={() => set({ days: f.days.map((d, j) => (j === i ? !d : d)) })}
                    accessibilityRole="checkbox"
                    accessibilityLabel={WEEKDAY_LONG[i]}
                    accessibilityState={{ checked: on }}
                    style={[styles.dayChip, { backgroundColor: on ? c.ink : t.field }]}>
                    <Text style={{ fontSize: 15, fontWeight: '600', color: on ? t.card : t.text }}>{l}</Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
          {f.freq === 'weekly' ? (
            <View style={styles.inline}>
              <Text style={[styles.inlineLabel, { color: t.text }]}>Ganger per uke</Text>
              <Stepper
                value={String(f.times)}
                onDecrease={() => set({ times: Math.max(1, f.times - 1) })}
                onIncrease={() => set({ times: Math.min(6, f.times + 1) })}
                decreaseLabel="Én gang mindre"
                increaseLabel="Én gang mer"
              />
            </View>
          ) : null}
        </Card>

        {f.freq !== 'weekly' ? (
          <Card style={styles.card}>
            <Text style={[styles.label, { color: t.sub }]}>Hvordan huke av</Text>
            <Segmented
              label="Type"
              value={f.type}
              onChange={(type) => set({ type })}
              options={[
                { value: 'check', label: 'Ja / nei' },
                { value: 'count', label: 'Antall' },
              ]}
            />
            {f.type === 'count' ? (
              <>
                <View style={styles.inline}>
                  <Text style={[styles.inlineLabel, { color: t.text }]}>Mål per dag</Text>
                  <Stepper
                    value={String(f.target)}
                    onDecrease={() => set({ target: Math.max(2, f.target - 1) })}
                    onIncrease={() => set({ target: Math.min(99, f.target + 1) })}
                    decreaseLabel="Ett mindre"
                    increaseLabel="Ett mer"
                  />
                </View>
                <View style={styles.inline}>
                  <Text style={[styles.inlineLabel, { color: t.text }]} nativeID="unit-label">
                    Enhet
                  </Text>
                  <TextInput
                    value={f.unit}
                    onChangeText={(unit) => set({ unit })}
                    placeholder="ganger"
                    placeholderTextColor={t.faint}
                    accessibilityLabelledBy="unit-label"
                    style={[styles.unit, { backgroundColor: t.field, color: t.text }]}
                  />
                </View>
              </>
            ) : null}
          </Card>
        ) : null}

        <Card style={{ overflow: 'hidden' }}>
          <SwitchRow first label="Påminnelse" value={f.reminderOn} onChange={(reminderOn) => set({ reminderOn })} />
          {f.reminderOn ? (
            <Row>
              <Text style={{ flex: 1, fontSize: 16, color: t.text }}>Klokkeslett</Text>
              <Stepper
                value={f.reminder}
                minWidth={60}
                onDecrease={() => set({ reminder: shiftTime(f.reminder, -15) })}
                onIncrease={() => set({ reminder: shiftTime(f.reminder, 15) })}
                decreaseLabel="15 minutter tidligere"
                increaseLabel="15 minutter senere"
              />
            </Row>
          ) : null}
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingTop: 10,
    paddingBottom: 4,
  },
  barTitle: { fontSize: 17, fontWeight: '600' },
  content: { padding: 16, gap: 12 },
  card: { padding: 14, gap: 10 },
  label: { fontSize: 13, fontWeight: '600' },
  input: { height: 44, borderRadius: 10, paddingHorizontal: 12, fontSize: 17 },
  swatches: { flexDirection: 'row', justifyContent: 'space-between' },
  swatchHit: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  swatch: { width: 34, height: 34, borderRadius: 17 },
  days: { flexDirection: 'row', justifyContent: 'space-between' },
  dayChip: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  inline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  inlineLabel: { fontSize: 16 },
  unit: { width: 140, height: 44, borderRadius: 10, paddingHorizontal: 12, fontSize: 16, textAlign: 'right' },
});
