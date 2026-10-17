import { AccessoryWidgetBackground, Gauge, HStack, Image, Text, VStack, ZStack } from '@expo/ui/swift-ui';
import { containerBackground, font, gaugeStyle, lineLimit, widgetURL } from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

import type { LockWidgetProps } from './types';

/**
 * Låseskjermen. Appen bestemmer hva som vises (dagens mål, en invitasjon om morgenen, eller neste
 * vane resten av dagen) og sender ferdig tekst, så denne bare tegner.
 */
const LockWidget = (props: LockWidgetProps, environment: WidgetEnvironment) => {
  'widget';
  const family = environment.widgetFamily;
  const root = [containerBackground('clear', 'widget'), widgetURL(props.url || 'vane://')];

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
          value={props.total > 0 ? props.done / props.total : 0}
          modifiers={[gaugeStyle('circularCapacity')]}
          currentValueLabel={<Text modifiers={[font({ size: 14, weight: 'semibold' })]}>{`${props.done}/${props.total}`}</Text>}
        />
      </ZStack>
    );
  }

  if (family === 'accessoryInline') {
    return <Text modifiers={root}>{props.inline}</Text>;
  }

  return (
    <VStack alignment="leading" spacing={1} modifiers={root}>
      <HStack spacing={4}>
        {props.mode === 'prompt' ? <Image systemName="sunrise" size={12} /> : null}
        <Text modifiers={[font({ size: 12, weight: 'bold' })]}>{props.title}</Text>
      </HStack>
      <Text modifiers={[font({ size: 15, weight: 'semibold' }), lineLimit(1)]}>{props.line}</Text>
      {props.detail ? <Text modifiers={[font({ size: 12 })]}>{props.detail}</Text> : null}
    </VStack>
  );
};

export default createWidget<LockWidgetProps>('LockWidget', LockWidget, {
  day: '',
  mode: 'prompt',
  done: 0,
  total: 0,
  title: 'GOD MORGEN',
  line: 'Hva vil du få til i dag?',
  detail: 'Trykk for å sette mål',
  inline: 'Sett dagens mål',
  url: 'vane://goals',
});
