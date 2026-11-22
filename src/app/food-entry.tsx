import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/ScreenHeader';
import { useDiscardGuard } from '@/components/useDiscardGuard';
import { AmountPicker } from '@/components/AmountPicker';
import { Field } from '@/components/Field';
import { TimeField } from '@/components/TimeField';
import { Card, Chip, Row, TextButton } from '@/components/ui';
import { tr } from '@/i18n';
import { canEditFood, decimalInput, entriesOn, mealById, mealName, parseKcal, parseProtein, PROTEIN_SCALE, visibleMeals } from '@/lib/food';
import { itemForRef, itemNutrients } from '@/lib/foodItems';
import { foodHome, useFood, useFoodData } from '@/lib/foodStore';
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
  // Endringer som ikke er lagret: spør før arket lukkes (Avbryt, sveip ned eller tilbake).
  const [initial] = useState(() => JSON.stringify({ amount, protein, kcal, name, mealId, time }));
  const allowClose = useDiscardGuard(JSON.stringify({ amount, protein, kcal, name, mealId, time }) !== initial);
  const done = () => {
    allowClose();
    close();
  };

  // Slettet, eller en dag som ikke kan endres lenger (for eksempel åpnet fra et gammelt varsel).
  if (!entry || !canEditFood(day, today)) {
    return (
      <View style={[styles.missing, { backgroundColor: t.bg }]}>
        <Text style={[styles.missingTitle, { color: t.text }]}>{entry ? tr.food.entryLocked : tr.food.entryMissing}</Text>
        <Text style={[styles.missingText, { color: t.sub }]}>{entry ? tr.food.entryLockedText : tr.food.entryMissingText}</Text>
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
    done();
  };

  const confirmDelete = () =>
    Alert.alert(tr.food.deleteConfirm(entry.name || tr.food.quickName), undefined, [
      { text: tr.common.cancel, style: 'cancel' },
      {
        text: tr.common.delete,
        style: 'destructive',
        onPress: () => {
          done();
          removeEntry(day, entry.id);
        },
      },
    ]);

  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1, backgroundColor: t.bg }}>
      <ScreenHeader
        title={entry.name || tr.food.quickName}
        left={[{ label: tr.common.cancel, onPress: close }]}
        right={[{ label: tr.common.save, variant: 'done', onPress: save, disabled: !canSave }]}
      />

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
                <Chip key={m.id} label={mealName(m)} on={on} onPress={() => setMealId(m.id)} />
              );
            })}
          </View>
        </Card>

        <Card style={{ overflow: 'hidden' }}>
          <Row first>
            <Text style={{ flex: 1, fontSize: 16, color: t.text }}>{tr.food.time}</Text>
            <TimeField value={time} label={tr.food.time} onChange={setTime} />
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
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 32 },
  missingTitle: { fontSize: 19, fontWeight: '700', textAlign: 'center' },
  missingText: { fontSize: 15, lineHeight: 21, textAlign: 'center' },
  content: { padding: 16, gap: 12 },
  card: { padding: 14, gap: 12 },
  label: { fontSize: 13, fontWeight: '600' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
