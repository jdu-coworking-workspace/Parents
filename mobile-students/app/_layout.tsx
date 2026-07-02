import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

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

  return (
    <RootSiblingParent>
      <I18nProvider>
        <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
          <Stack>
            <Stack.Screen name="sign-in" options={{ headerShown: false }} />
            <Stack.Screen name="forgot-password" options={{ headerShown: false }} />
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