import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ColumnGrid, Legend, WeekRows, type HeatWeek } from '@/components/HeatGrid';
import { Icon } from '@/components/Icon';
import { Card, SectionLabel, Segmented } from '@/components/ui';
import { addDays, formatShort, isoWeek, relativeDayName, type DateKey } from '@/lib/dates';
import { daysInRange, isFuture, weekColumns, weekRows } from '@/lib/grid';
import { dayStats, fractionOn, goalsOn, periodSummary, summaryText } from '@/lib/habits';
import { useData } from '@/lib/store';
import { useToday } from '@/lib/useToday';
import { shade, useTheme } from '@/theme';

type Range = 'week' | 'month' | 'year';

const RANGE_WEEKS: Record<Range, number> = { week: 1, month: 4, year: 53 };
const RANGE_TITLE: Record<Range, string> = {
  week: 'Denne uka',
  month: 'Siste fire uker',
  year: 'Siste 12 måneder',
};

export default function OverviewScreen() {
  const t = useTheme();
  const today = useToday();
  const data = useData();
  const [range, setRange] = useState<Range>('month');
  const [picked, setPicked] = useState<DateKey>(today);
  const weeks = RANGE_WEEKS[range];

  const dayColor = (day: DateKey) => (isFuture(day, today) ? 'transparent' : shade(t, t.slate, dayStats(data, day).average));

  const heroWeeks: HeatWeek[] = weekRows(today, weeks).map((row) => ({
    label: range === 'week' ? `uke ${isoWeek(today)}` : formatShort(row[0]),
    cells: row.map((day) => {
      const future = isFuture(day, today);
      const s = dayStats(data, day);
      return {
        key: day,
        color: dayColor(day),
        today: day === today,
        selected: day === picked,
        label: future ? 'Fremtidig dag' : `${relativeDayName(day, today)}: ${s.done} av ${s.total} gjort`,
        onPress: future ? undefined : () => setPicked(day),
      };
    }),
  }));

  const pickedStats = dayStats(data, picked);
  const pickedGoals = goalsOn(data, picked);
  const dayLine =
    `${relativeDayName(picked, today)}: ${pickedStats.done} av ${pickedStats.total} gjort` +
    (pickedGoals.length
      ? ` · ${pickedGoals.filter((g) => g.done).length} av ${pickedGoals.length} mål`
      : ' · ingen mål satt');

  const legend = [0, 0.25, 0.5, 0.75, 1].map((f) => shade(t, t.slate, f));
  const nDays = daysInRange(today, weeks);
  const yearCols = range === 'year' ? weekColumns(today, 53) : [];

  const recentGoals = Array.from({ length: 7 }, (_, i) => addDays(today, -i)).flatMap((day) =>
    goalsOn(data, day).map((g) => ({ day, goal: g }))
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.bg }} contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={[styles.sub, { color: t.sub }]}>{RANGE_TITLE[range]}</Text>
        <Text style={[styles.title, { color: t.text }]} accessibilityRole="header">
          Oversikt
        </Text>
      </View>

      <View style={{ paddingHorizontal: 16 }}>
        <Segmented
          label="Periode"
          value={range}
          onChange={(r) => {
            setRange(r);
            setPicked(today);
          }}
          options={[
            { value: 'week', label: 'Uke' },
            { value: 'month', label: '4 uker' },
            { value: 'year', label: 'År' },
          ]}
        />
      </View>

      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: t.text }]}>Alt samlet</Text>
          <Text style={{ fontSize: 13, color: t.sub }}>vaner og dagens mål</Text>
        </View>
        {range === 'year' ? (
          <ColumnGrid columns={yearCols.map((col) => col.map(dayColor))} size={5} gap={1} />
        ) : (
          <>
            <WeekRows weeks={heroWeeks} />
            <Text accessibilityLiveRegion="polite" style={[styles.dayLine, { backgroundColor: t.bg, color: t.text }]}>
              {dayLine}
            </Text>
          </>
        )}
        <Legend colors={legend} />
      </Card>

      {data.habits.length ? (
        <View style={styles.section}>
          <SectionLabel>Hver vane</SectionLabel>
          {data.habits.map((h) => {
            const c = t.colors[h.color];
            const color = (day: DateKey) => (isFuture(day, today) ? 'transparent' : shade(t, c.solid, fractionOn(data, h, day)));
            const summary = summaryText(periodSummary(data, h, today, nDays));
            return (
              <Pressable
                key={h.id}
                onPress={() => router.push({ pathname: '/habit/[id]', params: { id: h.id } })}
                accessibilityRole="button"
                accessibilityLabel={`${h.name}, ${summary}`}
                style={({ pressed }) => [styles.habitCard, { backgroundColor: t.card, opacity: pressed ? 0.8 : 1 }]}>
                <View style={styles.habitTop}>
                  <View style={{ flex: 1, gap: 3 }}>
                    <View style={styles.nameRow}>
                      <View style={[styles.dot, { backgroundColor: c.solid }]} />
                      <Text style={[styles.habitName, { color: t.text }]} numberOfLines={1}>
                        {h.name}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 13, color: t.sub }}>{summary}</Text>
                  </View>
                  {range !== 'year' ? <MiniRows rows={weekRows(today, weeks)} color={color} today={today} big={range === 'week'} /> : null}
                </View>
                {range === 'year' ? <ColumnGrid columns={yearCols.map((col) => col.map(color))} size={5} gap={1} /> : null}
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {recentGoals.length ? (
        <View style={styles.section}>
          <SectionLabel>Siste mål</SectionLabel>
          <Card style={{ paddingHorizontal: 16, paddingVertical: 4 }}>
            {recentGoals.map(({ day, goal }, i) => (
              <View key={goal.id} style={[styles.goalRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.hair }]}>
                <Text style={[styles.goalDay, { color: t.sub }]}>{relativeDayName(day, today).replace(/ \d.*$/, '')}</Text>
                <Text style={[styles.goalText, { color: t.text }]} numberOfLines={1}>
                  {goal.text}
                </Text>
                {goal.done ? <Icon name="checkmark" size={16} color={t.text} weight="bold" /> : null}
              </View>
            ))}
          </Card>
        </View>
      ) : null}
    </ScrollView>
  );
}

/** Lite rutenett til høyre på hvert vanekort: uker som rader, mandag–søndag. */
function MiniRows({ rows, color, today, big }: { rows: DateKey[][]; color: (d: DateKey) => string; today: DateKey; big: boolean }) {
  const t = useTheme();
  const size = big ? 20 : 13;
  const gap = big ? 5 : 3;
  return (
    <View style={{ gap }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {rows.map((row) => (
        <View key={row[0]} style={{ flexDirection: 'row', gap }}>
          {row.map((day) => (
            <View
              key={day}
              style={{
                width: size,
                height: size,
                borderRadius: size / 4,
                backgroundColor: color(day),
                borderWidth: day === today ? 1.5 : 0,
                borderColor: t.sub,
              }}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 8, paddingBottom: 40 },
  header: { paddingHorizontal: 20, paddingBottom: 14, gap: 2 },
  sub: { fontSize: 15, fontWeight: '500' },
  title: { fontSize: 34, lineHeight: 40, fontWeight: '700', letterSpacing: -0.5 },
  card: { marginHorizontal: 16, marginTop: 12, padding: 16, gap: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  cardTitle: { fontSize: 17, fontWeight: '700' },
  dayLine: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, lineHeight: 20, overflow: 'hidden' },
  section: { paddingHorizontal: 16, paddingTop: 20, gap: 8 },
  habitCard: { borderRadius: 20, padding: 16, gap: 12 },
  habitTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  habitName: { fontSize: 15, fontWeight: '600', flexShrink: 1 },
  goalRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 12 },
  goalDay: { width: 64, fontSize: 13 },
  goalText: { flex: 1, fontSize: 15 },
});
