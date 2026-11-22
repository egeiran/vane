import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, LayoutAnimationConfig } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DayPager } from '@/components/DayPager';
import { FoodCard } from '@/components/FoodCard';
import { GoalsCard } from '@/components/GoalsCard';
import { HabitRow, WeeklyRow } from '@/components/HabitRow';
import { JournalCard } from '@/components/JournalCard';
import { Card, IconButton, PrimaryButton, SectionLabel, TextButton } from '@/components/ui';
import { WeekStrip } from '@/components/WeekStrip';
import { tr } from '@/i18n';
import { daysFrom, dayWhen, formatLong, inlineDayName, isoWeek, pickedDay, relativeWeekday, type DateKey } from '@/lib/dates';
import { dailyHabitsOn, firstDataDay, frequencyText, isDone, restingHabitsOn, weeklyHabitsOn } from '@/lib/habits';
import { showsWeekNumber, weekStartOf } from '@/lib/region';
import { useStore } from '@/lib/store';
import { useToday } from '@/lib/useToday';
import { useTheme } from '@/theme';

/**
 * I dag: overskriften og ukestripa står fast, og under ligger én side per dag som man blar mellom
 * sidelengs. Man kan bla tilbake til den første dagen med data. Bare i dag og i går kan endres.
 */
export default function TodayScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const today = useToday();
  const first = useStore((s) => firstDataDay(s, today));
  const weekStart = useStore((s) => weekStartOf(s.settings));
  // `null` er alltid i dag, også når appen har ligget i bakgrunnen over midnatt (for eksempel når
  // kveldsvarselet åpner den). Andre dager velges i ukestripa eller med sveip.
  const [picked, setPicked] = useState<DateKey | null>(null);
  const day = pickedDay(picked, today, first);
  const pick = (d: DateKey) => setPicked(d === today ? null : d);
  const when = dayWhen(day, today);
  const isToday = when === 'today';

  return (
    <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: insets.top }}>
      <View style={styles.header}>
        {/* Ny dag gir ny tekst, som tones inn. */}
        <Animated.View key={day} entering={FadeIn.duration(160)} style={{ gap: 2, flexShrink: 1 }}>
          <Text style={[styles.date, { color: t.sub }]}>{formatLong(day)}</Text>
          <Text style={[styles.title, { color: t.text }]} accessibilityRole="header" numberOfLines={1}>
            {isToday ? tr.today.title : when === 'yesterday' ? tr.today.yesterdayTitle : relativeWeekday(day, today)}
          </Text>
        </Animated.View>
        {isToday ? (
          <IconButton icon="plus" label={tr.today.newHabit} onPress={() => router.push('/habit-form')} />
        ) : (
          <TextButton label={tr.today.backToToday} bold onPress={() => setPicked(null)} />
        )}
      </View>

      <WeekStrip today={today} selected={day} first={first} weekStart={weekStart} onSelect={pick} />

      <DayPager days={daysFrom(first, today)} day={day} onChange={pick} renderDay={(d) => <DayPage day={d} today={today} />} />
    </View>
  );
}

/** Én dag: mål, dagbok, vanene og maten. Har sin egen loddrette rulling. */
function DayPage({ day, today }: { day: DateKey; today: DateKey }) {
  const t = useTheme();
  const when = dayWhen(day, today);
  const isToday = when === 'today';
  const editable = when !== 'older';

  const habits = useStore((s) => s.habits);
  const journalOn = useStore((s) => s.settings.modules.journal);
  const foodOn = useStore((s) => !!s.settings.modules.food);
  const weekStart = useStore((s) => weekStartOf(s.settings));
  const logs = useStore((s) => s.logs[day]);
  const daily = dailyHabitsOn(habits, day);
  const resting = restingHabitsOn(habits, day);
  const weekly = weeklyHabitsOn(habits, day);
  const doneCount = daily.filter((h) => isDone(h, logs?.[h.id] ?? 0)).length;

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentInsetAdjustmentBehavior="automatic"
      // Dagboken har et tekstfelt: tastaturet skal ikke dekke det, og et trykk ved siden av skal virke.
      automaticallyAdjustKeyboardInsets
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      contentContainerStyle={styles.content}>
      {/* Det som tones inn (som haken), gjør det bare når man endrer noe, ikke når dagen åpnes. */}
      <LayoutAnimationConfig skipEntering>
        {!isToday ? <Text style={[styles.note, { color: t.sub }]}>{editable ? tr.today.yesterdayNote : tr.today.olderNote}</Text> : null}

        <View style={styles.section}>
          <GoalsCard day={day} when={when} />
        </View>

        {/* Dagboken er en modul. Er den av, er kortet borte, men det som er skrevet, ligger der. */}
        {journalOn ? (
          <View style={styles.section}>
            <JournalCard day={day} when={when} />
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

        {/* Mat er en modul. Er den av, er kortet borte, men det som er logget, ligger der. */}
        {foodOn ? (
          <View style={styles.section}>
            <FoodCard day={day} today={today} />
          </View>
        ) : null}
      </LayoutAnimationConfig>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 4, paddingBottom: 40 },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
  },
  date: { fontSize: 15, lineHeight: 20, fontWeight: '500' },
  title: { fontSize: 34, lineHeight: 40, fontWeight: '700', letterSpacing: -0.5 },
  note: { fontSize: 14, lineHeight: 20, marginHorizontal: 20, marginTop: 4 },
  resting: { marginHorizontal: 4, marginTop: 2 },
  section: { paddingHorizontal: 16, paddingTop: 18, gap: 8 },
  empty: { marginHorizontal: 16, marginTop: 18, padding: 20, gap: 12 },
  emptyTitle: { fontSize: 19, fontWeight: '700' },
  emptyText: { fontSize: 15, lineHeight: 21 },
});
