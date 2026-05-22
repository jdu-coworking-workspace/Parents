import React, { useContext } from "react";
import { Stack } from "expo-router";
import { I18nContext } from "@/contexts/i18n-context";

export default function SettingsLayout() {
  const { t } = useContext(I18nContext);

  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          headerShown: true,
          title: t("settingsHeader"),
          headerStyle: {
            backgroundColor: "#1A4AAC",
          },
          headerTintColor: "#fff",
          headerTitleStyle: {
            fontWeight: "bold",
            fontSize: 18,
            color: "#fff",
          },
          headerShadowVisible: false,
          headerTitleAlign: "center",
        }}
      />
    </Stack>
  );
}
