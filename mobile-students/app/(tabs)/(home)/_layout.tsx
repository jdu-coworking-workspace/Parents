import React, { useContext } from 'react';
import { Stack } from 'expo-router';
import { Platform, Text, View } from 'react-native';
import { BrandColors } from '@/constants/theme';
import { I18nContext } from '@/contexts/i18n-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { useMessageContext } from '@/contexts/message-context';

export default function HomeLayout() {
  const { t } = useContext(I18nContext);
  const colorScheme = useColorScheme() ?? 'light';
  const headerBg = Colors[colorScheme].tint;
  const { unreadCount } = useMessageContext();

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
            headerRight: () => {
              if (unreadCount === 0) {
                return null;
              }

              const displayUnreadCount =
                unreadCount > 99 ? '99+' : String(unreadCount);

              return (
                <View
                  style={{
                    width: 36,
                    height: 36,
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    borderRadius: 18,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Text
                    numberOfLines={1}
                    style={{
                      color: 'white',
                      fontSize: 16,
                      lineHeight: 17,
                      textAlign: 'center',
                      fontWeight: 'bold',
                    }}
                  >
                    {displayUnreadCount}
                  </Text>
                </View>
              );
            },
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

