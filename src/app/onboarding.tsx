import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { SFSymbol } from 'sf-symbols-typescript';

import { Icon } from '@/components/Icon';
import { Card, PrimaryButton, Row, TextButton } from '@/components/ui';
import { tr } from '@/i18n';
import { frequencyText } from '@/lib/habits';
import { useMoney } from '@/lib/moneyStore';
import { requestPermission, scheduleNotificationSync } from '@/lib/notifications';
import {
  addOwnHabit,
  firstHabitInputs,
  HABIT_SUGGESTIONS,
  MAX_FIRST_HABITS,
  onboardingProgress,
  onboardingStart,
  rememberOnboarding,
  toggleFirstHabit,
  type FirstHabit,
  type OnboardingProgress,
  type OnboardingStep,
} from '@/lib/onboarding';
import { showTime, weekStartOf } from '@/lib/region';
import { getData, useStore } from '@/lib/store';
import type { Habit } from '@/lib/types';
import { useToday } from '@/lib/useToday';
import { useTheme } from '@/theme';

type Step = OnboardingStep;

/**
 * Første gang appen åpnes: hva Vane er, moduler, de første vanene, varsler (forklart før iOS spør),
 * widgetene og Apple Pay hvis Penger er valgt. Hvert steg lagres når man går videre, og «Hopp over»
 * avslutter med det som er valgt så langt. Alt kan endres i Innstillinger.
 */
