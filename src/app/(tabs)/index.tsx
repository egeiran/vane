import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { GoalsCard } from '@/components/GoalsCard';
import { HabitRow, WeeklyRow } from '@/components/HabitRow';
import { Card, IconButton, PrimaryButton, SectionLabel, TextButton } from '@/components/ui';
import { WeekStrip } from '@/components/WeekStrip';
import { addDays, formatLong, isoWeek, type DateKey } from '@/lib/dates';
import { dailyHabitsOn, frequencyText, isDone, restingHabitsOn, weeklyHabitsOn } from '@/lib/habits';
import { useStore } from '@/lib/store';
import { useToday } from '@/lib/useToday';
import { useTheme } from '@/theme';

export default function TodayScreen() {
  const t = useTheme();
  const today = useToday();
  const yesterday = addDays(today, -1);
  const [picked, setPicked] = useState<DateKey>(today);
  // Etter midnatt er «i går» ikke lenger det samme – da går vi tilbake til i dag.
  const day = picked === today || picked === yesterday ? picked : today;
  const isToday = day === today;

  const habits = useStore((s) => s.habits);
  const logs = useStore((s) => s.logs[day]);
  const daily = dailyHabitsOn(habits, day);
  const resting = restingHabitsOn(habits, day);
  const weekly = weeklyHabitsOn(habits, day);
  const doneCount = daily.filter((h) => isDone(h, logs?.[h.id] ?? 0)).length;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: t.bg }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={{ gap: 2 }}>
          <Text style={[styles.date, { color: t.sub }]}>{formatLong(day)}</Text>
          <Text style={[styles.title, { color: t.text }]} accessibilityRole="header">
            {isToday ? 'I dag' : 'I går'}
          </Text>
        </View>
        {isToday ? (
          <IconButton icon="plus" label="Ny vane" onPress={() => router.push('/habit-form')} />
        ) : (
          <TextButton label="Til i dag" bold onPress={() => setPicked(today)} />
        )}
      </View>

      <WeekStrip today={today} selected={day} onSelect={setPicked} />
      {!isToday ? (
        <Text style={[styles.note, { color: t.sub }]}>Du kan rette i går. Eldre dager er låst.</Text>
      ) : null}

      <View style={styles.section}>
        <GoalsCard day={day} isToday={isToday} />
      </View>

      {habits.length === 0 ? (
        <Card style={styles.empty}>
          <Text style={[styles.emptyTitle, { color: t.text }]}>Ingen vaner ennå</Text>
          <Text style={[styles.emptyText, { color: t.sub }]}>
            Start med én liten ting du vil gjøre hver dag. Du kan alltid legge til flere senere.
          </Text>
          <PrimaryButton label="Legg til en vane" onPress={() => router.push('/habit-form')} />
        </Card>
      ) : null}

      {daily.length > 0 || resting.length > 0 ? (
        <View style={styles.section}>
          <SectionLabel right={daily.length ? `${doneCount} av ${daily.length}` : undefined}>Daglig</SectionLabel>
          {daily.map((h) => (
            <HabitRow key={h.id} habit={h} day={day} showReminder={isToday} />
          ))}
          {resting.length ? (
            <Text style={[styles.note, styles.resting, { color: t.sub }]}>
              {(isToday ? 'Ikke i dag: ' : 'Ikke i går: ') +
                resting.map((h) => `${h.name} (${frequencyText(h).toLowerCase()})`).join(', ')}
            </Text>
          ) : null}
        </View>
      ) : null}

      {weekly.length > 0 ? (
        <View style={styles.section}>
          <SectionLabel right={`uke ${isoWeek(day)}`}>Denne uka</SectionLabel>
          {weekly.map((h) => (
            <WeeklyRow key={h.id} habit={h} day={day} />
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
