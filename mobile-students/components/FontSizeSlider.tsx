import React, { useContext, useState } from "react";
import { StyleSheet, View, Text } from "react-native";
import Slider from "@react-native-community/slider";
import { I18nContext } from "@/contexts/i18n-context";
import { useFontSize } from "@/contexts/font-size-context";

const FONT_SIZES = [1.0, 1.2, 1.4, 1.6, 1.8, 2.0, 2.2];

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
  const { multiplier, setMultiplier } = useFontSize();
  const { t } = useContext(I18nContext);
  const [previewMultiplier, setPreviewMultiplier] = useState<number | undefined>(undefined);

  // Find current step index
  const currentStep = FONT_SIZES.findIndex(size => size === multiplier);
  const safeCurrentStep = currentStep >= 0 ? currentStep : 0;

  const handleChange = (value: number) => {
    const step = Math.round(value);
    const fontSize = FONT_SIZES[step];
    setPreviewMultiplier(fontSize);
    onPreviewChange?.(fontSize);
  };

  const handleComplete = (value: number) => {
    const step = Math.round(value);
    const fontSize = FONT_SIZES[step];
    setMultiplier(fontSize);
    setPreviewMultiplier(undefined);
    onPreviewChange?.(fontSize);
  };

  const effectiveMultiplier = previewMultiplier ?? multiplier;
  const sampleFontSize = 15 * effectiveMultiplier;

  return (
    <View style={styles.container}>
      {/* Sample text preview card */}
      <View
        style={[styles.textContainer, { backgroundColor: cardBackgroundColor }]}
      >
        <Text
          style={[
            styles.descriptionText,
            {
              color: textColor,
              fontSize: sampleFontSize,
              lineHeight: sampleFontSize * 1.4,
            },
          ]}
        >
          {t("sampleText")}
        </Text>
      </View>

      {/* Slider with A labels */}
      <View style={styles.sliderRow}>
        <Text style={[styles.smallLabel, { color: textColor }]}>A</Text>

        <View style={styles.sliderWrapper}>
          <Slider
            style={styles.slider}
            value={safeCurrentStep}
            minimumValue={0}
            maximumValue={FONT_SIZES.length - 1}
            step={1}
            onValueChange={handleChange}
            onSlidingComplete={handleComplete}
            minimumTrackTintColor={activeColor}
            maximumTrackTintColor={inactiveColor}
            thumbTintColor={activeColor}
          />
        </View>

        <Text style={[styles.largeLabel, { color: textColor }]}>A</Text>
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
    marginHorizontal: 20,
    justifyContent: "space-between",
  },
  sliderWrapper: {
    flex: 1,
    height: 40,
    justifyContent: "center",
  },
  slider: {
    width: "100%",
    height: 40,
  },
  smallLabel: {
    fontWeight: "500",
    fontSize: 14,
    marginRight: 12,
  },
  largeLabel: {
    fontWeight: "600",
    fontSize: 24,
    marginLeft: 12,
  },
});

export default FontSizeSlider;

