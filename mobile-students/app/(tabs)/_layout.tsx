import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import type { Href } from 'expo-router';
import React, { useContext, useEffect, useState } from 'react';

import { BrandColors } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { I18nContext } from '@/contexts/i18n-context';
import { useColorScheme } from '@/hooks/use-color-scheme';

const LANGUAGE_SELECTED_KEY = 'languageSelected';
const LANGUAGE_SELECT_ROUTE = '/language-select' as Href;

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { t } = useContext(I18nContext);
  const { isLoading, isSignedIn } = useAuth();
  const theme = colorScheme ?? 'light';
  const [languageSelected, setLanguageSelected] = useState<boolean | null>(null);

  useEffect(() => {
    let isMounted = true;

    const checkLanguageSelection = async () => {
      try {
        const selected = await AsyncStorage.getItem(LANGUAGE_SELECTED_KEY);
        if (isMounted) {
          setLanguageSelected(selected === 'true');
        }
      } catch (error) {
        console.error('Error checking language selection:', error);
        if (isMounted) {
          setLanguageSelected(false);
        }
      }
    };

    void checkLanguageSelection();

    return () => {
      isMounted = false;
    };
  }, []);

  if (isLoading || languageSelected === null) {
    return null;
  }

  if (!isSignedIn) {
    return (
      <Redirect href={languageSelected ? '/sign-in' : LANGUAGE_SELECT_ROUTE} />
    );
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: BrandColors[theme],
        headerShown: false,
      }}>
      <Tabs.Screen
        name="(home)"
        options={{
          title: t('home'),
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="(settings)"
        options={{
          title: t('settings'),
          tabBarIcon: ({ color, size }) => <Ionicons name="settings" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
