import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeModeContextProps {
  themeMode: ThemeMode;
  toggleTheme: () => void;
  setThemeMode: (mode: ThemeMode) => void;
  currentColorScheme: 'light' | 'dark';
}

const ThemeModeContext = createContext<ThemeModeContextProps | undefined>(
  undefined
);

export const ThemeModeProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [themeMode, setThemeMode] = useState<ThemeMode>('system');
  const [currentColorScheme, setCurrentColorScheme] = useState<'light' | 'dark'>('light');
  const storageKey = 'themeMode';

  // ✅ Load saved theme (or system default)
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const saved = await AsyncStorage.getItem(storageKey);
        if (saved === 'light' || saved === 'dark' || saved === 'system') {
          setThemeMode(saved);
        } else {
          setThemeMode('system');
        }
      } catch (err) {
        console.warn('Failed to load theme:', err);
        setThemeMode('system');
      }
    };
    loadTheme();
  }, []);

  // ✅ Update color scheme based on theme mode
  useEffect(() => {
    const updateColorScheme = () => {
      if (themeMode === 'system') {
        const system = Appearance.getColorScheme();
        setCurrentColorScheme(system === 'dark' ? 'dark' : 'light');
      } else {
        setCurrentColorScheme(themeMode);
      }
    };

    updateColorScheme();

    // Listen for system appearance changes
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      if (themeMode === 'system') {
        setCurrentColorScheme(colorScheme === 'dark' ? 'dark' : 'light');
      }
    });

    return () => subscription.remove();
  }, [themeMode]);

  // ✅ Save theme when changed
  useEffect(() => {
    AsyncStorage.setItem(storageKey, themeMode).catch(err =>
      console.warn('Failed to save theme:', err)
    );
  }, [themeMode]);

  const toggleTheme = () => {
    if (themeMode === 'system') {
      setThemeMode(currentColorScheme === 'light' ? 'dark' : 'light');
    } else {
      setThemeMode(currentColorScheme === 'light' ? 'dark' : 'light');
    }
  };

  return (
    <ThemeModeContext.Provider
      value={{
        themeMode,
        toggleTheme,
        setThemeMode,
        currentColorScheme,
      }}
    >
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
