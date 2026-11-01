#!/usr/bin/env node
// Skjermbilder av Vane i nettleseren (Expo web), med faste testdata og fast dato.
//
//   node skjermbilde.cjs --sjekk [--url http://localhost:8091]
//   node skjermbilde.cjs --ut <mappe> --navn 006-before [valg] / /overview /money /settings
//
// Valg:
//   --url <url>         Expo web (standard http://localhost:8091)
//   --data <fil.cjs>    testdata (standard testdata.cjs ved siden av dette skriptet)
//   --tom               ingen testdata, som en ny bruker
//   --sprak <locale>    nettleserens språk, f.eks. en-US (standard nb-NO)
//   --sone <tidssone>   standard Europe/Oslo
//   --mork              mørk modus
//   --bredde <px>       standard 390 (iPhone), høyden er 844
//   --hoyde <px>        høyere bilde for lange skjermer
//   --lagre <json>      ekstra nøkler i localStorage, slått sammen med testdataene
//                       (f.eks. '{"vane-data.settings":{"weekStart":"sun"}}')
//
// Bildene heter <navn>-<rute>.png, f.eks. 006-before-overview.png. Ta før og etter med nøyaktig
// de samme valgene. Expo web må kjøre (npx expo start --web --port 8091). Metro ser ikke nye
// filer uten omstart: start den på nytt med --clear når du har lagt til en fil.
const path = require('path');

function loadPlaywright() {
  try {
    return require('playwright');
  } catch {
    const { execSync } = require('child_process');
    const root = execSync('npm root -g').toString().trim();
    return require(path.join(root, 'playwright'));
  }
}

function parseArgs(argv) {
  const opts = { url: 'http://localhost:8091', sprak: 'nb-NO', sone: 'Europe/Oslo', bredde: 390, hoyde: 844, routes: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    if (a === '--sjekk') opts.sjekk = true;
    else if (a === '--url') opts.url = next();
    else if (a === '--ut') opts.ut = next();
    else if (a === '--navn') opts.navn = next();
    else if (a === '--data') opts.data = next();
    else if (a === '--tom') opts.tom = true;
    else if (a === '--sprak') opts.sprak = next();
    else if (a === '--sone') opts.sone = next();
    else if (a === '--mork') opts.mork = true;
    else if (a === '--bredde') opts.bredde = Number(next());
    else if (a === '--hoyde') opts.hoyde = Number(next());
    else if (a === '--lagre') opts.lagre = JSON.parse(next());
    else if (a.startsWith('/')) opts.routes.push(a);
    else throw new Error(`Ukjent valg: ${a}`);
  }
  return opts;
}

/** '{"vane-data.settings": {...}}' slår sammen objektet inn i state.settings i vane-data. */
function applyOverrides(storage, overrides) {
  const out = { ...storage };
  for (const [k, value] of Object.entries(overrides ?? {})) {
    const [storeKey, ...fieldPath] = k.split('.');
    if (!fieldPath.length) {
      out[storeKey] = typeof value === 'string' ? value : JSON.stringify(value);
      continue;
    }
    const parsed = JSON.parse(out[storeKey] ?? '{"version":1,"state":{}}');
    let node = parsed.state;
    for (const f of fieldPath.slice(0, -1)) node = node[f] ??= {};
    const last = fieldPath[fieldPath.length - 1];
    node[last] = value && typeof value === 'object' && !Array.isArray(value) ? { ...(node[last] ?? {}), ...value } : value;
    out[storeKey] = JSON.stringify(parsed);
  }
  return out;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const { chromium } = loadPlaywright();

  if (opts.sjekk) {
    const browser = await chromium.launch();
    console.log('Playwright og Chromium: ok');
    const page = await browser.newPage();
    const res = await page.goto(opts.url, { timeout: 15000 }).catch(() => null);
    console.log(res?.ok() ? `Expo web svarer på ${opts.url}` : `Expo web svarer ikke på ${opts.url} (start: npx expo start --web --port 8091)`);
    await browser.close();
    return;
  }
  if (!opts.ut || !opts.navn || !opts.routes.length) throw new Error('Trenger --ut, --navn og minst én rute, f.eks. /');

  const data = opts.tom ? null : require(path.resolve(opts.data ?? path.join(__dirname, 'testdata.cjs')));
  const storage = applyOverrides(data ? data.storage() : {}, opts.lagre);
  const now = data?.now ?? '2026-11-04T12:00:00';

  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: opts.bredde, height: opts.hoyde },
    deviceScaleFactor: 2,
    locale: opts.sprak,
    timezoneId: opts.sone,
    colorScheme: opts.mork ? 'dark' : 'light',
  });
  // expo-localization på web leser ukestart og klokke fra Intl.DateTimeFormat().resolvedOptions(),
  // som ikke har dem. Uten dette får appen alltid mandag og 24 timer i nettleseren (ikke på iPhone).
  await ctx.addInitScript(() => {
    const original = Intl.DateTimeFormat.prototype.resolvedOptions;
    Intl.DateTimeFormat.prototype.resolvedOptions = function () {
      const o = original.call(this);
      try {
        const l = new Intl.Locale(o.locale);
        if (!o.weekInfo) o.weekInfo = l.getWeekInfo ? l.getWeekInfo() : l.weekInfo;
        if (!o.hourCycle) o.hourCycle = (l.getHourCycles ? l.getHourCycles() : l.hourCycles)?.[0];
      } catch {}
      return o;
    };
  });
  await ctx.addInitScript((entries) => {
    // Bare første gang i denne fanen, så endringer appen gjør mens skriptet kjører, blir stående.
    if (sessionStorage.getItem('__seeded')) return;
    localStorage.clear();
    for (const [k, v] of Object.entries(entries)) localStorage.setItem(k, v);
    sessionStorage.setItem('__seeded', '1');
  }, storage);
  const page = await ctx.newPage();
  await page.clock.setFixedTime(new Date(now));
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));

  const fs = require('fs');
  fs.mkdirSync(opts.ut, { recursive: true });
  for (const route of opts.routes) {
    await page.goto(opts.url + route, { waitUntil: 'networkidle', timeout: 120000 });
    await page.waitForTimeout(1500);
    const name = route === '/' ? 'today' : route.replace(/^\//, '').replace(/[^a-z0-9]+/gi, '-');
    const file = path.join(opts.ut, `${opts.navn}-${name}.png`);
    await page.screenshot({ path: file });
    console.log(file);
  }
  if (errors.length) {
    console.error('Feil i appen:\n' + errors.join('\n'));
    process.exitCode = 1;
  }
  await browser.close();
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
