import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { tr } from '@/i18n';
import { amountText, formatNumber, kcalText, nutrientsFor, parseDecimal, proteinText, takesGrams, type Source } from '@/lib/food';
import type { Amount } from '@/lib/types';
import { useTheme } from '@/theme';

import { Stepper } from './ui';

type Props = {
  source: Source;
  /** Knappene øverst: porsjonene, og «100 g» når mengden kan være gram. */
  options: Amount[];
  value: Amount;
  onChange: (a: Amount) => void;
  showKcal: boolean;
};

const MAX_GRAMS = 5000;
const MAX_COUNT = 20;

const same = (a: Amount, b: Amount) =>
  a.kind === b.kind && (a.kind === 'grams' ? a.grams === (b as typeof a).grams : a.count === (b as typeof a).count && a.label === (b as typeof a).label);

/** «1 stk (56 g)», «100 g», «1 beger». */
export function optionLabel(a: Amount): string {
  if (a.kind === 'portion' && a.grams !== null && a.label) return `${amountText(a)} (${formatNumber(a.grams * a.count)} g)`;
  return amountText(a);
}

/**
 * Hvor mye: knapper for porsjonene, + og − (en halv porsjon eller 5–10 g om gangen), og gram skrevet
 * inn. Under står hva det blir: «= 47 g protein · 240 kcal».
 */
export function AmountPicker({ source, options, value, onChange, showKcal }: Props) {
  const t = useTheme();
  const n = nutrientsFor(source, value);
  const grams = takesGrams(source);
  // Det som står i gramfeltet mens man skriver, så feltet kan tømmes før man skriver et nytt tall.
  const [draft, setDraft] = useState<string | null>(null);
  const gramsText = value.kind === 'grams' ? String(value.grams) : value.grams !== null ? formatNumber(value.grams * value.count) : '';

  const step = (dir: 1 | -1) => {
    if (value.kind === 'portion') {
      onChange({ ...value, count: Math.min(MAX_COUNT, Math.max(0.5, value.count + dir * 0.5)) });
    } else {
      const size = value.grams + (dir > 0 ? 0 : -1) < 50 ? 5 : 10;
      const next = Math.round((value.grams + dir * size) / size) * size;
      onChange({ kind: 'grams', grams: Math.min(MAX_GRAMS, Math.max(5, next)) });
    }
  };

  return (
    <View style={{ gap: 14 }}>
      {options.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} keyboardShouldPersistTaps="handled">
          {options.map((o) => {
            const on = same(o, value);
            return (
              <Pressable
                key={optionLabel(o)}
                onPress={() => {
                  setDraft(null);
                  onChange(o);
                }}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                style={({ pressed }) => [styles.chip, { backgroundColor: on ? t.inverse : t.button, opacity: pressed ? 0.7 : 1 }]}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: on ? t.onInverse : t.text }}>{optionLabel(o)}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}

      <View style={styles.row}>
        <Text style={[styles.label, { color: t.text }]}>{tr.food.amount}</Text>
        <Stepper
          value={amountText(value)}
          minWidth={92}
          onDecrease={() => {
            setDraft(null);
            step(-1);
          }}
          onIncrease={() => {
            setDraft(null);
            step(1);
          }}
          decreaseLabel={tr.food.less}
          increaseLabel={tr.food.more}
        />
      </View>

      {grams ? (
        <View style={styles.row}>
          <Text style={[styles.label, { color: t.sub }]} nativeID="amount-grams-label">
            {tr.food.portionWeight}
          </Text>
          <TextInput
            value={draft ?? gramsText}
            onChangeText={(text) => {
              setDraft(text);
              const g = parseDecimal(text);
              if (g !== null && g > 0) onChange({ kind: 'grams', grams: Math.min(MAX_GRAMS, Math.round(g)) });
            }}
            onBlur={() => setDraft(null)}
            keyboardType="number-pad"
            placeholder="100"
            placeholderTextColor={t.faint}
            selectTextOnFocus
            accessibilityLabelledBy="amount-grams-label"
            style={[styles.input, { backgroundColor: t.field, color: t.text }]}
          />
        </View>
      ) : null}

      <Text style={[styles.result, { color: t.text }]} accessibilityLiveRegion="polite">
        {n ? ['=', `${proteinText(n.protein, true)} ${tr.food.protein.toLowerCase()}`, showKcal && n.kcal !== null ? `· ${kcalText(n.kcal)}` : ''].filter(Boolean).join(' ') : tr.food.cannotCount}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chips: { gap: 8, paddingRight: 8 },
  chip: { minHeight: 40, borderRadius: 20, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  label: { fontSize: 16, fontWeight: '500', flexShrink: 1 },
  input: { width: 110, height: 44, borderRadius: 10, paddingHorizontal: 12, fontSize: 17, textAlign: 'right', fontVariant: ['tabular-nums'] },
  result: { fontSize: 20, fontWeight: '700', fontVariant: ['tabular-nums'] },
});
