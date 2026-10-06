import { useState } from "react";
import {
  Dimensions,
  Image,
  LayoutChangeEvent,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type MessageImageGridProps = {
  images: string[];
  onImagePress: (index: number) => void;
};

export default function MessageImageGrid({
  images,
  onImagePress,
}: MessageImageGridProps) {
  const [containerWidth, setContainerWidth] = useState(() => {
    const screenWidth = Dimensions.get("window").width;
    return Math.max(0, screenWidth - 32);
  });

  const handleLayout = (event: LayoutChangeEvent) => {
    const width = event.nativeEvent.layout.width;
    if (width > 0 && Math.abs(width - containerWidth) > 1) {
      setContainerWidth(width);
    }
  };

  if (!images || images.length === 0) {
    return null;
  }

  const gap = 4;
  const count = images.length;

  // 1 ta rasm
  if (count === 1) {
    const height = Math.min(300, Math.max(160, containerWidth * 0.6));
    return (
      <View onLayout={handleLayout} style={styles.container}>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => onImagePress(0)}
          style={[styles.singleWrapper, { width: containerWidth, height }]}
        >
          <Image
            source={{ uri: images[0] }}
            resizeMode="cover"
            style={styles.image}
          />
        </TouchableOpacity>
      </View>
    );
  }

  // 2 ta rasm: Yonma-yon 50% dan
  if (count === 2) {
    const itemWidth = (containerWidth - gap) / 2;
    const height = Math.min(220, itemWidth * 1.1);

    return (
      <View onLayout={handleLayout} style={styles.container}>
        <View style={styles.row}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => onImagePress(0)}
            style={[
              styles.cellWrapper,
              styles.roundedLeft,
              { width: itemWidth, height },
            ]}
          >
            <Image
              source={{ uri: images[0] }}
              resizeMode="cover"
              style={styles.image}
            />
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => onImagePress(1)}
            style={[
              styles.cellWrapper,
              styles.roundedRight,
              { width: itemWidth, height },
            ]}
          >
            <Image
              source={{ uri: images[1] }}
              resizeMode="cover"
              style={styles.image}
            />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // 3 ta rasm: 1 ta katta tepada, 2 ta kichik pastda
  if (count === 3) {
    const topHeight = Math.min(200, containerWidth * 0.5);
    const bottomItemWidth = (containerWidth - gap) / 2;
    const bottomHeight = Math.min(150, bottomItemWidth * 0.85);

    return (
      <View onLayout={handleLayout} style={styles.container}>
        {/* Yuqori rasm */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => onImagePress(0)}
          style={[
            styles.cellWrapper,
            styles.roundedTop,
            { width: containerWidth, height: topHeight, marginBottom: gap },
          ]}
        >
          <Image
            source={{ uri: images[0] }}
            resizeMode="cover"
            style={styles.image}
          />
        </TouchableOpacity>

        {/* Pastki 2 ta rasm */}
        <View style={styles.row}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => onImagePress(1)}
            style={[
              styles.cellWrapper,
              styles.roundedBottomLeft,
              { width: bottomItemWidth, height: bottomHeight },
            ]}
          >
            <Image
              source={{ uri: images[1] }}
              resizeMode="cover"
              style={styles.image}
            />
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => onImagePress(2)}
            style={[
              styles.cellWrapper,
              styles.roundedBottomRight,
              { width: bottomItemWidth, height: bottomHeight },
            ]}
          >
            <Image
              source={{ uri: images[2] }}
              resizeMode="cover"
              style={styles.image}
            />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // 4 yoki undan ortiq rasm: 2x2 panjara (grid)
  const itemWidth = (containerWidth - gap) / 2;
  const itemHeight = Math.min(160, itemWidth * 0.85);
  const remainingCount = count - 4;

  return (
    <View onLayout={handleLayout} style={styles.container}>
      {/* 1-qator */}
      <View style={[styles.row, { marginBottom: gap }]}>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => onImagePress(0)}
          style={[
            styles.cellWrapper,
            styles.roundedTopLeft,
            { width: itemWidth, height: itemHeight },
          ]}
        >
          <Image
            source={{ uri: images[0] }}
            resizeMode="cover"
            style={styles.image}
          />
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => onImagePress(1)}
          style={[
            styles.cellWrapper,
            styles.roundedTopRight,
            { width: itemWidth, height: itemHeight },
          ]}
        >
          <Image
            source={{ uri: images[1] }}
            resizeMode="cover"
            style={styles.image}
          />
        </TouchableOpacity>
      </View>

      {/* 2-qator */}
      <View style={styles.row}>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => onImagePress(2)}
          style={[
            styles.cellWrapper,
            styles.roundedBottomLeft,
            { width: itemWidth, height: itemHeight },
          ]}
        >
          <Image
            source={{ uri: images[2] }}
            resizeMode="cover"
            style={styles.image}
          />
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => onImagePress(3)}
          style={[
            styles.cellWrapper,
            styles.roundedBottomRight,
            { width: itemWidth, height: itemHeight },
          ]}
        >
          <Image
            source={{ uri: images[3] }}
            resizeMode="cover"
            style={styles.image}
          />
          {remainingCount > 0 && (
            <View style={styles.overlay}>
              <Text style={styles.overlayText}>+{remainingCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const RADIUS = 12;

const styles = StyleSheet.create({
  container: {
    width: "100%",
    marginVertical: 6,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  cellWrapper: {
    overflow: "hidden",
    backgroundColor: "#F3F4F6",
  },
  singleWrapper: {
    borderRadius: RADIUS,
    overflow: "hidden",
    backgroundColor: "#F3F4F6",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  roundedLeft: {
    borderTopLeftRadius: RADIUS,
    borderBottomLeftRadius: RADIUS,
  },
  roundedRight: {
    borderTopRightRadius: RADIUS,
    borderBottomRightRadius: RADIUS,
  },
  roundedTop: {
    borderTopLeftRadius: RADIUS,
    borderTopRightRadius: RADIUS,
  },
  roundedTopLeft: {
    borderTopLeftRadius: RADIUS,
  },
  roundedTopRight: {
    borderTopRightRadius: RADIUS,
  },
  roundedBottomLeft: {
    borderBottomLeftRadius: RADIUS,
  },
  roundedBottomRight: {
    borderBottomRightRadius: RADIUS,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  overlayText: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "700",
  },
});
