import { NativeTabs } from 'expo-router/native-tabs';

import { tr } from '@/i18n';
import { isPending } from '@/lib/money';
import { useMoney } from '@/lib/moneyStore';
import { useStore } from '@/lib/store';
import { useTheme } from '@/theme';

export default function TabLayout() {
  const t = useTheme();
  const waiting = useMoney((s) => s.purchases.filter(isPending).length);
  const moneyOn = useStore((s) => s.settings.modules.money);
  const foodOn = useStore((s) => !!s.settings.modules.food);
  return (
    <NativeTabs tintColor={t.text}>
      {/* I dag og Mat blar sidelengs mellom dagene, med en loddrett ScrollView per dag. iOS skal ikke
          gi den første (vannrette) listen innrykk for fanelinja; det gjør hver dag selv. */}
      <NativeTabs.Trigger name="index" disableAutomaticContentInsets>
        <NativeTabs.Trigger.Label>{tr.tabs.today}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'checkmark.circle', selected: 'checkmark.circle.fill' }} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="overview">
        <NativeTabs.Trigger.Label>{tr.tabs.overview}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'square.grid.2x2', selected: 'square.grid.2x2.fill' }} />
      </NativeTabs.Trigger>
      {/* Med Mat av er fanen borte. Dataene ligger der fortsatt. */}
      <NativeTabs.Trigger name="food" hidden={!foodOn} disableAutomaticContentInsets>
        <NativeTabs.Trigger.Label>{tr.tabs.food}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'fork.knife.circle', selected: 'fork.knife.circle.fill' }} />
      </NativeTabs.Trigger>
      {/* Med Penger av er fanen borte. Dataene ligger der fortsatt. */}
      <NativeTabs.Trigger name="money" hidden={!moneyOn}>
        <NativeTabs.Trigger.Label>{tr.tabs.money}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'creditcard', selected: 'creditcard.fill' }} />
        {/* expo-router ser bort fra `hidden` når badgen har tekst, så «0» ble vist. Uten ventende kjøp: ingen badge. */}
        {waiting > 0 && <NativeTabs.Trigger.Badge>{String(waiting)}</NativeTabs.Trigger.Badge>}
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Label>{tr.tabs.settings}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="slider.horizontal.3" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