export default function OnboardingScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const today = useToday();
  const settings = useStore((s) => s.settings);
  const update = useStore((s) => s.updateSettings);
  const addHabit = useStore((s) => s.addHabit);
  const weekStart = useStore((s) => weekStartOf(s.settings));
  const markSetupSeen = useMoney((s) => s.markSetupSeen);

  // Åpnes oppstarten på nytt underveis, fortsetter den der den var (se `rememberOnboarding`).
  const [step, setStepState] = useState<Step>(() => onboardingProgress()?.step ?? onboardingStart(getData()));
  const [money, setMoney] = useState(settings.modules.money);
  const [journal, setJournal] = useState(settings.modules.journal);
  const [recurring, setRecurring] = useState(settings.modules.recurring);
  const [food, setFood] = useState(!!settings.modules.food);
  const [chosen, setChosenState] = useState<FirstHabit[]>(() => onboardingProgress()?.chosen ?? []);
  const [own, setOwn] = useState('');
  const [setupOpened, setSetupOpenedState] = useState(() => onboardingProgress()?.setupOpened ?? false);
  const remember = (patch: Partial<OnboardingProgress>) =>
    rememberOnboarding({ step, chosen, setupOpened, ...onboardingProgress(), ...patch });
  const setStep = (s: Step) => {
    remember({ step: s });
    setStepState(s);
  };
  const setChosen = (fn: (c: FirstHabit[]) => FirstHabit[]) => {
    const next = fn(chosen);
    remember({ chosen: next });
    setChosenState(next);
  };
  const setSetupOpened = (v: boolean) => {
    remember({ setupOpened: v });
    setSetupOpenedState(v);
  };

  const steps: Step[] = ['welcome', 'modules', 'habits', 'notifications', 'widgets', ...(money ? (['applePay'] as const) : [])];
  const index = steps.indexOf(step);
  const last = index === steps.length - 1;

  // Når oppstarten er ferdig, slipper rotlayouten appen fram (se `_layout.tsx`).
  const finish = () => {
    rememberOnboarding(null);
    update({ onboarded: true });
  };
  const next = () => (last ? finish() : setStep(steps[index + 1]));

  const saveModules = () => {
    const m = settings.modules;
    if (money !== m.money || journal !== m.journal || recurring !== m.recurring || food !== !!m.food) update({ modules: { ...m, money, journal, recurring, food } });
    next();
  };
  const saveHabits = () => {
    for (const input of firstHabitInputs(chosen, tr.onboarding)) addHabit(input, today);
    next();
  };
  const allowNotifications = async () => {
    if (await requestPermission()) scheduleNotificationSync(0);
    next();
  };
  const openSetup = () => {
    markSetupSeen();
    setSetupOpened(true);
    router.push('/money-setup');
  };
  const skipSetup = () => {
    // Penger-fanen skal ikke åpne veiviseren av seg selv etterpå. Kortet der kan fortsatt åpne den.
    markSetupSeen();
    finish();
  };
  const addOwn = () => {
    setChosen((c) => addOwnHabit(c, own, tr.onboarding.suggestions));
    setOwn('');
  };

  const full = chosen.length >= MAX_FIRST_HABITS;

  let content: ReactNode;
  let primary: { label: string; onPress: () => void; disabled?: boolean };
  let secondary: { label: string; onPress: () => void } | null = null;

  switch (step) {
    case 'welcome':
      content = (
        <>
          <Title>{tr.onboarding.welcomeTitle}</Title>
          <Lead>{tr.onboarding.welcomeLead}</Lead>
          <View style={styles.points}>
            {(['checkmark.circle', 'square.grid.2x2', 'creditcard'] as SFSymbol[]).map((icon, i) => (
              <Point key={icon} icon={icon} text={tr.onboarding.welcomePoints[i]} />
            ))}
          </View>
          <Note>{tr.onboarding.welcomeNote}</Note>
        </>
      );
      primary = { label: tr.onboarding.start, onPress: next };
      break;

    case 'modules':
      content = (
        <>
          <Title>{tr.onboarding.modulesTitle}</Title>
          <Lead>{tr.onboarding.modulesLead}</Lead>
          <Card style={styles.list}>
            <Row first>
              <View style={styles.rowText}>
                <Text style={[styles.rowTitle, { color: t.text }]}>{tr.onboarding.habitsModule}</Text>
                <Text style={[styles.rowSub, { color: t.sub }]}>{tr.onboarding.always}</Text>
              </View>
              <Icon name="checkmark" size={16} color={t.sub} />
            </Row>
            <Row>
              <View style={styles.rowText}>
                <Text style={[styles.rowTitle, { color: t.text }]}>{tr.settings.moneyModule}</Text>
                <Text style={[styles.rowSub, { color: t.sub }]}>{tr.onboarding.moneyModuleSub}</Text>
              </View>
              <Switch value={money} onValueChange={setMoney} trackColor={{ true: t.switchOn }} accessibilityLabel={tr.settings.moneyModule} />
            </Row>
            {/* Faste utgifter ligger i Penger. */}
            {money ? (
              <Row>
                <View style={styles.rowText}>
                  <Text style={[styles.rowTitle, { color: t.text }]}>{tr.settings.recurringModule}</Text>
                  <Text style={[styles.rowSub, { color: t.sub }]}>{tr.onboarding.recurringModuleSub}</Text>
                </View>
                <Switch value={recurring} onValueChange={setRecurring} trackColor={{ true: t.switchOn }} accessibilityLabel={tr.settings.recurringModule} />
              </Row>
            ) : null}
            <Row>
              <View style={styles.rowText}>
                <Text style={[styles.rowTitle, { color: t.text }]}>{tr.settings.journalModule}</Text>
                <Text style={[styles.rowSub, { color: t.sub }]}>{tr.onboarding.journalModuleSub}</Text>
              </View>
              <Switch value={journal} onValueChange={setJournal} trackColor={{ true: t.switchOn }} accessibilityLabel={tr.settings.journalModule} />
            </Row>
            <Row>
              <View style={styles.rowText}>
                <Text style={[styles.rowTitle, { color: t.text }]}>{tr.settings.foodModule}</Text>
                <Text style={[styles.rowSub, { color: t.sub }]}>{tr.onboarding.foodModuleSub}</Text>
              </View>
              <Switch value={food} onValueChange={setFood} trackColor={{ true: t.switchOn }} accessibilityLabel={tr.settings.foodModule} />
            </Row>
          </Card>
        </>
      );
      primary = { label: tr.onboarding.next, onPress: saveModules };
      break;

    case 'habits':
      content = (
        <>
          <Title>{tr.onboarding.habitsTitle}</Title>
          <Lead>{tr.onboarding.habitsLead}</Lead>
          <Card style={styles.list}>
            {HABIT_SUGGESTIONS.map((s, i) => {
              const on = chosen.some((c) => 'key' in c && c.key === s.key);
              const name = tr.onboarding.suggestions[s.key];
              const sub = frequencyText({ ...s.input, name, unit: '', id: s.key, createdAt: today } as Habit, weekStart);
              return (
                <Pressable
                  key={s.key}
                  onPress={() => setChosen((c) => toggleFirstHabit(c, { key: s.key }))}
                  disabled={!on && full}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on, disabled: !on && full }}
                  accessibilityLabel={`${name}, ${sub}`}>
                  <Row first={i === 0}>
                    <Check on={on} color={t.colors[s.input.color].solid} faded={!on && full} />
                    <View style={styles.rowText}>
                      <Text style={[styles.rowTitle, { color: !on && full ? t.sub : t.text }]}>{name}</Text>
                      <Text style={[styles.rowSub, { color: t.sub }]}>{sub}</Text>
                    </View>
                  </Row>
                </Pressable>
              );
            })}
            {/* Egne vaner står under forslagene. Et trykk fjerner dem. */}
            {chosen.flatMap((c) =>
              'name' in c
                ? [
                    <Pressable
                      key={c.name}
                      onPress={() => setChosen((cs) => toggleFirstHabit(cs, c))}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: true }}
                      accessibilityLabel={c.name}
                      accessibilityHint={tr.onboarding.remove(c.name)}>
                      <Row>
                        <Check on color={t.text} />
                        <View style={styles.rowText}>
                          <Text style={[styles.rowTitle, { color: t.text }]}>{c.name}</Text>
                          <Text style={[styles.rowSub, { color: t.sub }]}>{tr.habits.everyDay}</Text>
                        </View>
                      </Row>
                    </Pressable>,
                  ]
                : []
            )}
          </Card>
          {!full ? (
            <View style={styles.ownRow}>
              <TextInput
                value={own}
                onChangeText={setOwn}
                onSubmitEditing={addOwn}
                submitBehavior="submit"
                returnKeyType="done"
                placeholder={tr.onboarding.ownPlaceholder}
                placeholderTextColor={t.faint}
                accessibilityLabel={tr.onboarding.ownHabit}
                style={[styles.input, { backgroundColor: t.card, color: t.text }]}
              />
              <Pressable
                onPress={addOwn}
                disabled={!own.trim()}
                accessibilityRole="button"
                accessibilityLabel={tr.onboarding.addOwn}
                style={[styles.addButton, { backgroundColor: own.trim() ? t.inverse : t.button }]}>
                <Icon name="plus" size={18} color={own.trim() ? t.onInverse : t.sub} />
              </Pressable>
            </View>
          ) : null}
          <Text style={[styles.count, { color: t.sub }]} accessibilityLiveRegion="polite">
            {tr.onboarding.chosen(chosen.length, MAX_FIRST_HABITS)}
          </Text>
        </>
      );
      primary = { label: tr.onboarding.next, onPress: saveHabits };
      break;

    case 'notifications':
      content = (
        <>
          <Title>{tr.onboarding.notificationsTitle}</Title>
          <Lead>{tr.onboarding.notificationsLead}</Lead>
          <View style={styles.points}>
            <Point icon="sun.max" text={tr.onboarding.morningPoint(tr.dates.at(showTime(settings.morningTime)))} />
            <Point icon="bell" text={tr.onboarding.remindersPoint} />
            {money ? <Point icon="creditcard" text={tr.onboarding.purchasesPoint} /> : null}
          </View>
          <Note>{tr.onboarding.notificationsNote}</Note>
        </>
      );
      primary = { label: tr.onboarding.allowNotifications, onPress: allowNotifications };
      secondary = { label: tr.onboarding.notNow, onPress: next };
      break;

    case 'widgets':
      content = (
        <>
          <Title>{tr.onboarding.widgetsTitle}</Title>
          <Lead>{tr.onboarding.widgetsLead}</Lead>
          <View style={styles.points}>
            {tr.onboarding.widgetSteps.map((text, i) => (
              <Point key={text} number={i + 1} text={text} />
            ))}
          </View>
          <Note>{tr.onboarding.lockNote}</Note>
        </>
      );
      primary = { label: last ? tr.onboarding.done : tr.onboarding.next, onPress: next };
      break;

    case 'applePay':
      content = (
        <>
          <Title>{tr.onboarding.applePayTitle}</Title>
          <Lead>{tr.onboarding.applePayLead}</Lead>
          <Note>{tr.onboarding.applePayNote}</Note>
        </>
      );
      primary = setupOpened ? { label: tr.onboarding.done, onPress: finish } : { label: tr.onboarding.setUpNow, onPress: openSetup };
      secondary = setupOpened ? { label: tr.onboarding.setUpNow, onPress: openSetup } : { label: tr.onboarding.later, onPress: skipSetup };
      break;
  }

  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1, backgroundColor: t.bg }}>
      <View style={[styles.top, { paddingTop: insets.top + 8 }]}>
        <View style={styles.dots} accessible accessibilityLabel={tr.onboarding.step(index + 1, steps.length)}>
          {steps.map((s, i) => (
            <View key={s} style={[styles.dot, { backgroundColor: i <= index ? t.text : t.border }]} />
          ))}
        </View>
        {!last ? (
          <Pressable onPress={finish} accessibilityRole="button" accessibilityLabel={tr.onboarding.skipLabel} hitSlop={8} style={styles.skip}>
            <Text style={{ fontSize: 16, fontWeight: '500', color: t.sub }}>{tr.onboarding.skip}</Text>
          </Pressable>
        ) : null}
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        {content}
      </ScrollView>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + 12 }]}>
        <PrimaryButton label={primary.label} onPress={primary.onPress} disabled={primary.disabled} />
        {secondary ? (
          <View style={{ alignItems: 'center' }}>
            <TextButton label={secondary.label} color={t.sub} onPress={secondary.onPress} />
          </View>
        ) : null}
      </View>
    </KeyboardAvoidingView>
  );
}

