import { TabBarIcon } from '@/components/navigation/TabBarIcon';
import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import { useSession } from '@/contexts/auth-context';
import { I18nContext } from '@/contexts/i18n-context';
import { Redirect, Tabs } from 'expo-router';
import type { Href } from 'expo-router';
import React, { useContext, useEffect, useState } from 'react';
import { useThemeMode } from '@rneui/themed';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LANGUAGE_SELECTED_KEY = 'languageSelected';
const LANGUAGE_SELECT_ROUTE = '/language-select' as Href;

export default function TabLayout() {
  const { language, i18n } = useContext(I18nContext);
  const { mode } = useThemeMode();
  const { session, isLoading } = useSession();
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
    return (
      <ThemedText style={{ alignContent: 'center', justifyContent: 'center' }}>
        Loading...
      </ThemedText>
    );
  }

  if (!session) {
    return (
      <Redirect
        href={languageSelected ? '/sign-in' : LANGUAGE_SELECT_ROUTE}
      />
    );
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[mode].tint,
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name='(home)'
        options={{
          title: i18n[language].home,
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon
              name={focused ? 'home' : 'home-outline'}
              color={color}
            />
          ),
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name='(settings)'
        options={{
          title: i18n[language].settings,
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon
              name={focused ? 'settings' : 'settings-outline'}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
