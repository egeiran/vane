import { router, useLocalSearchParams } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { CheckButton } from '@/components/CheckButton';
import { ColumnGrid, WeekRows, type HeatWeek } from '@/components/HeatGrid';
import { Icon } from '@/components/Icon';
import { Card, TextButton, tick } from '@/components/ui';
import { tr } from '@/i18n';
import { formatShort, relativeDayName } from '@/lib/dates';
import { weekColumns, weekRows, isFuture, daysInRange, monthLabels } from '@/lib/grid';
import { amountText, fractionOn, frequencyText, isDone, isWeekly, periodSummary, summaryText, weekCount, weeklyTarget } from '@/lib/habits';
import { showTime, weekStartOf } from '@/lib/region';
import { useData, useStore } from '@/lib/store';
import { useToday } from '@/lib/useToday';
import { shade, useTheme } from '@/theme';

const HALF_YEAR = 26;
const CELL = 9;
const GAP = 3;

function back() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

export default function HabitScreen() {
  const t = useTheme();
  const today = useToday();
  const { id } = useLocalSearchParams<{ id: string }>();
  const data = useData();
  const toggle = useStore((s) => s.toggle);
  const increment = useStore((s) => s.increment);
  const deleteHabit = useStore((s) => s.deleteHabit);
  const habit = data.habits.find((h) => h.id === id);

  if (!habit) {
    return (
      <View style={[styles.missing, { backgroundColor: t.bg }]}>
        <Text style={{ color: t.sub, fontSize: 16 }}>{tr.habitDetail.missing}</Text>
        <TextButton label={tr.common.back} bold onPress={back} />
      </View>
    );
  }

  const c = t.colors[habit.color];
  const weekStart = weekStartOf(data.settings);
  const value = data.logs[today]?.[habit.id] ?? 0;
  const isCount = habit.type === 'count' && !isWeekly(habit);
  const done = isDone(habit, value);

  const meta = [
    isCount ? tr.habitDetail.todayAmount(amountText(habit, value)) : isWeekly(habit) ? tr.habits.weekCount(weekCount(data, habit, today, weekStart), weeklyTarget(habit)) : null,
    frequencyText(habit, weekStart),
    habit.reminder ? tr.dates.at(showTime(habit.reminder)) : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const weeks: HeatWeek[] = weekRows(today, 5, weekStart).map((row) => ({
    label: formatShort(row[0]),
    cells: row.map((day) => {
      const future = isFuture(day, today);
      const f = future ? null : fractionOn(data, habit, day);
      return {
        key: day,
        color: future ? 'transparent' : shade(t, c.solid, f),
        today: day === today,
        label: tr.habitDetail.dayState(relativeDayName(day, today), f === null ? 'none' : f >= 1 ? 'done' : f > 0 ? 'partly' : 'not'),
      };
    }),
  }));

  const columns = weekColumns(today, HALF_YEAR, weekStart);
  const colors = columns.map((col) =>
    col.map((day) => (isFuture(day, today) ? 'transparent' : shade(t, c.solid, fractionOn(data, habit, day))))
  );
  const labels = monthLabels(columns);

  const confirmDelete = () =>
    Alert.alert(tr.habitDetail.deleteTitle(habit.name), tr.habitDetail.deleteBody, [
      { text: tr.common.cancel, style: 'cancel' },
      {
        text: tr.common.delete,
        style: 'destructive',
        onPress: () => {
          back();
          deleteHabit(habit.id);
        },
      },
    ]);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.bg }} contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
      <View style={styles.bar}>
        <Pressable onPress={back} accessibilityRole="button" accessibilityLabel={tr.common.back} style={styles.backButton}>
          <Icon name="chevron.left" size={20} color={t.text} />
          <Text style={{ fontSize: 17, color: t.text, fontWeight: '500' }}>{tr.common.back}</Text>
        </Pressable>
        <TextButton label={tr.common.edit} onPress={() => router.push({ pathname: '/habit-form', params: { id: habit.id } })} />
      </View>

      <View style={styles.header}>
        <View style={{ flex: 1, gap: 4 }}>
          <View style={styles.metaRow}>
            <View style={[styles.dot, { backgroundColor: c.solid }]} />
            <Text style={{ fontSize: 14, color: t.sub, flexShrink: 1 }}>{meta}</Text>
          </View>
          <Text style={[styles.title, { color: t.text }]} accessibilityRole="header">
            {habit.name}
          </Text>
        </View>
        {isCount ? (
          <Pressable
            onPress={() => {
              tick();
              increment(habit.id, today, 1);
            }}
            accessibilityRole="button"
            accessibilityLabel={tr.habits.addOne(habit.unit)}
            style={[styles.plusOne, { backgroundColor: c.soft }]}>
            <Text style={{ fontSize: 17, fontWeight: '700', color: c.ink }}>+1</Text>
          </Pressable>
        ) : (
          <CheckButton
            size={52}
            done={done}
            color={c.solid}
            label={tr.habitDetail.today(habit.name)}
            onPress={() => {
              tick();
              toggle(habit.id, today);
            }}
          />
        )}
      </View>

      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: t.text }]}>{tr.habitDetail.lastFiveWeeks}</Text>
          <Text style={{ fontSize: 13, color: t.sub }}>{summaryText(periodSummary(data, habit, today, daysInRange(today, 5, weekStart)))}</Text>
        </View>
        <WeekRows weeks={weeks} weekStart={weekStart} />
      </Card>

      <Card style={styles.card}>
        <Text style={[styles.cardTitle, { color: t.text, fontSize: 15 }]}>{tr.habitDetail.lastHalfYear}</Text>
        <View style={{ height: 14 }}>
          {labels.map((l) => (
            <Text key={l.index} style={[styles.month, { color: t.sub, left: l.index * (CELL + GAP) }]}>
              {l.label}
            </Text>
          ))}
        </View>
        <ColumnGrid columns={colors} size={CELL} gap={GAP} />
      </Card>

      <View style={{ alignItems: 'center', marginTop: 8 }}>
        <TextButton label={tr.habitDetail.deleteHabit} color={t.danger} onPress={confirmDelete} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 40 },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, paddingTop: 4 },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: 44, paddingHorizontal: 4 },
  header: { flexDirection: 'row', alignItems: 'flex-end', gap: 12, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  title: { fontSize: 32, lineHeight: 38, fontWeight: '700', letterSpacing: -0.5 },
  plusOne: { height: 52, borderRadius: 26, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center' },
  card: { marginHorizontal: 16, marginTop: 14, padding: 16, gap: 10 },
  cardHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  cardTitle: { fontSize: 17, fontWeight: '700' },
  month: { position: 'absolute', fontSize: 11 },
});
