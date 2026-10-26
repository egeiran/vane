// Kobler svar på kjøpsvarsler til Swift-koden i app-intents/ fra første øyeblikk appen starter.
//
// Svarer man på et varsel uten å åpne appen, starter iOS appen i bakgrunnen uten vindu. Da kjører
// ikke appens JavaScript (React Native starter først når et vindu kobles til), og ingen inline-modul
// er lastet. Derfor må `PurchaseNotifications.install()` kalles fra AppDelegate.
const { withAppDelegate } = require('expo/config-plugins');

const CALL = 'PurchaseNotifications.install()';
const ANCHOR = /^([ \t]*)return super\.application\(application, didFinishLaunchingWithOptions: launchOptions\)/m;

module.exports = function withPurchaseNotifications(config) {
  return withAppDelegate(config, (c) => {
    if (c.modResults.language !== 'swift') {
      throw new Error('withPurchaseNotifications: forventet AppDelegate.swift');
    }
    const src = c.modResults.contents;
    if (src.includes(CALL)) return c;
    if (!ANCHOR.test(src)) {
      throw new Error('withPurchaseNotifications: fant ikke `return super.application(...)` i AppDelegate.swift');
    }
    c.modResults.contents = src.replace(ANCHOR, (line, indent) => `${indent}// Vane: kjøpsvarsler (app-intents/PurchaseNotifications.swift)\n${indent}${CALL}\n${line}`);
    return c;
  });
};
