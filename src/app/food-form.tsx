import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Field } from '@/components/Field';
import { Card, TextButton } from '@/components/ui';
import { tr } from '@/i18n';
import { decimalInput, nutrientsFor, parseGrams, parseKcal, parseProtein, PROTEIN_SCALE } from '@/lib/food';
import { MAX_FOOD_NAME } from '@/lib/foodState';
import { foodHome, useFood, useFoodData } from '@/lib/foodStore';
import { tableFood } from '@/lib/matvaretabellen';
import type { Food, Nutrients } from '@/lib/types';
import { useTheme } from '@/theme';

function close() {
  if (router.canGoBack()) router.back();
  else router.replace(foodHome());
}

type Form = {
  name: string;
  label: string;
  grams: string;
  protein: string;
  kcal: string;
  protein100: string;
  kcal100: string;
  mvtId: string | null;
};

const proteinInput = (n: Nutrients | null) => (n ? decimalInput(n.protein / PROTEIN_SCALE) : '');
const kcalInput = (n: Nutrients | null) => (n?.kcal != null ? String(n.kcal) : '');

function initialForm(food: Food | undefined, mvtId: string | undefined): Form {
  if (food) {
    return {
      name: food.name,
      label: food.portion.label,
      grams: food.portion.grams ? String(food.portion.grams) : '',
      protein: proteinInput(food.portion),
      kcal: kcalInput(food.portion),
      protein100: proteinInput(food.per100),
      kcal100: kcalInput(food.per100),
      mvtId: food.mvtId,
    };
  }
  const table = mvtId ? tableFood(mvtId) : undefined;
  if (table) {
    // Første porsjon i tabellen, ellers 100 g uten navn (vises som «1 porsjon»).
    const p = table.portions[0] ?? { label: '', grams: 100 };
    const portion = nutrientsFor({ per100: table.per100, portion: null }, { kind: 'grams', grams: p.grams });
    return {
      name: table.name,
      label: p.label,
      grams: String(p.grams),
      protein: proteinInput(portion),
      kcal: kcalInput(portion),
      protein100: proteinInput(table.per100),
      kcal100: kcalInput(table.per100),
      mvtId: table.id,
    };
  }
  return { name: '', label: '', grams: '', protein: '', kcal: '', protein100: '', kcal100: '', mvtId: null };
}

/** Ny matvare, kopi fra Matvaretabellen (?mvt=…), eller endre en (?id=…). */
export default function FoodFormScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { id, mvt } = useLocalSearchParams<{ id?: string; mvt?: string }>();
  const data = useFoodData();
  const existing = id ? data.foods.find((f) => f.id === id) : undefined;
  const addFood = useFood((s) => s.addFood);
  const updateFood = useFood((s) => s.updateFood);
  const removeFood = useFood((s) => s.removeFood);
  const [f, setF] = useState(() => initialForm(existing, mvt));
  const set = (patch: Partial<Form>) => setF((prev) => ({ ...prev, ...patch }));

  const protein = parseProtein(f.protein);
  const grams = parseGrams(f.grams);
  const protein100 = parseProtein(f.protein100);
  const canSave = !!f.name.trim() && protein !== null && (protein > 0 || f.protein.trim() === '0');

  const save = () => {
    if (!canSave) return;
    const input = {
      name: f.name.trim().slice(0, MAX_FOOD_NAME),
      portion: {
        // Tom porsjon vises som «1 porsjon» på telefonens språk (se `amountText`).
        label: f.label.trim(),
        grams,
        protein: protein!,
        kcal: data.showKcal ? parseKcal(f.kcal) : (existing?.portion.kcal ?? parseKcal(f.kcal)),
      },
      per100: protein100 !== null ? { protein: protein100, kcal: data.showKcal ? parseKcal(f.kcal100) : (existing?.per100?.kcal ?? parseKcal(f.kcal100)) } : null,
      mvtId: f.mvtId,
    };
    if (existing) updateFood(existing.id, input);
    else addFood(input);
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
          removeFood(existing.id);
        },
      },
    ]);

  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1, backgroundColor: t.bg }}>
      <View style={styles.bar}>
        <TextButton label={tr.common.cancel} onPress={close} />
        <Text style={[styles.barTitle, { color: t.text }]} accessibilityRole="header">
          {existing ? tr.food.foodFormEdit : tr.food.foodFormNew}
        </Text>
        <TextButton label={existing ? tr.common.save : tr.common.add} bold onPress={save} disabled={!canSave} />
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
        <Card style={styles.card}>
          <Text style={[styles.label, { color: t.sub }]} nativeID="food-name-label">
            {tr.common.name}
          </Text>
          <TextInput
            value={f.name}
            onChangeText={(name) => set({ name })}
            placeholder={tr.food.foodNamePlaceholder}
            placeholderTextColor={t.faint}
            autoFocus={!existing && !mvt}
            returnKeyType="done"
            maxLength={MAX_FOOD_NAME}
            accessibilityLabelledBy="food-name-label"
            style={[styles.input, { backgroundColor: t.field, color: t.text }]}
          />
        </Card>

        <Card style={styles.card}>
          <Text style={[styles.cardTitle, { color: t.text }]}>{tr.food.perPortion}</Text>
          <Field label={tr.food.portionLabel} value={f.label} onChange={(label) => set({ label })} placeholder={tr.food.portionPlaceholder} maxLength={30} />
          <Field label={tr.food.portionWeight} value={f.grams} onChange={(g) => set({ grams: g })} placeholder={tr.food.optional} keyboardType="number-pad" />
          <Field label={tr.food.proteinField} value={f.protein} onChange={(p) => set({ protein: p })} placeholder="0" keyboardType="decimal-pad" />
          {data.showKcal ? <Field label={tr.food.kcalField} value={f.kcal} onChange={(k) => set({ kcal: k })} placeholder={tr.food.optional} keyboardType="number-pad" /> : null}
        </Card>

        <Card style={styles.card}>
          <Text style={[styles.cardTitle, { color: t.text }]}>{tr.food.per100Section}</Text>
          <Text style={[styles.help, { color: t.sub }]}>{tr.food.per100Help}</Text>
          <Field label={tr.food.proteinField} value={f.protein100} onChange={(p) => set({ protein100: p })} placeholder={tr.food.optional} keyboardType="decimal-pad" />
          {data.showKcal ? <Field label={tr.food.kcalField} value={f.kcal100} onChange={(k) => set({ kcal100: k })} placeholder={tr.food.optional} keyboardType="number-pad" /> : null}
        </Card>

        {f.mvtId ? <Text style={[styles.help, { color: t.sub, paddingHorizontal: 4 }]}>{tr.food.source}</Text> : null}

        {existing ? (
          <View style={{ alignItems: 'center' }}>
            <TextButton label={tr.food.deleteFood} color={t.danger} onPress={confirmDelete} />
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
  help: { fontSize: 13, lineHeight: 18 },
  input: { height: 44, borderRadius: 10, paddingHorizontal: 12, fontSize: 17 },
});
