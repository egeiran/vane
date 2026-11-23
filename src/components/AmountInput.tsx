import { useState } from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { useTheme } from '@/theme';

type Props = Pick<TextInputProps, 'keyboardType' | 'autoFocus' | 'maxLength' | 'accessibilityLabel'> & {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  /** «kr», «$», «g». */
  unit: string;
  /** Enheten foran tallet («$149»), ellers etter («149 kr»). */
  unitFirst?: boolean;
  fontSize?: number;
  unitSize?: number;
};

/**
 * Et stort tall med enhet, midt i kortet: «149 kr», «$149», «140 g». Feltet er like bredt som tallet,
 * så tallet og enheten står midt på sammen, uansett hvor langt tallet er. Bredden måles med en usynlig
 * kopi av teksten i samme skrift.
 */
export function AmountInput({ value, onChangeText, placeholder, unit, unitFirst, fontSize = 44, unitSize = 24, ...input }: Props) {
  const t = useTheme();
  const [width, setWidth] = useState(0);
  const unitText = <Text style={[styles.unit, { fontSize: unitSize, color: t.sub }]}>{unit}</Text>;

  return (
    <View style={styles.row}>
      <Text
        style={[styles.number, styles.measure, { fontSize }]}
        numberOfLines={1}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants">
        {value || placeholder}
      </Text>
      {unitFirst ? unitText : null}
      <TextInput
        {...input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={t.faint}
        // Litt ekstra til markøren.
        style={[styles.number, styles.input, { fontSize, color: t.text }, width ? { width: Math.ceil(width) + 8 } : null]}
      />
      {unitFirst ? null : unitText}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 8, paddingTop: 6 },
  number: { fontWeight: '700', fontVariant: ['tabular-nums'] },
  measure: { position: 'absolute', left: 0, top: 0, opacity: 0 },
  input: { minWidth: 30, flexShrink: 1, padding: 0, textAlign: 'center' },
  unit: { fontWeight: '600' },
});
