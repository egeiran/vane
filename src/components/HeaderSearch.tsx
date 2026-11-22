import { Stack } from 'expo-router';

import { useTheme } from '@/theme';

/**
 * Søkefeltet i den native headeren (iOS), som i Mail og Notater. Skjules når man ruller, og kommer
 * fram når man drar ned. På web vises et vanlig felt der komponenten står (`HeaderSearch.web.tsx`).
 */
export function HeaderSearch({ value, onChange, placeholder }: { value: string; onChange: (text: string) => void; placeholder: string }) {
  const t = useTheme();
  // `value` styres av iOS-feltet selv; vi får bare endringene.
  void value;
  return (
    <Stack.SearchBar
      placeholder={placeholder}
      onChangeText={(e) => onChange(e.nativeEvent.text)}
      onCancelButtonPress={() => onChange('')}
      tintColor={t.text}
      hideWhenScrolling={false}
    />
  );
}
