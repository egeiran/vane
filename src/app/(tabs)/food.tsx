import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, LayoutAnimationConfig } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DayPager } from '@/components/DayPager';
import { FoodEntryRow } from '@/components/FoodEntryRow';
import { Icon } from '@/components/Icon';
import { appear, disappear, reflow } from '@/components/motion';
import { ProteinBar } from '@/components/ProteinBar';
import { Card, IconButton, PrimaryButton, TextButton } from '@/components/ui';
import { WeekStrip } from '@/components/WeekStrip';
import { tr } from '@/i18n';
import { daysFrom, dayWhen, formatLong, pickedDay, type DateKey } from '@/lib/dates';
import { canEditFood, entriesOn, firstFoodDay, fractionOn, goalOn, mealGroups, mealName, proteinText, sumEntries } from '@/lib/food';
import { useFoodData } from '@/lib/foodStore';
import { weekStartOf } from '@/lib/region';
import { useStore } from '@/lib/store';
import { useToday } from '@/lib/useToday';
import { useTheme } from '@/theme';

/**
 * Mat-fanen: overskriften og ukestripa står fast, og under ligger én side per dag med protein, det man
 * har spist per måltid, og + for å legge til. Bla sidelengs mellom dagene, som på I dag.
 */
export default function FoodScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const today = useToday();
  const food = useFoodData();
  const first = firstFoodDay(food, today);
  const weekStart = useStore((s) => weekStartOf(s.settings));
  // Som på I dag: `null` er alltid i dag. Bare i dag og i går kan endres.
  const [picked, setPicked] = useState<DateKey | null>(null);
  const day = pickedDay(picked, today, first);
  const pick = (d: DateKey) => setPicked(d === today ? null : d);
  const editable = canEditFood(day, today);

  return (
    <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: insets.top }}>
      <View style={styles.header}>
        <Animated.View key={day} entering={FadeIn.duration(160)} style={{ gap: 2, flexShrink: 1 }}>
          <Text style={[styles.date, { color: t.sub }]}>{formatLong(day)}</Text>
          <Text style={[styles.title, { color: t.text }]} accessibilityRole="header">
            {tr.food.title}
          </Text>
        </Animated.View>
        {editable ? (
          <IconButton icon="plus" label={tr.food.add} onPress={() => router.push({ pathname: '/food-log', params: { day } })} />
        ) : (
          <TextButton label={tr.today.backToToday} bold onPress={() => setPicked(null)} />
        )}
      </View>

      <WeekStrip today={today} selected={day} first={first} weekStart={weekStart} onSelect={pick} dot={(d) => fractionOn(food, d)} />

      <DayPager days={daysFrom(first, today)} day={day} onChange={pick} renderDay={(d) => <FoodDay day={d} today={today} />} />
    </View>
  );
}

