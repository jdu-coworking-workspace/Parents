import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';
import * as SystemUI from 'expo-system-ui';

import { Colors } from '@/constants/theme';

type ThemeMode = 'light' | 'dark' | 'system';
type ColorScheme = 'light' | 'dark';

interface ThemeModeContextProps {
  themeMode: ThemeMode;
  toggleTheme: () => void;
  setThemeMode: (mode: ThemeMode) => void;
  currentColorScheme: ColorScheme;
}

const ThemeModeContext = createContext<ThemeModeContextProps | undefined>(
  undefined
);

const STORAGE_KEY = 'themeMode';

function resolveSystemScheme(): ColorScheme {
  return Appearance.getColorScheme() === 'dark' ? 'dark' : 'light';
}

function resolveScheme(mode: ThemeMode, systemScheme: ColorScheme): ColorScheme {
  return mode === 'system' ? systemScheme : mode;
}

function applyNativeAppearance(mode: ThemeMode, scheme: ColorScheme) {
  if (typeof Appearance.setColorScheme === 'function') {
    Appearance.setColorScheme(mode === 'system' ? null : mode);
  }
SystemUI.setBackgroundColorAsync(Colors[scheme].background).catch(err =>
  console.warn('Failed to set system UI background:', err)
);
}

export const ThemeModeProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [systemScheme, setSystemScheme] = useState<ColorScheme>(resolveSystemScheme);
  const [isThemeReady, setIsThemeReady] = useState(false);

  const currentColorScheme = resolveScheme(themeMode, systemScheme);

  useEffect(() => {
    let cancelled = false;

    const loadTheme = async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (cancelled) return;

        const nextMode: ThemeMode =
          saved === 'light' || saved === 'dark' || saved === 'system'
            ? saved
            : 'system';

        setSystemScheme(resolveSystemScheme());
        setThemeModeState(nextMode);
      } catch (err) {
        console.warn('Failed to load theme:', err);
      } finally {
        if (!cancelled) {
          setIsThemeReady(true);
        }
      }
    };

    void loadTheme();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemScheme(colorScheme === 'dark' ? 'dark' : 'light');
    });

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!isThemeReady) return;

    AsyncStorage.setItem(STORAGE_KEY, themeMode).catch(err =>
      console.warn('Failed to save theme:', err)
    );
  }, [themeMode, isThemeReady]);

  useEffect(() => {
    if (!isThemeReady) return;
    applyNativeAppearance(themeMode, currentColorScheme);
  }, [themeMode, currentColorScheme, isThemeReady]);

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeMode(currentColorScheme === 'light' ? 'dark' : 'light');
  }, [currentColorScheme, setThemeMode]);

  const value = useMemo(
    () => ({
      themeMode,
      toggleTheme,
      setThemeMode,
      currentColorScheme,
    }),
    [themeMode, toggleTheme, setThemeMode, currentColorScheme]
  );

  return (
    <ThemeModeContext.Provider value={value}>
      {children}
    </ThemeModeContext.Provider>
  );
};

export const useThemeModeContext = (): ThemeModeContextProps => {
  const context = useContext(ThemeModeContext);
  if (!context) {
    throw new Error(
      'useThemeModeContext must be used within ThemeModeProvider'
    );
  }
  return context;
};
