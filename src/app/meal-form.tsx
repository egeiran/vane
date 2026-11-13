import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card, Row, Stepper, SwitchRow, TextButton } from '@/components/ui';
import { tr } from '@/i18n';
import { parseTime, shiftTime } from '@/lib/dates';
import { DEFAULT_MEALS, mealName } from '@/lib/food';
import { MAX_FOOD_NAME } from '@/lib/foodState';
import { foodHome, useFood } from '@/lib/foodStore';
import { requestPermission } from '@/lib/notifications';
import { showTime } from '@/lib/region';
import { useTheme } from '@/theme';

function close() {
  if (router.canGoBack()) router.back();
  else router.replace(foodHome());
}

const minutes = (time: string) => {
  const t = parseTime(time);
  return t.hour * 60 + t.minute;
};

/** Nytt måltid, eller endre et (?id=…): navn, tidsrom og «Har du logget …?». */
export default function MealFormScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const existing = useFood((s) => (id ? s.meals.find((m) => m.id === id) : undefined));
  const addMeal = useFood((s) => s.addMeal);
  const updateMeal = useFood((s) => s.updateMeal);
  const deleteMeal = useFood((s) => s.deleteMeal);
  const isDefault = !!existing && DEFAULT_MEALS.some((m) => m.id === existing.id);

  const [name, setName] = useState(existing ? mealName(existing) : '');
  const [hasWindow, setHasWindow] = useState(existing ? existing.start !== null : true);
  const [start, setStart] = useState(existing?.start ?? '12:00');
  const [end, setEnd] = useState(existing?.end ?? '13:00');
  const [remind, setRemind] = useState(existing?.remind ?? false);

  const canSave = !!name.trim();

  const save = () => {
    if (!canSave) return;
    // Et standardmåltid som ikke har fått nytt navn, beholder det norske navnet (se `mealName`).
    const keepName = existing && name.trim() === mealName(existing) ? existing.name : name.trim().slice(0, MAX_FOOD_NAME);
    const input = { name: keepName, start: hasWindow ? start : null, end: hasWindow ? end : null, remind: hasWindow && remind };
    if (existing) updateMeal(existing.id, input);
    else addMeal(input);
    close();
  };

  const toggleRemind = (on: boolean) => {
    setRemind(on);
    if (on) requestPermission().catch(() => {});
  };

  const confirmDelete = () =>
    existing &&
    Alert.alert(tr.food.deleteConfirm(mealName(existing)), tr.food.deleteHelp, [
      { text: tr.common.cancel, style: 'cancel' },
      {
        text: tr.common.delete,
        style: 'destructive',
        onPress: () => {
          close();
          deleteMeal(existing.id);
        },
      },
    ]);

  // Slutten er alltid etter starten, og starten før slutten.
  const moveStart = (delta: number) => {
    const next = shiftTime(start, delta, 0, 23 * 60 + 30);
    setStart(next);
    if (minutes(end) <= minutes(next)) setEnd(shiftTime(next, 15, 0, 23 * 60 + 45));
  };
  const moveEnd = (delta: number) => {
    const next = shiftTime(end, delta, 15, 23 * 60 + 45);
    setEnd(next);
    if (minutes(next) <= minutes(start)) setStart(shiftTime(next, -15));
  };

  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1, backgroundColor: t.bg }}>
      <View style={styles.bar}>
        <TextButton label={tr.common.cancel} onPress={close} />
        <Text style={[styles.barTitle, { color: t.text }]} accessibilityRole="header">
          {existing ? tr.food.editMeal : tr.food.newMeal}
        </Text>
        <TextButton label={existing ? tr.common.save : tr.common.add} bold onPress={save} disabled={!canSave} />
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
        <Card style={styles.card}>
          <Text style={[styles.label, { color: t.sub }]} nativeID="meal-name-label">
            {tr.common.name}
          </Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder={tr.food.mealNamePlaceholder}
            placeholderTextColor={t.faint}
            autoFocus={!existing}
            returnKeyType="done"
            maxLength={MAX_FOOD_NAME}
            accessibilityLabelledBy="meal-name-label"
            style={[styles.input, { backgroundColor: t.field, color: t.text }]}
          />
        </Card>

        <Card style={{ overflow: 'hidden' }}>
          <SwitchRow first label={tr.food.window} value={hasWindow} onChange={setHasWindow} />
          {hasWindow ? (
            <>
              <Row>
                <Text style={{ flex: 1, fontSize: 16, color: t.text }}>{tr.food.from}</Text>
                <Stepper value={showTime(start)} minWidth={60} onDecrease={() => moveStart(-15)} onIncrease={() => moveStart(15)} decreaseLabel={tr.common.earlier15} increaseLabel={tr.common.later15} />
              </Row>
              <Row>
                <Text style={{ flex: 1, fontSize: 16, color: t.text }}>{tr.food.to}</Text>
                <Stepper value={showTime(end)} minWidth={60} onDecrease={() => moveEnd(-15)} onIncrease={() => moveEnd(15)} decreaseLabel={tr.common.earlier15} increaseLabel={tr.common.later15} />
              </Row>
            </>
          ) : (
            <Row>
              <Text style={[styles.help, { color: t.sub }]}>{tr.food.noWindow}</Text>
            </Row>
          )}
        </Card>

        {hasWindow ? (
          <Card style={{ overflow: 'hidden' }}>
            <SwitchRow first label={tr.food.remind} value={remind} onChange={toggleRemind} />
            <Row>
              <Text style={[styles.help, { color: t.sub }]}>{tr.food.remindHelp}</Text>
            </Row>
          </Card>
        ) : null}

        {existing && !isDefault ? (
          <View style={{ alignItems: 'center' }}>
            <TextButton label={tr.food.deleteMeal} color={t.danger} onPress={confirmDelete} />
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, paddingTop: 10, paddingBottom: 4 },
  barTitle: { fontSize: 17, fontWeight: '600', flexShrink: 1, textAlign: 'center' },
  content: { padding: 16, gap: 12 },
  card: { padding: 14, gap: 10 },
  label: { fontSize: 13, fontWeight: '600' },
  input: { height: 44, borderRadius: 10, paddingHorizontal: 12, fontSize: 17 },
  help: { fontSize: 13, lineHeight: 18, flex: 1, paddingVertical: 8 },
});