/** Én dag på Mat-fanen, med sin egen loddrette rulling. */
function FoodDay({ day, today }: { day: DateKey; today: DateKey }) {
  const t = useTheme();
  const food = useFoodData();
  const when = dayWhen(day, today);
  const editable = canEditFood(day, today);

  const totals = sumEntries(entriesOn(food, day));
  const goal = goalOn(food, day);
  // Eldre dager viser bare måltidene der noe er logget. I dag og i går vises også de tomme.
  const groups = mealGroups(food, day).filter((g) => g.entries.length || (editable && !g.meal.hidden));
  const open = (mealId?: string) => router.push({ pathname: '/food-log', params: mealId ? { day, meal: mealId } : { day } });

  return (
    <ScrollView style={{ flex: 1 }} contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
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

      {/* Nye føringer og måltider tones inn og det rundt glir på plass, men ikke når dagen åpnes. */}
      <LayoutAnimationConfig skipEntering>
        {groups.map(({ meal, entries, totals: mt }) => {
          const name = mealName(meal);
          // Et tomt måltid er en stiplet plassholder, så det ikke ser ut som det hører til kortet over.
          if (!entries.length) {
            return (
              <Animated.View key={meal.id} entering={appear} exiting={disappear} layout={reflow}>
                <Pressable
                  onPress={() => open(meal.id)}
                  accessibilityRole="button"
                  accessibilityLabel={tr.food.addToMeal(name)}
                  style={({ pressed }) => [styles.emptyMeal, { borderColor: t.border, opacity: pressed ? 0.6 : 1 }]}>
                  <Text style={[styles.emptyMealName, { color: t.sub }]}>{name}</Text>
                  <View style={styles.emptyMealAdd}>
                    <Icon name="plus" size={13} color={t.sub} />
                    <Text style={{ fontSize: 15, fontWeight: '600', color: t.sub }}>{tr.common.add}</Text>
                  </View>
                </Pressable>
              </Animated.View>
            );
          }
          // Navnet og summen står inne i kortet, sammen med det som hører til måltidet.
          return (
            <Animated.View key={meal.id} entering={appear} exiting={disappear} layout={reflow}>
              <Card style={styles.meal}>
                <View style={styles.mealHead}>
                  <Text style={[styles.mealName, { color: t.text }]} accessibilityRole="header" numberOfLines={1}>
                    {name}
                  </Text>
                  <Text style={[styles.mealSum, { color: t.colors.fersken.ink }]}>{tr.food.proteinOf(proteinText(mt.protein))}</Text>
                </View>
                {entries.map((e, i) => (
                  <Animated.View key={e.id} entering={appear} exiting={disappear} layout={reflow}>
                    <FoodEntryRow entry={e} day={day} showKcal={food.showKcal} editable={editable} first={i === 0} />
                  </Animated.View>
                ))}
                {editable ? (
                  <Pressable
                    onPress={() => open(meal.id)}
                    accessibilityRole="button"
                    accessibilityLabel={tr.food.addToMeal(name)}
                    style={({ pressed }) => [styles.addRow, { borderTopColor: t.separator, opacity: pressed ? 0.6 : 1 }]}>
                    <Icon name="plus" size={14} color={t.sub} />
                    <Text style={{ fontSize: 15, color: t.sub, fontWeight: '500' }}>{tr.common.add}</Text>
                  </Pressable>
                ) : null}
              </Card>
            </Animated.View>
          );
        })}
      </LayoutAnimationConfig>

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
  content: { paddingTop: 4, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 14 },
  date: { fontSize: 15, lineHeight: 20, fontWeight: '500' },
  title: { fontSize: 34, lineHeight: 40, fontWeight: '700', letterSpacing: -0.5 },
  note: { fontSize: 14, lineHeight: 20, marginHorizontal: 20, marginTop: 4 },
  setup: { marginHorizontal: 16, marginTop: 18, padding: 20, gap: 10 },
  setupTitle: { fontSize: 19, fontWeight: '700' },
  setupText: { fontSize: 15, lineHeight: 21 },
  progress: { marginHorizontal: 16, marginTop: 18, padding: 16 },
  empty: { fontSize: 15, marginHorizontal: 20, marginTop: 18 },
  meal: { marginHorizontal: 16, marginTop: 14, paddingHorizontal: 14 },
  mealHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, paddingTop: 14, paddingBottom: 6 },
  mealName: { fontSize: 19, fontWeight: '700', flexShrink: 1 },
  mealSum: { fontSize: 15, fontWeight: '600', fontVariant: ['tabular-nums'] },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, borderTopWidth: StyleSheet.hairlineWidth },
  emptyMeal: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 16, marginTop: 10, minHeight: 50, paddingHorizontal: 14, borderRadius: 16, borderWidth: 1.5, borderStyle: 'dashed' },
  emptyMealName: { fontSize: 17, fontWeight: '600' },
  emptyMealAdd: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  linkCard: { marginHorizontal: 16, marginTop: 24 },
  linkRow: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16 },
});
