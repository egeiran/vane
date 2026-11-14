import { StyleSheet, Text, TextInput, View } from 'react-native';

import { useTheme } from '@/theme';

type Props = {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  /** Tall står til høyre i et smalt felt. */
  keyboardType?: 'decimal-pad' | 'number-pad';
  maxLength?: number;
};

/** Et felt med etiketten til venstre, som i skjemaene for mat. */
export function Field({ label, value, onChange, placeholder, autoFocus, keyboardType, maxLength }: Props) {
  const t = useTheme();
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: t.text }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={t.faint}
        autoFocus={autoFocus}
        keyboardType={keyboardType}
        returnKeyType="done"
        maxLength={maxLength ?? (keyboardType ? 8 : 80)}
        accessibilityLabel={label}
        style={[styles.input, { backgroundColor: t.field, color: t.text }, keyboardType && styles.number]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  field: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 },
  label: { fontSize: 16, flex: 1 },
  input: { flex: 1.4, minWidth: 0, height: 44, borderRadius: 10, paddingHorizontal: 12, fontSize: 17 },
  number: { flex: 0, width: 120, minWidth: 120, textAlign: 'right', fontVariant: ['tabular-nums'] },
});
