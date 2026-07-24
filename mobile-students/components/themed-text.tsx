import { StyleSheet, Text, type TextProps } from 'react-native';

import { useThemeColor } from '@/hooks/use-theme-color';
import { useFontSize } from '@/contexts/font-size-context';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link';
  disableScaling?: boolean;
};

const baseFontSizes: Record<NonNullable<ThemedTextProps['type']>, number> = {
  default: 16,
  defaultSemiBold: 16,
  title: 32,
  subtitle: 20,
  link: 16,
};

const baseLineHeights: Record<string, number> = {
  link: 30,
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = 'default',
  disableScaling = false,
  ...rest
}: ThemedTextProps) {
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');
  const { multiplier: globalMultiplier } = useFontSize();
  const multiplier = disableScaling ? 1.0 : globalMultiplier;

  // Extract explicit fontSize and lineHeight from the style prop (which could be an array or object)
  const flattenedStyle = StyleSheet.flatten(style);
  const customFontSize = flattenedStyle?.fontSize;
  const customLineHeight = flattenedStyle?.lineHeight;
  
  // Calculate the scaled font size: either scale the custom font size, or scale the base font size for the type
  const fontSize = (customFontSize !== undefined ? Number(customFontSize) : (baseFontSizes[type] || 16)) * multiplier;

  // Calculate the scaled line height to prevent overlapping lines
  const baseLineHeight = baseLineHeights[type];
  const lineHeight = customLineHeight !== undefined 
    ? Number(customLineHeight) * multiplier 
    : (baseLineHeight !== undefined ? baseLineHeight * multiplier : undefined);

  return (
    <Text
      style={[
        { color },
        type === 'default' ? styles.default : undefined,
        type === 'title' ? styles.title : undefined,
        type === 'defaultSemiBold' ? styles.defaultSemiBold : undefined,
        type === 'subtitle' ? styles.subtitle : undefined,
        type === 'link' ? styles.link : undefined,
        style,
        { fontSize }, // Apply the calculated scaled fontSize at the end so it overrides any unscaled value
        lineHeight !== undefined ? { lineHeight } : undefined, // Apply the calculated scaled lineHeight
      ]}
      {...rest}
    />
  );
}




const styles = StyleSheet.create({
  default: {},
  defaultSemiBold: {
    fontWeight: '600',
  },
  title: {
    fontWeight: 'bold',
  },
  subtitle: {
    fontWeight: 'bold',
  },
  link: {
    lineHeight: 30,
    color: '#1A4AAC',
  },
});

