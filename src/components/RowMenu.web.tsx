import type { Href } from 'expo-router';
import type { ReactElement } from 'react';

import type { MenuItem } from './RowMenu';

export type { MenuItem } from './RowMenu';

/** Hold-inne-menyen finnes bare på iPhone. På web vises raden som den er. */
export function RowMenu({ children }: { href: Href; items: MenuItem[]; children: ReactElement }) {
  return children;
}
