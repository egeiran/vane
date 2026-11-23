import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { tr } from '@/i18n';
import type { DateKey } from '@/lib/dates';
import { categoryById, categoryName, formatAmount, isPending, merchantName, purchaseWhen, suggestionFor } from '@/lib/money';
import { useMoney } from '@/lib/moneyStore';
import { showTime } from '@/lib/region';
import type { MoneyData, Purchase } from '@/lib/types';
import { useTheme } from '@/theme';

import { CategoryIcon } from './CategoryIcon';
import { Icon } from './Icon';
import { RowMenu, type MenuItem } from './RowMenu';
import { SwipeRow, useSwipeGuard } from './SwipeRow';
import { showUndo } from './UndoToast';
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
  const updatePurchase = useMoney((s) => s.updatePurchase);
  const deletePurchase = useMoney((s) => s.deletePurchase);
  const restorePurchase = useMoney((s) => s.restorePurchase);
  const pending = isPending(p);
  const suggestion = pending ? suggestionFor(data, p) : null;
  const biggest = p.parts.length ? p.parts.reduce((a, b) => (b.amount > a.amount ? b : a)) : null;
  const category = biggest ? categoryById(data, biggest.categoryId) : null;
  const name = merchantName(data, p);

  const what = p.skipped
    ? tr.money.notCounted
    : pending
      ? tr.money.pending
      : p.parts
          .map((part) => {
            const c = categoryById(data, part.categoryId);
            return c ? categoryName(c) : tr.money.deletedCategory;
          })
          .join(' + ');
  const when = timeOnly ? showTime(p.time) : purchaseWhen(p, today);
  const meta = [when, what, p.note].filter(Boolean).join(' · ');
  const amount = p.amount ? formatAmount(p.amount, p.currency) : tr.money.amountMissing;
  const guard = useSwipeGuard();
  const wasDragged = guard.wasDragged;
  const edit = () => router.push({ pathname: '/purchase-form', params: { id: p.id } });
  // Sletter med en gang, med «Angre» nederst (som Mail), både fra sveip og fra menyen.
  const remove = () => {
    const index = useMoney.getState().purchases.findIndex((q) => q.id === p.id);
    deletePurchase(p.id);
    showUndo(tr.common.deleted(name), () => restorePurchase(p, index));
  };
  // Hold inne: Endre, godkjenn forslaget, tell med eller ikke, og slett.
  const items: MenuItem[] = [
    { label: tr.common.edit, icon: 'pencil', onPress: edit },
    ...(suggestion ? [{ label: tr.money.approve(categoryName(suggestion)), icon: 'checkmark.circle' as const, onPress: () => approve(p.id) }] : []),
    p.skipped
      ? { label: tr.money.menuCount, icon: 'plus.circle', onPress: () => updatePurchase(p.id, { skipped: false }) }
      : { label: tr.money.menuSkip, icon: 'minus.circle', onPress: () => updatePurchase(p.id, { skipped: true }) },
    { label: tr.common.delete, icon: 'trash', destructive: true, onPress: remove },
  ];

  return (
    <SwipeRow onDelete={remove} guard={guard}>
      <RowMenu href={{ pathname: '/purchase-form', params: { id: p.id } }} items={items}>
        <View style={[styles.wrap, { backgroundColor: t.card }]}>
          {!first ? <View style={[styles.separator, { backgroundColor: t.separator }]} /> : null}
          <Pressable
            onPress={() => {
              if (!wasDragged()) edit();
            }}
            accessibilityRole="button"
            accessibilityLabel={tr.money.rowLabel(name, amount, meta)}
            accessibilityActions={[{ name: 'delete', label: tr.common.delete }]}
            onAccessibilityAction={(e) => {
              if (e.nativeEvent.actionName === 'delete') remove();
            }}
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
                if (wasDragged()) return;
                tick();
                approve(p.id);
              }}
              accessibilityRole="button"
              accessibilityLabel={tr.money.approve(categoryName(suggestion))}
              style={({ pressed }) => [
                styles.suggestion,
                { backgroundColor: t.colors[suggestion.color].soft, opacity: pressed ? 0.7 : 1 },
              ]}>
              <Icon name={suggestion.icon} size={14} color={t.colors[suggestion.color].ink} />
              <Text style={[styles.suggestionText, { color: t.colors[suggestion.color].ink }]}>{categoryName(suggestion)}</Text>
              <Icon name="checkmark" size={13} color={t.colors[suggestion.color].ink} weight="bold" />
            </Pressable>
          ) : null}
        </View>
      </RowMenu>
    </SwipeRow>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingVertical: 4, paddingHorizontal: 14 },
  separator: { position: 'absolute', top: 0, left: 14, right: 0, height: StyleSheet.hairlineWidth },
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
