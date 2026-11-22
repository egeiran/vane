import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { tr } from '@/i18n';
import { compareKeys, formatTime, type DateKey } from '@/lib/dates';
import { amountText, kcalText, mealName, proteinText, visibleMeals } from '@/lib/food';
import { useFood } from '@/lib/foodStore';
import { showTime } from '@/lib/region';
import type { FoodEntry } from '@/lib/types';
import { useToday } from '@/lib/useToday';
import { useTheme } from '@/theme';

import { RowMenu, type MenuItem } from './RowMenu';
import { SwipeRow } from './SwipeRow';

type Props = {
  entry: FoodEntry;
  day: DateKey;
  showKcal: boolean;
  editable: boolean;
  first?: boolean;
};

/**
 * Én ting i matloggen: navn, mengde og klokkeslett, og protein til høyre. Trykk for å endre. Sveip mot
 * venstre for Slett, og hold inne for Endre, Flytt til måltid, Kopier til i dag og Slett. Eldre dager
 * kan bare kopieres til i dag.
 */
export function FoodEntryRow({ entry: e, day, showKcal, editable, first }: Props) {
  const t = useTheme();
  const today = useToday();
  // Hele lista (stabil referanse), filtrert her. En ny liste fra velgeren ville gitt ny tegning hver gang.
  const allMeals = useFood((s) => s.meals);
  const meals = visibleMeals({ meals: allMeals });
  const addEntry = useFood((s) => s.addEntry);
  const updateEntry = useFood((s) => s.updateEntry);
  const removeEntry = useFood((s) => s.removeEntry);
  const name = e.name || tr.food.quickName;
  const meta = [showTime(e.time), e.amount ? amountText(e.amount) : '', showKcal && e.kcal !== null ? kcalText(e.kcal) : ''].filter(Boolean).join(' · ');
  const protein = proteinText(e.protein, true);
  const edit = () => router.push({ pathname: '/food-entry', params: { day, id: e.id } });

  const copyToToday = () => {
    const now = new Date();
    addEntry(today, { time: formatTime({ hour: now.getHours(), minute: now.getMinutes() }), mealId: e.mealId, name: e.name, protein: e.protein, kcal: e.kcal, ref: e.ref, amount: e.amount });
  };
  const items: MenuItem[] = [
    ...(editable
      ? [
          { label: tr.common.edit, icon: 'pencil' as const, onPress: edit },
          {
            label: tr.food.moveToMeal,
            icon: 'arrow.right.square' as const,
            items: meals.filter((m) => m.id !== e.mealId).map((m) => ({ label: mealName(m), onPress: () => updateEntry(day, e.id, { mealId: m.id }) })),
          },
        ]
      : []),
    ...(compareKeys(day, today) < 0 ? [{ label: tr.food.copyToToday, icon: 'doc.on.doc' as const, onPress: copyToToday }] : []),
    ...(editable ? [{ label: tr.food.deleteEntry, icon: 'trash' as const, destructive: true, onPress: () => removeEntry(day, e.id) }] : []),
  ];

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
  const style = [styles.row, { backgroundColor: t.card }, !first && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.separator }];

  return (
    <SwipeRow enabled={editable} actions={[{ label: tr.food.deleteEntry, color: t.danger, onPress: () => removeEntry(day, e.id) }]}>
      <RowMenu href={{ pathname: '/food-entry', params: { day, id: e.id } }} items={items}>
        <View>
          {editable ? (
            <Pressable onPress={edit} accessibilityRole="button" accessibilityLabel={`${name}, ${protein}. ${meta}`} style={({ pressed }) => [...style, { opacity: pressed ? 0.6 : 1 }]}>
              {body}
            </Pressable>
          ) : (
            <View style={style} accessible accessibilityLabel={`${name}, ${protein}. ${meta}`}>
              {body}
            </View>
          )}
        </View>
      </RowMenu>
    </SwipeRow>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingVertical: 8 },
  name: { fontSize: 16, fontWeight: '600' },
  meta: { fontSize: 13 },
  protein: { fontSize: 16, fontWeight: '600', fontVariant: ['tabular-nums'] },
});
