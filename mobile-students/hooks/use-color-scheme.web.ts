import { useEffect, useState } from 'react';
import { useThemeModeContext } from '@/contexts/theme-context';

/**
 * To support static rendering, this value needs to be re-calculated on the client side for web
 */
export function useColorScheme() {
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  const { currentColorScheme } = useThemeModeContext();

  if (hasHydrated) {
    return currentColorScheme;
  }

  return 'light';
}
