import { DateTimePicker } from '@expo/ui/community/datetime-picker';

import { atTime, formatTime } from '@/lib/dates';
import { useTheme } from '@/theme';

/** Dagen tidene regnes på. Bare klokkeslettet brukes. */
const DAY = '2026-01-01';

type Props = {
  /** 'HH:MM' */
  value: string;
  onChange: (value: string) => void;
  /** Tidligste og seneste tid, 'HH:MM'. */
  min?: string;
  max?: string;
  /** For skjermleser; raden har også en synlig tekst. */
  label: string;
};

/**
 * iOS sin egen tidsvelger (kompakt: et lite felt som åpner hjulet), i stedet for − og + i kvarter.
 * Følger telefonens 12/24-timersklokke. På web: se `TimeField.web.tsx`.
 */
export function TimeField({ value, onChange, min, max }: Props) {
  const t = useTheme();
  return (
    <DateTimePicker
      mode="time"
      display="compact"
      value={atTime(DAY, value)}
      minimumDate={min ? atTime(DAY, min) : undefined}
      maximumDate={max ? atTime(DAY, max) : undefined}
      accentColor={t.text}
      onValueChange={(_, d) => onChange(formatTime({ hour: d.getHours(), minute: d.getMinutes() }))}
    />
  );
}
