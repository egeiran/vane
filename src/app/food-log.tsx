import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AmountPicker } from '@/components/AmountPicker';
import { Field } from '@/components/Field';
import { Icon } from '@/components/Icon';
import { ProteinBar } from '@/components/ProteinBar';
import { Card, IconButton, PrimaryButton, SectionLabel, TextButton, tick } from '@/components/ui';
import { tr } from '@/i18n';
import { dayWhen, relativeWeekday, type DateKey } from '@/lib/dates';
import {
  amountText,
  canEditFood,
  decimalInput,
  entriesOn,
  entryTime,
  goalOn,
  mealById,
  mealName,
  parseKcal,
  parseProtein,
  previousMeal,
  PROTEIN_SCALE,
  proteinText,
  suggestions,
  suggestMeal,
  sumEntries,
  visibleMeals,
  type Suggestion,
} from '@/lib/food';
import { dishItem, foodItem, itemForRef, itemNutrients, tableItem, type LogItem } from '@/lib/foodItems';
import { foodHome, useFood, useFoodData } from '@/lib/foodStore';
import { search, tableFoods } from '@/lib/matvaretabellen';
import type { Amount, FoodRef, Nutrients } from '@/lib/types';
import { useToday } from '@/lib/useToday';
import { useTheme } from '@/theme';

function close() {
  if (router.canGoBack()) router.back();
  else router.replace(foodHome());
}

type Mode = { kind: 'list' } | { kind: 'amount'; item: LogItem; amount: Amount } | { kind: 'quick'; name: string; protein: string; kcal: string };

/**
 * Loggearket: velg måltid, og legg til fra forslagene, «Som i går», et raskt tall eller søket. Arket
 * blir åpent etter hvert tillegg, med «Angre», så man kan legge til flere ting i samme måltid.
 */
