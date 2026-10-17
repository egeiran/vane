import { SymbolView, type SymbolWeight } from 'expo-symbols';
import type { ColorValue } from 'react-native';
import type { SFSymbol } from 'sf-symbols-typescript';

type Props = {
  name: SFSymbol;
  size?: number;
  color: ColorValue;
  weight?: SymbolWeight;
};

/** SF Symbols, som passer rett inn i iOS. */
export function Icon({ name, size = 18, color, weight = 'semibold' }: Props) {
  return (
    <SymbolView
      name={name}
      size={size}
      tintColor={color}
      weight={weight}
      style={{ width: size, height: size }}
      accessibilityElementsHidden
      importantForAccessibility="no"
    />
  );
}
