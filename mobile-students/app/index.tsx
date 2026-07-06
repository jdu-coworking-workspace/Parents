import AsyncStorage from "@react-native-async-storage/async-storage";
import { Redirect } from "expo-router";
import type { Href } from "expo-router";
import { useEffect, useState } from "react";

const LANGUAGE_SELECTED_KEY = "languageSelected";
const LANGUAGE_SELECT_ROUTE = "/language-select" as Href;

export default function IndexScreen() {
  const [languageSelected, setLanguageSelected] = useState<boolean | null>(null);

  useEffect(() => {
    let isMounted = true;

    const checkLanguageSelection = async () => {
      try {
        const selected = await AsyncStorage.getItem(LANGUAGE_SELECTED_KEY);
        if (isMounted) {
          setLanguageSelected(selected === "true");
        }
      } catch (error) {
        console.error("Error checking language selection:", error);
        if (isMounted) {
          setLanguageSelected(false);
        }
      }
    };

    void checkLanguageSelection();

    return () => {
      isMounted = false;
    };
  }, []);

  if (languageSelected === null) {
    return null;
  }

  return languageSelected ? (
    <Redirect href="/sign-in" />
  ) : (
    <Redirect href={LANGUAGE_SELECT_ROUTE} />
  );
}
