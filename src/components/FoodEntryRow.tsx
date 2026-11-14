import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { tr } from '@/i18n';
import type { DateKey } from '@/lib/dates';
import { amountText, kcalText, proteinText } from '@/lib/food';
import { showTime } from '@/lib/region';
import type { FoodEntry } from '@/lib/types';
import { useTheme } from '@/theme';

type Props = {
  entry: FoodEntry;
  day: DateKey;
  showKcal: boolean;
  editable: boolean;
  first?: boolean;
};

/** Én ting i matloggen: navn, mengde og klokkeslett, og protein til høyre. */
export function FoodEntryRow({ entry: e, day, showKcal, editable, first }: Props) {
  const t = useTheme();
  const name = e.name || tr.food.quickName;
  const meta = [showTime(e.time), e.amount ? amountText(e.amount) : '', showKcal && e.kcal !== null ? kcalText(e.kcal) : ''].filter(Boolean).join(' · ');
  const protein = proteinText(e.protein, true);
  const body = (
    <>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[styles.name, { color: t.text }]} numberOfLines={1}>
          {name}
        </Text>
        <Text style={[styles.meta, { color: t.sub }]} numberOfLines={1}>
          {meta}
        </Text>
      </View>
      <Text style={[styles.protein, { color: t.text }]}>{protein}</Text>
    </>
  );
  const style = [styles.row, !first && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.hair }];
  if (!editable) {
    return (
      <View style={style} accessible accessibilityLabel={`${name}, ${protein}. ${meta}`}>
        {body}
      </View>
    );
  }
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/food-entry', params: { day, id: e.id } })}
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${protein}. ${meta}`}
      style={({ pressed }) => [...style, { opacity: pressed ? 0.6 : 1 }]}>
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingVertical: 8 },
  name: { fontSize: 16, fontWeight: '600' },
  meta: { fontSize: 13 },
  protein: { fontSize: 16, fontWeight: '600', fontVariant: ['tabular-nums'] },
});
