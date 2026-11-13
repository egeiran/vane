import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AmountPicker } from '@/components/AmountPicker';
import { Field } from '@/components/Field';
import { Card, Row, Stepper, TextButton } from '@/components/ui';
import { tr } from '@/i18n';
import { shiftTime } from '@/lib/dates';
import { canEditFood, decimalInput, entriesOn, mealById, mealName, parseKcal, parseProtein, PROTEIN_SCALE, visibleMeals } from '@/lib/food';
import { itemForRef, itemNutrients } from '@/lib/foodItems';
import { foodHome, useFood, useFoodData } from '@/lib/foodStore';
import { showTime } from '@/lib/region';
import type { Amount } from '@/lib/types';
import { useToday } from '@/lib/useToday';
import { useTheme } from '@/theme';

function close() {
  if (router.canGoBack()) router.back();
  else router.replace(foodHome());
}

/** Endre en føring: mengde (eller tallene for et raskt tall), måltid og klokkeslett, eller slette den. */
export default function FoodEntryScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const today = useToday();
  const { day = today, id } = useLocalSearchParams<{ day?: string; id?: string }>();
  const data = useFoodData();
  const updateEntry = useFood((s) => s.updateEntry);
  const removeEntry = useFood((s) => s.removeEntry);
  const entry = entriesOn(data, day).find((e) => e.id === id);
  const item = entry?.ref && entry.amount ? itemForRef(data, entry.ref) : null;

  const [amount, setAmount] = useState<Amount | null>(entry?.amount ?? null);
  const [protein, setProtein] = useState(entry ? decimalInput(entry.protein / PROTEIN_SCALE) : '');
  const [kcal, setKcal] = useState(entry?.kcal != null ? String(entry.kcal) : '');
  const [name, setName] = useState(entry?.name ?? '');
  const [mealId, setMealId] = useState(entry?.mealId ?? '');
  const [time, setTime] = useState(entry?.time ?? '12:00');

  if (!entry || !canEditFood(day, today)) {
    return (
      <View style={[styles.missing, { backgroundColor: t.bg }]}>
        <TextButton label={tr.common.close} bold onPress={close} />
      </View>
    );
  }

  const amountChanged = !!item && !!amount && JSON.stringify(amount) !== JSON.stringify(entry.amount);
  const fromItem = item && amount ? itemNutrients(item, amount) : null;
  const p = parseProtein(protein);
  // Bare en ny mengde må kunne regnes ut. Måltid og klokkeslett kan alltid endres.
  const canSave = item ? !amountChanged || !!fromItem : p !== null && p > 0;
  const meal = mealById(data, mealId);
  const meals = visibleMeals(data).some((m) => m.id === mealId) || !meal ? visibleMeals(data) : [...visibleMeals(data), meal];

  const save = () => {
    if (!canSave) return;
    const nutrients = item
      ? amountChanged && fromItem
        ? { protein: fromItem.protein, kcal: fromItem.kcal }
        : {}
      : { protein: p!, kcal: data.showKcal ? parseKcal(kcal) : entry.kcal };
    // Mengden sendes bare med når den er endret, så mengden Vane husker for matvaren, ikke byttes ut.
    updateEntry(day, entry.id, { ...nutrients, ...(item ? (amountChanged ? { amount: amount! } : {}) : { name: name.trim() }), mealId, time });
    close();
  };

  const confirmDelete = () =>
    Alert.alert(tr.food.deleteConfirm(entry.name || tr.food.quickName), undefined, [
      { text: tr.common.cancel, style: 'cancel' },
      {
        text: tr.common.delete,
        style: 'destructive',
        onPress: () => {
          close();
          removeEntry(day, entry.id);
        },
      },
    ]);

  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1, backgroundColor: t.bg }}>
      <View style={styles.bar}>
        <TextButton label={tr.common.cancel} onPress={close} />
        <Text style={[styles.barTitle, { color: t.text }]} accessibilityRole="header" numberOfLines={1}>
          {entry.name || tr.food.quickName}
        </Text>
        <TextButton label={tr.common.save} bold onPress={save} disabled={!canSave} />
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
        <Card style={styles.card}>
          {item && amount ? (
            <AmountPicker source={item.source} options={item.options} value={amount} onChange={setAmount} showKcal={data.showKcal} />
          ) : (
            <>
              <Field label={tr.food.proteinField} value={protein} onChange={setProtein} keyboardType="decimal-pad" />
              {data.showKcal ? <Field label={tr.food.kcalField} value={kcal} onChange={setKcal} placeholder={tr.food.optional} keyboardType="number-pad" /> : null}
              <Field label={tr.food.nameOptional} value={name} onChange={setName} placeholder={tr.food.quickNamePlaceholder} />
            </>
          )}
        </Card>

        <Card style={styles.card}>
          <Text style={[styles.label, { color: t.sub }]}>{tr.food.meal}</Text>
          <View style={styles.chips} accessibilityRole="radiogroup">
            {meals.map((m) => {
              const on = m.id === mealId;
              return (
                <Pressable
                  key={m.id}
                  onPress={() => setMealId(m.id)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                  style={({ pressed }) => [styles.chip, { backgroundColor: on ? t.inverse : t.button, opacity: pressed ? 0.7 : 1 }]}>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: on ? t.onInverse : t.text }}>{mealName(m)}</Text>
                </Pressable>
              );
            })}
          </View>
        </Card>

        <Card style={{ overflow: 'hidden' }}>
          <Row first>
            <Text style={{ flex: 1, fontSize: 16, color: t.text }}>{tr.food.time}</Text>
            <Stepper
              value={showTime(time)}
              minWidth={60}
              onDecrease={() => setTime(shiftTime(time, -15, 0, 23 * 60 + 59))}
              onIncrease={() => setTime(shiftTime(time, 15, 0, 23 * 60 + 59))}
              decreaseLabel={tr.common.earlier15}
              increaseLabel={tr.common.later15}
            />
          </Row>
        </Card>

        <View style={{ alignItems: 'center' }}>
          <TextButton label={tr.food.deleteEntry} color={t.danger} onPress={confirmDelete} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, paddingTop: 10, paddingBottom: 4 },
  barTitle: { fontSize: 17, fontWeight: '600', flexShrink: 1, textAlign: 'center' },
  content: { padding: 16, gap: 12 },
  card: { padding: 14, gap: 12 },
  label: { fontSize: 13, fontWeight: '600' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: 40, borderRadius: 20, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
});
