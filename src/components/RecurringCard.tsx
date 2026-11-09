import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { tr } from '@/i18n';
import type { DateKey } from '@/lib/dates';
import { formatAmount } from '@/lib/money';
import { chargeDay, recurringSummary, suggestRecurring, upcomingRecurring } from '@/lib/recurring';
import type { MoneyData } from '@/lib/types';
import { useTheme } from '@/theme';

import { Icon } from './Icon';
import { Card } from './ui';

/**
 * Faste utgifter i Penger: en egen, rolig linje med det som går ut i måneden. Den blandes ikke med
 * kjøpene, så ingenting telles to ganger. Et trykk åpner lista.
 */
export function RecurringCard({ data, today }: { data: MoneyData; today: DateKey }) {
  const t = useTheme();
  const summary = recurringSummary(data);
  const next = upcomingRecurring(data, today)[0];
  const suggestions = suggestRecurring(data, today).length;
  const amount = formatAmount(summary.perMonth, summary.currency);
  const lines = [
    next ? tr.recurring.next(next.expense.name, chargeDay(next.next, today)) : tr.recurring.empty,
    suggestions ? tr.recurring.suggestionCount(suggestions) : '',
  ].filter(Boolean);

  return (
    <Pressable
      onPress={() => router.push('/recurring')}
      accessibilityRole="button"
      accessibilityLabel={[summary.count ? tr.recurring.cardLabel(amount) : tr.recurring.title, ...lines].join('. ')}
      style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
      <Card style={styles.card}>
        <View style={styles.top}>
          <Icon name="arrow.triangle.2.circlepath" size={16} color={t.sub} />
          <Text style={[styles.title, { color: t.text }]} numberOfLines={1}>
            {tr.recurring.title}
          </Text>
          {summary.count ? <Text style={[styles.amount, { color: t.text }]}>{tr.recurring.perMonth(amount)}</Text> : null}
          <Icon name="chevron.right" size={14} color={t.sub} />
        </View>
        {lines.map((line) => (
          <Text key={line} style={[styles.body, { color: t.sub }]}>
            {line}
          </Text>
        ))}
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 16, marginTop: 16, padding: 16, gap: 6 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { flex: 1, fontSize: 17, fontWeight: '700' },
  amount: { fontSize: 16, fontWeight: '600', fontVariant: ['tabular-nums'] },
  body: { fontSize: 14, lineHeight: 20, marginLeft: 26 },
});
