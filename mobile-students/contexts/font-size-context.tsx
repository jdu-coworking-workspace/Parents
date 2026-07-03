import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FONT_SIZE_KEY = 'font_size_multiplier';

interface FontSizeContextType {
  multiplier: number;
  setMultiplier: (value: number) => void;
}

const FontSizeContext = createContext<FontSizeContextType>({
  multiplier: 1,
  setMultiplier: () => {},
});

export const FontSizeProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [multiplier, setMultiplierState] = useState(1.0);

  // Load saved font size on mount
  useEffect(() => {
    const loadFontSize = async () => {
      try {
        const saved = await AsyncStorage.getItem(FONT_SIZE_KEY);
        if (saved !== null) {
          const parsed = parseFloat(saved);
          if (!isNaN(parsed) && parsed >= 1.0 && parsed <= 2.2) {
            setMultiplierState(parsed);
          }
        }
      } catch (e) {
        // ignore
      }
    };
    loadFontSize();
  }, []);

  const setMultiplier = (value: number) => {
    setMultiplierState(value);
    AsyncStorage.setItem(FONT_SIZE_KEY, value.toString()).catch(() => {});
  };

  return (
    <FontSizeContext.Provider value={{ multiplier, setMultiplier }}>
      {children}
    </FontSizeContext.Provider>
  );
};

export const useFontSize = () => useContext(FontSizeContext);
