import { DateTimePicker } from '@expo/ui/community/datetime-picker';

import { fromKey, toKey, type DateKey } from '@/lib/dates';
import { useTheme } from '@/theme';

type Props = {
  value: DateKey;
  onChange: (day: DateKey) => void;
  min?: DateKey;
  max?: DateKey;
  /** Teksten som vises på web, for eksempel «I går». */
  text: string;
  label: string;
};

/** iOS sin egen datovelger (kompakt: et lite felt som åpner kalenderen). På web: se `DateField.web.tsx`. */
export function DateField({ value, onChange, min, max }: Props) {
  const t = useTheme();
  return (
    <DateTimePicker
      mode="date"
      display="compact"
      value={fromKey(value)}
      minimumDate={min ? fromKey(min) : undefined}
      maximumDate={max ? fromKey(max) : undefined}
      accentColor={t.text}
      onValueChange={(_, d) => onChange(toKey(d))}
    />
  );
}
