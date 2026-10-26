import { View } from 'react-native';

import type { Category } from '@/lib/types';
import { useTheme } from '@/theme';

import { Icon } from './Icon';

/** Rund brikke med ikonet og fargen til kategorien. Uten kategori: et kort, for kjøp som venter. */
export function CategoryIcon({ category, size = 32 }: { category?: Category | null; size?: number }) {
  const t = useTheme();
  const c = category ? t.colors[category.color] : null;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: c?.soft ?? t.button,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Icon name={category?.icon ?? 'creditcard'} size={Math.round(size * 0.48)} color={c?.ink ?? t.sub} />
    </View>
  );
}
