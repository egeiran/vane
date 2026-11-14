import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { tr } from '@/i18n';
import type { DateKey } from '@/lib/dates';
import { canEditFood, entriesOn, goalOn, sumEntries } from '@/lib/food';
import { useFood } from '@/lib/foodStore';
import { useTheme } from '@/theme';

import { ProteinBar } from './ProteinBar';
import { IconButton } from './ui';

/**
 * Proteinet på I dag, under vanene: stolpen, kaloriene (hvis de vises) og + for å legge til mat.
 * Trykk på kortet åpner Mat-fanen. Eldre dager vises uten +.
 */
export function FoodCard({ day, today }: { day: DateKey; today: DateKey }) {
  const t = useTheme();
  const entries = useFood((s) => entriesOn(s, day));
  const goal = useFood((s) => goalOn(s, day));
  const showKcal = useFood((s) => s.showKcal);
  const totals = sumEntries(entries);
  const editable = canEditFood(day, today);

  return (
    <View style={[styles.card, { backgroundColor: t.card }]}>
      <Pressable
        onPress={() => router.navigate('/food')}
        accessibilityHint={tr.food.openTab}
        style={({ pressed }) => [styles.main, { opacity: pressed ? 0.7 : 1 }]}>
        <ProteinBar protein={totals.protein} goal={goal} kcal={showKcal ? totals.kcal : null} compact />
      </Pressable>
      {editable ? (
        <IconButton
          icon="plus"
          label={tr.food.add}
          background={t.colors.fersken.soft}
          color={t.colors.fersken.ink}
          onPress={() => router.push({ pathname: '/food-log', params: { day } })}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 20, paddingVertical: 14, paddingLeft: 16, paddingRight: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  main: { flex: 1 },
});
