import { Tabs } from 'expo-router';
import React, { useContext } from 'react';
import { Ionicons } from '@expo/vector-icons';

import { BrandColors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { I18nContext } from '@/contexts/i18n-context';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { t } = useContext(I18nContext);
  const theme = colorScheme ?? 'light';

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
