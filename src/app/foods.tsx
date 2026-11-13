import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { Card, PrimaryButton, SectionLabel, TextButton } from '@/components/ui';
import { tr } from '@/i18n';
import { dishItem, foodItem } from '@/lib/foodItems';
import { foodHome, useFoodData } from '@/lib/foodStore';
import { useTheme } from '@/theme';

function back() {
  if (router.canGoBack()) router.back();
  else router.replace(foodHome());
}

/** Egne matvarer og retter. Trykk for å endre. */
export default function FoodsScreen() {
  const t = useTheme();
  const data = useFoodData();
  const foods = [...data.foods].sort((a, b) => a.name.localeCompare(b.name)).map((f) => foodItem(data, f));
  const dishes = [...data.dishes].sort((a, b) => a.name.localeCompare(b.name)).map((d) => dishItem(data, d));

  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.bg }} contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
      <View style={styles.bar}>
        <Pressable onPress={back} accessibilityRole="button" accessibilityLabel={tr.common.back} style={styles.backButton}>
          <Icon name="chevron.left" size={20} color={t.text} />
          <Text style={{ fontSize: 17, color: t.text, fontWeight: '500' }}>{tr.common.back}</Text>
        </Pressable>
      </View>
      <Text style={[styles.title, { color: t.text }]} accessibilityRole="header">
        {tr.food.foodsAndDishes}
      </Text>

      <View style={styles.section}>
        <SectionLabel right={<TextButton label={tr.common.add} bold onPress={() => router.push('/food-form')} />}>{tr.food.foods}</SectionLabel>
        {foods.length ? (
          <Card style={styles.list}>
            {foods.map((f, i) => (
              <ListRow key={f.key} first={i === 0} name={f.name} sub={f.sub} onPress={() => router.push({ pathname: '/food-form', params: { id: f.ref.id } })} />
            ))}
          </Card>
        ) : (
          <Text style={[styles.empty, { color: t.sub }]}>{tr.food.foodsEmpty}</Text>
        )}
      </View>

      <View style={styles.section}>
        <SectionLabel right={<TextButton label={tr.common.add} bold onPress={() => router.push('/dish-form')} />}>{tr.food.dishes}</SectionLabel>
        {dishes.length ? (
          <Card style={styles.list}>
            {dishes.map((d, i) => (
              <ListRow key={d.key} first={i === 0} name={d.name} sub={d.sub} onPress={() => router.push({ pathname: '/dish-form', params: { id: d.ref.id } })} />
            ))}
          </Card>
        ) : (
          <Text style={[styles.empty, { color: t.sub }]}>{tr.food.dishesEmpty}</Text>
        )}
      </View>

      {!foods.length && !dishes.length ? (
        <View style={{ paddingHorizontal: 16, paddingTop: 20 }}>
          <PrimaryButton label={tr.food.newFood} onPress={() => router.push('/food-form')} />
        </View>
      ) : null}
    </ScrollView>
  );
}

function ListRow({ name, sub, onPress, first }: { name: string; sub: string; onPress: () => void; first: boolean }) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${name}. ${sub}`}
      style={({ pressed }) => [styles.row, !first && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.hair }, { opacity: pressed ? 0.6 : 1 }]}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontSize: 16, fontWeight: '600', color: t.text }} numberOfLines={1}>
          {name}
        </Text>
        <Text style={{ fontSize: 13, color: t.sub }} numberOfLines={1}>
          {sub}
        </Text>
      </View>
      <Icon name="chevron.right" size={14} color={t.faint} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 40 },
  bar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingTop: 4 },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: 44, paddingHorizontal: 4 },
  title: { fontSize: 32, lineHeight: 38, fontWeight: '700', letterSpacing: -0.5, paddingHorizontal: 20, paddingTop: 6, paddingBottom: 4 },
  section: { paddingHorizontal: 16, paddingTop: 18, gap: 8 },
  list: { paddingHorizontal: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingVertical: 8 },
  empty: { fontSize: 15, lineHeight: 21, paddingHorizontal: 4 },
});
