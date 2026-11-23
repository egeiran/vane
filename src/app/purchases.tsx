import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import Animated from 'react-native-reanimated';

import { HeaderSearch } from '@/components/HeaderSearch';
import { disappear, reflow } from '@/components/motion';
import { ScreenHeader } from '@/components/ScreenHeader';
import { PurchaseRow } from '@/components/PurchaseRow';
import { Card, Chip, SectionLabel } from '@/components/ui';
import { tr } from '@/i18n';
import { relativeDayName, type DateKey } from '@/lib/dates';
import { capitalize, categoryName, findPurchases, monthName, visibleCategories } from '@/lib/money';
import { useMoneyData } from '@/lib/moneyStore';
import type { Purchase } from '@/lib/types';
import { useToday } from '@/lib/useToday';
import { useTheme } from '@/theme';

/** Så mange kjøp vises før «Vis flere». */
const PAGE = 60;


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
      <ScreenHeader title={month ? tr.money.purchasesIn(monthName(month, today)) : tr.purchases.allTitle} large />

      <HeaderSearch value={query} onChange={setQuery} placeholder={tr.purchases.search} />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {params.month ? (
          <Chip role="button" label={capitalize(monthName(params.month, today))} on={onlyMonth} onPress={() => setOnlyMonth(!onlyMonth)} />
        ) : null}
        <Chip role="button" label={tr.purchases.allCategories} on={!categoryId} onPress={() => setCategoryId(undefined)} />
        {chips.map((c) => (
          <Chip role="button" key={c.id} label={categoryName(c)} on={c.id === categoryId} onPress={() => setCategoryId(c.id === categoryId ? undefined : c.id)} />
        ))}
      </ScrollView>

      {days.length === 0 ? (
        <Text style={[styles.empty, { color: t.sub }]}>{query ? tr.purchases.noMatch : tr.purchases.none}</Text>
      ) : null}

      {days.map(({ day, items }) => (
        <View key={day} style={styles.section}>
          <SectionLabel>{relativeDayName(day, today)}</SectionLabel>
          <Card style={styles.list}>
            {items.map((p, i) => (
              <Animated.View key={p.id} exiting={disappear} layout={reflow}>
                <PurchaseRow purchase={p} data={data} today={today} first={i === 0} timeOnly />
              </Animated.View>
            ))}
          </Card>
        </View>
      ))}

      {list.length > shown ? (
        <Pressable onPress={() => setShown(shown + PAGE)} accessibilityRole="button" style={styles.more}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: t.text }}>{tr.purchases.showMore}</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}


const styles = StyleSheet.create({
  content: { paddingBottom: 40 },
  chips: { gap: 8, paddingHorizontal: 16, paddingTop: 12 },
  empty: { fontSize: 15, textAlign: 'center', marginTop: 40 },
  section: { paddingHorizontal: 16, paddingTop: 18, gap: 8 },
  // Radene går helt ut til kanten av kortet (sveip for å slette) og har marg selv.
  list: { paddingVertical: 2, overflow: 'hidden' },
  more: { alignSelf: 'center', minHeight: 44, justifyContent: 'center', paddingHorizontal: 16, marginTop: 12 },
});
