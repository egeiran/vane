import { Button, Circle, HStack, Image, Link, Spacer, Text, VStack, ZStack } from '@expo/ui/swift-ui';
import {
  buttonStyle,
  containerBackground,
  font,
  foregroundStyle,
  frame,
  kerning,
  lineLimit,
  monospacedDigit,
  opacity,
  padding,
  widgetURL,
} from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

import type { TodayWidgetGoal, TodayWidgetItem, TodayWidgetProps, TodayWidgetText } from './types';

/**
 * «Én ting» på hjemskjermen: det viktigste akkurat nå, med én knapp. Om morgenen er det å sette
 * dagens mål, så første uferdige mål, så neste vane. Under står en prikk per daglig vane.
 * Trykk huker av uten at appen åpnes. Appen leser endringene tilbake neste gang den åpnes.
 *
 * NB: Koden under kjører i widgetens egen runtime. Alt den trenger må ligge inne i funksjonen.
 */
const TodayWidget = (props: TodayWidgetProps, environment: WidgetEnvironment) => {
  'widget';
  const dark = environment.colorScheme === 'dark';
  const bg = dark ? '#1C1C1E' : '#FFFFFF';
  const text = dark ? '#F2F2F0' : '#1C1C1E';
  const sub = dark ? '#A1A1A6' : '#6A6A6F';
  const empty = dark ? '#2A2A2D' : '#E9E9E4';
  const family = environment.widgetFamily ?? 'systemMedium';
  const small = family === 'systemSmall';
  const large = family === 'systemLarge';

  const items = props.items ?? [];
  const goals = props.goals ?? [];
  const daily = items.filter((i) => !i.weekly);
  const isDone = (i: TodayWidgetItem) => i.value >= i.target;
  const doneCount = daily.filter(isDone).length;
  const openGoals = goals.filter((g) => !g.done);
  const doneGoals = goals.filter((g) => g.done);
  // Samme rekkefølge som i appen: vaner med påminnelse først, etter klokkeslett.
  const timed = daily.filter((i) => !isDone(i) && i.time).sort((a, b) => (a.time! < b.time! ? -1 : 1));
  const open = [...timed, ...daily.filter((i) => !isDone(i) && !i.time)];
  const colors = (i: TodayWidgetItem) => (dark ? i.dark : i.light);

  // Trykk gjelder bare dagens oppslag. Et utdatert oppslag (i går etter midnatt, eller morgendagens
  // rett etter at appen har sendt nye) skal ikke endres, ellers havner trykket på feil dag.
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  const now = new Date();
  const isToday = props.day === `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const withValue = (id: string, value: number) =>
    isToday ? { items: items.map((i) => (i.id === id ? { ...i, value } : i)) } : {};
  const withGoalDone = (id: string) =>
    isToday ? { goals: goals.map((g) => (g.id === id ? { ...g, done: true } : g)) } : {};
  const nextValue = (i: TodayWidgetItem) => (i.kind === 'count' ? Math.min(i.value + 1, i.target) : isDone(i) ? 0 : 1);

  const goal: TodayWidgetGoal | undefined = openGoals[0];
  const habit: TodayWidgetItem | undefined = open[0];
  const mode = props.goalPrompt ? 'prompt' : goal ? 'goal' : habit ? 'habit' : daily.length || goals.length ? 'done' : 'empty';

  // Teksten kommer fra appen, på telefonens språk. Maler som «{done} av {total}» fylles inn her.
  const T = props.text ?? ({} as TodayWidgetText);
  const fill = (template: string | undefined, values: Record<string, string | number>) =>
    (template ?? '').replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ''));

  const amount = (i: TodayWidgetItem) => fill(T.amount, { value: i.value, target: i.target }) + (i.unit ? ` ${i.unit}` : '');
  const waiting = props.waiting ?? 0;
  const vaner = (n: number) => fill(n === 1 ? T.habitOne : T.habitOther, { n });

  let label = T.labelToday ?? '';
  let title = '';
  let detail = '';
  if (mode === 'prompt') {
    label = T.labelMorning ?? '';
    title = T.prompt ?? '';
    detail = daily.length ? fill(T.habitsToday, { habits: vaner(daily.length) }) : '';
  } else if (mode === 'goal' && goal) {
    label = small ? (T.labelGoals ?? '') : fill(T.labelGoalsCount, { done: doneGoals.length, total: goals.length });
    title = goal.text;
    detail =
      openGoals.length > 1
        ? fill(T.moreGoals, { n: openGoals.length - 1 })
        : doneGoals.length === 1
          ? fill(T.goalDone, { goal: doneGoals[0].text })
          : doneGoals.length > 1
            ? fill(T.goalsDone, { n: doneGoals.length })
            : '';
  } else if (mode === 'habit' && habit) {
    const after = open[1];
    label = T.labelLeft ?? '';
    title = habit.name;
    detail =
      habit.kind === 'count'
        ? amount(habit)
        : after
          ? fill(T.after, { name: `${after.name}${after.time ? ` ${after.time}` : ''}` })
          : habit.time
            ? fill(T.at, { time: habit.time })
            : (T.last ?? '');
  } else if (mode === 'done') {
    title = T.allDone ?? '';
    detail = [daily.length ? vaner(daily.length) : '', goals.length ? fill(goals.length === 1 ? T.goalOne : T.goalOther, { n: goals.length }) : '']
      .filter(Boolean)
      .join(T.and ?? ' ');
  } else {
    title = (props.hasHabits ? T.noHabitsToday : T.addHabit) ?? '';
  }

  // Den store knappen. To like store symboler oppå hverandre gir en myk fylt sirkel med kant.
  const action = (size: number) => {
    if (mode === 'prompt') {
      return (
        <Link destination="vane://goals">
          <Image systemName="plus.circle.fill" size={size} color={text} />
        </Link>
      );
    }
    if (mode === 'goal' && goal) {
      return (
        <Button target={`goal:${goal.id}`} onPress={() => withGoalDone(goal.id)} modifiers={[buttonStyle('plain')]}>
          <Image systemName="circle" size={size} color={text} />
        </Button>
      );
    }
    if (mode === 'habit' && habit) {
      const c = colors(habit);
      return (
        <Button target={`tap:${habit.id}`} onPress={() => withValue(habit.id, nextValue(habit))} modifiers={[buttonStyle('plain')]}>
          <ZStack>
            <Image systemName="circle.fill" size={size} color={c.soft} />
            <Image systemName={habit.kind === 'count' ? 'plus.circle' : 'circle'} size={size} color={c.solid} />
          </ZStack>
        </Button>
      );
    }
    if (mode === 'done') return <Image systemName="checkmark.circle" size={size} color={sub} />;
    return null;
  };

  // Lite merke nede i hjørnet når kjøp venter på kategori. Den lille widgeten er ett trykkområde,
  // så der vises det bare.
  const waitingContent = (
    <HStack spacing={3}>
      <Image systemName="creditcard" size={11} color={sub} />
      <Text modifiers={[font({ size: 12, weight: 'semibold' }), foregroundStyle(sub), monospacedDigit()]}>{`${waiting}`}</Text>
    </HStack>
  );
  const waitingLink = <Link destination="vane://money">{waitingContent}</Link>;
  const waitingMark = waiting > 0 ? (small ? waitingContent : waitingLink) : null;

  const labelText = (
    <Text modifiers={[font({ size: 11, weight: 'bold' }), kerning(0.6), foregroundStyle(sub), lineLimit(1)]}>{label}</Text>
  );

  // En prikk per daglig vane. Fargestyrken viser hvor mye som er gjort, som i oversikten i appen.
  const dots = (size: number) =>
    daily.slice(0, 10).map((i) => {
      const f = Math.min(i.value / i.target, 1);
      return (
        <Circle
          key={i.id}
          modifiers={[frame({ width: size, height: size }), foregroundStyle(f > 0 ? colors(i).solid : empty), opacity(f > 0 ? 0.25 + 0.75 * f : 1)]}
        />
      );
    });
  const habitsText = daily.length ? fill(T.habitsDoneOf, { done: doneCount, habits: vaner(daily.length) }) : '';
  const goalsText = goals.length && mode !== 'goal' ? fill(T.goalsFoot, { done: doneGoals.length, total: goals.length }) : '';
  const foot = [habitsText, goalsText].filter(Boolean).join(' · ');

  const root = [
    containerBackground(bg, 'widget'),
    widgetURL('vane://'),
    frame({ maxWidth: Infinity, maxHeight: Infinity, alignment: 'topLeading' }),
  ];

  if (small) {
    const smallFoot =
      mode === 'prompt'
        ? (T.setGoal ?? '')
        : mode === 'goal'
          ? fill(T.goalsOf, { done: doneGoals.length, total: goals.length })
          : mode === 'habit' && habit
            ? habit.kind === 'count'
              ? `${habit.value}/${habit.target}`
              : habit.time || `${doneCount}/${daily.length}`
            : '';
    return (
      <VStack alignment="leading" spacing={4} modifiers={root}>
        {labelText}
        <Text modifiers={[font({ size: 17, weight: 'bold' }), foregroundStyle(text), lineLimit(3)]}>{title}</Text>
        <Spacer />
        <HStack spacing={8}>
          {action(36)}
          {smallFoot ? (
            <Text modifiers={[font({ size: 12, weight: 'medium' }), foregroundStyle(sub), lineLimit(2)]}>{smallFoot}</Text>
          ) : null}
          <Spacer />
          {waitingMark}
        </HStack>
      </VStack>
    );
  }

  const focus = (titleSize: number, buttonSize: number) => (
    <HStack spacing={14}>
      <VStack alignment="leading" spacing={3} modifiers={[frame({ maxWidth: Infinity, alignment: 'leading' })]}>
        {labelText}
        <Text modifiers={[font({ size: titleSize, weight: 'bold' }), foregroundStyle(text), lineLimit(2)]}>{title}</Text>
        {detail ? <Text modifiers={[font({ size: 13 }), foregroundStyle(sub), lineLimit(1)]}>{detail}</Text> : null}
      </VStack>
      {action(buttonSize)}
    </HStack>
  );

  const dotRow = (
    <HStack spacing={5}>
      {dots(9)}
      {foot ? (
        <Text modifiers={[font({ size: 12 }), foregroundStyle(sub), monospacedDigit(), lineLimit(1), padding({ leading: 4 })]}>{foot}</Text>
      ) : null}
      <Spacer />
      {waitingMark}
    </HStack>
  );

  if (!large) {
    return (
      <VStack alignment="leading" spacing={0} modifiers={root}>
        <Spacer />
        {focus(21, 50)}
        <Spacer />
        {dotRow}
      </VStack>
    );
  }

  // Stor: det viktigste øverst, så resten av dagen som vanlige rader, og det som er gjort nederst.
  const rest = [...(mode === 'habit' ? open.slice(1) : open), ...items.filter((i) => i.weekly && !isDone(i))].slice(0, 4);
  const row = (i: TodayWidgetItem) => {
    const c = colors(i);
    const right = i.kind === 'count' ? `${i.value}/${i.target}` : i.weekly ? T.thisWeek : i.time;
    return (
      <Button key={i.id} target={`tap:${i.id}`} onPress={() => withValue(i.id, nextValue(i))} modifiers={[buttonStyle('plain')]}>
        <HStack spacing={10}>
          <Image systemName={isDone(i) ? 'checkmark.circle.fill' : i.kind === 'count' ? 'plus.circle' : 'circle'} color={c.solid} size={22} />
          <Text modifiers={[font({ size: 15, weight: 'semibold' }), foregroundStyle(text), lineLimit(1)]}>{i.name}</Text>
          <Spacer />
          {right ? <Text modifiers={[font({ size: 13 }), foregroundStyle(sub), monospacedDigit()]}>{right}</Text> : null}
        </HStack>
      </Button>
    );
  };
  const doneNames = [...doneGoals.map((g) => g.text), ...daily.filter(isDone).map((i) => i.name)];

  return (
    <VStack alignment="leading" spacing={0} modifiers={root}>
      {focus(24, 56)}
      {rest.length ? (
        <VStack alignment="leading" spacing={8} modifiers={[padding({ top: 18 })]}>
          <Text modifiers={[font({ size: 11, weight: 'bold' }), kerning(0.6), foregroundStyle(sub)]}>{T.restOfDay ?? ''}</Text>
          {rest.map(row)}
        </VStack>
      ) : null}
      <Spacer />
      {doneNames.length ? (
        <Text modifiers={[font({ size: 13 }), foregroundStyle(sub), lineLimit(2), padding({ bottom: 8 })]}>{fill(T.doneList, { names: doneNames.join(', ') })}</Text>
      ) : null}
      {dotRow}
    </VStack>
  );
};

export default createWidget<TodayWidgetProps>('TodayWidget', TodayWidget, {
  day: '',
  items: [],
  goals: [],
  goalPrompt: true,
  hasHabits: false,
  waiting: 0,
  // Bare det som vises før appen har sendt noe. Appen sender all tekst på telefonens språk.
  text: { labelMorning: 'GOD MORGEN', prompt: 'Hva vil du få til i dag?', setGoal: 'Sett mål' } as TodayWidgetText,
});
