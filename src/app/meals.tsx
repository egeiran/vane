import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { Card, IconButton, PrimaryButton, tick } from '@/components/ui';
import { tr } from '@/i18n';
import { mealName } from '@/lib/food';
import { foodHome, useFood } from '@/lib/foodStore';
import { showTime } from '@/lib/region';
import { useTheme } from '@/theme';

function back() {
  if (router.canGoBack()) router.back();
  else router.replace(foodHome());
}

/** Måltidene: rekkefølge, skjule og vise, og trykk for å endre navn, tidsrom og varsel. */
export default function MealsScreen() {
  const t = useTheme();
  const meals = useFood((s) => s.meals);
  const moveMeal = useFood((s) => s.moveMeal);
  const updateMeal = useFood((s) => s.updateMeal);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.bg }} contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
      <View style={styles.bar}>
        <Pressable onPress={back} accessibilityRole="button" accessibilityLabel={tr.common.back} style={styles.backButton}>
          <Icon name="chevron.left" size={20} color={t.text} />
          <Text style={{ fontSize: 17, color: t.text, fontWeight: '500' }}>{tr.common.back}</Text>
        </Pressable>
      </View>
      <Text style={[styles.title, { color: t.text }]} accessibilityRole="header">
        {tr.food.mealsTitle}
      </Text>

      <Card style={styles.list}>
        {meals.map((m, i) => {
          const name = mealName(m);
          const window = m.start && m.end ? tr.food.mealWindow(showTime(m.start), showTime(m.end)) : tr.food.noWindow;
          return (
            <View key={m.id} style={[styles.row, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.hair }]}>
              <Pressable
                onPress={() => router.push({ pathname: '/meal-form', params: { id: m.id } })}
                accessibilityRole="button"
                accessibilityLabel={[name, window, m.hidden ? tr.food.hidden : ''].filter(Boolean).join(', ')}
                style={({ pressed }) => [styles.main, { opacity: pressed ? 0.6 : m.hidden ? 0.5 : 1 }]}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[styles.name, { color: t.text }]} numberOfLines={1}>
                    {name}
                  </Text>
                  <View style={styles.subRow}>
                    {m.remind && !m.hidden ? <Icon name="bell" size={12} color={t.sub} /> : null}
                    <Text style={{ fontSize: 13, color: t.sub }}>{m.hidden ? tr.food.hidden : window}</Text>
                  </View>
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
              <IconButton icon="chevron.up" label={`${name} ↑`} size={36} background="transparent" color={i === 0 ? t.faint : t.sub} onPress={() => moveMeal(m.id, -1)} />
              <IconButton icon="chevron.down" label={`${name} ↓`} size={36} background="transparent" color={i === meals.length - 1 ? t.faint : t.sub} onPress={() => moveMeal(m.id, 1)} />
            </View>
          );
        })}
      </Card>
      <Text style={[styles.footnote, { color: t.sub }]}>{tr.food.mealsHelp}</Text>

      <View style={{ paddingHorizontal: 16, paddingTop: 20 }}>
        <PrimaryButton label={tr.food.newMeal} onPress={() => router.push('/meal-form')} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 40 },
  bar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingTop: 4 },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: 44, paddingHorizontal: 4 },
  title: { fontSize: 32, lineHeight: 38, fontWeight: '700', letterSpacing: -0.5, paddingHorizontal: 20, paddingTop: 6, paddingBottom: 12 },
  list: { marginHorizontal: 16, paddingLeft: 14, paddingRight: 4 },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 56 },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56 },
  name: { fontSize: 16, fontWeight: '600' },
  subRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  footnote: { fontSize: 13, lineHeight: 18, paddingHorizontal: 20, paddingTop: 8 },
});
