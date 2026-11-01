import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { tr } from '@/i18n';
import type { DateKey } from '@/lib/dates';
import { useStore } from '@/lib/store';
import type { Goal } from '@/lib/types';
import { useTheme } from '@/theme';

import { CheckButton } from './CheckButton';
import { Icon } from './Icon';
import { TextButton, tick } from './ui';

const NO_GOALS: Goal[] = [];

/** Dagens mål på I dag-skjermen. For i går kan målene bare hukes av, ikke endres. */
export function GoalsCard({ day, isToday }: { day: DateKey; isToday: boolean }) {
  const t = useTheme();
  const goals = useStore((s) => s.goals[day] ?? NO_GOALS);
  const skipped = useStore((s) => !!s.goalsSkipped[day]);
  const toggleGoal = useStore((s) => s.toggleGoal);

  if (!goals.length) {
    if (!isToday) return <Text style={[styles.note, { color: t.sub }]}>{tr.goals.noneYesterday}</Text>;
    if (skipped) {
      // Man har sagt «Ikke i dag» – bare en stille linje, ingen invitasjon.
      return (
        <View style={styles.skipped}>
          <Text style={{ flex: 1, fontSize: 14, color: t.sub }}>{tr.goals.noneToday}</Text>
          <TextButton label={tr.goals.addAnyway} color={t.sub} onPress={() => router.push('/goals')} />
        </View>
      );
    }
    return (
      <Pressable
        onPress={() => router.push('/goals')}
        accessibilityRole="button"
        style={({ pressed }) => [styles.prompt, { borderColor: t.border, opacity: pressed ? 0.7 : 1 }]}>
        <View style={[styles.promptIcon, { backgroundColor: t.button }]}>
          <Icon name="plus" size={16} color={t.text} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: t.text }}>{tr.goals.setGoals}</Text>
          <Text style={{ fontSize: 13, color: t.sub }}>{tr.goals.setGoalsSub}</Text>
        </View>
      </Pressable>
    );
  }

  const done = goals.filter((g) => g.done).length;
  return (
    <View style={[styles.card, { backgroundColor: t.card }]}>
      <View style={styles.header}>
        <Text style={[styles.label, { color: t.sub }]}>{isToday ? tr.goals.cardLabelToday : tr.goals.cardLabelYesterday}</Text>
        <View style={styles.headerRight}>
          <Text style={{ fontSize: 13, color: t.sub }}>
            {tr.today.doneOf(done, goals.length)}
          </Text>
          {isToday ? <TextButton label={tr.common.edit} bold onPress={() => router.push('/goals')} /> : null}
        </View>
      </View>
      {goals.map((g) => (
        <View key={g.id} style={[styles.goal, { borderTopColor: t.hair }]}>
          <Text style={[styles.goalText, { color: g.done ? t.sub : t.text }]}>{g.text}</Text>
          <CheckButton
            size={30}
            done={g.done}
            color={t.inverse}
            checkColor={t.onInverse}
            label={g.text}
            onPress={() => {
              tick();
              toggleGoal(day, g.id);
            }}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  note: { fontSize: 14, paddingHorizontal: 4 },
  skipped: { flexDirection: 'row', alignItems: 'center', paddingLeft: 4, marginVertical: -6 },
  prompt: {
    minHeight: 68,
    borderRadius: 20,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  promptIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  card: { borderRadius: 20, paddingLeft: 16, paddingRight: 8, paddingTop: 2, paddingBottom: 4 },
  header: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  label: { fontSize: 12, fontWeight: '700', letterSpacing: 0.7 },
  goal: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 12, borderTopWidth: StyleSheet.hairlineWidth },
  goalText: { flex: 1, fontSize: 17, lineHeight: 22, fontWeight: '600' },
});
