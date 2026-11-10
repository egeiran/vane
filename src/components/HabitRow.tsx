import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { tr } from '@/i18n';
import type { DateKey } from '@/lib/dates';
import { amountText, frequencyText, isDone, isWeekly, valueOn, weekCount, weeklyTarget } from '@/lib/habits';
import { showTime, weekStartOf } from '@/lib/region';
import { useStore } from '@/lib/store';
import type { Habit } from '@/lib/types';
import { useTheme } from '@/theme';

import { CheckButton } from './CheckButton';
import { CountRing } from './CountRing';
import { IconButton, tick } from './ui';

type Props = {
  habit: Habit;
  day: DateKey;
  /** Vis påminnelsestid i stedet for hvor ofte (bare for i dag). */
  showReminder?: boolean;
};

export function HabitRow({ habit, day, showReminder }: Props) {
  const t = useTheme();
  const c = t.colors[habit.color];
  const value = useStore((s) => valueOn(s, habit.id, day));
  const toggle = useStore((s) => s.toggle);
  const increment = useStore((s) => s.increment);
  const remindersOn = useStore((s) => s.settings.remindersEnabled);
  const weekStart = useStore((s) => weekStartOf(s.settings));

  const isCount = habit.type === 'count' && !isWeekly(habit);
  const done = isDone(habit, value);
  const meta = isCount
    ? amountText(habit, value)
    : showReminder && habit.reminder && remindersOn
      ? tr.habits.reminder(showTime(habit.reminder))
      : frequencyText(habit, weekStart);

  return (
    <View style={[styles.row, { backgroundColor: done ? c.soft : t.card }]}>
      {isCount ? (
        <CountRing
          value={value}
          target={habit.target}
          color={c.solid}
          track={done ? t.card : c.soft}
          textColor={c.ink}
          label={tr.habits.minusOne(habit.name, amountText(habit, value))}
          onPress={() => {
            tick();
            increment(habit.id, day, -1);
          }}
        />
      ) : (
        <CheckButton
          done={done}
          color={c.solid}
          label={habit.name}
          onPress={() => {
            tick();
            toggle(habit.id, day);
          }}
        />
      )}
      <Pressable
        style={styles.body}
        onPress={() => router.push({ pathname: '/habit/[id]', params: { id: habit.id } })}
        accessibilityRole="button"
        accessibilityHint={tr.habits.gridHint}>
        <Text style={[styles.name, { color: t.text }]} numberOfLines={1}>
          {habit.name}
        </Text>
        <Text style={[styles.meta, { color: done ? c.ink : t.sub }]} numberOfLines={1}>
          {meta}
        </Text>
      </Pressable>
      {isCount && !done ? (
        <IconButton
          icon="plus"
          label={tr.habits.addOne(habit.unit || '')}
          background={c.soft}
          color={c.ink}
          onPress={() => {
            tick();
            increment(habit.id, day, 1);
          }}
        />
      ) : null}
    </View>
  );
}

export function WeeklyRow({ habit, day }: { habit: Habit; day: DateKey }) {
  const t = useTheme();
  const c = t.colors[habit.color];
  const doneToday = useStore((s) => valueOn(s, habit.id, day) >= 1);
  const count = useStore((s) => weekCount(s, habit, day, weekStartOf(s.settings)));
  const toggle = useStore((s) => s.toggle);
  const target = weeklyTarget(habit);
  const full = count >= target;

  return (
    <View style={[styles.row, { backgroundColor: full ? c.soft : t.card }]}>
      <CheckButton
        done={doneToday}
        color={c.solid}
        label={habit.name}
        onPress={() => {
          tick();
          toggle(habit.id, day);
        }}
      />
      <Pressable
        style={styles.body}
        onPress={() => router.push({ pathname: '/habit/[id]', params: { id: habit.id } })}
        accessibilityRole="button">
        <Text style={[styles.name, { color: t.text }]} numberOfLines={1}>
          {habit.name}
        </Text>
        <Text style={[styles.meta, { color: full ? c.ink : t.sub }]}>
          {full ? tr.habits.weekDone : tr.habits.weekCount(count, target)}
        </Text>
      </Pressable>
      <View style={styles.pips} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {Array.from({ length: target }, (_, i) => (
          <View
            key={i}
            style={[
              styles.pip,
              i < count ? { backgroundColor: c.solid } : { borderWidth: 1.5, borderColor: c.solid },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 64,
    borderRadius: 20,
    paddingVertical: 9,
    paddingLeft: 12,
    paddingRight: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  body: { flex: 1, minWidth: 0, paddingVertical: 4, gap: 2 },
  name: { fontSize: 17, lineHeight: 22, fontWeight: '600' },
  meta: { fontSize: 14, lineHeight: 18 },
  pips: { flexDirection: 'row', gap: 5, paddingRight: 4 },
  pip: { width: 10, height: 10, borderRadius: 5 },
});
