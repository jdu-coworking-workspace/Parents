import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function IndexScreen() {
  const [languageSelected, setLanguageSelected] = useState<boolean | null>(null);

  useEffect(() => {
    const checkLanguageSelection = async () => {
      try {
        const selected = await AsyncStorage.getItem("languageSelected");
        setLanguageSelected(selected === "true");
      } catch (error) {
        console.error("Error checking language selection:", error);
        setLanguageSelected(false);
      }
    };

    checkLanguageSelection();
  }, []);

  if (languageSelected === null) {
    return null;
  }

  return languageSelected ? (
    <Redirect href="/sign-in" />
  ) : (
    <Redirect href="/language-select" />
  );
}