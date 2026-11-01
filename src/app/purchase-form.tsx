import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CategoryIcon } from '@/components/CategoryIcon';
import { CategoryPicker } from '@/components/CategoryPicker';
import { Card, IconButton, Row, SwitchRow, TextButton } from '@/components/ui';
import { getLang, tr } from '@/i18n';
import { addDays, formatTime, relativeDayName, type DateKey } from '@/lib/dates';
import {
  amountInputText,
  categoryName,
  currencyLabel,
  formatAmount,
  isPending,
  mainCurrency,
  merchantKey,
  merchantName,
  parseAmount,
  purchaseWhen,
  suggestionFor,
  suggestionForKey,
} from '@/lib/money';
import { partsAreValid } from '@/lib/moneyState';
import { useMoney, useMoneyData } from '@/lib/moneyStore';
import { moneyHome } from '@/lib/store';
import type { MoneyData, Purchase, PurchasePart } from '@/lib/types';
import { useToday } from '@/lib/useToday';
import { useTheme } from '@/theme';

type Form = {
  amount: string;
  merchant: string;
  day: DateKey;
  categoryId: string | null;
  /** Kategorien er valgt av brukeren, ikke foreslått ut fra stedet. */
  picked: boolean;
  split: boolean;
  splitAmounts: Record<string, string>;
  skipped: boolean;
  note: string;
};

function initialForm(data: MoneyData, p: Purchase | undefined, today: DateKey): Form {
  if (!p) {
    return { amount: '', merchant: '', day: today, categoryId: null, picked: false, split: false, splitAmounts: {}, skipped: false, note: '' };
  }
  // Et kjøp som venter, får forslaget valgt, så «Lagre» godkjenner det.
  const categoryId = p.parts.length === 1 ? p.parts[0].categoryId : p.parts.length === 0 ? (suggestionFor(data, p)?.id ?? null) : null;
  return {
    amount: amountInputText(p.amount),
    merchant: merchantName(data, p),
    day: p.day,
    categoryId,
    picked: true,
    split: p.parts.length > 1,
    splitAmounts: Object.fromEntries(p.parts.map((part) => [part.categoryId, amountInputText(part.amount)])),
    skipped: p.skipped,
    note: p.note,
  };
}

function close() {
  if (router.canGoBack()) router.back();
  else router.replace(moneyHome());
}

const toAmount = (text: string | undefined) => (text ? (parseAmount(text)?.amount ?? 0) : 0);

