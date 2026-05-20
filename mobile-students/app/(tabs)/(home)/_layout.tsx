import React, { useContext } from 'react';
import { Stack } from 'expo-router';
import { Platform } from 'react-native';
import { I18nContext } from '@/contexts/i18n-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme'; 

export default function HomeLayout() {
  const { t } = useContext(I18nContext);
  const colorScheme = useColorScheme() ?? 'light';
  const headerBg = Colors[colorScheme].tint;
  
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="student/[studentId]/index"
        options={({ route }: any) => {
          const givenName = route.params?.givenName ?? '';
          const familyName = route.params?.familyName ?? '';
          const studentName = `${givenName} ${familyName}`.trim() || 'Student';

          return {
            headerTitle: studentName,
            headerTitleAlign: 'center',
            headerShadowVisible: false,
            headerStyle: {
              backgroundColor: headerBg,
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              color: '#fff',
              fontWeight: 'bold',
              fontSize: Platform.OS === 'android' ? 18 : 17,
            },
            ...(Platform.OS === 'android' && {
              headerStatusBarHeight: 0,
            }),
          };
        }}
      />
      <Stack.Screen
        name="student/[studentId]/message/[id]"
        options={{
          headerTitle: t('detailedView'),
          headerTitleAlign: 'center',
          headerBackButtonDisplayMode: 'minimal',
          headerShadowVisible: false,
          headerStyle: {
            backgroundColor: headerBg,
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            color: '#fff',
            fontWeight: 'bold',
            fontSize: Platform.OS === 'android' ? 18 : 17,
          },
          ...(Platform.OS === 'android' && {
            headerStatusBarHeight: 0,
          }),
        }}
      />
    </Stack>
  );
}
