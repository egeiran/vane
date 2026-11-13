import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { GoalsCard } from '@/components/GoalsCard';
import { HabitRow, WeeklyRow } from '@/components/HabitRow';
import { JournalCard } from '@/components/JournalCard';
import { Card, IconButton, PrimaryButton, SectionLabel, TextButton } from '@/components/ui';
import { WeekStrip } from '@/components/WeekStrip';
import { tr } from '@/i18n';
import { dayWhen, formatLong, inlineDayName, isoWeek, pickedDay, relativeWeekday, type DateKey } from '@/lib/dates';
import { dailyHabitsOn, frequencyText, isDone, restingHabitsOn, weeklyHabitsOn } from '@/lib/habits';
import { showsWeekNumber, weekStartOf } from '@/lib/region';
import { useStore } from '@/lib/store';
import { useToday } from '@/lib/useToday';
import { useTheme } from '@/theme';

export default function TodayScreen() {
  const t = useTheme();
  const today = useToday();
  // `null` er alltid i dag, også når appen har ligget i bakgrunnen over midnatt (for eksempel når
  // kveldsvarselet åpner den). Dagene i ukestripa kan velges i tillegg; bare i går kan endres.
  const [picked, setPicked] = useState<DateKey | null>(null);
  const day = pickedDay(picked, today);
  const pick = (d: DateKey) => setPicked(d === today ? null : d);
  const when = dayWhen(day, today);
  const isToday = when === 'today';
  const editable = when !== 'older';

  const habits = useStore((s) => s.habits);
  const journalOn = useStore((s) => s.settings.modules.journal);
  const weekStart = useStore((s) => weekStartOf(s.settings));
  const logs = useStore((s) => s.logs[day]);
  const daily = dailyHabitsOn(habits, day);
  const resting = restingHabitsOn(habits, day);
  const weekly = weeklyHabitsOn(habits, day);
  const doneCount = daily.filter((h) => isDone(h, logs?.[h.id] ?? 0)).length;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: t.bg }}
      contentInsetAdjustmentBehavior="automatic"
      // Dagboken har et tekstfelt: tastaturet skal ikke dekke det, og et trykk ved siden av skal virke.
      automaticallyAdjustKeyboardInsets
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={{ gap: 2 }}>
          <Text style={[styles.date, { color: t.sub }]}>{formatLong(day)}</Text>
          <Text style={[styles.title, { color: t.text }]} accessibilityRole="header">
            {isToday ? tr.today.title : when === 'yesterday' ? tr.today.yesterdayTitle : relativeWeekday(day, today)}
          </Text>
        </View>
        {isToday ? (
          <IconButton icon="plus" label={tr.today.newHabit} onPress={() => router.push('/habit-form')} />
        ) : (
          <TextButton label={tr.today.backToToday} bold onPress={() => setPicked(null)} />
        )}
      </View>

      <WeekStrip today={today} selected={day} onSelect={pick} />
      {!isToday ? (
        <Text style={[styles.note, { color: t.sub }]}>{editable ? tr.today.yesterdayNote : tr.today.olderNote}</Text>
      ) : null}

      <View style={styles.section}>
        <GoalsCard day={day} when={when} />
      </View>

      {/* Dagboken er en modul. Er den av, er kortet borte, men det som er skrevet, ligger der. */}
      {journalOn ? (
        <View style={styles.section}>
          {/* Ny dag gir nytt kort, så det som er skrevet, lagres før det byttes. */}
          <JournalCard key={day} day={day} when={when} />
        </View>
      ) : null}

      {habits.length === 0 ? (
        <Card style={styles.empty}>
          <Text style={[styles.emptyTitle, { color: t.text }]}>{tr.today.emptyTitle}</Text>
          <Text style={[styles.emptyText, { color: t.sub }]}>{tr.today.emptyText}</Text>
          <PrimaryButton label={tr.today.addFirst} onPress={() => router.push('/habit-form')} />
        </Card>
      ) : null}

      {daily.length > 0 || resting.length > 0 ? (
        <View style={styles.section}>
          <SectionLabel right={daily.length ? tr.today.doneOf(doneCount, daily.length) : undefined}>{tr.today.daily}</SectionLabel>
          {daily.map((h) => (
            <HabitRow key={h.id} habit={h} day={day} showReminder={isToday} editable={editable} />
          ))}
          {resting.length ? (
            <Text style={[styles.note, styles.resting, { color: t.sub }]}>
              {tr.today.resting(inlineDayName(day, today), resting.map((h) => tr.today.restingItem(h.name, frequencyText(h, weekStart))).join(', '))}
            </Text>
          ) : null}
        </View>
      ) : null}

      {weekly.length > 0 ? (
        <View style={styles.section}>
          <SectionLabel right={showsWeekNumber(weekStart) ? tr.dates.week(isoWeek(day)) : undefined}>{tr.today.thisWeek}</SectionLabel>
          {weekly.map((h) => (
            <WeeklyRow key={h.id} habit={h} day={day} editable={editable} />
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 8, paddingBottom: 40 },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  date: { fontSize: 15, lineHeight: 20, fontWeight: '500' },
  title: { fontSize: 34, lineHeight: 40, fontWeight: '700', letterSpacing: -0.5 },
  note: { fontSize: 14, lineHeight: 20, marginHorizontal: 20, marginTop: 8 },
  resting: { marginHorizontal: 4, marginTop: 2 },
  section: { paddingHorizontal: 16, paddingTop: 18, gap: 8 },
  empty: { marginHorizontal: 16, marginTop: 18, padding: 20, gap: 12 },
  emptyTitle: { fontSize: 19, fontWeight: '700' },
  emptyText: { fontSize: 15, lineHeight: 21 },
});
