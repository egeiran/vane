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

import type { TodayWidgetGoal, TodayWidgetItem, TodayWidgetProps } from './types';

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

  const amount = (i: TodayWidgetItem) => `${i.value} av ${i.target}${i.unit ? ` ${i.unit}` : ''}`;
  const vaner = (n: number) => `${n} ${n === 1 ? 'vane' : 'vaner'}`;

  let label = 'I DAG';
  let title = '';
  let detail = '';
  if (mode === 'prompt') {
    label = 'GOD MORGEN';
    title = 'Hva vil du få til i dag?';
    detail = daily.length ? `${vaner(daily.length)} i dag` : '';
  } else if (mode === 'goal' && goal) {
    label = small ? 'DAGENS MÅL' : `DAGENS MÅL · ${doneGoals.length} AV ${goals.length}`;
    title = goal.text;
    detail =
      openGoals.length > 1
        ? `+ ${openGoals.length - 1} til`
        : doneGoals.length === 1
          ? `${doneGoals[0].text} er gjort`
          : doneGoals.length > 1
            ? `${doneGoals.length} mål er gjort`
            : '';
  } else if (mode === 'habit' && habit) {
    const after = open[1];
    label = 'IGJEN I DAG';
    title = habit.name;
    detail =
      habit.kind === 'count'
        ? amount(habit)
        : after
          ? `Etterpå: ${after.name}${after.time ? ` ${after.time}` : ''}`
          : habit.time
            ? `kl. ${habit.time}`
            : 'Den siste i dag';
  } else if (mode === 'done') {
    title = 'Alt er gjort';
    detail = [daily.length ? vaner(daily.length) : '', goals.length ? `${goals.length} mål` : ''].filter(Boolean).join(' og ');
  } else {
    title = props.hasHabits ? 'Ingen vaner i dag' : 'Legg til en vane i appen';
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
  const habitsText = daily.length ? `${doneCount} av ${vaner(daily.length)}` : '';
  const goalsText = goals.length && mode !== 'goal' ? `mål ${doneGoals.length} av ${goals.length}` : '';
  const foot = [habitsText, goalsText].filter(Boolean).join(' · ');

  const root = [
    containerBackground(bg, 'widget'),
    widgetURL('vane://'),
    frame({ maxWidth: Infinity, maxHeight: Infinity, alignment: 'topLeading' }),
  ];

  if (small) {
    const smallFoot =
      mode === 'prompt'
        ? 'Sett mål'
        : mode === 'goal'
          ? `${doneGoals.length} av ${goals.length} mål`
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
    const right = i.kind === 'count' ? `${i.value}/${i.target}` : i.weekly ? 'denne uka' : i.time;
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
          <Text modifiers={[font({ size: 11, weight: 'bold' }), kerning(0.6), foregroundStyle(sub)]}>RESTEN AV DAGEN</Text>
          {rest.map(row)}
        </VStack>
      ) : null}
      <Spacer />
      {doneNames.length ? (
        <Text modifiers={[font({ size: 13 }), foregroundStyle(sub), lineLimit(2), padding({ bottom: 8 })]}>{`Gjort: ${doneNames.join(', ')}`}</Text>
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
});
