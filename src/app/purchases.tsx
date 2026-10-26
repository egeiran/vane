import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { PurchaseRow } from '@/components/PurchaseRow';
import { Card, SectionLabel } from '@/components/ui';
import { relativeDayName, type DateKey } from '@/lib/dates';
import { capitalize, findPurchases, monthName, visibleCategories } from '@/lib/money';
import { useMoneyData } from '@/lib/moneyStore';
import type { Purchase } from '@/lib/types';
import { useToday } from '@/lib/useToday';
import { useTheme } from '@/theme';

/** Så mange kjøp vises før «Vis flere». */
const PAGE = 60;

function back() {
  if (router.canGoBack()) router.back();
  else router.replace('/money');
}

/** Alle kjøp, eller én måned (?month=YYYY-MM), med filter på kategori (?category=…) og søk. */
export default function PurchasesScreen() {
  const t = useTheme();
  const today = useToday();
  const data = useMoneyData();
  const params = useLocalSearchParams<{ month?: string; category?: string }>();
  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState<string | undefined>(params.category);
  const [onlyMonth, setOnlyMonth] = useState(!!params.month);
  const [shown, setShown] = useState(PAGE);

  const month = onlyMonth ? params.month : undefined;
  const list = findPurchases(data, { month, categoryId, query });
  const chips = visibleCategories(data);
  if (categoryId && !chips.some((c) => c.id === categoryId)) {
    const hidden = data.categories.find((c) => c.id === categoryId);
    if (hidden) chips.push(hidden);
  }

  const days: { day: DateKey; items: Purchase[] }[] = [];
  for (const p of list.slice(0, shown)) {
    const last = days[days.length - 1];
    if (last?.day === p.day) last.items.push(p);
    else days.push({ day: p.day, items: [p] });
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: t.bg }}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.content}>
      <View style={styles.bar}>
        <Pressable onPress={back} accessibilityRole="button" accessibilityLabel="Tilbake" style={styles.backButton}>
          <Icon name="chevron.left" size={20} color={t.text} />
          <Text style={{ fontSize: 17, color: t.text, fontWeight: '500' }}>Tilbake</Text>
        </Pressable>
      </View>
      <Text style={[styles.title, { color: t.text }]} accessibilityRole="header">
        {month ? `Kjøp i ${monthName(month, today)}` : 'Alle kjøp'}
      </Text>

      <View style={styles.searchWrap}>
        <View style={[styles.search, { backgroundColor: t.card }]}>
          <Icon name="magnifyingglass" size={16} color={t.sub} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Søk på sted eller notat"
            placeholderTextColor={t.faint}
            returnKeyType="search"
            clearButtonMode="while-editing"
            accessibilityLabel="Søk på sted eller notat"
            style={{ flex: 1, fontSize: 16, color: t.text, height: 44 }}
          />
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {params.month ? (
          <Chip label={capitalize(monthName(params.month, today))} on={onlyMonth} onPress={() => setOnlyMonth(!onlyMonth)} />
        ) : null}
        <Chip label="Alle kategorier" on={!categoryId} onPress={() => setCategoryId(undefined)} />
        {chips.map((c) => (
          <Chip key={c.id} label={c.name} on={c.id === categoryId} onPress={() => setCategoryId(c.id === categoryId ? undefined : c.id)} />
        ))}
      </ScrollView>

      {days.length === 0 ? (
        <Text style={[styles.empty, { color: t.sub }]}>{query ? 'Ingen kjøp passer søket.' : 'Ingen kjøp her ennå.'}</Text>
      ) : null}

      {days.map(({ day, items }) => (
        <View key={day} style={styles.section}>
          <SectionLabel>{relativeDayName(day, today)}</SectionLabel>
          <Card style={styles.list}>
            {items.map((p, i) => (
              <PurchaseRow key={p.id} purchase={p} data={data} today={today} first={i === 0} timeOnly />
            ))}
          </Card>
        </View>
      ))}

      {list.length > shown ? (
        <Pressable onPress={() => setShown(shown + PAGE)} accessibilityRole="button" style={styles.more}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: t.text }}>Vis flere</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      style={[styles.chip, { backgroundColor: on ? t.inverse : t.card }]}>
      <Text style={{ fontSize: 14, fontWeight: '600', color: on ? t.onInverse : t.text }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 40 },
  bar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingTop: 4 },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: 44, paddingHorizontal: 4 },
  title: { fontSize: 32, lineHeight: 38, fontWeight: '700', letterSpacing: -0.5, paddingHorizontal: 20, paddingTop: 6 },
  searchWrap: { paddingHorizontal: 16, paddingTop: 12 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, paddingHorizontal: 12 },
  chips: { gap: 8, paddingHorizontal: 16, paddingTop: 12 },
  chip: { height: 36, borderRadius: 18, paddingHorizontal: 14, justifyContent: 'center' },
  empty: { fontSize: 15, textAlign: 'center', marginTop: 40 },
  section: { paddingHorizontal: 16, paddingTop: 18, gap: 8 },
  list: { paddingHorizontal: 14, paddingVertical: 2 },
  more: { alignSelf: 'center', minHeight: 44, justifyContent: 'center', paddingHorizontal: 16, marginTop: 12 },
});
