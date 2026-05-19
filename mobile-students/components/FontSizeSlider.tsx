import React, { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import Slider from "@react-native-community/slider";
import { useColorScheme } from "@/hooks/use-color-scheme";

export const SampleText = () => {
  const colorScheme = useColorScheme() ?? "light";
  const isDark = colorScheme === "dark";

  return (
    <View
      style={[
        styles.sampleContainer,
        // Rasmdagi kabi orqa fon qorong'u rejimda to'q kulrang bo'ladi
        { backgroundColor: isDark ? "#3A3A3C" : "#F2F2F7" },
      ]}
    >
      <Text
        style={[
          styles.sampleText,
          // Matn rangi rejimga qarab o'zgaradi
          { color: isDark ? "#FFFFFF" : "#000000" },
        ]}
      >
        O'zingizga qulay bo'lgan matn hajmini tanlang — o'qish yanada qulay
        bo'ladi.
      </Text>
    </View>
  );
};

export const FontSizeSlider = () => {
  const colorScheme = useColorScheme() ?? "light";
  const isDark = colorScheme === "dark";
  const [fontSize, setFontSize] = useState(16);

  return (
    <View style={styles.sliderRow}>
      <Text
        style={[styles.smallLabel, { color: isDark ? "#9CA3AF" : "#8E8E93" }]}
      >
        A
      </Text>

      <View style={styles.sliderWrapper}>
        <Slider
          style={styles.slider}
          minimumValue={12}
          maximumValue={24}
          step={2}
          value={fontSize}
          onValueChange={setFontSize}
          // Moviy rang
          minimumTrackTintColor="#3887FE"
          // Qolgan qismi dark modeda to'q kulrang bo'ladi
          maximumTrackTintColor={isDark ? "#4B4B4D" : "#D1D1D6"}
          thumbTintColor="#3887FE"
        />
      </View>

      <Text
        style={[styles.largeLabel, { color: isDark ? "#9CA3AF" : "#8E8E93" }]}
      >
        A
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  sampleContainer: {
    padding: 10,
    marginTop: 10,
    borderRadius: 12,
    marginBottom: 35, // Matn va slider orasidagi ochiq joy
  },
  sampleText: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
  },
  sliderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  sliderWrapper: {
    flex: 1,
    marginHorizontal: 15,
  },
  slider: {
    width: "100%",
    height: 40,
  },
  smallLabel: {
    fontSize: 16,
    fontWeight: "500",
  },
  largeLabel: {
    fontSize: 24, // Katta "A" harfi uchun
    fontWeight: "500",
  },
});
