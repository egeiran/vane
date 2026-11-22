import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ScreenHeader } from '@/components/ScreenHeader';
import { Icon } from '@/components/Icon';
import { Card, PrimaryButton, SectionLabel } from '@/components/ui';
import { tr } from '@/i18n';
import { dishItem, foodItem } from '@/lib/foodItems';
import { useFoodData } from '@/lib/foodStore';
import { useTheme } from '@/theme';


/** Egne matvarer og retter. Trykk for å endre. */
export default function FoodsScreen() {
  const t = useTheme();
  const data = useFoodData();
  const foods = [...data.foods].sort((a, b) => a.name.localeCompare(b.name)).map((f) => foodItem(data, f));
  const dishes = [...data.dishes].sort((a, b) => a.name.localeCompare(b.name)).map((d) => dishItem(data, d));

  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.bg }} contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
      <ScreenHeader title={tr.food.foodsAndDishes} large right={[{ label: tr.common.add, icon: 'plus', items: [{ label: tr.food.newFood, icon: 'carrot', onPress: () => router.push('/food-form') }, { label: tr.food.newDish, icon: 'fork.knife', onPress: () => router.push('/dish-form') }] }]} />

      <View style={styles.section}>
        <SectionLabel>{tr.food.foods}</SectionLabel>
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
        <SectionLabel>{tr.food.dishes}</SectionLabel>
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
      style={({ pressed }) => [styles.row, !first && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.separator }, { opacity: pressed ? 0.6 : 1 }]}>
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
  section: { paddingHorizontal: 16, paddingTop: 18, gap: 8 },
  list: { paddingHorizontal: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingVertical: 8 },
  empty: { fontSize: 15, lineHeight: 21, paddingHorizontal: 4 },
});
