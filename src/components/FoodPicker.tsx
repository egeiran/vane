import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { tr } from '@/i18n';
import { parseKcal, parseProtein } from '@/lib/food';
import { foodItem, itemNutrients, tableItem, type LogItem } from '@/lib/foodItems';
import { search, tableFoods } from '@/lib/matvaretabellen';
import type { Amount, FoodData, FoodRef, Nutrients } from '@/lib/types';
import { useTheme } from '@/theme';

import { AmountPicker } from './AmountPicker';
import { Field } from './Field';
import { Icon } from './Icon';
import { Card, IconButton, PrimaryButton, TextButton } from './ui';

type Props = {
  data: FoodData;
  onPick: (name: string, n: Nutrients, ref: FoodRef | null, amount: Amount | null) => void;
  onCancel: () => void;
};

/**
 * Velg noe til en rett: søk i egne matvarer og Matvaretabellen, velg mengde, eller skriv et raskt tall.
 */
export function FoodPicker({ data, onPick, onCancel }: Props) {
  const t = useTheme();
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<{ item: LogItem; amount: Amount } | null>(null);
  const [quick, setQuick] = useState<{ name: string; protein: string; kcal: string } | null>(null);

  if (picked) {
    const n = itemNutrients(picked.item, picked.amount);
    return (
      <Card style={styles.card}>
        <Text style={[styles.title, { color: t.text }]}>{picked.item.name}</Text>
        <AmountPicker source={picked.item.source} options={picked.item.options} value={picked.amount} onChange={(amount) => setPicked({ ...picked, amount })} showKcal={data.showKcal} />
        <PrimaryButton label={tr.common.add} disabled={!n} onPress={() => n && onPick(picked.item.name, n, picked.item.ref, picked.amount)} />
        <View style={{ alignItems: 'center' }}>
          <TextButton label={tr.common.back} color={t.sub} onPress={() => setPicked(null)} />
        </View>
      </Card>
    );
  }

  if (quick) {
    const p = parseProtein(quick.protein);
    const ok = !!quick.name.trim() && p !== null && p > 0;
    return (
      <Card style={styles.card}>
        <Text style={[styles.title, { color: t.text }]}>{tr.food.quick}</Text>
        <Field label={tr.common.name} value={quick.name} onChange={(name) => setQuick({ ...quick, name })} placeholder={tr.food.foodNamePlaceholder} />
        <Field label={tr.food.proteinField} value={quick.protein} onChange={(protein) => setQuick({ ...quick, protein })} placeholder="0" keyboardType="decimal-pad" autoFocus />
        {data.showKcal ? <Field label={tr.food.kcalField} value={quick.kcal} onChange={(kcal) => setQuick({ ...quick, kcal })} placeholder={tr.food.optional} keyboardType="number-pad" /> : null}
        <PrimaryButton label={tr.common.add} disabled={!ok} onPress={() => ok && onPick(quick.name.trim(), { protein: p, kcal: data.showKcal ? parseKcal(quick.kcal) : null }, null, null)} />
        <View style={{ alignItems: 'center' }}>
          <TextButton label={tr.common.back} color={t.sub} onPress={() => setQuick(null)} />
        </View>
      </Card>
    );
  }

  const q = query.trim();
  const results: LogItem[] = q
    ? [...search(data.foods, q, 10).map((f) => foodItem(data, f)), ...search(tableFoods(), q, 30).map((f) => tableItem(data, f))]
    : [...data.foods].sort((a, b) => a.name.localeCompare(b.name)).map((f) => foodItem(data, f));

  return (
    <Card style={styles.card}>
      <View style={[styles.searchBox, { backgroundColor: t.field }]}>
        <Icon name="magnifyingglass" size={16} color={t.sub} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={tr.food.search}
          placeholderTextColor={t.faint}
          autoFocus
          autoCorrect={false}
          returnKeyType="search"
          accessibilityLabel={tr.food.search}
          style={[styles.searchInput, { color: t.text }]}
        />
        {query ? <IconButton icon="xmark.circle.fill" label={tr.common.close} size={30} background="transparent" color={t.faint} onPress={() => setQuery('')} /> : null}
      </View>
      <View>
        <Row first name={tr.food.quick} sub={tr.food.quickSub} onPress={() => setQuick({ name: q, protein: '', kcal: '' })} />
        {results.map((item) => (
          <Row key={item.key} name={item.name} sub={item.sub} onPress={() => setPicked({ item, amount: item.amount })} />
        ))}
      </View>
      {q && results.some((r) => r.ref.kind === 'mvt') ? <Text style={[styles.source, { color: t.sub }]}>{tr.food.source}</Text> : null}
      <View style={{ alignItems: 'center' }}>
        <TextButton label={tr.common.cancel} color={t.sub} onPress={onCancel} />
      </View>
    </Card>
  );
}

function Row({ name, sub, onPress, first }: { name: string; sub: string; onPress: () => void; first?: boolean }) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${name}. ${sub}`}
      style={({ pressed }) => [styles.row, !first && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.hair }, { opacity: pressed ? 0.6 : 1 }]}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontSize: 16, fontWeight: '600', color: t.text }} numberOfLines={2}>
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
  card: { padding: 14, gap: 12 },
  title: { fontSize: 17, fontWeight: '700' },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, paddingLeft: 12, paddingRight: 4, minHeight: 46 },
  searchInput: { flex: 1, fontSize: 17, paddingVertical: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, paddingVertical: 6 },
  source: { fontSize: 12, lineHeight: 16 },
});
