import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SortableList } from '@/components/SortableList';
import { Card, IconButton, tick } from '@/components/ui';
import { tr } from '@/i18n';
import { mealName } from '@/lib/food';
import { useFood } from '@/lib/foodStore';
import { showTime } from '@/lib/region';
import { useTheme } from '@/theme';

/**
 * Måltidene: rekkefølge (hold inne og dra, eller Endre), skjule og vise, og trykk for å endre navn,
 * tidsrom og varsel.
 */
export default function MealsScreen() {
  const t = useTheme();
  const meals = useFood((s) => s.meals);
  const moveMeal = useFood((s) => s.moveMeal);
  const updateMeal = useFood((s) => s.updateMeal);
  const [editing, setEditing] = useState(false);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.bg }} contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
      <ScreenHeader
        title={tr.food.mealsTitle}
        large
        right={[
          { label: editing ? tr.common.done : tr.common.edit, variant: editing ? 'done' : 'plain', onPress: () => setEditing(!editing) },
          { label: tr.food.newMeal, icon: 'plus', onPress: () => router.push('/meal-form') },
        ]}
      />

      <Card style={styles.list}>
        <SortableList
          items={meals}
          keyOf={(m) => m.id}
          rowHeight={60}
          editing={editing}
          onMove={moveMeal}
          renderRow={(m, handle) => {
            const name = mealName(m);
            const window = m.start && m.end ? tr.food.mealWindow(showTime(m.start), showTime(m.end)) : tr.food.noWindow;
            return (
              <View style={styles.row}>
                <Pressable
                  onPress={() => router.push({ pathname: '/meal-form', params: { id: m.id } })}
                  accessibilityRole="button"
                  accessibilityLabel={[name, window, m.hidden ? tr.food.hidden : ''].filter(Boolean).join(', ')}
                  style={({ pressed }) => [styles.main, { opacity: pressed ? 0.6 : m.hidden ? 0.5 : 1 }]}>
                  <Text style={[styles.name, { color: t.text }]} numberOfLines={1}>
                    {name}
                  </Text>
                  <View style={styles.subRow}>
                    {m.remind && !m.hidden ? <Icon name="bell" size={12} color={t.sub} /> : null}
                    <Text style={{ fontSize: 13, color: t.sub }}>{m.hidden ? tr.food.hidden : window}</Text>
                  </View>
                </Pressable>
                <IconButton
                  icon={m.hidden ? 'eye.slash' : 'eye'}
                  label={m.hidden ? tr.food.showMeal : tr.food.hideMeal}
                  size={36}
                  background="transparent"
                  color={t.sub}
                  onPress={() => {
                    tick();
                    updateMeal(m.id, { hidden: !m.hidden });
                  }}
                />
                {handle}
              </View>
            );
          }}
        />
      </Card>
      <Text style={[styles.footnote, { color: t.sub }]}>{tr.food.mealsHelp}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 40 },
  list: { marginHorizontal: 16, marginTop: 8, overflow: 'hidden' },
  row: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingLeft: 14, paddingRight: 4 },
  main: { flex: 1, justifyContent: 'center', gap: 2, alignSelf: 'stretch' },
  name: { fontSize: 16, fontWeight: '600' },
  subRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  footnote: { fontSize: 13, lineHeight: 18, paddingHorizontal: 20, paddingTop: 8 },
});
