import { tr } from '@/i18n';
import { minutesOf, shiftTime } from '@/lib/dates';
import { showTime } from '@/lib/region';

import { Stepper } from './ui';

/** På web finnes ikke iOS-velgeren, så tiden stilles med − og + i kvarter. Bare for testing. */
export function TimeField({ value, onChange, min, max }: { value: string; onChange: (value: string) => void; min?: string; max?: string; label: string }) {
  const lo = min ? minutesOf(min) : 0;
  const hi = max ? minutesOf(max) : 23 * 60 + 59;
  return (
    <Stepper
      value={showTime(value)}
      minWidth={60}
      onDecrease={() => onChange(shiftTime(value, -15, lo, hi))}
      onIncrease={() => onChange(shiftTime(value, 15, lo, hi))}
      decreaseLabel={tr.common.earlier15}
      increaseLabel={tr.common.later15}
    />
  );
}
