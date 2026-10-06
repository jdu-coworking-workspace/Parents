import { useCallback, useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Image,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

type MessageImageCarouselProps = {
  images: string[];
  onImagePress: (index: number) => void;
};

export default function MessageImageCarousel({
  images,
  onImagePress,
}: MessageImageCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [containerWidth, setContainerWidth] = useState(() => {
    const screenWidth = Dimensions.get("window").width;
    return Math.max(0, screenWidth - 32);
  });
  const [imageRatios, setImageRatios] = useState<Record<string, number>>({});
  const [loadedImages, setLoadedImages] = useState<Record<string, boolean>>({});
  const flatListRef = useRef<FlatList<string>>(null);

  const handleLayout = (event: LayoutChangeEvent) => {
    const width = event.nativeEvent.layout.width;
    if (width > 0 && Math.abs(width - containerWidth) > 1) {
      setContainerWidth(width);
    }
  };

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetX = event.nativeEvent.contentOffset.x;
      if (containerWidth > 0) {
        const nextIndex = Math.round(offsetX / containerWidth);
        if (
          nextIndex >= 0 &&
          nextIndex < images.length &&
          nextIndex !== activeIndex
        ) {
          setActiveIndex(nextIndex);
        }
      }
    },
    [containerWidth, images.length, activeIndex]
  );

  const scrollToIndex = (index: number) => {
    if (index >= 0 && index < images.length) {
      flatListRef.current?.scrollToIndex({ index, animated: true });
      setActiveIndex(index);
    }
  };

  const handleImageLoad = (uri: string, width: number, height: number) => {
    if (width && height) {
      setImageRatios((prev) =>
        prev[uri] ? prev : { ...prev, [uri]: width / height }
      );
      setLoadedImages((prev) => ({ ...prev, [uri]: true }));
    }
  };

  if (!images || images.length === 0) {
    return null;
  }

  // Calculate dynamic height based on the current active image ratio
  const currentUri = images[activeIndex] ?? images[0];
  const activeRatio = imageRatios[currentUri] ?? 16 / 9;
  const computedHeight = Math.min(
    340,
    Math.max(180, containerWidth / activeRatio)
  );

  // Single image: clean single card without carousel controls
  if (images.length === 1) {
    const singleUri = images[0];
    const isLoaded = loadedImages[singleUri];

    return (
      <View onLayout={handleLayout} style={styles.container}>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => onImagePress(0)}
          style={[styles.imageWrapper, { height: computedHeight }]}
        >
          {!isLoaded && <View style={styles.placeholder} />}
          <Image
            source={{ uri: singleUri }}
            style={styles.image}
            resizeMode="contain"
            onLoad={(e) => {
              const { width, height } = e.nativeEvent.source;
              handleImageLoad(singleUri, width, height);
            }}
          />
        </TouchableOpacity>
      </View>
    );
  }

  // Multiple images: full swipeable carousel with dots and counter badge
  return (
    <View onLayout={handleLayout} style={styles.container}>
      <View style={[styles.carouselWrapper, { height: computedHeight }]}>
        <FlatList
          ref={flatListRef}
          data={images}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          snapToInterval={containerWidth}
          snapToAlignment="center"
          decelerationRate="fast"
          bounces={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          keyExtractor={(item, index) => `${item}-${index}`}
          renderItem={({ item, index }) => {
            const isLoaded = loadedImages[item];

            return (
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => onImagePress(index)}
                style={[
                  styles.imageWrapper,
                  { width: containerWidth, height: computedHeight },
                ]}
              >
                {!isLoaded && <View style={styles.placeholder} />}
                <Image
                  source={{ uri: item }}
                  style={styles.image}
                  resizeMode="contain"
                  onLoad={(e) => {
                    const { width, height } = e.nativeEvent.source;
                    handleImageLoad(item, width, height);
                  }}
                />
              </TouchableOpacity>
            );
          }}
        />

        {/* Counter Badge */}
        <View style={styles.counterBadge}>
          <Text style={styles.counterText}>
            {activeIndex + 1} / {images.length}
          </Text>
        </View>

        {/* Previous Button */}
        {activeIndex > 0 && (
          <TouchableOpacity
            style={[styles.arrowButton, styles.leftArrow]}
            onPress={() => scrollToIndex(activeIndex - 1)}
            activeOpacity={0.8}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        )}

        {/* Next Button */}
        {activeIndex < images.length - 1 && (
          <TouchableOpacity
            style={[styles.arrowButton, styles.rightArrow]}
            onPress={() => scrollToIndex(activeIndex + 1)}
            activeOpacity={0.8}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        )}

        {/* Pagination Dots */}
        <View style={styles.dotsContainer}>
          {images.map((_, dotIndex) => {
            const isActive = dotIndex === activeIndex;
            return (
              <View
                key={`dot-${dotIndex}`}
                style={[styles.dot, isActive ? styles.activeDot : styles.inactiveDot]}
              />
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    marginTop: 12,
  },
  carouselWrapper: {
    width: "100%",
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#F3F4F6",
    position: "relative",
  },
  imageWrapper: {
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  placeholder: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#E5E7EB",
  },
  counterBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingHorizontal: 8,
    paddingVertical: 4,
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
    marginTop: -16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
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
    bottom: 10,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    zIndex: 10,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  activeDot: {
    width: 16,
    backgroundColor: "#0A84FF",
  },
  inactiveDot: {
    width: 6,
    backgroundColor: "rgba(255, 255, 255, 0.65)",
  },
});
