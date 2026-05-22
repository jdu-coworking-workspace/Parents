import React, { useContext } from 'react';
import { Stack } from 'expo-router';
import { BrandColors } from '@/constants/theme';
import { I18nContext } from '@/contexts/i18n-context';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function SettingsLayout() {
  const { t } = useContext(I18nContext);
  const colorScheme = useColorScheme() ?? 'light';
  const headerColor = BrandColors[colorScheme];

  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          headerShown: true,
          title: t('settingsHeader'),
          headerStyle: {
            backgroundColor: headerColor,
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
            fontSize: 18,
            color: '#fff',
          },
          headerShadowVisible: false,
          headerTitleAlign: 'center',
        }}
      />
      <Stack.Screen
        name="change-password"
        options={{
          headerShown: true,
          title: t('changePassword'),
          headerStyle: {
            backgroundColor: headerColor,
          },
          headerTintColor: '#fff',
          headerBackButtonDisplayMode: 'minimal',
          headerBackTitle: '',
          headerTitleStyle: {
            fontWeight: 'bold',
            fontSize: 18,
            color: '#fff',
          },
          headerShadowVisible: false,
          headerTitleAlign: 'center',
        }}
      />
    </Stack>
  );
}
