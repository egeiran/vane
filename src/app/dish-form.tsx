import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FoodPicker } from '@/components/FoodPicker';
import { Card, IconButton, TextButton } from '@/components/ui';
import { tr } from '@/i18n';
import { amountText, dishTotals, kcalText, proteinText } from '@/lib/food';
import { MAX_FOOD_NAME } from '@/lib/foodState';
import { foodHome, useFood, useFoodData } from '@/lib/foodStore';
import type { DishItem } from '@/lib/types';
import { useTheme } from '@/theme';

function close() {
  if (router.canGoBack()) router.back();
  else router.replace(foodHome());
}

/** Ny rett, eller endre en (?id=…): et navn og det den består av. */
export default function DishFormScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const data = useFoodData();
  const existing = id ? data.dishes.find((d) => d.id === id) : undefined;
  const addDish = useFood((s) => s.addDish);
  const updateDish = useFood((s) => s.updateDish);
  const removeDish = useFood((s) => s.removeDish);
  const [name, setName] = useState(existing?.name ?? '');
  const [items, setItems] = useState<DishItem[]>(existing?.items ?? []);
  const [picking, setPicking] = useState(!existing);

  const total = dishTotals({ items });
  const canSave = !!name.trim() && items.length > 0;

  const save = () => {
    if (!canSave) return;
    const input = { name: name.trim().slice(0, MAX_FOOD_NAME), items };
    if (existing) updateDish(existing.id, input);
    else addDish(input);
    close();
  };

  const confirmDelete = () =>
    existing &&
    Alert.alert(tr.food.deleteConfirm(existing.name), tr.food.deleteHelp, [
      { text: tr.common.cancel, style: 'cancel' },
      {
        text: tr.common.delete,
        style: 'destructive',
        onPress: () => {
          close();
          removeDish(existing.id);
        },
      },
    ]);

  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1, backgroundColor: t.bg }}>
      <View style={styles.bar}>
        <TextButton label={tr.common.cancel} onPress={close} />
        <Text style={[styles.barTitle, { color: t.text }]} accessibilityRole="header">
          {existing ? tr.food.dishFormEdit : tr.food.dishFormNew}
        </Text>
        <TextButton label={existing ? tr.common.save : tr.common.add} bold onPress={save} disabled={!canSave} />
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
        <Card style={styles.card}>
          <Text style={[styles.label, { color: t.sub }]} nativeID="dish-name-label">
            {tr.common.name}
          </Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder={tr.food.dishNamePlaceholder}
            placeholderTextColor={t.faint}
            returnKeyType="done"
            maxLength={MAX_FOOD_NAME}
            accessibilityLabelledBy="dish-name-label"
            style={[styles.input, { backgroundColor: t.field, color: t.text }]}
          />
        </Card>

        <Card style={styles.card}>
          <Text style={[styles.cardTitle, { color: t.text }]}>{tr.food.ingredients}</Text>
          {items.length ? (
            items.map((item, i) => (
              <View key={`${item.name}-${i}`} style={[styles.item, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.hair }]}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: t.text }} numberOfLines={2}>
                    {item.name}
                  </Text>
                  <Text style={{ fontSize: 13, color: t.sub }}>
                    {[item.amount ? amountText(item.amount) : '', proteinText(item.protein, true), data.showKcal && item.kcal !== null ? kcalText(item.kcal) : ''].filter(Boolean).join(' · ')}
                  </Text>
                </View>
                <IconButton icon="minus.circle" label={tr.food.remove(item.name)} size={36} background="transparent" color={t.sub} onPress={() => setItems(items.filter((_, j) => j !== i))} />
              </View>
            ))
          ) : (
            <Text style={{ fontSize: 15, color: t.sub }}>{tr.food.dishEmpty}</Text>
          )}
          {items.length ? (
            <View style={[styles.total, { borderTopColor: t.border }]}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: t.text }}>{tr.food.total}</Text>
              <Text style={{ fontSize: 16, fontWeight: '700', color: t.text, fontVariant: ['tabular-nums'] }}>
                {[proteinText(total.protein, true), data.showKcal && total.kcal !== null ? kcalText(total.kcal) : ''].filter(Boolean).join(' · ')}
              </Text>
            </View>
          ) : null}
          {!picking ? (
            <View style={{ alignItems: 'flex-start' }}>
              <TextButton label={tr.food.addIngredient} bold onPress={() => setPicking(true)} />
            </View>
          ) : null}
        </Card>

        {picking ? (
          <FoodPicker
            data={data}
            onCancel={() => setPicking(false)}
            onPick={(itemName, n, ref, amount) => {
              setItems([...items, { name: itemName, protein: n.protein, kcal: n.kcal, ref, amount }]);
              setPicking(false);
            }}
          />
        ) : null}

        {existing ? (
          <View style={{ alignItems: 'center' }}>
            <TextButton label={tr.food.deleteDish} color={t.danger} onPress={confirmDelete} />
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, paddingTop: 10, paddingBottom: 4 },
  barTitle: { fontSize: 17, fontWeight: '600', flexShrink: 1, textAlign: 'center' },
  content: { padding: 16, gap: 12 },
  card: { padding: 14, gap: 10 },
  cardTitle: { fontSize: 17, fontWeight: '700' },
  label: { fontSize: 13, fontWeight: '600' },
  input: { height: 44, borderRadius: 10, paddingHorizontal: 12, fontSize: 17 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 52, paddingVertical: 4 },
  total: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth },
});
