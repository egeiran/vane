import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import { IconButton, PrimaryButton, TextButton } from '@/components/ui';
import { tr } from '@/i18n';
import { addDays, daysBetween, formatLong, fromKey, inlineDayName, relativeDayName, weekdayIndex, type DateKey } from '@/lib/dates';
import { canPlanGoals, dailyHabitsOn, goalDays } from '@/lib/habits';
import { useStore } from '@/lib/store';
import type { Goal } from '@/lib/types';
import { useToday } from '@/lib/useToday';
import { useTheme } from '@/theme';

const NO_GOALS: Goal[] = [];

function close() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

/**
 * Morgenskjermen: ett eller flere små mål for dagen. Åpnes fra morgenvarselet. Mål kan også settes
 * for i morgen og resten av uka (`?day=`, eller dagene øverst). De hukes av når dagen kommer.
 */
export default function GoalsScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const today = useToday();
  const params = useLocalSearchParams<{ day?: string }>();
  // `null` er alltid i dag, også over midnatt. En dag som ikke kan planlegges (passert, eller for langt
  // fram), blir også i dag.
  const [picked, setPicked] = useState<DateKey | null>(() => (typeof params.day === 'string' ? params.day : null));
  const day = picked !== null && canPlanGoals(picked, today) ? picked : today;
  const ahead = daysBetween(today, day);
  // Uten mål viser skjermen målene dagen før som hjelp: i går for i dag, i dag for i morgen.
  const before = addDays(day, -1);

  const allGoals = useStore((s) => s.goals);
  const goals = allGoals[day] ?? NO_GOALS;
  const beforeGoals = ahead <= 1 ? (allGoals[before] ?? NO_GOALS) : NO_GOALS;
  const habits = useStore((s) => s.habits);
  const addGoal = useStore((s) => s.addGoal);
  const removeGoal = useStore((s) => s.removeGoal);
  const skipGoals = useStore((s) => s.skipGoals);
  const [draft, setDraft] = useState('');

  const habitCount = dailyHabitsOn(habits, day).length;
  const empty = !draft.trim();
  const dayInline = inlineDayName(day, today);
  const title =
    ahead === 0 ? (goals.length ? tr.goals.title : tr.goals.morning) : ahead === 1 ? tr.goals.titleTomorrow : tr.goals.titleOn(tr.dates.weekdayLong[weekdayIndex(day)]);

  const add = () => {
    if (empty) return;
    addGoal(day, draft);
    setDraft('');
  };
  const finish = () => {
    if (!empty) addGoal(day, draft);
    close();
  };

  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.top}>
          <Text style={[styles.date, { color: t.sub }]}>{formatLong(day)}</Text>
          <IconButton icon="xmark" label={tr.common.close} onPress={close} />
        </View>

        {/* I dag og uka fram. Det man har skrevet i feltet, blir med når man bytter dag. */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll} contentContainerStyle={styles.chips}>
          {goalDays(today).map((d, i) => {
            const on = d === day;
            const n = allGoals[d]?.length ?? 0;
            const label = i === 0 ? tr.dates.today : i === 1 ? tr.dates.tomorrow : tr.goals.dayChip(tr.dates.weekdayShort[weekdayIndex(d)], fromKey(d).getDate());
            return (
              <Pressable
                key={d}
                onPress={() => setPicked(i === 0 ? null : d)}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                accessibilityLabel={n ? `${relativeDayName(d, today)}, ${tr.goals.dayGoals(n)}` : relativeDayName(d, today)}
                style={({ pressed }) => [styles.chip, { backgroundColor: on ? t.inverse : t.button, opacity: pressed ? 0.7 : 1 }]}>
                <Text style={[styles.chipText, { color: on ? t.onInverse : t.text }]}>{label}</Text>
                {n ? <View style={[styles.chipDot, { backgroundColor: on ? t.onInverse : t.sub }]} /> : null}
              </Pressable>
            );
          })}
        </ScrollView>

        <Text style={[styles.title, { color: t.text }]} accessibilityRole="header">
          {title}
        </Text>
        <Text style={[styles.prompt, { color: t.sub }]} nativeID="goal-label">
          {tr.goals.questionOn(dayInline)}
        </Text>

        <View style={styles.inputRow}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={add}
            submitBehavior="submit"
            returnKeyType="done"
            placeholder={tr.goals.placeholder}
            placeholderTextColor={t.faint}
            autoFocus={goals.length === 0}
            accessibilityLabelledBy="goal-label"
            style={[styles.input, { backgroundColor: t.card, borderColor: t.border, color: t.text }]}
          />
          <Pressable
            onPress={add}
            disabled={empty}
            accessibilityRole="button"
            accessibilityLabel={tr.goals.add}
            style={[styles.add, { backgroundColor: empty ? t.button : t.inverse }]}>
            <Icon name="plus" size={20} color={empty ? t.sub : t.onInverse} />
          </Pressable>
        </View>
        <Text style={[styles.hint, { color: t.sub }]}>{tr.goals.helpOn(dayInline)}</Text>

        {goals.length ? (
          <View style={styles.list}>
            {goals.map((g) => (
              <View key={g.id} style={[styles.goal, { backgroundColor: t.card }]}>
                <Text style={[styles.goalText, { color: t.text }]}>{g.text}</Text>
                <IconButton icon="xmark" label={tr.goals.remove(g.text)} background="transparent" color={t.sub} onPress={() => removeGoal(day, g.id)} />
              </View>
            ))}
          </View>
        ) : beforeGoals.length ? (
          <View style={[styles.yesterday, { backgroundColor: t.button }]}>
            <Text style={[styles.yesterdayLabel, { color: t.sub }]}>{ahead === 0 ? tr.goals.yesterdayLabel : tr.goals.todayLabel}</Text>
            {beforeGoals.map((g) => (
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
            {tr.goals.alsoHabits(habitCount, dayInline)}
          </Text>
        ) : null}
        <PrimaryButton label={tr.common.done} onPress={finish} disabled={empty && goals.length === 0} />
        {/* «Ikke i dag» gjelder bare i dag: det stopper spørsmålene om morgenen. */}
        {goals.length === 0 && ahead === 0 ? (
          <View style={{ alignItems: 'center', marginTop: 4 }}>
            <TextButton
              label={tr.goals.skip}
              color={t.sub}
              onPress={() => {
                skipGoals(today);
                close();
              }}
            />
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
  chipScroll: { marginHorizontal: -24, marginTop: 12, flexGrow: 0 },
  chips: { paddingHorizontal: 24, gap: 6 },
  chip: { height: 34, borderRadius: 17, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 6 },
  chipText: { fontSize: 15, fontWeight: '600', fontVariant: ['tabular-nums'] },
  chipDot: { width: 5, height: 5, borderRadius: 3 },
  title: { fontSize: 34, lineHeight: 40, fontWeight: '700', letterSpacing: -0.5, marginTop: 18 },
  prompt: { fontSize: 20, lineHeight: 28, marginTop: 6 },
  inputRow: { flexDirection: 'row', gap: 8, marginTop: 22 },
  input: { flex: 1, minWidth: 0, height: 56, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 18, fontSize: 19 },
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
