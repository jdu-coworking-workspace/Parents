import React, { useContext } from 'react';
import { Stack } from 'expo-router';
import { I18nContext } from '@/contexts/i18n-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';   

export default function SettingsLayout() {
  const { t } = useContext(I18nContext);
  const colorScheme = useColorScheme() ?? 'light';
  const headerBg = Colors[colorScheme].tint; 

  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          headerShown: true,
          title: t('settingsHeader'),
          headerStyle: {
            backgroundColor: headerBg,
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
    </Stack>
  );
}
