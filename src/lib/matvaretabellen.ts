import type { Nutrients, Portion } from './types';

/**
 * Matvaretabellen fra Mattilsynet, i en kompakt utgave som ligger i appen
 * (`src/data/matvaretabellen.json`, laget med `scripts/matvaretabellen.mjs`). Søket virker uten nett,
 * og ingenting sendes ut. Tabellen leses første gang den trengs.
 *
 * Mattilsynet ber om at Matvaretabellen oppgis som kilde (`tr.food.source`).
 */

export type TableFood = {
  id: string;
  name: string;
  per100: Nutrients;
  /** Porsjonene i tabellen: «1 stk» (56 g), «1 dl» (100 g). */
  portions: (Portion & { grams: number })[];
  keywords: string[];
};

type Raw = { version: string; foods: [string, string, number, number | null, [string, number][], string[]][] };

let table: TableFood[] | null = null;
let byId: Map<string, TableFood> | null = null;

/** Hele tabellen. Leses fra fila første gang. */
export function tableFoods(): TableFood[] {
  if (!table) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const raw = require('@/data/matvaretabellen.json') as Raw;
    table = raw.foods.map(([id, name, protein, kcal, portions, keywords]) => ({
      id,
      name,
      per100: { protein, kcal },
      portions: portions.map(([label, grams]) => ({ label, grams })),
      keywords,
    }));
  }
  return table;
}

export function tableFood(id: string): TableFood | undefined {
  if (!byId) byId = new Map(tableFoods().map((f) => [f.id, f]));
  return byId.get(id);
}

/**
 * Små bokstaver uten aksenter: «Bønner» og «bonner» er like, «Crème» er «creme». Æ blir «ae», så
 * både «ærter» og «aerter» treffer.
 */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/æ/g, 'ae')
    .replace(/ø/g, 'o')
    .normalize('NFKD')
    .replace(/\p{M}/gu, '');
}

const words = (s: string) => normalize(s).split(/[^\p{L}\p{N}]+/u).filter(Boolean);

type Indexed = { words: string[]; extra: string[] };
const indexCache = new WeakMap<object, Indexed>();

function indexed(item: { name: string; keywords?: string[] }): Indexed {
  let i = indexCache.get(item);
  if (!i) {
    i = { words: words(item.name), extra: (item.keywords ?? []).flatMap(words) };
    indexCache.set(item, i);
  }
  return i;
}

/**
 * Søk i navn (og søkeord). Hvert ord i søket må være starten på et ord i navnet eller søkeordene.
 * Først det der første ord i navnet treffer, så der treffene kommer tidlig i navnet, så de korteste
 * navnene. Et tomt søk gir ingenting.
 */
export function search<T extends { name: string; keywords?: string[] }>(items: T[], query: string, limit = 40): T[] {
  const q = words(query);
  if (!q.length) return [];
  const hits: { item: T; score: number }[] = [];
  for (const item of items) {
    const { words: w, extra } = indexed(item);
    let score = 0;
    let ok = true;
    for (const token of q) {
      const pos = w.findIndex((x) => x.startsWith(token));
      if (pos >= 0) {
        score += pos * 10 + (w[pos] === token ? 0 : 1);
        continue;
      }
      if (extra.some((x) => x.startsWith(token))) {
        score += 100;
        continue;
      }
      ok = false;
      break;
    }
    if (ok) hits.push({ item, score: score * 1000 + Math.min(item.name.length, 999) });
  }
  return hits
    .sort((a, b) => a.score - b.score)
    .slice(0, limit)
    .map((h) => h.item);
}
