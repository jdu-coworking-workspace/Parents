import React, { useContext, useState } from "react";
import { StyleSheet, View, Text } from "react-native";
import Slider from "@react-native-community/slider";
import { I18nContext } from "@/contexts/i18n-context";

interface FontSizeSliderProps {
  onPreviewChange?: (value: number) => void;
  textColor?: string;
  activeColor?: string;
  inactiveColor?: string;
  cardBackgroundColor?: string;
}

export const FontSizeSlider: React.FC<FontSizeSliderProps> = ({
  onPreviewChange,
  textColor = "#000000",
  activeColor = "#4182EB",
  inactiveColor = "#C6C6C6",
  cardBackgroundColor = "#333335",
}) => {
  const [fontSize, setFontSize] = useState(1.4);
  const { t } = useContext(I18nContext);

  const handleValueChange = (value: number) => {
    setFontSize(value);
    onPreviewChange?.(value);
  };

  return (
    <View style={styles.container}>
      {/* Matn qutisi (Karta) */}
      <View
        style={[styles.textContainer, { backgroundColor: cardBackgroundColor }]}
      >
        <Text
          style={[
            styles.descriptionText,
            {
              color: textColor,
              fontSize: 15 * fontSize,
              lineHeight: 22 * fontSize,
            },
          ]}
        >
          {t("sampleText")}
        </Text>
      </View>

      {/* Slider Qismi (Silliq) */}
      <View style={styles.sliderRow}>
        <Text style={[styles.label, { color: textColor }]}>A</Text>

        <Slider
          style={styles.slider}
          minimumValue={1.0}
          maximumValue={2.2}
          step={0.1}
          value={fontSize}
          onValueChange={handleValueChange}
          minimumTrackTintColor={activeColor}
          maximumTrackTintColor={inactiveColor}
          thumbTintColor={activeColor}
        />

        <Text style={[styles.label, { color: textColor, fontSize: 24 }]}>
          A
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  textContainer: {
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 16,
    marginBottom: 30,
    alignItems: "center",
  },
  descriptionText: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    fontWeight: "400",
  },
  sliderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 40,
    justifyContent: "space-between",
  },
  slider: {
    flex: 1,
    height: 40,
    marginHorizontal: 10,
  },
  label: {
    fontWeight: "500",
    fontSize: 16,
  },
});

export default FontSizeSlider;
