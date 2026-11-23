import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DateField } from '@/components/DateField';
import { AmountInput } from '@/components/AmountInput';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useDiscardGuard } from '@/components/useDiscardGuard';
import { CategoryPicker } from '@/components/CategoryPicker';
import { Card, Row, Segmented, SwitchRow, TextButton } from '@/components/ui';
import { getLang, tr } from '@/i18n';
import { addDays, daysBetween, formatFull, formatLong, type DateKey } from '@/lib/dates';
import { amountInputText, currencyLabel, mainCurrency, parseAmount } from '@/lib/money';
import { useMoney, useMoneyData } from '@/lib/moneyStore';
import { requestPermission } from '@/lib/notifications';
import { FREQUENCIES, nextCharge, RECURRING_REMINDER_TIME, shiftMonths, suggestRecurring } from '@/lib/recurring';
import { showTime } from '@/lib/region';
import { moneyHome } from '@/lib/store';
import type { MoneyData, RecurringExpense, RecurringFrequency } from '@/lib/types';
import { useToday } from '@/lib/useToday';
import { useTheme } from '@/theme';

type Form = {
  amount: string;
  name: string;
  frequency: RecurringFrequency;
  /** Neste trekk slik det vises. */
  next: DateKey;
  /**
   * Ankeret som lagres når datoen og hvor ofte ikke er endret. Da står en utgift den 31. på den 31.,
   * også når neste trekk er den 30.
   */
  keepAnchor: DateKey | null;
  categoryId: string | null;
  note: string;
  remind: boolean;
  merchantKey: string;
};

function initialForm(data: MoneyData, e: RecurringExpense | undefined, merchant: string | undefined, today: DateKey): Form {
  if (e) {
    return {
      amount: amountInputText(e.amount),
      name: e.name,
      frequency: e.frequency,
      next: nextCharge(e, today),
      keepAnchor: e.anchor,
      categoryId: e.categoryId,
      note: e.note,
      remind: e.remind,
      merchantKey: e.merchantKey,
    };
  }
  // Fra et forslag: stedet, det siste beløpet og neste trekk en måned etter det siste kjøpet.
  const s = merchant ? suggestRecurring(data, today).find((x) => x.merchantKey === merchant) : undefined;
  if (s) {
    return {
      amount: amountInputText(s.amount),
      name: s.name,
      frequency: 'month',
      // Er det siste kjøpet i dag, er neste trekk om en måned, og det er den dagen som lagres.
      next: nextCharge({ anchor: s.anchor, frequency: 'month' }, s.anchor === today ? addDays(today, 1) : today),
      keepAnchor: s.anchor === today ? null : s.anchor,
      categoryId: s.categoryId,
      note: '',
      remind: false,
      merchantKey: s.merchantKey,
    };
  }
  return { amount: '', name: '', frequency: 'month', next: today, keepAnchor: null, categoryId: null, note: '', remind: false, merchantKey: '' };
}

function close() {
  if (router.canGoBack()) router.back();
  else router.replace(moneyHome());
}

const toAmount = (text: string) => (text ? (parseAmount(text)?.amount ?? 0) : 0);

/** «I dag», «I morgen», «Torsdag 3. desember», eller med år når det er neste år. */
function nextLabel(day: DateKey, today: DateKey): string {
  const diff = daysBetween(today, day);
  if (diff === 0) return tr.dates.today;
  if (diff === 1) return tr.dates.tomorrow;
  return day.slice(0, 4) === today.slice(0, 4) ? formatLong(day) : formatFull(day);
}

