import { AccessoryWidgetBackground, Gauge, Text, VStack, ZStack } from '@expo/ui/swift-ui';
import { containerBackground, font, gaugeStyle, lineLimit, widgetURL } from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

import type { LockWidgetProps } from './types';

/** Låseskjermen: ring med dagens vaner, eller en linje med vaner og mål. */
const LockWidget = (props: LockWidgetProps, environment: WidgetEnvironment) => {
  'widget';
  const family = environment.widgetFamily;
  const value = props.total > 0 ? props.done / props.total : 0;
  const root = [containerBackground('clear', 'widget'), widgetURL('vane://')];

  if (family === 'accessoryCircular') {
    return (
      <ZStack modifiers={root}>
        <AccessoryWidgetBackground />
        <Gauge
          value={value}
          modifiers={[gaugeStyle('circularCapacity')]}
          currentValueLabel={<Text modifiers={[font({ size: 14, weight: 'semibold' })]}>{`${props.done}/${props.total}`}</Text>}
        />
      </ZStack>
    );
  }

  if (family === 'accessoryInline') {
    return (
      <Text modifiers={root}>
        {props.goalsTotal > 0
          ? `${props.done}/${props.total} vaner · ${props.goalsDone}/${props.goalsTotal} mål`
          : `${props.done} av ${props.total} vaner`}
      </Text>
    );
  }

  return (
    <VStack alignment="leading" spacing={1} modifiers={root}>
      <Text modifiers={[font({ size: 12, weight: 'bold' })]}>DAGENS MÅL</Text>
      <Text modifiers={[font({ size: 15, weight: 'semibold' }), lineLimit(1)]}>{props.goalText}</Text>
      <Text modifiers={[font({ size: 12 })]}>{`${props.done} av ${props.total} vaner`}</Text>
    </VStack>
  );
};

export default createWidget<LockWidgetProps>('LockWidget', LockWidget, {
  day: '',
  done: 0,
  total: 0,
  goalText: 'Ikke satt ennå',
  goalsDone: 0,
  goalsTotal: 0,
});
