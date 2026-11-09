import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { CategoryIcon } from '@/components/CategoryIcon';
import { Icon } from '@/components/Icon';
import { Card, PrimaryButton, SectionLabel, tick } from '@/components/ui';
import { tr } from '@/i18n';
import { categoryById, formatAmount } from '@/lib/money';
import { useMoney, useMoneyData } from '@/lib/moneyStore';
import { chargeDay, recurringSummary, suggestRecurring, upcomingRecurring } from '@/lib/recurring';
import { moneyHome } from '@/lib/store';
import { useToday } from '@/lib/useToday';
import { useTheme } from '@/theme';

function back() {
  if (router.canGoBack()) router.back();
  else router.replace(moneyHome());
}

/** Faste utgifter: hva som går ut i måneden, alle sammen med neste trekk, og forslag fra kjøpene. */
export default function RecurringScreen() {
  const t = useTheme();
  const today = useToday();
  const data = useMoneyData();
  const dismiss = useMoney((s) => s.dismissRecurringSuggestion);
  const summary = recurringSummary(data);
  const upcoming = upcomingRecurring(data, today);
  const suggestions = suggestRecurring(data, today);
  const other = Object.entries(summary.other).map(([cur, amount]) => formatAmount(amount, cur));
  const perMonth = formatAmount(summary.perMonth, summary.currency);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.bg }} contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
      <View style={styles.bar}>
        <Pressable onPress={back} accessibilityRole="button" accessibilityLabel={tr.common.back} style={styles.backButton}>
          <Icon name="chevron.left" size={20} color={t.text} />
          <Text style={{ fontSize: 17, color: t.text, fontWeight: '500' }}>{tr.common.back}</Text>
        </Pressable>
      </View>
      <Text style={[styles.title, { color: t.text }]} accessibilityRole="header">
        {tr.recurring.title}
      </Text>

      {summary.count ? (
        <Text style={[styles.total, { color: t.text }]} accessibilityLabel={tr.recurring.cardLabel(perMonth)}>
          {tr.recurring.perMonth(perMonth)}
        </Text>
      ) : (
        <Text style={[styles.lead, { color: t.sub }]}>{tr.recurring.empty}</Text>
      )}
      {other.length ? <Text style={[styles.footnote, { color: t.sub, paddingTop: 0 }]}>{tr.recurring.otherCurrencies(other.join(', '))}</Text> : null}

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
                style={({ pressed }) => [styles.row, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.hair }, { opacity: pressed ? 0.6 : 1 }]}>
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

      {suggestions.length ? (
        <View style={styles.section}>
          <SectionLabel>{tr.recurring.suggestions}</SectionLabel>
          <Card style={[styles.list, { marginHorizontal: 0 }]}>
            {suggestions.map((s, i) => (
              <View key={s.merchantKey} style={[styles.suggestion, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.hair }]}>
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
                  <Pill
                    label={tr.recurring.add}
                    a11y={tr.recurring.addLabel(s.name)}
                    strong
                    onPress={() => router.push({ pathname: '/recurring-form', params: { merchant: s.merchantKey } })}
                  />
                  <Pill
                    label={tr.recurring.dismiss}
                    a11y={tr.recurring.dismissLabel(s.name)}
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

      <View style={{ paddingHorizontal: 16, paddingTop: 20 }}>
        <PrimaryButton label={tr.recurring.new} onPress={() => router.push('/recurring-form')} />
      </View>
      <Text style={[styles.footnote, { color: t.sub }]}>{tr.recurring.notCounted}</Text>
    </ScrollView>
  );
}

function Pill({ label, a11y, onPress, strong }: { label: string; a11y: string; onPress: () => void; strong?: boolean }) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={a11y}
      hitSlop={4}
      style={({ pressed }) => [styles.pill, { backgroundColor: strong ? t.inverse : t.button, opacity: pressed ? 0.7 : 1 }]}>
      <Text style={{ fontSize: 15, fontWeight: '600', color: strong ? t.onInverse : t.text }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 40 },
  bar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingTop: 4 },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: 44, paddingHorizontal: 4 },
  title: { fontSize: 32, lineHeight: 38, fontWeight: '700', letterSpacing: -0.5, paddingHorizontal: 20, paddingTop: 6, paddingBottom: 4 },
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
  pill: { minHeight: 36, borderRadius: 18, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  footnote: { fontSize: 13, lineHeight: 18, paddingHorizontal: 20, paddingTop: 8 },
});