/** Ny fast utgift, fra et forslag (?merchant=…), eller endre en (?id=…). */
export default function RecurringFormScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const today = useToday();
  const { id, merchant } = useLocalSearchParams<{ id?: string; merchant?: string }>();
  const data = useMoneyData();
  const existing = id ? data.recurring.find((e) => e.id === id) : undefined;
  const addRecurring = useMoney((s) => s.addRecurring);
  const updateRecurring = useMoney((s) => s.updateRecurring);
  const deleteRecurring = useMoney((s) => s.deleteRecurring);
  const [f, setF] = useState(() => initialForm(data, existing, merchant, today));
  // Endringer som ikke er lagret: spør før arket lukkes (Avbryt, sveip ned eller tilbake).
  const [initial] = useState(() => JSON.stringify(initialForm(data, existing, merchant, today)));
  const allowClose = useDiscardGuard(JSON.stringify(f) !== initial);
  const done = () => {
    allowClose();
    close();
  };
  const set = (patch: Partial<Form>) => setF((prev) => ({ ...prev, ...patch }));

  if (id && !existing) {
    return (
      <View style={[styles.missing, { backgroundColor: t.bg }]}>
        <Text style={{ color: t.sub, fontSize: 16 }}>{tr.recurring.missing}</Text>
        <TextButton label={tr.common.close} bold onPress={close} />
      </View>
    );
  }

  const currency = existing?.currency ?? mainCurrency(data);
  const unit = currencyLabel(currency);
  const unitFirst = getLang() === 'en';
  const amount = toAmount(f.amount);
  const canSave = amount > 0 && !!f.name.trim();
  // Neste trekk er fra i dag og opptil ett år fram.
  const last = shiftMonths(today, 12);
  const clamp = (day: DateKey) => (day < today ? today : day > last ? last : day);
  const moveTo = (next: DateKey) => set({ next: clamp(next), keepAnchor: null });
  // Skjulte kategorier vises bare når utgiften allerede har en.
  const categories = data.categories.filter((c) => !c.hidden || c.id === existing?.categoryId);

  const save = () => {
    if (!canSave) return;
    const input = {
      name: f.name,
      amount,
      frequency: f.frequency,
      anchor: f.keepAnchor ?? f.next,
      categoryId: f.categoryId,
      note: f.note,
      remind: f.remind,
    };
    if (existing) updateRecurring(existing.id, input);
    else addRecurring({ ...input, merchantKey: f.merchantKey });
    done();
  };

  // Varslene legges inn når utgiften lagres. Sier man nei til varsler, står valget likevel, som for vanene.
  const toggleRemind = (remind: boolean) => {
    set({ remind });
    if (remind) requestPermission().catch(() => {});
  };

  const confirmDelete = () =>
    Alert.alert(tr.recurring.deleteTitle, tr.recurring.deleteBody, [
      { text: tr.common.cancel, style: 'cancel' },
      {
        text: tr.common.delete,
        style: 'destructive',
        onPress: () => {
          done();
          if (existing) deleteRecurring(existing.id);
        },
      },
    ]);

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScreenHeader
        title={existing ? tr.recurring.editTitle : tr.recurring.new}
        left={[{ label: tr.common.cancel, onPress: close }]}
        right={[{ label: existing ? tr.common.save : tr.common.add, variant: 'done', onPress: save, disabled: !canSave }]}
      />

      <ScrollView automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
        <Card style={styles.card}>
          {/* «$149» på engelsk, «149 kr» på norsk, midt i kortet. */}
          <AmountInput
            value={f.amount}
            onChangeText={(a) => set({ amount: a })}
            placeholder="0"
            unit={unit}
            unitFirst={unitFirst}
            keyboardType="decimal-pad"
            autoFocus={!existing && !f.name}
            accessibilityLabel={tr.recurring.amountIn(unit)}
          />

          <Text style={[styles.label, { color: t.sub }]} nativeID="recurring-name-label">
            {tr.common.name}
          </Text>
          <TextInput
            value={f.name}
            onChangeText={(name) => set({ name })}
            placeholder={tr.recurring.namePlaceholder}
            placeholderTextColor={t.faint}
            returnKeyType="done"
            maxLength={100}
            accessibilityLabelledBy="recurring-name-label"
            style={[styles.input, { backgroundColor: t.field, color: t.text }]}
          />

          <Text style={[styles.label, { color: t.sub }]}>{tr.recurring.howOften}</Text>
          <Segmented
            label={tr.recurring.howOften}
            value={f.frequency}
            onChange={(frequency) => set({ frequency, keepAnchor: null })}
            options={FREQUENCIES.map((value) => ({ value, label: tr.recurring.frequencyPick[value] }))}
          />

          <Text style={[styles.label, { color: t.sub }]}>{tr.recurring.nextCharge}</Text>
          <View style={styles.dateRow}>
            <Text style={[styles.dateText, { color: t.sub }]} numberOfLines={2}>
              {nextLabel(f.next, today)}
            </Text>
            <DateField value={f.next} min={today} max={last} text={nextLabel(f.next, today)} label={tr.recurring.nextCharge} onChange={moveTo} />
          </View>
        </Card>

        <Card style={styles.card}>
          <Text style={[styles.label, { color: t.sub }]}>{tr.recurring.categoryOptional}</Text>
          <CategoryPicker categories={categories} value={f.categoryId} onChange={(categoryId) => set({ categoryId: categoryId === f.categoryId ? null : categoryId })} />
        </Card>

        <Card style={styles.card}>
          <Text style={[styles.label, { color: t.sub }]} nativeID="recurring-note-label">
            {tr.recurring.note}
          </Text>
          <TextInput
            value={f.note}
            onChangeText={(note) => set({ note })}
            placeholder={tr.recurring.notePlaceholder}
            placeholderTextColor={t.faint}
            returnKeyType="done"
            maxLength={280}
            accessibilityLabelledBy="recurring-note-label"
            style={[styles.input, { backgroundColor: t.field, color: t.text }]}
          />
        </Card>

        <Card style={{ overflow: 'hidden' }}>
          <SwitchRow first label={tr.recurring.remind} value={f.remind} onChange={toggleRemind} />
          <Row>
            <Text style={[styles.help, { color: t.sub, paddingVertical: 8 }]}>{tr.recurring.remindHelp(showTime(RECURRING_REMINDER_TIME))}</Text>
          </Row>
        </Card>

        {existing ? (
          <View style={{ alignItems: 'center' }}>
            <TextButton label={tr.recurring.delete} color={t.danger} onPress={confirmDelete} />
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}


const styles = StyleSheet.create({
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  content: { padding: 16, gap: 12 },
  card: { padding: 14, gap: 10 },
  label: { fontSize: 13, fontWeight: '600' },
  help: { fontSize: 13, lineHeight: 18, flex: 1 },
  input: { height: 44, borderRadius: 10, paddingHorizontal: 12, fontSize: 17 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dateText: { flex: 1, fontSize: 15, fontWeight: '500' },
});
