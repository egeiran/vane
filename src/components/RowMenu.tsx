import { Link, type Href } from 'expo-router';
import type { ReactElement } from 'react';
import type { SFSymbol } from 'sf-symbols-typescript';

/** Et valg i hold-inne-menyen, eller en undermeny (som «Flytt til måltid»). */
export type MenuItem =
  | { label: string; icon?: SFSymbol; onPress: () => void; destructive?: boolean }
  | { label: string; icon?: SFSymbol; items: MenuItem[] };

/** Menyen godtar bare sine egne elementer som barn, så dette er en vanlig funksjon, ikke en komponent. */
function renderItems(items: MenuItem[]) {
  return items.map((item) =>
    'items' in item ? (
      <Link.Menu key={item.label} title={item.label} icon={item.icon}>
        {renderItems(item.items)}
      </Link.Menu>
    ) : (
      <Link.MenuAction key={item.label} icon={item.icon} destructive={item.destructive} onPress={item.onPress}>
        {item.label}
      </Link.MenuAction>
    )
  );
}

/**
 * Hold inne på en rad for iOS sin egen meny (Endre, Flytt, Slett …). `children` er raden selv, en
 * View: trykk håndteres av knappene inne i raden som før, så menyen endrer ikke hva et trykk gjør.
 * På web finnes ikke menyen (`RowMenu.web.tsx`).
 */
export function RowMenu({ href, items, children }: { href: Href; items: MenuItem[]; children: ReactElement }) {
  if (!items.length) return children;
  return (
    <Link href={href} asChild>
      <Link.Trigger>{children}</Link.Trigger>
      <Link.Menu>{renderItems(items)}</Link.Menu>
    </Link>
  );
}
