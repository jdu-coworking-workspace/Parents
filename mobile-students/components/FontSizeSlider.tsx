import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import Slider from '@react-native-community/slider';

const FONT_SIZES = [1.0, 1.2, 1.4, 1.6, 1.8, 2.0, 2.2];

export const FontSizeSlider = () => {
  return (
    <View style={styles.container}>
      <View style={styles.sliderRow}>
        <Text style={styles.smallLabel}>A</Text>

        <View style={styles.sliderWrapper}>
          <Slider
            style={styles.slider}
            value={3}
            minimumValue={0}
            maximumValue={FONT_SIZES.length - 1}
            step={1}
            onValueChange={() => {}}
            minimumTrackTintColor="#007AFF"
            maximumTrackTintColor="#D0D0D0"
            thumbTintColor="#007AFF"
          />
        </View>

        <Text style={styles.largeLabel}>A</Text>
      </View>
    </View>
  );
};

export const SampleText = () => {
  return (
    <View style={sampleTextStyles.container}>
      <Text style={sampleTextStyles.text}>
       O'zingizga qulay bo'lgan matn hajmini tanlang — o'qish yanada qulay bo'ladi.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 300,
    alignSelf: 'center',
    paddingVertical: 15,
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
  },
  smallLabel: {
    fontSize: 14,
    color: '#8E8E93',
    marginRight: 12,
  },
  largeLabel: {
    fontSize: 24,
    color: '#8E8E93',
    marginLeft: 12,
  },
  sliderWrapper: {
    flex: 1,
    height: 40,
    justifyContent: 'center',
  },
  slider: {
    width: '100%',
    height: 40,
  },
});

const sampleTextStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: 15,
    borderRadius: 12,
    marginTop: 20,
    backgroundColor: '#F2F2F7',
  },
  text: {
    fontSize: 16,
    textAlign: 'center',
    color: '#000',
  },
});