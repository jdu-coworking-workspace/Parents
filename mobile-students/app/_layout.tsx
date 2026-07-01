import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";
import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { RootSiblingParent } from 'react-native-root-siblings';
import { useColorScheme } from "@/hooks/use-color-scheme";
import { AuthProvider } from "@/contexts/auth-context";
import { I18nProvider } from "@/contexts/i18n-context";
import { ThemeModeProvider } from "@/contexts/theme-context";
import { MessageProvider } from "@/contexts/message-context";

export const unstable_settings = {
  initialRouteName: "sign-in",
  anchor: "sign-in",
};

function RootLayoutContent() {
  const colorScheme = useColorScheme();
  const [initialRouteName, setInitialRouteName] = useState<string | null>(null);

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      try {
        const languageSelected = await AsyncStorage.getItem('languageSelected');
        
        if (languageSelected !== 'true') {
          // First time user, show language selection
          setInitialRouteName('language-select');
        } else {
          // Language already selected, show sign-in
          setInitialRouteName('sign-in');
        }
      } catch (error) {
        console.error('Error checking onboarding status:', error);
        setInitialRouteName('sign-in');
      }
    };

    checkOnboardingStatus();
  }, []);

  if (initialRouteName === null) {
    return null; // Loading state
  }

  return (
    <RootSiblingParent>
      <I18nProvider>
        <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
          <Stack screenOptions={{ headerShown: false }} initialRouteName={initialRouteName}>
            <Stack.Screen name="language-select" options={{ headerShown: false }} />
            <Stack.Screen name="sign-in" options={{ headerShown: false }} />
            <Stack.Screen name="new-psswd" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          </Stack>
          <StatusBar style="auto" />
        </ThemeProvider>
      </I18nProvider>
    </RootSiblingParent>
  );
}

export default function RootLayout() {
  return (
    <ThemeModeProvider>
      <AuthProvider>
        <MessageProvider>
          <RootLayoutContent />
        </MessageProvider>
      </AuthProvider>
    </ThemeModeProvider>
  );
}