import { HStack, Image, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import {
  containerBackground,
  font,
  foregroundStyle,
  frame,
  kerning,
  lineLimit,
  monospacedDigit,
  widgetURL,
} from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

import type { PengerWidgetProps } from './types';

/**
 * «Penger» på hjemskjermen: venter det kjøp på kategori, viser den hvor mange og åpner «Penger».
 * Ellers er den en knapp for å legge inn et kjøp.
 *
 * NB: Koden under kjører i widgetens egen runtime. Alt den trenger må ligge inne i funksjonen.
 */
const PengerWidget = (props: PengerWidgetProps, environment: WidgetEnvironment) => {
  'widget';
  const dark = environment.colorScheme === 'dark';
  const bg = dark ? '#1C1C1E' : '#FFFFFF';
  const text = dark ? '#F2F2F0' : '#1C1C1E';
  const sub = dark ? '#A1A1A6' : '#6A6A6F';
  const waiting = props.waiting ?? 0;
  // Teksten kommer fra appen, på telefonens språk.
  const T = props.text ?? { label: '', waiting: '', tapToPick: '', add: '', off: '' };

  const label = (
    <Text modifiers={[font({ size: 11, weight: 'bold' }), kerning(0.6), foregroundStyle(sub), lineLimit(1)]}>{T.label}</Text>
  );
  const base = [containerBackground(bg, 'widget'), frame({ maxWidth: Infinity, maxHeight: Infinity, alignment: 'topLeading' })];

  // Penger er slått av i appen: si det, uten knapp. Trykk åpner appen.
  if (props.enabled === false) {
    return (
      <VStack alignment="leading" spacing={4} modifiers={[...base, widgetURL('vane://')]}>
        {label}
        <Spacer />
        <Text modifiers={[font({ size: 15, weight: 'semibold' }), foregroundStyle(sub), lineLimit(3)]}>{T.off}</Text>
      </VStack>
    );
  }

  if (waiting > 0) {
    return (
      <VStack alignment="leading" spacing={4} modifiers={[...base, widgetURL('vane://money')]}>
        {label}
        <Spacer />
        <Text modifiers={[font({ size: 34, weight: 'bold' }), foregroundStyle(text), monospacedDigit(), lineLimit(1)]}>{`${waiting}`}</Text>
        <Text modifiers={[font({ size: 15, weight: 'semibold' }), foregroundStyle(text), lineLimit(2)]}>{T.waiting}</Text>
        <Text modifiers={[font({ size: 12 }), foregroundStyle(sub), lineLimit(1)]}>{T.tapToPick}</Text>
      </VStack>
    );
  }

  return (
    <VStack alignment="leading" spacing={4} modifiers={[...base, widgetURL('vane://purchase-form')]}>
      {label}
      <Spacer />
      <HStack spacing={8}>
        <Image systemName="plus.circle.fill" size={30} color={text} />
        <Text modifiers={[font({ size: 15, weight: 'semibold' }), foregroundStyle(text), lineLimit(2)]}>{T.add}</Text>
        <Spacer />
      </HStack>
    </VStack>
  );
};

export default createWidget<PengerWidgetProps>('PengerWidget', PengerWidget, {
  waiting: 0,
  enabled: true,
  text: { label: 'PENGER', waiting: 'kjøp venter', tapToPick: 'Trykk for å velge kategori', add: 'Legg inn kjøp', off: 'Penger er slått av i Vane' },
});
