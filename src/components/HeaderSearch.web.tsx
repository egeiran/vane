import { StyleSheet, TextInput, View } from 'react-native';

import { useTheme } from '@/theme';

import { Icon } from './Icon';

/** På web finnes ikke søkefeltet i headeren, så det vises som et vanlig felt øverst på siden. */
export function HeaderSearch({ value, onChange, placeholder }: { value: string; onChange: (text: string) => void; placeholder: string }) {
  const t = useTheme();
  return (
    <View style={styles.wrap}>
      <View style={[styles.search, { backgroundColor: t.card }]}>
        <Icon name="magnifyingglass" size={16} color={t.sub} />
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={t.faint}
          returnKeyType="search"
          accessibilityLabel={placeholder}
          style={{ flex: 1, fontSize: 16, color: t.text, height: 44 }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingTop: 12 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, paddingHorizontal: 12 },
});