function Title({ children }: { children: string }) {
  const t = useTheme();
  return (
    <Text style={[styles.title, { color: t.text }]} accessibilityRole="header">
      {children}
    </Text>
  );
}

function Lead({ children }: { children: string }) {
  const t = useTheme();
  return <Text style={[styles.lead, { color: t.sub }]}>{children}</Text>;
}

function Note({ children }: { children: string }) {
  const t = useTheme();
  return <Text style={[styles.note, { color: t.sub }]}>{children}</Text>;
}

function Point({ icon, number, text }: { icon?: SFSymbol; number?: number; text: string }) {
  const t = useTheme();
  return (
    <View style={styles.point}>
      <View style={[styles.badge, { backgroundColor: t.card }]}>
        {icon ? <Icon name={icon} size={20} color={t.text} /> : <Text style={[styles.badgeNumber, { color: t.text }]}>{number}</Text>}
      </View>
      <Text style={[styles.pointText, { color: t.text }]}>{text}</Text>
    </View>
  );
}

function Check({ on, color, faded }: { on: boolean; color: string; faded?: boolean }) {
  const t = useTheme();
  return (
    <View style={[styles.check, on ? { backgroundColor: color, borderColor: color } : { borderColor: faded ? t.hair : t.border }]}>
      {on ? <Icon name="checkmark" size={13} color={t.card} weight="bold" /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, minHeight: 44 },
  dots: { flexDirection: 'row', gap: 6, paddingVertical: 12 },
  dot: { width: 18, height: 4, borderRadius: 2 },
  skip: { minHeight: 44, justifyContent: 'center' },
  content: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 24, gap: 14 },
  title: { fontSize: 34, lineHeight: 40, fontWeight: '700', letterSpacing: -0.5 },
  lead: { fontSize: 17, lineHeight: 24 },
  note: { fontSize: 14, lineHeight: 20, marginTop: 6 },
  points: { gap: 16, marginTop: 10 },
  point: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  badge: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  badgeNumber: { fontSize: 16, fontWeight: '700', fontVariant: ['tabular-nums'] },
  pointText: { flex: 1, fontSize: 16, lineHeight: 22 },
  list: { overflow: 'hidden', marginTop: 8 },
  rowText: { flex: 1, gap: 2, paddingVertical: 8 },
  rowTitle: { fontSize: 16, fontWeight: '600' },
  rowSub: { fontSize: 13, lineHeight: 18 },
  check: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  ownRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  input: { flex: 1, height: 48, borderRadius: 14, paddingHorizontal: 14, fontSize: 16 },
  addButton: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  count: { fontSize: 13, paddingHorizontal: 4 },
  bottom: { paddingHorizontal: 24, paddingTop: 8, gap: 4 },
});
