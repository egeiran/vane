import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { DateKey } from '@/lib/dates';
import { categoryById, formatAmount, isPending, merchantName, purchaseWhen, suggestionFor } from '@/lib/money';
import { useMoney } from '@/lib/moneyStore';
import type { MoneyData, Purchase } from '@/lib/types';
import { useTheme } from '@/theme';

import { CategoryIcon } from './CategoryIcon';
import { Icon } from './Icon';
import { tick } from './ui';

type Props = {
  purchase: Purchase;
  data: MoneyData;
  today: DateKey;
  first?: boolean;
  /** Vis tidspunktet i stedet for dagen (når lista allerede er delt opp på dager). */
  timeOnly?: boolean;
};

/** Ett kjøp i en liste. Venter det og Vane har et forslag, kan forslaget godkjennes rett her. */
export function PurchaseRow({ purchase: p, data, today, first, timeOnly }: Props) {
  const t = useTheme();
  const approve = useMoney((s) => s.approveSuggestion);
  const pending = isPending(p);
  const suggestion = pending ? suggestionFor(data, p) : null;
  const biggest = p.parts.length ? p.parts.reduce((a, b) => (b.amount > a.amount ? b : a)) : null;
  const category = biggest ? categoryById(data, biggest.categoryId) : null;
  const name = merchantName(data, p);

  const what = p.skipped
    ? 'Ikke talt med'
    : pending
      ? 'Venter'
      : p.parts.map((part) => categoryById(data, part.categoryId)?.name ?? 'Slettet kategori').join(' + ');
  const when = timeOnly ? p.time : purchaseWhen(p, today);
  const meta = [when, what, p.note].filter(Boolean).join(' · ');
  const amount = p.amount ? formatAmount(p.amount, p.currency) : 'Beløp mangler';

  return (
    <View style={[styles.wrap, !first && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.hair }]}>
      <Pressable
        onPress={() => router.push({ pathname: '/purchase-form', params: { id: p.id } })}
        accessibilityRole="button"
        accessibilityLabel={`${name}, ${amount}, ${meta}`}
        style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : p.skipped ? 0.55 : 1 }]}>
        <CategoryIcon category={category} size={36} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[styles.name, { color: t.text }]} numberOfLines={1}>
            {name}
          </Text>
          <Text style={[styles.meta, { color: t.sub }]} numberOfLines={1}>
            {meta}
          </Text>
        </View>
        <Text style={[styles.amount, { color: p.amount ? t.text : t.sub }]}>{amount}</Text>
      </Pressable>
      {suggestion ? (
        <Pressable
          onPress={() => {
            tick();
            approve(p.id);
          }}
          accessibilityRole="button"
          accessibilityLabel={`Godkjenn ${suggestion.name}`}
          style={({ pressed }) => [
            styles.suggestion,
            { backgroundColor: t.colors[suggestion.color].soft, opacity: pressed ? 0.7 : 1 },
          ]}>
          <Icon name={suggestion.icon} size={14} color={t.colors[suggestion.color].ink} />
          <Text style={[styles.suggestionText, { color: t.colors[suggestion.color].ink }]}>{suggestion.name}</Text>
          <Icon name="checkmark" size={13} color={t.colors[suggestion.color].ink} weight="bold" />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingVertical: 4 },
  row: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12 },
  name: { fontSize: 16, fontWeight: '600' },
  meta: { fontSize: 13 },
  amount: { fontSize: 16, fontWeight: '600', fontVariant: ['tabular-nums'] },
  suggestion: {
    alignSelf: 'flex-start',
    marginLeft: 48,
    marginBottom: 8,
    minHeight: 34,
    borderRadius: 17,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  suggestionText: { fontSize: 14, fontWeight: '600' },
});
