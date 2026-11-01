import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import { Card, Row, TextButton, tick } from '@/components/ui';
import { tr } from '@/i18n';
import { useMoney } from '@/lib/moneyStore';
import { getDeviceRegion } from '@/lib/region';
import { useTheme } from '@/theme';

/** Valutaene man kan velge. Telefonens valuta kommer i tillegg hvis den ikke er med. */
const CURRENCIES = ['NOK', 'SEK', 'DKK', 'ISK', 'EUR', 'GBP', 'CHF', 'PLN', 'USD', 'CAD', 'AUD', 'NZD'];

function close() {
  if (router.canGoBack()) router.back();
  else router.replace('/settings');
}

/** Hovedvalutaen i Penger: som telefonen, eller en valgt valuta. */
export default function CurrencyScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const chosen = useMoney((s) => s.currency);
  const setCurrency = useMoney((s) => s.setCurrency);
  const device = getDeviceRegion().currency;
  const codes = CURRENCIES.includes(device) ? CURRENCIES : [device, ...CURRENCIES];

  const pick = (currency: string | null) => {
    tick();
    setCurrency(currency);
    close();
  };

  const option = (key: string, label: string, sub: string | null, on: boolean, onPress: () => void, first = false) => (
    <Pressable key={key} onPress={onPress} accessibilityRole="radio" accessibilityState={{ selected: on }}>
      <Row first={first}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, color: t.text }}>{label}</Text>
          {sub ? <Text style={{ fontSize: 13, color: t.sub }}>{sub}</Text> : null}
        </View>
        {on ? <Icon name="checkmark" size={16} color={t.text} weight="bold" /> : null}
      </Row>
    </Pressable>
  );

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <View style={styles.bar}>
        <View style={{ width: 70 }} />
        <Text style={[styles.barTitle, { color: t.text }]} accessibilityRole="header">
          {tr.currency.title}
        </Text>
        <TextButton label={tr.common.done} bold onPress={close} />
      </View>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
        <Card style={{ overflow: 'hidden' }}>
          <View accessibilityRole="radiogroup" accessibilityLabel={tr.currency.title}>
            {option('phone', tr.currency.phone(device), null, chosen === null, () => pick(null), true)}
            {codes.map((code) => option(code, code, tr.currency.names[code] ?? null, chosen === code, () => pick(code)))}
          </View>
        </Card>
        <Text style={[styles.footnote, { color: t.sub }]}>{tr.currency.help}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, paddingTop: 10, paddingBottom: 4 },
  barTitle: { fontSize: 17, fontWeight: '600' },
  content: { padding: 16, gap: 8 },
  footnote: { fontSize: 13, lineHeight: 18, paddingHorizontal: 4 },
});
