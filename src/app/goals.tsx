import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import { IconButton, PrimaryButton, TextButton } from '@/components/ui';
import { addDays, formatLong } from '@/lib/dates';
import { dailyHabitsOn } from '@/lib/habits';
import { useStore } from '@/lib/store';
import type { Goal } from '@/lib/types';
import { useToday } from '@/lib/useToday';
import { useTheme } from '@/theme';

const NO_GOALS: Goal[] = [];

function close() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

/** Morgenskjermen: ett eller flere små mål for dagen. Åpnes fra morgenvarselet. */
export default function GoalsScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const today = useToday();
  const goals = useStore((s) => s.goals[today] ?? NO_GOALS);
  const yesterdayGoals = useStore((s) => s.goals[addDays(today, -1)] ?? NO_GOALS);
  const habits = useStore((s) => s.habits);
  const addGoal = useStore((s) => s.addGoal);
  const removeGoal = useStore((s) => s.removeGoal);
  const [draft, setDraft] = useState('');

  const habitCount = dailyHabitsOn(habits, today).length;
  const empty = !draft.trim();

  const add = () => {
    if (empty) return;
    addGoal(today, draft);
    setDraft('');
  };
  const finish = () => {
    if (!empty) addGoal(today, draft);
    close();
  };

  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.top}>
          <Text style={[styles.date, { color: t.sub }]}>{formatLong(today)}</Text>
          <IconButton icon="xmark" label="Lukk" onPress={close} />
        </View>
        <Text style={[styles.title, { color: t.text }]} accessibilityRole="header">
          {goals.length ? 'Dagens mål' : 'God morgen.'}
        </Text>
        <Text style={[styles.prompt, { color: t.sub }]} nativeID="goal-label">
          Hva vil du få til i dag?
        </Text>

        <View style={styles.inputRow}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={add}
            submitBehavior="submit"
            returnKeyType="done"
            placeholder="F.eks. ringe bestemor"
            placeholderTextColor={t.faint}
            autoFocus={goals.length === 0}
            accessibilityLabelledBy="goal-label"
            style={[styles.input, { backgroundColor: t.card, borderColor: t.border, color: t.text }]}
          />
          <Pressable
            onPress={add}
            disabled={empty}
            accessibilityRole="button"
            accessibilityLabel="Legg til mål"
            style={[styles.add, { backgroundColor: empty ? t.button : t.inverse }]}>
            <Icon name="plus" size={20} color={empty ? t.sub : t.onInverse} />
          </Pressable>
        </View>
        <Text style={[styles.hint, { color: t.sub }]}>Små ting du kan bli ferdig med i dag. Ett er nok, tre er mye.</Text>

        {goals.length ? (
          <View style={styles.list}>
            {goals.map((g) => (
              <View key={g.id} style={[styles.goal, { backgroundColor: t.card }]}>
                <Text style={[styles.goalText, { color: t.text }]}>{g.text}</Text>
                <IconButton icon="xmark" label={`Fjern ${g.text}`} background="transparent" color={t.sub} onPress={() => removeGoal(today, g.id)} />
              </View>
            ))}
          </View>
        ) : yesterdayGoals.length ? (
          <View style={[styles.yesterday, { backgroundColor: t.button }]}>
            <Text style={[styles.yesterdayLabel, { color: t.sub }]}>I GÅR</Text>
            {yesterdayGoals.map((g) => (
              <View key={g.id} style={styles.yesterdayRow}>
                <Icon name={g.done ? 'checkmark.circle.fill' : 'circle'} size={18} color={g.done ? t.text : t.sub} />
                <Text style={{ fontSize: 15, color: t.text, flex: 1 }}>{g.text}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <View style={{ flex: 1, minHeight: 24 }} />
        {habitCount ? (
          <Text style={[styles.habits, { color: t.sub }]}>
            Du har også {habitCount} {habitCount === 1 ? 'vane' : 'vaner'} i dag.
          </Text>
        ) : null}
        <PrimaryButton label="Ferdig" onPress={finish} disabled={empty && goals.length === 0} />
        {goals.length === 0 ? (
          <View style={{ alignItems: 'center', marginTop: 4 }}>
            <TextButton label="Ikke i dag" color={t.sub} onPress={close} />
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 20 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginRight: -6 },
  date: { fontSize: 15, fontWeight: '500' },
  title: { fontSize: 34, lineHeight: 40, fontWeight: '700', letterSpacing: -0.5, marginTop: 20 },
  prompt: { fontSize: 20, lineHeight: 28, marginTop: 6 },
  inputRow: { flexDirection: 'row', gap: 8, marginTop: 22 },
  input: { flex: 1, height: 56, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 18, fontSize: 19 },
  add: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  hint: { fontSize: 14, lineHeight: 20, marginTop: 10, marginHorizontal: 4 },
  list: { gap: 6, marginTop: 18 },
  goal: { minHeight: 52, borderRadius: 14, paddingLeft: 16, paddingRight: 4, flexDirection: 'row', alignItems: 'center', gap: 8 },
  goalText: { flex: 1, fontSize: 17, fontWeight: '600' },
  yesterday: { marginTop: 24, borderRadius: 16, padding: 14, gap: 8 },
  yesterdayLabel: { fontSize: 12, fontWeight: '600', letterSpacing: 0.5 },
  yesterdayRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  habits: { textAlign: 'center', fontSize: 14, marginBottom: 14 },
});
