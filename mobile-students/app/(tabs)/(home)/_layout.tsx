import React, { useContext } from 'react';
import { Stack, useFocusEffect } from 'expo-router';
import { Platform, BackHandler } from 'react-native';
import { BrandColors } from '@/constants/theme';
import { I18nContext } from '@/contexts/i18n-context';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function HomeLayout() {
  const { t } = useContext(I18nContext);
  const colorScheme = useColorScheme() ?? 'light';
  const headerColor = BrandColors[colorScheme];

  // Handle back button on home tab to exit app instead of navigate
  useFocusEffect(
    React.useCallback(() => {
      if (Platform.OS !== 'android') return;

      const backAction = () => {
        BackHandler.exitApp();
        return true;
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', backAction);

      return () => subscription.remove();
    }, [])
  );

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
              backgroundColor: headerColor,
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
            backgroundColor: headerColor,
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
