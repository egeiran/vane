// Testene går på norsk med en norsk telefon (kroner, mandag, 24 timer), uansett maskinen de kjører
// på. Tester av noe annet bytter selv med `setLang` og `setDeviceRegion`.
import { setLang } from './src/i18n';
import { NORWEGIAN_REGION, setDeviceRegion } from './src/lib/region';

setLang('nb');
setDeviceRegion(NORWEGIAN_REGION);
