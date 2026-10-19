import { AccessoryWidgetBackground, Gauge, HStack, Image, Text, VStack, ZStack } from '@expo/ui/swift-ui';
import { containerBackground, font, foregroundStyle, frame, gaugeStyle, lineLimit, widgetURL } from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

import type { LockWidgetProps } from './types';

/**
 * Låseskjermen: en ring med daglige vaner gjort, og ved siden av det viktigste akkurat nå (dagens
 * mål, en invitasjon om morgenen, eller det som er igjen). Appen sender ferdig tekst, så denne bare tegner.
 */
const LockWidget = (props: LockWidgetProps, environment: WidgetEnvironment) => {
  'widget';
  const family = environment.widgetFamily;
  const root = [containerBackground('clear', 'widget'), widgetURL(props.url || 'vane://')];
  const fraction = props.total > 0 ? props.done / props.total : 0;
  const count = `${props.done}/${props.total}`;

  if (family === 'accessoryCircular') {
    if (props.mode === 'prompt') {
      return (
        <ZStack modifiers={root}>
          <AccessoryWidgetBackground />
          <VStack spacing={1}>
            <Image systemName="sunrise" size={18} />
            <Text modifiers={[font({ size: 11, weight: 'semibold' })]}>Mål</Text>
          </VStack>
        </ZStack>
      );
    }
    return (
      <ZStack modifiers={root}>
        <AccessoryWidgetBackground />
        <Gauge
          value={fraction}
          modifiers={[gaugeStyle('circularCapacity')]}
          currentValueLabel={<Text modifiers={[font({ size: 14, weight: 'semibold' })]}>{count}</Text>}
        />
      </ZStack>
    );
  }

  if (family === 'accessoryInline') {
    return <Text modifiers={root}>{props.inline}</Text>;
  }

  return (
    <HStack spacing={10} modifiers={[...root, frame({ maxWidth: Infinity, alignment: 'leading' })]}>
      <Gauge
        value={fraction}
        modifiers={[gaugeStyle('circularCapacity')]}
        currentValueLabel={<Text modifiers={[font({ size: 13, weight: 'semibold' })]}>{count}</Text>}
      />
      <VStack alignment="leading" spacing={1}>
        <Text modifiers={[font({ size: 15, weight: 'semibold' }), lineLimit(2)]}>{props.main}</Text>
        {props.sub ? (
          <Text modifiers={[font({ size: 13 }), foregroundStyle({ type: 'hierarchical', style: 'secondary' }), lineLimit(1)]}>
            {props.sub}
          </Text>
        ) : null}
      </VStack>
    </HStack>
  );
};

export default createWidget<LockWidgetProps>('LockWidget', LockWidget, {
  day: '',
  mode: 'prompt',
  done: 0,
  total: 0,
  main: 'Sett dagens mål',
  sub: 'Hva vil du få til i dag?',
  inline: 'Sett dagens mål',
  url: 'vane://goals',
});
