import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ScreenHeader } from '@/components/ScreenHeader';
import { CategoryIcon } from '@/components/CategoryIcon';
import { Card, Chip, SectionLabel, SwitchRow, tick } from '@/components/ui';
import { tr } from '@/i18n';
import { categoryById, formatAmount } from '@/lib/money';
import { useMoney, useMoneyData } from '@/lib/moneyStore';
import { chargeDay, recurringSummary, suggestRecurring, upcomingRecurring } from '@/lib/recurring';
import { useToday } from '@/lib/useToday';
import { useTheme } from '@/theme';


/** Faste utgifter: hva som går ut i måneden, alle sammen med neste trekk, og forslag fra kjøpene. */
export default function RecurringScreen() {
  const t = useTheme();
  const today = useToday();
  const data = useMoneyData();
  const dismiss = useMoney((s) => s.dismissRecurringSuggestion);
  const setInTotal = useMoney((s) => s.setRecurringInTotal);
  const summary = recurringSummary(data);
  const upcoming = upcomingRecurring(data, today);
  const suggestions = suggestRecurring(data, today);
  const perMonth = summary.totals.map((x) => formatAmount(x.amount, x.currency)).join(' + ');

  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.bg }} contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
      <ScreenHeader title={tr.recurring.title} large right={[{ label: tr.recurring.new, icon: 'plus', onPress: () => router.push('/recurring-form') }]} />

      {summary.count ? (
        <Text style={[styles.total, { color: t.text }]} accessibilityLabel={tr.recurring.cardLabel(perMonth)}>
          {tr.recurring.perMonth(perMonth)}
        </Text>
      ) : (
        <Text style={[styles.lead, { color: t.sub }]}>{tr.recurring.empty}</Text>
      )}

      {upcoming.length ? (
        <Card style={styles.list}>
          {upcoming.map(({ expense: e, next }, i) => {
            const category = e.categoryId ? categoryById(data, e.categoryId) : null;
            const amount = formatAmount(e.amount, e.currency);
            const meta = [tr.recurring.rowMeta(tr.recurring.frequency[e.frequency], chargeDay(next, today)), e.note].filter(Boolean).join(' · ');
            return (
              <Pressable
                key={e.id}
                onPress={() => router.push({ pathname: '/recurring-form', params: { id: e.id } })}
                accessibilityRole="button"
                accessibilityLabel={tr.recurring.rowLabel(e.name, amount, meta)}
                style={({ pressed }) => [styles.row, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.separator }, { opacity: pressed ? 0.6 : 1 }]}>
                <CategoryIcon category={category} size={36} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[styles.name, { color: t.text }]} numberOfLines={1}>
                    {e.name}
                  </Text>
                  <Text style={[styles.meta, { color: t.sub }]} numberOfLines={1}>
                    {meta}
                  </Text>
                </View>
                <Text style={[styles.amount, { color: t.text }]}>{amount}</Text>
              </Pressable>
            );
          })}
        </Card>
      ) : null}

      {/* Med i månedens sum i Penger, eller en egen linje (standard). */}
      <View style={styles.section}>
        <Card style={{ overflow: 'hidden' }}>
          <SwitchRow first label={tr.recurring.inTotal} value={data.recurringInTotal} onChange={setInTotal} />
        </Card>
        <Text style={[styles.footnote, { color: t.sub, paddingHorizontal: 4, paddingTop: 0 }]}>{data.recurringInTotal ? tr.recurring.inTotalOn : tr.recurring.inTotalOff}</Text>
      </View>

      {suggestions.length ? (
        <View style={styles.section}>
          <SectionLabel>{tr.recurring.suggestions}</SectionLabel>
          <Card style={[styles.list, { marginHorizontal: 0 }]}>
            {suggestions.map((s, i) => (
              <View key={s.merchantKey} style={[styles.suggestion, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.separator }]}>
                <View style={styles.suggestionTop}>
                  <CategoryIcon category={s.categoryId ? categoryById(data, s.categoryId) : null} size={36} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={[styles.name, { color: t.text }]} numberOfLines={1}>
                      {s.name}
                    </Text>
                    <Text style={[styles.meta, { color: t.sub }]} numberOfLines={1}>
                      {tr.recurring.suggestionMeta(formatAmount(s.amount, summary.currency))}
                    </Text>
                  </View>
                </View>
                <View style={styles.buttons}>
                  <Chip
                    role="button"
                    selectable={false}
                    label={tr.recurring.add}
                    accessibilityLabel={tr.recurring.addLabel(s.name)}
                    on
                    onPress={() => router.push({ pathname: '/recurring-form', params: { merchant: s.merchantKey } })}
                  />
                  <Chip
                    role="button"
                    selectable={false}
                    label={tr.recurring.dismiss}
                    accessibilityLabel={tr.recurring.dismissLabel(s.name)}
                    on={false}
                    onPress={() => {
                      tick();
                      dismiss(s.merchantKey);
                    }}
                  />
                </View>
              </View>
            ))}
          </Card>
          <Text style={[styles.footnote, { color: t.sub, paddingHorizontal: 4, paddingTop: 0 }]}>{tr.recurring.suggestionsHelp}</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}


const styles = StyleSheet.create({
  content: { paddingBottom: 40 },
  total: { fontSize: 22, lineHeight: 28, fontWeight: '700', paddingHorizontal: 20, paddingBottom: 12, fontVariant: ['tabular-nums'] },
  lead: { fontSize: 15, lineHeight: 21, paddingHorizontal: 20, paddingBottom: 12 },
  section: { paddingHorizontal: 16, paddingTop: 20, gap: 8 },
  list: { marginHorizontal: 16, paddingHorizontal: 14, paddingVertical: 2 },
  row: { minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
  name: { fontSize: 16, fontWeight: '600' },
  meta: { fontSize: 13 },
  amount: { fontSize: 16, fontWeight: '600', fontVariant: ['tabular-nums'] },
  suggestion: { paddingVertical: 10, gap: 8 },
  suggestionTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  buttons: { flexDirection: 'row', gap: 8, marginLeft: 48 },
  footnote: { fontSize: 13, lineHeight: 18, paddingHorizontal: 20, paddingTop: 8 },
});
