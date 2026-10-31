import React, { useCallback, useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getMessageImageUrl } from "@/utils/image-url";
import { useColorScheme } from "@/hooks/use-color-scheme";

export type ImageGroupLayout = "sequential" | "carousel" | "group";

export interface MessageImageGroupViewProps {
  images: string[];
  layout?: ImageGroupLayout;
  alt?: string;
  onImagePress?: (images: string[], index: number) => void;
}

const FALLBACK_WIDTH = Math.max(300, Dimensions.get("window").width - 32);

export default function MessageImageGroupView({
  images,
  layout = "sequential",
  onImagePress,
}: MessageImageGroupViewProps) {
  const colorScheme = useColorScheme() ?? "dark";
  const isDark = colorScheme === "dark";

  const [containerWidth, setContainerWidth] = useState<number>(FALLBACK_WIDTH);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const flatListRef = useRef<FlatList<string>>(null);

  const resolvedImages = React.useMemo(() => {
    return (images || []).map((img) => getMessageImageUrl(img)).filter(Boolean);
  }, [images]);

  const handleContainerLayout = useCallback((e: any) => {
    const width = e.nativeEvent?.layout?.width;
    if (width && width > 0) {
      setContainerWidth(width);
    }
  }, []);

  const handleScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetX = e.nativeEvent.contentOffset.x;
      const index = Math.round(offsetX / (containerWidth || FALLBACK_WIDTH));
      if (index >= 0 && index < resolvedImages.length) {
        setCurrentIndex(index);
      }
    },
    [containerWidth, resolvedImages.length]
  );

  const scrollToIndex = useCallback(
    (index: number) => {
      if (index < 0 || index >= resolvedImages.length) return;
      setCurrentIndex(index);
      flatListRef.current?.scrollToIndex({
        index,
        animated: true,
      });
    },
    [resolvedImages.length]
  );

  const handlePrev = useCallback(() => {
    const target =
      currentIndex === 0 ? resolvedImages.length - 1 : currentIndex - 1;
    scrollToIndex(target);
  }, [currentIndex, resolvedImages.length, scrollToIndex]);

  const handleNext = useCallback(() => {
    const target =
      currentIndex === resolvedImages.length - 1 ? 0 : currentIndex + 1;
    scrollToIndex(target);
  }, [currentIndex, resolvedImages.length, scrollToIndex]);

  if (!resolvedImages || resolvedImages.length === 0) {
    return null;
  }

  // Single Image Layout (used when only 1 image exists, regardless of layout)
  if (resolvedImages.length === 1) {
    const singleUri = resolvedImages[0];
    return (
      <View
        onLayout={handleContainerLayout}
        style={[styles.singleContainer, { backgroundColor: isDark ? "#1C1C1E" : "#F3F4F6" }]}
      >
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => onImagePress?.(resolvedImages, 0)}
        >
          <Image
            source={{ uri: singleUri }}
            style={styles.singleImage}
            resizeMode="cover"
          />
        </TouchableOpacity>
      </View>
    );
  }

  // 1. CAROUSEL LAYOUT
  if (layout === "carousel") {
    const activeWidth = containerWidth > 0 ? containerWidth : FALLBACK_WIDTH;

    return (
      <View
        onLayout={handleContainerLayout}
        style={[
          styles.carouselWrapper,
          {
            backgroundColor: isDark ? "#1C1C1E" : "#F3F4F6",
            borderColor: isDark ? "#2C2C2E" : "#E5E7EB",
          },
        ]}
      >
        {/* Horizontal FlatList slider */}
        <FlatList
          ref={flatListRef}
          data={resolvedImages}
          keyExtractor={(item, index) => `${item}-${index}`}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScrollEnd}
          getItemLayout={(_, index) => ({
            length: activeWidth,
            offset: activeWidth * index,
            index,
          })}
          renderItem={({ item, index }) => (
            <TouchableOpacity
              activeOpacity={0.9}
              style={{ width: activeWidth, height: 260 }}
              onPress={() => onImagePress?.(resolvedImages, index)}
            >
              <Image
                source={{ uri: item }}
                style={{ width: activeWidth, height: 260 }}
                resizeMode="cover"
              />
            </TouchableOpacity>
          )}
        />

        {/* Counter Badge (top-right) */}
        <View style={styles.counterBadge}>
          <Text style={styles.counterText}>
            {currentIndex + 1} / {resolvedImages.length}
          </Text>
        </View>

        {/* Left Arrow Button */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handlePrev}
          style={[styles.arrowButton, styles.leftArrow]}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Right Arrow Button */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleNext}
          style={[styles.arrowButton, styles.rightArrow]}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Dots Pagination (Overlay on bottom of image) */}
        <View style={styles.dotsContainer}>
          {resolvedImages.map((_, idx) => {
            const isActive = idx === currentIndex;
            return (
              <TouchableOpacity
                key={`dot-${idx}`}
                onPress={() => scrollToIndex(idx)}
                style={[
                  styles.dot,
                  isActive ? styles.activeDot : styles.inactiveDot,
                ]}
              />
            );
          })}
        </View>
      </View>
    );
  }

  // 2. GROUP (COLLAGE / GRID) LAYOUT
  if (layout === "group") {
    // 2 images: 2 equal columns
    if (resolvedImages.length === 2) {
      return (
        <View onLayout={handleContainerLayout} style={styles.groupContainer}>
          <View style={styles.row}>
            {resolvedImages.map((img, idx) => (
              <TouchableOpacity
                key={`group-2-${idx}`}
                activeOpacity={0.9}
                style={[
                  styles.gridItemHalf,
                  {
                    height: 180,
                    backgroundColor: isDark ? "#1C1C1E" : "#F3F4F6",
                    borderColor: isDark ? "#2C2C2E" : "#E5E7EB",
                  },
                ]}
                onPress={() => onImagePress?.(resolvedImages, idx)}
              >
                <Image
                  source={{ uri: img }}
                  style={styles.fullImage}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      );
    }

    // 3 images: 1 large on left (50%), 2 stacked on right (50%)
    if (resolvedImages.length === 3) {
      return (
        <View onLayout={handleContainerLayout} style={styles.groupContainer}>
          <View style={[styles.row, { height: 220 }]}>
            {/* Left large image */}
            <TouchableOpacity
              activeOpacity={0.9}
              style={[
                styles.gridItemHalf,
                {
                  height: "100%",
                  backgroundColor: isDark ? "#1C1C1E" : "#F3F4F6",
                  borderColor: isDark ? "#2C2C2E" : "#E5E7EB",
                },
              ]}
              onPress={() => onImagePress?.(resolvedImages, 0)}
            >
              <Image
                source={{ uri: resolvedImages[0] }}
                style={styles.fullImage}
                resizeMode="cover"
              />
            </TouchableOpacity>

            {/* Right stacked images */}
            <View style={[styles.gridItemHalf, styles.stackedColumn]}>
              {resolvedImages.slice(1, 3).map((img, idx) => (
                <TouchableOpacity
                  key={`group-3-${idx + 1}`}
                  activeOpacity={0.9}
                  style={[
                    styles.stackedItem,
                    {
                      backgroundColor: isDark ? "#1C1C1E" : "#F3F4F6",
                      borderColor: isDark ? "#2C2C2E" : "#E5E7EB",
                    },
                  ]}
                  onPress={() => onImagePress?.(resolvedImages, idx + 1)}
                >
                  <Image
                    source={{ uri: img }}
                    style={styles.fullImage}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      );
    }

    // 4 images: 2x2 grid
    if (resolvedImages.length === 4) {
      return (
        <View onLayout={handleContainerLayout} style={styles.groupContainer}>
          <View style={styles.grid2x2}>
            {resolvedImages.map((img, idx) => (
              <TouchableOpacity
                key={`group-4-${idx}`}
                activeOpacity={0.9}
                style={[
                  styles.gridItemQuarter,
                  {
                    height: 140,
                    backgroundColor: isDark ? "#1C1C1E" : "#F3F4F6",
                    borderColor: isDark ? "#2C2C2E" : "#E5E7EB",
                  },
                ]}
                onPress={() => onImagePress?.(resolvedImages, idx)}
              >
                <Image
                  source={{ uri: img }}
                  style={styles.fullImage}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      );
    }

    // 5 or more images: 3-column responsive grid
    return (
      <View onLayout={handleContainerLayout} style={styles.groupContainer}>
        <View style={styles.grid3Col}>
          {resolvedImages.map((img, idx) => (
            <TouchableOpacity
              key={`group-many-${idx}`}
              activeOpacity={0.9}
              style={[
                styles.gridItemThird,
                {
                  height: 110,
                  backgroundColor: isDark ? "#1C1C1E" : "#F3F4F6",
                  borderColor: isDark ? "#2C2C2E" : "#E5E7EB",
                },
              ]}
              onPress={() => onImagePress?.(resolvedImages, idx)}
            >
              <Image
                source={{ uri: img }}
                style={styles.fullImage}
                resizeMode="cover"
              />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  }

  // 3. SEQUENTIAL (Ketma-ket)
  return (
    <View onLayout={handleContainerLayout} style={styles.sequentialContainer}>
      {resolvedImages.map((img, idx) => (
        <TouchableOpacity
          key={`seq-${idx}`}
          activeOpacity={0.9}
          style={[
            styles.sequentialItem,
            {
              backgroundColor: isDark ? "#1C1C1E" : "#F3F4F6",
              borderColor: isDark ? "#2C2C2E" : "#E5E7EB",
            },
          ]}
          onPress={() => onImagePress?.(resolvedImages, idx)}
        >
          <Image
            source={{ uri: img }}
            style={styles.sequentialImage}
            resizeMode="cover"
          />
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  singleContainer: {
    marginVertical: 10,
    width: "100%",
    borderRadius: 12,
    overflow: "hidden",
  },
  singleImage: {
    width: "100%",
    height: 240,
  },
  carouselWrapper: {
    marginVertical: 12,
    width: "100%",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    position: "relative",
  },
  counterBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 12,
    zIndex: 10,
  },
  counterText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  arrowButton: {
    position: "absolute",
    top: "50%",
    transform: [{ translateY: -17 }],
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  leftArrow: {
    left: 8,
  },
  rightArrow: {
    right: 8,
  },
  dotsContainer: {
    position: "absolute",
    bottom: 12,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    gap: 6,
    zIndex: 10,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  activeDot: {
    width: 18,
    backgroundColor: "#FFFFFF",
  },
  inactiveDot: {
    width: 6,
    backgroundColor: "rgba(255, 255, 255, 0.5)",
  },
  groupContainer: {
    marginVertical: 12,
    width: "100%",
  },
  row: {
    flexDirection: "row",
    gap: 8,
    width: "100%",
  },
  gridItemHalf: {
    flex: 1,
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
  },
  stackedColumn: {
    flexDirection: "column",
    gap: 8,
  },
  stackedItem: {
    flex: 1,
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
  },
  grid2x2: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    width: "100%",
  },
  gridItemQuarter: {
    width: "48.5%",
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
  },
  grid3Col: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    width: "100%",
  },
  gridItemThird: {
    width: "31.8%",
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
  },
  fullImage: {
    width: "100%",
    height: "100%",
  },
  sequentialContainer: {
    marginVertical: 12,
    gap: 10,
    width: "100%",
  },
  sequentialItem: {
    width: "100%",
    height: 220,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
  },
  sequentialImage: {
    width: "100%",
    height: "100%",
  },
});

