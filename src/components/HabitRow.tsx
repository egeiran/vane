import { router } from 'expo-router';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { tr } from '@/i18n';
import type { DateKey } from '@/lib/dates';
import { amountText, frequencyText, isDone, isWeekly, valueOn, weekCount, weeklyTarget } from '@/lib/habits';
import { showTime, weekStartOf } from '@/lib/region';
import { useStore } from '@/lib/store';
import type { Habit } from '@/lib/types';
import { useTheme } from '@/theme';

import { CheckButton } from './CheckButton';
import { confirmDestructive } from './confirm';
import { CountRing } from './CountRing';
import { RowMenu, type MenuItem } from './RowMenu';
import { IconButton, tick } from './ui';

type Props = {
  habit: Habit;
  day: DateKey;
  /** Vis påminnelsestid i stedet for hvor ofte (bare for i dag). */
  showReminder?: boolean;
  /** Bare i dag og i går kan endres. Eldre dager vises, men kan ikke hukes av. */
  editable?: boolean;
};

/** Valgene som gjelder alle vaner: endre, rutenettet og slette. */
function habitItems(habit: Habit, deleteHabit: (id: string) => void): MenuItem[] {
  return [
    { label: tr.common.edit, icon: 'pencil', onPress: () => router.push({ pathname: '/habit-form', params: { id: habit.id } }) },
    { label: tr.habits.menuOverview, icon: 'square.grid.3x3', onPress: () => router.push({ pathname: '/habit/[id]', params: { id: habit.id } }) },
    { label: tr.habits.menuReorder, icon: 'arrow.up.arrow.down', onPress: () => router.push('/habits') },
    {
      label: tr.common.delete,
      icon: 'trash',
      destructive: true,
      onPress: () => confirmDestructive(tr.habitDetail.deleteTitle(habit.name), tr.habitDetail.deleteBody, tr.common.delete, () => deleteHabit(habit.id)),
    },
  ];
}

export function HabitRow({ habit, day, showReminder, editable = true }: Props) {
  const t = useTheme();
  const c = t.colors[habit.color];
  const value = useStore((s) => valueOn(s, habit.id, day));
  const toggle = useStore((s) => s.toggle);
  const increment = useStore((s) => s.increment);
  const setValue = useStore((s) => s.setValue);
  const deleteHabit = useStore((s) => s.deleteHabit);
  const remindersOn = useStore((s) => s.settings.remindersEnabled);
  const weekStart = useStore((s) => weekStartOf(s.settings));

  const isCount = habit.type === 'count' && !isWeekly(habit);
  const done = isDone(habit, value);
  const meta = isCount
    ? amountText(habit, value)
    : showReminder && habit.reminder && remindersOn
      ? tr.habits.reminder(showTime(habit.reminder))
      : frequencyText(habit, weekStart);

  // Hold inne: for vaner med antall kommer «Én mindre», «Skriv inn antall» og «Nullstill» først.
  const countItems: MenuItem[] =
    isCount && editable
      ? [
          ...(value > 0 ? [{ label: tr.habits.menuLess, icon: 'minus.circle' as const, onPress: () => increment(habit.id, day, -1) }] : []),
          {
            label: tr.habits.menuEnterCount,
            icon: 'number' as const,
            onPress: () =>
              Alert.prompt(
                tr.habits.menuEnterCountTitle(habit.name),
                undefined,
                [
                  { text: tr.common.cancel, style: 'cancel' },
                  {
                    text: tr.common.save,
                    onPress: (text?: string) => {
                      const n = Number.parseInt(text ?? '', 10);
                      if (Number.isFinite(n) && n >= 0) setValue(habit.id, day, Math.min(n, 999));
                    },
                  },
                ],
                'plain-text',
                String(value),
                'number-pad'
              ),
          },
          ...(value > 0 ? [{ label: tr.habits.menuReset, icon: 'arrow.counterclockwise' as const, onPress: () => setValue(habit.id, day, 0) }] : []),
        ]
      : [];

  return (
    <RowMenu href={{ pathname: '/habit/[id]', params: { id: habit.id } }} items={[...countItems, ...habitItems(habit, deleteHabit)]}>
      <View style={[styles.row, { backgroundColor: done ? c.soft : t.card }]}>
        {isCount ? (
          // Ringen legger til én, som +. Én mindre ligger i hold-inne-menyen.
          <CountRing
            value={value}
            target={habit.target}
            color={c.solid}
            track={done ? t.card : c.soft}
            textColor={c.ink}
            label={editable ? tr.habits.plusOne(habit.name, amountText(habit, value)) : `${habit.name}: ${amountText(habit, value)}`}
            onPress={
              editable
                ? () => {
                    tick();
                    increment(habit.id, day, 1);
                  }
                : undefined
            }
          />
        ) : (
          <CheckButton
            done={done}
            color={c.solid}
            label={habit.name}
            disabled={!editable}
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
        {isCount && !done && editable ? (
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
    </RowMenu>
  );
}

export function WeeklyRow({ habit, day, editable = true }: { habit: Habit; day: DateKey; editable?: boolean }) {
  const t = useTheme();
  const c = t.colors[habit.color];
  const doneToday = useStore((s) => valueOn(s, habit.id, day) >= 1);
  const count = useStore((s) => weekCount(s, habit, day, weekStartOf(s.settings)));
  const toggle = useStore((s) => s.toggle);
  const deleteHabit = useStore((s) => s.deleteHabit);
  const target = weeklyTarget(habit);
  const full = count >= target;

  return (
    <RowMenu href={{ pathname: '/habit/[id]', params: { id: habit.id } }} items={habitItems(habit, deleteHabit)}>
      <View style={[styles.row, { backgroundColor: full ? c.soft : t.card }]}>
        <CheckButton
          done={doneToday}
          color={c.solid}
          label={habit.name}
          disabled={!editable}
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
    </RowMenu>
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