/** Nytt kjøp, eller velg kategori for og endre et kjøp (?id=…). */
export default function PurchaseFormScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const today = useToday();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const data = useMoneyData();
  const existing = id ? data.purchases.find((p) => p.id === id) : undefined;
  const addPurchase = useMoney((s) => s.addPurchase);
  const updatePurchase = useMoney((s) => s.updatePurchase);
  const renameMerchant = useMoney((s) => s.renameMerchant);
  const deletePurchase = useMoney((s) => s.deletePurchase);
  const [f, setF] = useState(() => initialForm(data, existing, today));
  const set = (patch: Partial<Form>) => setF((prev) => ({ ...prev, ...patch }));

  if (id && !existing) {
    return (
      <View style={[styles.missing, { backgroundColor: t.bg }]}>
        <Text style={{ color: t.sub, fontSize: 16 }}>{tr.purchaseForm.missing}</Text>
        <TextButton label={tr.common.close} bold onPress={close} />
      </View>
    );
  }

  const currency = existing?.currency ?? mainCurrency(data);
  const unit = currencyLabel(currency);
  const unitFirst = getLang() === 'en';
  const amount = toAmount(f.amount);
  // Skjulte kategorier vises bare når kjøpet allerede har dem.
  const used = new Set(existing?.parts.map((p) => p.categoryId) ?? []);
  const categories = data.categories.filter((c) => !c.hidden || used.has(c.id));
  const splitParts: PurchasePart[] = categories
    .map((c) => ({ categoryId: c.id, amount: toAmount(f.splitAmounts[c.id]) }))
    .filter((p) => p.amount > 0);
  const splitSum = splitParts.reduce((sum, p) => sum + p.amount, 0);
  const parts: PurchasePart[] = f.split ? splitParts : f.categoryId ? [{ categoryId: f.categoryId, amount }] : [];
  const splitOk = !f.split || (splitParts.length > 0 && splitSum === amount);
  const valid = splitOk && partsAreValid(amount, parts);
  const canSave = existing ? valid : valid && amount > 0 && (parts.length > 0 || f.skipped);
  const hasKey = existing ? !!existing.merchantKey : true;

  const save = () => {
    if (!canSave) return;
    if (existing) {
      updatePurchase(existing.id, { amount, day: f.day, parts, skipped: f.skipped, note: f.note });
      const name = f.merchant.trim();
      if (existing.merchantKey && name !== merchantName(data, existing)) {
        renameMerchant(existing.merchantKey, name === existing.merchant ? '' : name);
      }
    } else {
      const now = new Date();
      addPurchase({
        amount,
        merchant: f.merchant,
        day: f.day,
        time: formatTime({ hour: now.getHours(), minute: now.getMinutes() }),
        parts,
        skipped: f.skipped,
        note: f.note,
      });
    }
    close();
  };

  const changeMerchant = (merchant: string) => {
    if (existing || f.picked) return set({ merchant });
    set({ merchant, categoryId: suggestionForKey(data, merchantKey(merchant))?.id ?? null });
  };

  const toggleSplit = (split: boolean) => {
    if (split && f.categoryId && !Object.keys(f.splitAmounts).length) {
      return set({ split, splitAmounts: { [f.categoryId]: f.amount } });
    }
    set({ split });
  };

  const confirmDelete = () =>
    Alert.alert(tr.purchaseForm.deleteTitle, tr.purchaseForm.deleteBody, [
      { text: tr.common.cancel, style: 'cancel' },
      {
        text: tr.common.delete,
        style: 'destructive',
        onPress: () => {
          close();
          if (existing) deletePurchase(existing.id);
        },
      },
    ]);

  const rest = amount - splitSum;
  const title = !existing ? tr.purchaseForm.newTitle : isPending(existing) ? tr.purchaseForm.pickTitle : tr.purchaseForm.title;

  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1, backgroundColor: t.bg }}>
      <View style={styles.bar}>
        <TextButton label={tr.common.cancel} onPress={close} />
        <Text style={[styles.barTitle, { color: t.text }]} accessibilityRole="header">
          {title}
        </Text>
        <TextButton label={existing ? tr.common.save : tr.common.add} bold onPress={save} disabled={!canSave} />
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
        <Card style={styles.card}>
          <View style={styles.amountRow}>
            {/* «$149» på engelsk, «149 kr» på norsk: tegnet og tallet møtes på midten. */}
            {unitFirst ? <Text style={[styles.unit, { color: t.sub, textAlign: 'right' }]}>{unit}</Text> : null}
            <TextInput
              value={f.amount}
              onChangeText={(a) => set({ amount: a })}
              placeholder="0"
              placeholderTextColor={t.faint}
              keyboardType="decimal-pad"
              autoFocus={!existing}
              accessibilityLabel={tr.purchaseForm.amountIn(unit)}
              style={[styles.amountInput, { color: t.text }, unitFirst && { textAlign: 'left' }]}
            />
            {unitFirst ? null : <Text style={[styles.unit, { color: t.sub }]}>{unit}</Text>}
          </View>
          {existing ? (
            <Text style={[styles.help, { color: t.sub, textAlign: 'center' }]}>
              {`${existing.source === 'applepay' ? tr.purchaseForm.sourceApplePay : tr.purchaseForm.sourceManual} · ${purchaseWhen(existing, today)}`}
            </Text>
          ) : null}

          {hasKey ? (
            <>
              <Text style={[styles.label, { color: t.sub }]} nativeID="merchant-label">
                {tr.purchaseForm.place}
              </Text>
              <TextInput
                value={f.merchant}
                onChangeText={changeMerchant}
                placeholder={tr.purchaseForm.placePlaceholder}
                placeholderTextColor={t.faint}
                returnKeyType="done"
                accessibilityLabelledBy="merchant-label"
                style={[styles.input, { backgroundColor: t.field, color: t.text }]}
              />
              {existing ? <Text style={[styles.help, { color: t.sub }]}>{tr.purchaseForm.placeHelp}</Text> : null}
            </>
          ) : null}

          <View style={styles.dayRow}>
            <Text style={{ flex: 1, fontSize: 16, color: t.text }}>{tr.purchaseForm.date}</Text>
            <IconButton icon="chevron.left" label={tr.purchaseForm.dayBefore} size={36} background={t.field} onPress={() => set({ day: addDays(f.day, -1) })} />
            <Text style={[styles.dayText, { color: t.text }]} accessibilityLiveRegion="polite">
              {relativeDayName(f.day, today)}
            </Text>
            {f.day < today ? (
              <IconButton icon="chevron.right" label={tr.purchaseForm.dayAfter} size={36} background={t.field} onPress={() => set({ day: addDays(f.day, 1) })} />
            ) : (
              <View style={{ width: 36 }} />
            )}
          </View>
        </Card>

        <Card style={styles.card}>
          <Text style={[styles.label, { color: t.sub }]}>{f.split ? tr.purchaseForm.split : tr.common.category}</Text>
          {f.split ? (
            <>
              {categories.map((c) => (
                <View key={c.id} style={styles.splitRow}>
                  <CategoryIcon category={c} size={30} />
                  <Text style={{ flex: 1, fontSize: 16, color: t.text }} numberOfLines={1}>
                    {categoryName(c)}
                  </Text>
                  <TextInput
                    value={f.splitAmounts[c.id] ?? ''}
                    onChangeText={(v) => set({ splitAmounts: { ...f.splitAmounts, [c.id]: v } })}
                    placeholder="0"
                    placeholderTextColor={t.faint}
                    keyboardType="decimal-pad"
                    accessibilityLabel={tr.purchaseForm.splitAmount(categoryName(c), unit)}
                    style={[styles.splitInput, { backgroundColor: t.field, color: t.text }]}
                  />
                </View>
              ))}
              <Text style={[styles.help, { color: rest === 0 ? t.sub : t.text }]} accessibilityLiveRegion="polite">
                {rest === 0 ? tr.purchaseForm.balanced : rest > 0 ? tr.purchaseForm.left(formatAmount(rest, currency)) : tr.purchaseForm.tooMuch(formatAmount(-rest, currency))}
              </Text>
            </>
          ) : (
            <CategoryPicker categories={categories} value={f.categoryId} onChange={(categoryId) => set({ categoryId, picked: true })} />
          )}
          <View style={{ alignItems: 'flex-start', marginLeft: -8 }}>
            <TextButton label={f.split ? tr.purchaseForm.oneCategory : tr.purchaseForm.splitMany} color={t.sub} onPress={() => toggleSplit(!f.split)} />
          </View>
        </Card>

        <Card style={styles.card}>
          <Text style={[styles.label, { color: t.sub }]} nativeID="note-label">
            {tr.purchaseForm.note}
          </Text>
          <TextInput
            value={f.note}
            onChangeText={(note) => set({ note })}
            placeholder={tr.purchaseForm.notePlaceholder}
            placeholderTextColor={t.faint}
            returnKeyType="done"
            accessibilityLabelledBy="note-label"
            style={[styles.input, { backgroundColor: t.field, color: t.text }]}
          />
        </Card>

        <Card style={{ overflow: 'hidden' }}>
          <SwitchRow first label={tr.purchaseForm.skip} value={f.skipped} onChange={(skipped) => set({ skipped })} />
          <Row>
            <Text style={[styles.help, { color: t.sub, paddingVertical: 8 }]}>{tr.purchaseForm.skipHelp}</Text>
          </Row>
        </Card>

        {existing ? (
          <View style={{ alignItems: 'center' }}>
            <TextButton label={tr.purchaseForm.deletePurchase} color={t.danger} onPress={confirmDelete} />
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, paddingTop: 10, paddingBottom: 4 },
  barTitle: { fontSize: 17, fontWeight: '600' },
  content: { padding: 16, gap: 12 },
  card: { padding: 14, gap: 10 },
  label: { fontSize: 13, fontWeight: '600' },
  help: { fontSize: 13, lineHeight: 18, flex: 1 },
  input: { height: 44, borderRadius: 10, paddingHorizontal: 12, fontSize: 17 },
  // Tallet slutter midt på, og «kr» begynner der.
  amountRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, paddingTop: 6 },
  amountInput: { flex: 1, fontSize: 44, fontWeight: '700', textAlign: 'right', fontVariant: ['tabular-nums'] },
  unit: { flex: 1, fontSize: 24, fontWeight: '600' },
  dayRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  dayText: { minWidth: 120, textAlign: 'center', fontSize: 15, fontWeight: '600' },
  splitRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  splitInput: { width: 110, height: 40, borderRadius: 10, paddingHorizontal: 12, fontSize: 16, textAlign: 'right' },
});