export default function FoodLogScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const today = useToday();
  const params = useLocalSearchParams<{ day?: string; meal?: string }>();
  // Dagen ligger fast mens arket er åpent, også over midnatt, så «Angre» alltid treffer riktig dag.
  const [day] = useState<DateKey>(() => (params.day && canEditFood(params.day, today) ? params.day : today));
  const data = useFoodData();
  const addEntry = useFood((s) => s.addEntry);
  const removeEntry = useFood((s) => s.removeEntry);
  const copyMeal = useFood((s) => s.copyMeal);

  const [mealId, setMealId] = useState(() => {
    const fromParam = params.meal ? mealById(data, params.meal) : undefined;
    return (fromParam ?? suggestMeal(data.meals, entryTime(today, undefined)) ?? data.meals[0]).id;
  });
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<Mode>({ kind: 'list' });
  const [added, setAdded] = useState<{ ids: string[]; text: string } | null>(null);

  const meal = mealById(data, mealId);
  const meals = visibleMeals(data).some((m) => m.id === mealId) ? visibleMeals(data) : [...visibleMeals(data), ...(meal ? [meal] : [])];
  const totals = sumEntries(entriesOn(data, day));
  const when = dayWhen(day, today);

  const log = (name: string, n: Nutrients, ref: FoodRef | null, amount: Amount | null) => {
    tick();
    // Klokka når man trykker, ikke da arket ble åpnet: arket kan ligge åpent lenge.
    const id = addEntry(day, { time: entryTime(day, meal), mealId, name, protein: n.protein, kcal: n.kcal, ref, amount });
    setAdded({ ids: [id], text: tr.food.added(name || tr.food.quickName, proteinText(n.protein, true)) });
    setMode({ kind: 'list' });
    setQuery('');
  };

  const logItem = (item: LogItem, amount: Amount) => {
    const n = itemNutrients(item, amount);
    if (n) log(item.name, n, item.ref, amount);
  };

  const logSuggestion = (s: Suggestion) => {
    if (!s.ref) return log(s.name, s.nutrients, null, null);
    const item = itemForRef(data, s.ref);
    if (item) logItem(item, s.amount ?? item.amount);
  };

  const openSuggestion = (s: Suggestion) => {
    if (!s.ref) return setMode({ kind: 'quick', name: s.name, protein: decimalInput(s.nutrients.protein / PROTEIN_SCALE), kcal: s.nutrients.kcal === null ? '' : String(s.nutrients.kcal) });
    const item = itemForRef(data, s.ref);
    if (item) setMode({ kind: 'amount', item, amount: s.amount ?? item.amount });
  };

  const sameAsBefore = previousMeal(data, day, mealId);
  const copyPrevious = () => {
    tick();
    const ids = copyMeal(day, mealId, entryTime(day, meal));
    const protein = sumEntries(sameAsBefore).protein;
    setAdded({ ids, text: sameAsBefore.length === 1 ? tr.food.added(sameAsBefore[0].name || tr.food.quickName, proteinText(protein, true)) : tr.food.addedMany(ids.length, proteinText(protein, true)) });
  };

  const undo = () => {
    if (!added) return;
    for (const id of added.ids) removeEntry(day, id);
    setAdded(null);
  };

  const q = query.trim();
  const mine: LogItem[] = q
    ? search([...data.foods.map((f) => foodItem(data, f)), ...data.dishes.map((d) => dishItem(data, d))], q, 20)
    : [...data.dishes.map((d) => dishItem(data, d)), ...data.foods.map((f) => foodItem(data, f))].sort((a, b) => a.name.localeCompare(b.name));
  const table = q ? search(tableFoods(), q, 40).map((f) => tableItem(data, f)) : [];
  const often = q ? [] : suggestions(data, mealId, today);

  const title = when === 'today' ? tr.food.logTitle : `${tr.food.logTitle} · ${relativeWeekday(day, today)}`;

  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1, backgroundColor: t.bg }}>
      <View style={styles.bar}>
        {mode.kind === 'list' ? <View style={{ width: 70 }} /> : <TextButton label={tr.common.back} onPress={() => setMode({ kind: 'list' })} />}
        <Text style={[styles.barTitle, { color: t.text }]} accessibilityRole="header" numberOfLines={1}>
          {title}
        </Text>
        <TextButton label={tr.common.done} bold onPress={close} />
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
        <Card style={styles.progress}>
          <ProteinBar protein={totals.protein} goal={goalOn(data, day)} kcal={data.showKcal ? totals.kcal : null} compact />
        </Card>

        {added ? (
          <View style={[styles.added, { backgroundColor: t.colors.fersken.soft }]} accessibilityLiveRegion="polite">
            <Icon name="checkmark" size={14} color={t.colors.fersken.ink} />
            <Text style={[styles.addedText, { color: t.colors.fersken.ink }]} numberOfLines={2}>
              {added.text}
            </Text>
            <TextButton label={tr.food.undo} bold color={t.colors.fersken.ink} onPress={undo} />
          </View>
        ) : null}

        <View>
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
        </View>

        {mode.kind === 'amount' ? (
          <Card style={styles.panel}>
            <Text style={[styles.panelTitle, { color: t.text }]}>{mode.item.name}</Text>
            {mode.item.source.per100 ? <Text style={{ fontSize: 14, color: t.sub }}>{tr.food.per100(proteinText(mode.item.source.per100.protein, true))}</Text> : null}
            <AmountPicker source={mode.item.source} options={mode.item.options} value={mode.amount} onChange={(amount) => setMode({ ...mode, amount })} showKcal={data.showKcal} />
            <PrimaryButton label={tr.common.add} disabled={!itemNutrients(mode.item, mode.amount)} onPress={() => logItem(mode.item, mode.amount)} />
            {mode.item.ref.kind === 'mvt' ? (
              <View style={{ alignItems: 'center' }}>
                <TextButton label={tr.food.saveAsOwn} color={t.sub} onPress={() => router.push({ pathname: '/food-form', params: { mvt: mode.item.ref.id } })} />
              </View>
            ) : null}
          </Card>
        ) : mode.kind === 'quick' ? (
          <QuickForm initial={mode} showKcal={data.showKcal} onAdd={(name, n) => log(name, n, null, null)} />
        ) : (
          <>
            <View style={[styles.searchBox, { backgroundColor: t.field }]}>
              <Icon name="magnifyingglass" size={16} color={t.sub} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder={tr.food.search}
                placeholderTextColor={t.faint}
                returnKeyType="search"
                autoCorrect={false}
                accessibilityLabel={tr.food.search}
                style={[styles.searchInput, { color: t.text }]}
              />
              {query ? <IconButton icon="xmark.circle.fill" label={tr.common.close} size={30} background="transparent" color={t.faint} onPress={() => setQuery('')} /> : null}
            </View>

            {!q ? (
              <Card style={styles.list}>
                {sameAsBefore.length ? (
                  <ActionRow
                    first
                    icon="arrow.uturn.backward"
                    title={when === 'today' ? tr.food.sameAsYesterday : tr.food.sameAsDayBefore}
                    sub={`${sameAsBefore.map((e) => e.name || tr.food.quickName).join(', ')} · ${proteinText(sumEntries(sameAsBefore).protein)}`}
                    onPress={copyPrevious}
                  />
                ) : null}
                <ActionRow first={!sameAsBefore.length} icon="number" title={tr.food.quick} sub={tr.food.quickSub} onPress={() => setMode({ kind: 'quick', name: '', protein: '', kcal: '' })} />
              </Card>
            ) : null}

            {often.length ? (
              <View style={styles.group}>
                <SectionLabel>{tr.food.often}</SectionLabel>
                <Card style={styles.list}>
                  {often.map((s, i) => (
                    <ItemRow
                      key={s.key}
                      first={i === 0}
                      name={s.name || tr.food.quickName}
                      sub={s.amount ? `${amountText(s.amount)} · ${proteinText(s.nutrients.protein, true)}` : proteinText(s.nutrients.protein, true)}
                      onOpen={() => openSuggestion(s)}
                      onAdd={() => logSuggestion(s)}
                    />
                  ))}
                </Card>
              </View>
            ) : null}

            {mine.length ? (
              <View style={styles.group}>
                <SectionLabel>{tr.food.mine}</SectionLabel>
                <Card style={styles.list}>
                  {mine.map((item, i) => (
                    <ItemRow
                      key={item.key}
                      first={i === 0}
                      name={item.name}
                      sub={item.sub}
                      onOpen={() => setMode({ kind: 'amount', item, amount: item.amount })}
                      onAdd={() => logItem(item, item.amount)}
                    />
                  ))}
                </Card>
              </View>
            ) : null}

            {table.length ? (
              <View style={styles.group}>
                <SectionLabel>{tr.food.table}</SectionLabel>
                <Card style={styles.list}>
                  {table.map((item, i) => (
                    <ItemRow key={item.key} first={i === 0} name={item.name} sub={item.sub} onOpen={() => setMode({ kind: 'amount', item, amount: item.amount })} />
                  ))}
                </Card>
                <Text style={[styles.source, { color: t.sub }]}>{tr.food.source}</Text>
              </View>
            ) : null}

            {q && !mine.length && !table.length ? <Text style={[styles.none, { color: t.sub }]}>{tr.food.noResults}</Text> : null}
            {q ? (
              <Card style={styles.list}>
                <ActionRow first icon="number" title={tr.food.quick} sub={tr.food.quickSub} onPress={() => setMode({ kind: 'quick', name: q, protein: '', kcal: '' })} />
              </Card>
            ) : null}

            <View style={styles.newRow}>
              <TextButton label={tr.food.newFood} color={t.sub} onPress={() => router.push('/food-form')} />
              <TextButton label={tr.food.newDish} color={t.sub} onPress={() => router.push('/dish-form')} />
            </View>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function ActionRow({ icon, title, sub, onPress, first }: { icon: 'number' | 'arrow.uturn.backward'; title: string; sub: string; onPress: () => void; first?: boolean }) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${sub}`}
      style={({ pressed }) => [styles.row, !first && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.hair }, { opacity: pressed ? 0.6 : 1 }]}>
      <View style={[styles.rowIcon, { backgroundColor: t.colors.fersken.soft }]}>
        <Icon name={icon} size={15} color={t.colors.fersken.ink} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[styles.rowName, { color: t.text }]}>{title}</Text>
        <Text style={[styles.rowSub, { color: t.sub }]} numberOfLines={1}>
          {sub}
        </Text>
      </View>
    </Pressable>
  );
}

/** En rad i en liste: trykk for å velge mengde, + for å legge til med mengden fra sist. */
function ItemRow({ name, sub, onOpen, onAdd, first }: { name: string; sub: string; onOpen: () => void; onAdd?: () => void; first?: boolean }) {
  const t = useTheme();
  return (
    <View style={[styles.row, !first && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.hair }]}>
      <Pressable onPress={onOpen} accessibilityRole="button" accessibilityLabel={`${name}. ${sub}`} style={({ pressed }) => [{ flex: 1, gap: 2, opacity: pressed ? 0.6 : 1 }]}>
        <Text style={[styles.rowName, { color: t.text }]} numberOfLines={2}>
          {name}
        </Text>
        <Text style={[styles.rowSub, { color: t.sub }]} numberOfLines={1}>
          {sub}
        </Text>
      </Pressable>
      {onAdd ? (
        <IconButton
          icon="plus"
          label={`${tr.common.add}: ${name}`}
          size={36}
          background={t.colors.fersken.soft}
          color={t.colors.fersken.ink}
          onPress={onAdd}
        />
      ) : (
        <Icon name="chevron.right" size={14} color={t.faint} />
      )}
    </View>
  );
}

function QuickForm({
  initial,
  showKcal,
  onAdd,
}: {
  initial: { name: string; protein: string; kcal: string };
  showKcal: boolean;
  onAdd: (name: string, n: Nutrients) => void;
}) {
  const t = useTheme();
  const [protein, setProtein] = useState(initial.protein);
  const [kcal, setKcal] = useState(initial.kcal);
  const [name, setName] = useState(initial.name);
  const p = parseProtein(protein);
  const k = showKcal ? parseKcal(kcal) : null;
  const ok = p !== null && p > 0;

  return (
    <Card style={styles.panel}>
      <Text style={[styles.panelTitle, { color: t.text }]}>{tr.food.quick}</Text>
      <Field label={tr.food.proteinField} value={protein} onChange={setProtein} placeholder="25" autoFocus keyboardType="decimal-pad" />
      {showKcal ? <Field label={tr.food.kcalField} value={kcal} onChange={setKcal} placeholder={tr.food.optional} keyboardType="number-pad" /> : null}
      <Field label={tr.food.nameOptional} value={name} onChange={setName} placeholder={tr.food.quickNamePlaceholder} />
      <PrimaryButton label={tr.common.add} disabled={!ok} onPress={() => ok && onAdd(name.trim(), { protein: p, kcal: k })} />
    </Card>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, paddingTop: 10, paddingBottom: 4 },
  barTitle: { fontSize: 17, fontWeight: '600', flexShrink: 1, textAlign: 'center' },
  content: { padding: 16, gap: 14 },
  progress: { padding: 14 },
  added: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 14, paddingLeft: 14, paddingRight: 4, minHeight: 48 },
  addedText: { flex: 1, fontSize: 15, fontWeight: '600' },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 8, paddingHorizontal: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: 40, borderRadius: 20, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, paddingLeft: 12, paddingRight: 4, minHeight: 46 },
  searchInput: { flex: 1, fontSize: 17, paddingVertical: 10 },
  group: { gap: 8 },
  list: { paddingHorizontal: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingVertical: 8 },
  rowIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  rowName: { fontSize: 16, fontWeight: '600' },
  rowSub: { fontSize: 13 },
  source: { fontSize: 12, lineHeight: 16, paddingHorizontal: 4 },
  none: { fontSize: 15, paddingHorizontal: 4 },
  newRow: { flexDirection: 'row', justifyContent: 'center', gap: 16 },
  panel: { padding: 16, gap: 14 },
  panelTitle: { fontSize: 19, fontWeight: '700' },
});
