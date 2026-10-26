import { NativeTabs } from 'expo-router/native-tabs';

import { isPending } from '@/lib/money';
import { useMoney } from '@/lib/moneyStore';
import { useTheme } from '@/theme';

export default function TabLayout() {
  const t = useTheme();
  const waiting = useMoney((s) => s.purchases.filter(isPending).length);
  return (
    <NativeTabs tintColor={t.text}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>I dag</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'checkmark.circle', selected: 'checkmark.circle.fill' }} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="overview">
        <NativeTabs.Trigger.Label>Oversikt</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'square.grid.2x2', selected: 'square.grid.2x2.fill' }} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="money">
        <NativeTabs.Trigger.Label>Penger</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'creditcard', selected: 'creditcard.fill' }} />
        <NativeTabs.Trigger.Badge hidden={waiting === 0}>{String(waiting)}</NativeTabs.Trigger.Badge>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Label>Innstillinger</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="slider.horizontal.3" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
