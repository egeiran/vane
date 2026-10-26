import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { CategoryIcon } from '@/components/CategoryIcon';
import { Icon } from '@/components/Icon';
import { PurchaseRow } from '@/components/PurchaseRow';
import { Card, IconButton, PrimaryButton, SectionLabel, TextButton, tick } from '@/components/ui';
import {
  addMonths,
  capitalize,
  categoryById,
  formatAmount,
  isPending,
  monthName,
  monthOf,
  monthShort,
  monthSummary,
  pendingPurchases,
  recentMonths,
  suggestionFor,
  type MonthKey,
} from '@/lib/money';
import { useMoney, useMoneyData } from '@/lib/moneyStore';
import { useToday } from '@/lib/useToday';
import { useTheme } from '@/theme';

const RECENT = 5;

export default function MoneyScreen() {
  const t = useTheme();
  const today = useToday();
  const data = useMoneyData();
  const approveAll = useMoney((s) => s.approveAllSuggestions);
  const markSetupSeen = useMoney((s) => s.markSetupSeen);
  const current = monthOf(today);
  const [picked, setPicked] = useState<MonthKey>(current);
  const month = picked > current ? current : picked;

  // Første gang fanen åpnes: veiviseren for Snarveier.
  useFocusEffect(
    useCallback(() => {
      if (useMoney.getState().setupSeen) return;
      markSetupSeen();
      router.push('/money-setup');
    }, [markSetupSeen])
  );

  const pending = pendingPurchases(data);
  const withSuggestion = pending.filter((p) => suggestionFor(data, p)).length;
  const summary = monthSummary(data, month);
  const months = recentMonths(data, today);
  const maxTotal = Math.max(1, ...months.map((m) => m.total));
  const recent = data.purchases.filter((p) => p.day.startsWith(month) && !isPending(p));
  const hasApplePay = data.purchases.some((p) => p.source === 'applepay');
  const otherCurrencies = Object.entries(summary.other).map(([cur, amount]) => formatAmount(amount, cur));

  const color = (categoryId: string) => {
    const c = categoryById(data, categoryId);
    return c ? t.colors[c.color].solid : t.faint;
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.bg }} contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={{ gap: 2 }}>
          <Text style={[styles.sub, { color: t.sub }]}>{capitalize(monthName(current, today))}</Text>
          <Text style={[styles.title, { color: t.text }]} accessibilityRole="header">
            Penger
          </Text>
        </View>
        <IconButton icon="plus" label="Legg inn kjøp" onPress={() => router.push('/purchase-form')} />
      </View>

      {!hasApplePay ? (
        <Card style={styles.card}>
          <Text style={[styles.cardTitle, { color: t.text }]}>Kjøp fra Apple Pay</Text>
          <Text style={[styles.body, { color: t.sub }]}>
            Få et varsel hver gang du betaler med iPhone eller klokka, og velg kategori med én gang. Du setter det opp én gang i
            Snarveier.
          </Text>
          <PrimaryButton label="Sett opp" onPress={() => router.push('/money-setup')} />
        </Card>
      ) : null}

      {pending.length ? (
        <View style={styles.section}>
          <SectionLabel
            right={
              withSuggestion > 1 ? (
                <TextButton
                  label="Godkjenn alle forslag"
                  bold
                  onPress={() => {
                    tick();
                    approveAll();
                  }}
                />
              ) : (
                `${pending.length}`
              )
            }>
            Venter
          </SectionLabel>
          <Card style={styles.list}>
            {pending.map((p, i) => (
              <PurchaseRow key={p.id} purchase={p} data={data} today={today} first={i === 0} />
            ))}
          </Card>
        </View>
      ) : null}

      <Card style={styles.card}>
        <View style={styles.monthBar}>
          <IconButton icon="chevron.left" label="Forrige måned" size={36} background="transparent" onPress={() => setPicked(addMonths(month, -1))} />
          <Text style={[styles.cardTitle, { color: t.text }]} accessibilityRole="header">
            {capitalize(monthName(month, today))}
          </Text>
          {month < current ? (
            <IconButton icon="chevron.right" label="Neste måned" size={36} background="transparent" onPress={() => setPicked(addMonths(month, 1))} />
          ) : (
            <View style={{ width: 36 }} />
          )}
        </View>
        <Text style={[styles.total, { color: t.text }]} accessibilityLabel={`Brukt i ${monthName(month, today)}: ${formatAmount(summary.total)}`}>
          {formatAmount(summary.total)}
        </Text>

        {summary.count === 0 ? (
          <Text style={[styles.body, { color: t.sub, textAlign: 'center' }]}>Ingen kjøp i {monthName(month, today)}.</Text>
        ) : null}

        {summary.byCategory.map((row) => {
          const c = categoryById(data, row.categoryId);
          return (
            <Pressable
              key={row.categoryId}
              onPress={() => router.push({ pathname: '/purchases', params: { month, category: row.categoryId } })}
              accessibilityRole="button"
              accessibilityLabel={`${c?.name ?? 'Slettet kategori'}: ${formatAmount(row.amount)}`}
              style={({ pressed }) => [styles.catRow, { opacity: pressed ? 0.6 : 1 }]}>
              <CategoryIcon category={c} size={30} />
              <View style={{ flex: 1, gap: 6 }}>
                <View style={styles.catTop}>
                  <Text style={[styles.catName, { color: t.text }]} numberOfLines={1}>
                    {c?.name ?? 'Slettet kategori'}
                  </Text>
                  <Text style={[styles.catAmount, { color: t.text }]}>{formatAmount(row.amount)}</Text>
                </View>
                <View style={[styles.track, { backgroundColor: t.bg }]}>
                  <View style={[styles.fill, { width: `${(row.amount / Math.max(1, summary.total)) * 100}%`, backgroundColor: color(row.categoryId) }]} />
                </View>
              </View>
            </Pressable>
          );
        })}

        {summary.pending ? (
          <View style={styles.catRow}>
            <CategoryIcon size={30} />
            <View style={{ flex: 1, gap: 6 }}>
              <View style={styles.catTop}>
                <Text style={[styles.catName, { color: t.sub }]}>Venter</Text>
                <Text style={[styles.catAmount, { color: t.sub }]}>{formatAmount(summary.pending)}</Text>
              </View>
              <View style={[styles.track, { backgroundColor: t.bg }]}>
                <View style={[styles.fill, { width: `${(summary.pending / Math.max(1, summary.total)) * 100}%`, backgroundColor: t.faint }]} />
              </View>
            </View>
          </View>
        ) : null}

        {otherCurrencies.length || summary.skipped ? (
          <Text style={[styles.note, { color: t.sub }]}>
            {[
              otherCurrencies.length ? `I tillegg: ${otherCurrencies.join(', ')}.` : '',
              summary.skipped ? `${summary.skipped} kjøp er ikke talt med.` : '',
            ]
              .filter(Boolean)
              .join(' ')}
          </Text>
        ) : null}
      </Card>

      <Card style={styles.card}>
        <Text style={[styles.cardTitle, { color: t.text }]}>Siste seks måneder</Text>
        {months.map((m) => {
          const on = m.month === month;
          const segments = data.categories
            .map((c) => ({ id: c.id, amount: m.byCategory.find((b) => b.categoryId === c.id)?.amount ?? 0, color: t.colors[c.color].solid }))
            .filter((s) => s.amount > 0);
          const unknown = m.byCategory.filter((b) => !categoryById(data, b.categoryId)).reduce((sum, b) => sum + b.amount, 0);
          return (
            <Pressable
              key={m.month}
              onPress={() => setPicked(m.month)}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${monthName(m.month, today)}: ${formatAmount(m.total)}`}
              style={({ pressed }) => [styles.barRow, { opacity: pressed ? 0.6 : 1 }]}>
              <Text style={[styles.barLabel, { color: on ? t.text : t.sub, fontWeight: on ? '700' : '500' }]}>{monthShort(m.month)}</Text>
              <View style={styles.barTrack}>
                {m.total ? (
                  <View style={[styles.bar, { width: `${(m.total / maxTotal) * 100}%` }]}>
                    {segments.map((s) => (
                      <View key={s.id} style={{ flex: s.amount, backgroundColor: s.color }} />
                    ))}
                    {unknown ? <View style={{ flex: unknown, backgroundColor: t.faint }} /> : null}
                    {m.pending ? <View style={{ flex: m.pending, backgroundColor: t.empty }} /> : null}
                  </View>
                ) : null}
              </View>
              <Text style={[styles.barAmount, { color: on ? t.text : t.sub }]}>{formatAmount(m.total)}</Text>
            </Pressable>
          );
        })}
      </Card>

      <View style={styles.section}>
        <SectionLabel
          right={
            recent.length ? (
              <TextButton label="Se alle" onPress={() => router.push({ pathname: '/purchases', params: { month } })} />
            ) : undefined
          }>
          {`Kjøp i ${monthName(month, today)}`}
        </SectionLabel>
        {recent.length ? (
          <Card style={styles.list}>
            {recent.slice(0, RECENT).map((p, i) => (
              <PurchaseRow key={p.id} purchase={p} data={data} today={today} first={i === 0} />
            ))}
          </Card>
        ) : (
          <Text style={[styles.note, { color: t.sub, marginHorizontal: 4 }]}>
            Ingen kjøp med kategori ennå. Trykk + for å legge inn et kjøp du har betalt med Vipps, kontanter eller på nett.
          </Text>
        )}
      </View>

      <View style={styles.section}>
        <Card style={{ overflow: 'hidden' }}>
          <LinkRow icon="square.grid.2x2" label="Kategorier" onPress={() => router.push('/categories')} first />
          <LinkRow icon="wallet.pass" label="Kjøp fra Apple Pay" onPress={() => router.push('/money-setup')} />
        </Card>
      </View>
    </ScrollView>
  );
}

function LinkRow({ icon, label, onPress, first }: { icon: 'square.grid.2x2' | 'wallet.pass'; label: string; onPress: () => void; first?: boolean }) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.linkRow,
        !first && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.border },
        { opacity: pressed ? 0.6 : 1 },
      ]}>
      <Icon name={icon} size={18} color={t.sub} />
      <Text style={{ flex: 1, fontSize: 16, color: t.text }}>{label}</Text>
      <Icon name="chevron.right" size={14} color={t.sub} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 8, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 6 },
  sub: { fontSize: 15, lineHeight: 20, fontWeight: '500' },
  title: { fontSize: 34, lineHeight: 40, fontWeight: '700', letterSpacing: -0.5 },
  section: { paddingHorizontal: 16, paddingTop: 20, gap: 8 },
  card: { marginHorizontal: 16, marginTop: 16, padding: 16, gap: 12 },
  cardTitle: { fontSize: 17, fontWeight: '700' },
  body: { fontSize: 15, lineHeight: 21 },
  note: { fontSize: 13, lineHeight: 18 },
  list: { paddingHorizontal: 14, paddingVertical: 2 },
  monthBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: -8, marginTop: -6 },
  total: { fontSize: 34, lineHeight: 40, fontWeight: '700', letterSpacing: -0.5, textAlign: 'center', fontVariant: ['tabular-nums'] },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 },
  catTop: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 },
  catName: { fontSize: 15, fontWeight: '600', flexShrink: 1 },
  catAmount: { fontSize: 15, fontWeight: '600', fontVariant: ['tabular-nums'] },
  track: { height: 5, borderRadius: 3, overflow: 'hidden' },
  fill: { height: 5, borderRadius: 3 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 30 },
  barLabel: { width: 34, fontSize: 14 },
  barTrack: { flex: 1, height: 14, justifyContent: 'center' },
  bar: { height: 14, borderRadius: 4, overflow: 'hidden', flexDirection: 'row' },
  barAmount: { width: 84, textAlign: 'right', fontSize: 14, fontWeight: '600', fontVariant: ['tabular-nums'] },
  linkRow: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16 },
});
