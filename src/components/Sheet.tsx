import type { ReactNode } from 'react';
import { View } from 'react-native';

import { useTheme } from '@/theme';

/**
 * Roten i et ark (formSheet i `_layout.tsx`): bakgrunnen, og en tom View først.
 *
 * I et ark leter react-native-screens etter et rullefelt ved å følge første barn nedover, og setter
 * rammen dens selv. Med native header ligger innholdet et lag dypere enn det forventer, og da tegnes
 * ikke rullefeltet: arket viste bare headeren (Endre føring, Måltid, Kategori). Den tomme View-en
 * stopper søket, så rullefeltet legges ut som en vanlig flex-visning. Arket utvides derfor ikke når man
 * ruller mot toppen; det dras opp i håndtaket eller headeren.
 */
export function Sheet({ children }: { children: ReactNode }) {
  const t = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <View collapsable={false} />
      {children}
    </View>
  );
}
