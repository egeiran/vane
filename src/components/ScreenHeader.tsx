import { Stack } from 'expo-router';
import type { SFSymbol } from 'sf-symbols-typescript';

/** En knapp i headeren: ikon (med teksten for skjermleser) eller bare tekst. */
export type HeaderButton = {
  label: string;
  icon?: SFSymbol;
  onPress: () => void;
  /** `done` er fet, som Lagre og Ferdig. */
  variant?: 'plain' | 'done';
  disabled?: boolean;
};

/** En knapp som åpner en meny, som + med «Ny matvare» og «Ny rett». */
export type HeaderMenu = {
  label: string;
  icon: SFSymbol;
  items: { label: string; icon?: SFSymbol; onPress: () => void; destructive?: boolean }[];
};

export type HeaderItem = HeaderButton | HeaderMenu;

const isMenu = (item: HeaderItem): item is HeaderMenu => 'items' in item;

/**
 * Knappene må være direkte barn av `Stack.Toolbar` (den godtar ikke egne komponenter rundt), så dette
 * er en vanlig funksjon som lager elementene, ikke en komponent.
 */
function renderItems(items: HeaderItem[]) {
  return items.map((item) =>
    isMenu(item) ? (
      <Stack.Toolbar.Menu key={item.label} icon={item.icon} accessibilityLabel={item.label}>
        {item.items.map((a) => (
          <Stack.Toolbar.MenuAction key={a.label} icon={a.icon} destructive={a.destructive} onPress={a.onPress}>
            {a.label}
          </Stack.Toolbar.MenuAction>
        ))}
      </Stack.Toolbar.Menu>
    ) : (
      <Stack.Toolbar.Button
        key={item.label}
        icon={item.icon}
        variant={item.variant ?? 'plain'}
        disabled={item.disabled}
        accessibilityLabel={item.label}
        onPress={item.onPress}>
        {item.icon ? undefined : item.label}
      </Stack.Toolbar.Button>
    )
  );
}

/**
 * Den native headeren på en underside eller et ark: tittel (stor på undersidene, som krymper når man
 * ruller) og knapper til venstre og høyre. Headeren slås på for ruten i `_layout.tsx`. Første
 * ScrollView på skjermen må ha `contentInsetAdjustmentBehavior="automatic"`, ellers krymper ikke tittelen.
 * På web finnes ikke verktøylinja; se `ScreenHeader.web.tsx`.
 */
export function ScreenHeader({ title, large, left, right }: { title: string; large?: boolean; left?: HeaderItem[]; right?: HeaderItem[] }) {
  return (
    <>
      <Stack.Title large={large}>{title}</Stack.Title>
      {left?.length ? (
        <Stack.Toolbar placement="left">
          {renderItems(left)}
        </Stack.Toolbar>
      ) : null}
      {right?.length ? (
        <Stack.Toolbar placement="right">
          {renderItems(right)}
        </Stack.Toolbar>
      ) : null}
    </>
  );
}
