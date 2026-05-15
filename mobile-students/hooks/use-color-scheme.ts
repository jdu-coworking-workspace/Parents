import { useThemeModeContext } from '@/contexts/theme-context';

export function useColorScheme() {
  const { currentColorScheme } = useThemeModeContext();
  return currentColorScheme;
}
