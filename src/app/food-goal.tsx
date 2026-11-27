import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AmountInput } from '@/components/AmountInput';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Sheet } from '@/components/Sheet';
import { useDiscardGuard } from '@/components/useDiscardGuard';
import { Field } from '@/components/Field';
import { Card, TextButton } from '@/components/ui';
import { tr } from '@/i18n';
import { currentGoal, decimalInput, formatNumber, MAX_GOAL, parseDecimal } from '@/lib/food';
import { foodHome, useFood } from '@/lib/foodStore';
import { useToday } from '@/lib/useToday';
import { useTheme } from '@/theme';

function close() {
  if (router.canGoBack()) router.back();
  else router.replace(foodHome());
}

/** Proteinmålet: et fast antall gram per dag, med en hjelper som regner ut fra vekt. */
export default function FoodGoalScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const today = useToday();
  const setGoal = useFood((s) => s.setGoal);
  const existing = useFood((s) => currentGoal(s));
  const [grams, setGrams] = useState(existing ? String(existing) : '');
  // Endringer som ikke er lagret: spør før arket lukkes (Avbryt, sveip ned eller tilbake).
  const [initial] = useState(() => grams);
  const allowClose = useDiscardGuard(grams !== initial);
  const done = () => {
    allowClose();
    close();
  };
  const [weight, setWeight] = useState('');
  const [perKg, setPerKg] = useState(decimalInput(1.6));

  const value = parseDecimal(grams);
  const canSave = value !== null && value >= 1 && value <= MAX_GOAL;
  const w = parseDecimal(weight);
  const k = parseDecimal(perKg);
  const helped = w && k ? Math.round(w * k) : null;

  const save = () => {
    if (!canSave) return;
    setGoal(value, today);
    done();
  };

  return (
    <Sheet>
      <ScreenHeader
        title={tr.food.goalTitle}
        left={[{ label: tr.common.cancel, onPress: close }]}
        right={[{ label: tr.common.save, variant: 'done', onPress: save, disabled: !canSave }]}
      />

      <ScrollView automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
        <Card style={styles.card}>
          <AmountInput
            value={grams}
            onChangeText={setGrams}
            placeholder="140"
            unit="g"
            fontSize={52}
            unitSize={26}
            keyboardType="number-pad"
            autoFocus={!existing}
            maxLength={3}
            accessibilityLabel={tr.food.goalLabel}
          />
          <Text style={[styles.center, { color: t.sub }]}>{tr.food.goalLabel}</Text>
        </Card>
        <Text style={[styles.help, { color: t.sub }]}>{tr.food.goalHelp}</Text>

        <Card style={styles.card}>
          <Text style={[styles.cardTitle, { color: t.text }]}>{tr.food.helperTitle}</Text>
          <Field label={tr.food.helperWeight} value={weight} onChange={setWeight} placeholder="75" keyboardType="decimal-pad" />
          <Field label={tr.food.helperPerKg} value={perKg} onChange={setPerKg} keyboardType="decimal-pad" />
          {helped ? (
            <View style={styles.result}>
              <Text style={[styles.resultText, { color: t.text }]}>{tr.food.helperResult(formatNumber(helped))}</Text>
              <TextButton label={tr.food.helperUse} bold onPress={() => setGrams(String(Math.min(MAX_GOAL, helped)))} />
            </View>
          ) : null}
          <Text style={[styles.help, { color: t.sub, paddingHorizontal: 0 }]}>{tr.food.helperNote}</Text>
        </Card>
      </ScrollView>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12 },
  card: { padding: 16, gap: 12 },
  cardTitle: { fontSize: 17, fontWeight: '700' },
  center: { textAlign: 'center', fontSize: 15 },
  help: { fontSize: 13, lineHeight: 18, paddingHorizontal: 4 },
  result: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  resultText: { fontSize: 17, fontWeight: '700', fontVariant: ['tabular-nums'] },
});
