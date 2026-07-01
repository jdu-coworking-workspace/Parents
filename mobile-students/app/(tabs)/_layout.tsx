import { Tabs, Redirect } from 'expo-router';
import React, { useContext, useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { BrandColors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { I18nContext } from '@/contexts/i18n-context';
import { useAuth } from '@/contexts/auth-context';
import { ThemedText } from '@/components/themed-text';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { t } = useContext(I18nContext);
  const { isSignedIn, isLoading } = useAuth();
  const [hasEverLoggedIn, setHasEverLoggedIn] = useState<boolean | null>(null);
  const theme = colorScheme ?? 'light';

  useEffect(() => {
    const checkLoginHistory = async () => {
      try {
        const hasLoggedIn = await AsyncStorage.getItem('hasEverLoggedIn');
        setHasEverLoggedIn(hasLoggedIn === 'true');
      } catch (error) {
        console.error('Error checking login history:', error);
        setHasEverLoggedIn(false);
      }
    };

    checkLoginHistory();
  }, []);

  if (isLoading || hasEverLoggedIn === null) {
    return (
      <ThemedText style={{ alignContent: 'center', justifyContent: 'center' }}>
        Loading...
      </ThemedText>
    );
  }

  if (!isSignedIn) {
    if (!hasEverLoggedIn) {
      return <Redirect href='/language-select' />;
    }
    return <Redirect href='/sign-in' />;
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
