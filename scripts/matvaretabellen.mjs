#!/usr/bin/env node
/**
 * Henter Matvaretabellen fra Mattilsynet og skriver en kompakt utgave til
 * `src/data/matvaretabellen.json`, som ligger i appen og brukes til søk uten nett.
 *
 *   node scripts/matvaretabellen.mjs [år]
 *
 * Bak en proxy (som i en skyøkt) må Node få beskjed om å bruke den:
 * `NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=<ca-fil> node scripts/matvaretabellen.mjs 2026`.
 *
 * Tabellen kommer ut på nytt hver høst. Kjør skriptet da, med året for utgaven, og oppdater
 * kildelinja (`food.source` i `src/i18n`). Mattilsynet ber om at Matvaretabellen oppgis som kilde:
 * https://www.matvaretabellen.no/api/
 *
 * Hver matvare blir `[id, navn, protein, kcal, porsjoner, søkeord]`:
 * - protein i tideler gram per 100 g (som i appen), kcal per 100 g (eller null)
 * - porsjoner som `[navn, gram]`, for eksempel `["stk", 56]`
 * - søkeord fra tabellen («belgfrukt», «kaffi»), så søket finner flere skrivemåter
 *
 * Spedbarnsmat (gruppe 11) er ikke med.
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const URL = 'https://www.matvaretabellen.no/api/nb/foods.json';
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'matvaretabellen.json');
const SKIP_GROUPS = ['11'];

/** Porsjonsnavnene slik de står etter et tall: «1 dl», «2 ss». */
const PORTION_NAMES = {
  desiliter: 'dl',
  spiseskje: 'ss',
  teskje: 'ts',
  'pr brødskive': 'skive pålegg',
};

const year = process.argv[2] ?? String(new Date().getFullYear());

const res = await fetch(URL);
if (!res.ok) throw new Error(`${URL}: ${res.status}`);
const { foods } = await res.json();

const out = [];
for (const f of foods) {
  if (SKIP_GROUPS.some((g) => f.foodGroupId === g || f.foodGroupId.startsWith(`${g}.`))) continue;
  const protein = f.constituents.find((c) => c.nutrientId === 'Protein');
  if (!protein || typeof protein.quantity !== 'number') continue;
  const kcal = typeof f.calories?.quantity === 'number' ? Math.round(f.calories.quantity) : null;
  const portions = (f.portions ?? [])
    .filter((p) => p.unit === 'g' && p.quantity > 0)
    .map((p) => [PORTION_NAMES[p.portionName] ?? p.portionName, Math.max(1, Math.round(p.quantity))]);
  const keywords = (f.searchKeywords ?? []).filter((k) => typeof k === 'string' && k.trim());
  out.push([f.foodId, f.foodName.trim(), Math.round(protein.quantity * 10), kcal, portions, keywords]);
}
out.sort((a, b) => a[1].localeCompare(b[1], 'nb'));

writeFileSync(OUT, JSON.stringify({ version: year, foods: out }) + '\n');
console.log(`${out.length} matvarer skrevet til ${OUT}`);
