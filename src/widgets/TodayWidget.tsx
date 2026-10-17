import { Button, HStack, Image, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import {
  buttonStyle,
  containerBackground,
  font,
  foregroundStyle,
  frame,
  lineLimit,
  monospacedDigit,
  padding,
  widgetURL,
} from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

import type { TodayWidgetItem, TodayWidgetProps } from './types';

/**
 * Dagens vaner på hjemskjermen. Trykk på en vane huker av (eller legger til én),
 * uten at appen åpnes. Appen leser endringene tilbake neste gang den åpnes.
 *
 * NB: Koden under kjører i widgetens egen runtime. Alt den trenger må ligge inne i funksjonen.
 */
const TodayWidget = (props: TodayWidgetProps, environment: WidgetEnvironment) => {
  'widget';
  const dark = environment.colorScheme === 'dark';
  const bg = dark ? '#1C1C1E' : '#FFFFFF';
  const text = dark ? '#F2F2F0' : '#1C1C1E';
  const sub = dark ? '#A1A1A6' : '#6A6A6F';
  const family = environment.widgetFamily ?? 'systemMedium';
  const limit = family === 'systemSmall' ? 3 : family === 'systemMedium' ? 6 : 9;
  const all = props.items ?? [];
  const shown = all.slice(0, limit);
  const done = all.filter((i) => i.value >= i.target).length;

  const withValue = (id: string, value: number) => ({
    items: all.map((i) => (i.id === id ? { ...i, value } : i)),
  });

  const row = (item: TodayWidgetItem) => {
    const c = dark ? item.dark : item.light;
    const complete = item.value >= item.target;
    const next = item.kind === 'count' ? Math.min(item.value + 1, item.target) : complete ? 0 : 1;
    const icon = complete ? 'checkmark.circle.fill' : item.kind === 'count' ? 'plus.circle' : 'circle';
    return (
      <Button
        key={item.id}
        target={`tap:${item.id}`}
        onPress={() => withValue(item.id, next)}
        modifiers={[buttonStyle('plain')]}>
        <HStack spacing={8}>
          <Image systemName={icon} color={c.solid} size={20} />
          <Text modifiers={[font({ size: 14, weight: 'semibold' }), foregroundStyle(complete ? sub : text), lineLimit(1)]}>
            {item.name}
          </Text>
          <Spacer />
          {item.kind === 'count' ? (
            <Text modifiers={[font({ size: 12, weight: 'medium' }), foregroundStyle(sub), monospacedDigit()]}>
              {`${item.value}/${item.target}`}
            </Text>
          ) : null}
        </HStack>
      </Button>
    );
  };

  const header = (
    <HStack>
      <Text modifiers={[font({ size: 15, weight: 'bold' }), foregroundStyle(text)]}>I dag</Text>
      <Spacer />
      <Text modifiers={[font({ size: 13 }), foregroundStyle(sub), monospacedDigit()]}>{`${done} av ${all.length}`}</Text>
    </HStack>
  );

  const root = [containerBackground(bg, 'widget'), widgetURL('vane://')];

  if (!props.hasHabits || all.length === 0) {
    return (
      <VStack alignment="leading" spacing={6} modifiers={root}>
        {header}
        <Spacer />
        <Text modifiers={[font({ size: 13 }), foregroundStyle(sub)]}>
          {props.hasHabits ? 'Ingen vaner i dag.' : 'Legg til en vane i appen.'}
        </Text>
      </VStack>
    );
  }

  if (family === 'systemMedium' && shown.length > 3) {
    const left = shown.filter((_, i) => i % 2 === 0);
    const right = shown.filter((_, i) => i % 2 === 1);
    return (
      <VStack alignment="leading" spacing={8} modifiers={root}>
        {header}
        <HStack alignment="top" spacing={14}>
          <VStack alignment="leading" spacing={8} modifiers={[frame({ maxWidth: Infinity, alignment: 'leading' })]}>
            {left.map(row)}
          </VStack>
          <VStack alignment="leading" spacing={8} modifiers={[frame({ maxWidth: Infinity, alignment: 'leading' })]}>
            {right.map(row)}
          </VStack>
        </HStack>
        <Spacer />
      </VStack>
    );
  }

  return (
    <VStack alignment="leading" spacing={family === 'systemLarge' ? 12 : 8} modifiers={root}>
      {header}
      {shown.map(row)}
      <Spacer />
      {family === 'systemLarge' && props.goalsTotal > 0 ? (
        <Text modifiers={[font({ size: 13 }), foregroundStyle(sub), padding({ top: 4 })]}>
          {`Dagens mål: ${props.goalsDone} av ${props.goalsTotal}`}
        </Text>
      ) : null}
    </VStack>
  );
};

export default createWidget<TodayWidgetProps>('TodayWidget', TodayWidget, {
  day: '',
  items: [],
  goalsDone: 0,
  goalsTotal: 0,
  hasHabits: false,
});
