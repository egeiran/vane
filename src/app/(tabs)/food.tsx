import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { FoodEntryRow } from '@/components/FoodEntryRow';
import { Icon } from '@/components/Icon';
import { ProteinBar } from '@/components/ProteinBar';
import { Card, IconButton, PrimaryButton, SectionLabel } from '@/components/ui';
import { WeekStrip } from '@/components/WeekStrip';
import { tr } from '@/i18n';
import { dayWhen, formatLong, pickedDay, type DateKey } from '@/lib/dates';
import { canEditFood, fractionOn, goalOn, mealGroups, mealName, proteinText, sumEntries, entriesOn } from '@/lib/food';
import { useFoodData } from '@/lib/foodStore';
import { useToday } from '@/lib/useToday';
import { useTheme } from '@/theme';

/** Mat-fanen: dagens protein, det man har spist per måltid, og + for å legge til. */
export default function FoodScreen() {
  const t = useTheme();
  const today = useToday();
  const food = useFoodData();
  // Som på I dag: `null` er alltid i dag, og dagene i ukestripa kan åpnes. Bare i dag og i går kan endres.
  const [picked, setPicked] = useState<DateKey | null>(null);
  const day = pickedDay(picked, today);
  const when = dayWhen(day, today);
  const editable = canEditFood(day, today);

  const totals = sumEntries(entriesOn(food, day));
  const goal = goalOn(food, day);
  const groups = mealGroups(food, day).filter((g) => g.entries.length || (editable && !g.meal.hidden));
  const open = (mealId?: string) => router.push({ pathname: '/food-log', params: mealId ? { day, meal: mealId } : { day } });

  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.bg }} contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={{ gap: 2, flexShrink: 1 }}>
          <Text style={[styles.date, { color: t.sub }]}>{formatLong(day)}</Text>
          <Text style={[styles.title, { color: t.text }]} accessibilityRole="header">
            {tr.food.title}
          </Text>
        </View>
        {editable ? <IconButton icon="plus" label={tr.food.add} onPress={() => open()} /> : null}
      </View>

      <WeekStrip today={today} selected={day} onSelect={(d) => setPicked(d === today ? null : d)} dot={(d) => fractionOn(food, d)} />
      {when !== 'today' ? <Text style={[styles.note, { color: t.sub }]}>{editable ? tr.today.yesterdayNote : tr.today.olderNote}</Text> : null}

      {!food.goals.length ? (
        <Card style={styles.setup}>
          <Text style={[styles.setupTitle, { color: t.text }]}>{tr.food.setupTitle}</Text>
          <Text style={[styles.setupText, { color: t.sub }]}>{tr.food.setupText}</Text>
          <PrimaryButton label={tr.food.setupButton} onPress={() => router.push('/food-goal')} />
        </Card>
      ) : null}

      <Card style={styles.progress}>
        <ProteinBar protein={totals.protein} goal={goal} kcal={food.showKcal ? totals.kcal : null} />
      </Card>

      {!editable && !totals.count ? <Text style={[styles.empty, { color: t.sub }]}>{tr.food.emptyOlder}</Text> : null}

      {groups.map(({ meal, entries, totals: mt }) => {
        const name = mealName(meal);
        const addButton = editable ? (
          <IconButton icon="plus" label={tr.food.addToMeal(name)} size={32} background={t.button} onPress={() => open(meal.id)} />
        ) : undefined;
        if (!entries.length) {
          return (
            <View key={meal.id} style={styles.emptyMeal}>
              <Text style={[styles.emptyMealName, { color: t.sub }]}>{name}</Text>
              {addButton}
            </View>
          );
        }
        return (
          <View key={meal.id} style={styles.section}>
            <SectionLabel right={proteinText(mt.protein)}>{name}</SectionLabel>
            <Card style={styles.list}>
              {entries.map((e, i) => (
                <FoodEntryRow key={e.id} entry={e} day={day} showKcal={food.showKcal} editable={editable} first={i === 0} />
              ))}
              {editable ? (
                <Pressable
                  onPress={() => open(meal.id)}
                  accessibilityRole="button"
                  accessibilityLabel={tr.food.addToMeal(name)}
                  style={({ pressed }) => [styles.addRow, { borderTopColor: t.hair, opacity: pressed ? 0.6 : 1 }]}>
                  <Icon name="plus" size={14} color={t.sub} />
                  <Text style={{ fontSize: 15, color: t.sub, fontWeight: '500' }}>{tr.common.add}</Text>
                </Pressable>
              ) : null}
            </Card>
          </View>
        );
      })}

      <Card style={styles.linkCard}>
        <Pressable onPress={() => router.push('/foods')} accessibilityRole="button" style={({ pressed }) => [styles.linkRow, { opacity: pressed ? 0.6 : 1 }]}>
          <Text style={{ flex: 1, fontSize: 16, color: t.text }}>{tr.food.foodsAndDishes}</Text>
          <Icon name="chevron.right" size={14} color={t.faint} />
        </Pressable>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 8, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 14 },
  date: { fontSize: 15, lineHeight: 20, fontWeight: '500' },
  title: { fontSize: 34, lineHeight: 40, fontWeight: '700', letterSpacing: -0.5 },
  note: { fontSize: 14, lineHeight: 20, marginHorizontal: 20, marginTop: 8 },
  setup: { marginHorizontal: 16, marginTop: 18, padding: 20, gap: 10 },
  setupTitle: { fontSize: 19, fontWeight: '700' },
  setupText: { fontSize: 15, lineHeight: 21 },
  progress: { marginHorizontal: 16, marginTop: 18, padding: 16 },
  empty: { fontSize: 15, marginHorizontal: 20, marginTop: 18 },
  section: { paddingHorizontal: 16, paddingTop: 18, gap: 8 },
  list: { paddingHorizontal: 14 },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, borderTopWidth: StyleSheet.hairlineWidth },
  emptyMeal: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 20, marginTop: 14, minHeight: 36 },
  emptyMealName: { fontSize: 13, lineHeight: 20, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' },
  linkCard: { marginHorizontal: 16, marginTop: 24 },
  linkRow: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16 },
});
