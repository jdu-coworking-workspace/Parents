import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Alert,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { I18nContext } from '@/contexts/i18n-context';
import { downloadFileFromUrl } from '@/utils/file-download';

type Img = { uri: string };

interface ZoomableImageItemProps {
  uri: string;
  screenWidth: number;
  screenHeight: number;
  isSingle?: boolean;
}

function ZoomableImageItem({
  uri,
  screenWidth,
  screenHeight,
  isSingle = false,
}: ZoomableImageItemProps) {
  const [scale, setScale] = useState(1);
  const [lastScale, setLastScale] = useState(1);
  const [translateX, setTranslateX] = useState(0);
  const [translateY, setTranslateY] = useState(0);
  const [lastTranslateX, setLastTranslateX] = useState(0);
  const [lastTranslateY, setLastTranslateY] = useState(0);
  const [aspectRatio, setAspectRatio] = useState<number>(1);

  useEffect(() => {
    Image.getSize(
      uri,
      (w, h) => {
        if (w > 0 && h > 0) {
          setAspectRatio(w / h);
        }
      },
      () => {}
    );
  }, [uri]);

  const resetZoom = () => {
    setScale(1);
    setLastScale(1);
    setTranslateX(0);
    setTranslateY(0);
    setLastTranslateX(0);
    setLastTranslateY(0);
  };

  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (scale > 1.2) {
        resetZoom();
      } else {
        setScale(2.2);
        setLastScale(2.2);
      }
    })
    .runOnJS(true);

  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      if (!e || typeof e.scale !== 'number') return;
      const newScale = Math.min(Math.max(lastScale * e.scale, 1), 3.5);
      setScale(newScale);
      if (newScale <= 1) {
        setTranslateX(0);
        setTranslateY(0);
      }
    })
    .onEnd(() => {
      if (scale <= 1.05) {
        resetZoom();
      } else {
        setLastScale(scale);
        setLastTranslateX(translateX);
        setLastTranslateY(translateY);
      }
    })
    .runOnJS(true);

  const panGesture = Gesture.Pan()
    .enabled(scale > 1.05)
    .onUpdate((e) => {
      if (scale <= 1.05) return;
      const maxT = 120 * scale;
      setTranslateX(
        Math.min(Math.max(lastTranslateX + e.translationX, -maxT), maxT)
      );
      setTranslateY(
        Math.min(Math.max(lastTranslateY + e.translationY, -maxT), maxT)
      );
    })
    .onEnd(() => {
      setLastTranslateX(translateX);
      setLastTranslateY(translateY);
    })
    .runOnJS(true);

  const composedGesture = Gesture.Race(
    doubleTapGesture,
    Gesture.Simultaneous(pinchGesture, panGesture)
  );

  const imgWidth = screenWidth - 20;
  const maxAllowedHeight = screenHeight - (Platform.OS === 'ios' ? 170 : 150);
  const imgHeight = Math.min(
    maxAllowedHeight,
    Math.max(200, imgWidth / (aspectRatio || 1))
  );

  return (
    <View
      style={[
        styles.imageItemContainer,
        isSingle && styles.singleImageItemContainer,
      ]}
    >
      <GestureDetector gesture={composedGesture}>
        <View
          style={[
            styles.imageWrapper,
            {
              width: imgWidth,
              height: imgHeight,
              transform: [
                { scale: isFinite(scale) && scale > 0 ? scale : 1 },
                { translateX: isFinite(translateX) ? translateX : 0 },
                { translateY: isFinite(translateY) ? translateY : 0 },
              ],
              zIndex: scale > 1 ? 99 : 1,
            },
          ]}
        >
          <Image
            source={{ uri }}
            style={styles.fullImage}
            resizeMode="contain"
            onLoad={(e) => {
              const { width, height } = e.nativeEvent.source;
              if (width && height) {
                setAspectRatio(width / height);
              }
            }}
          />
        </View>
      </GestureDetector>
    </View>
  );
}

interface Props {
  visible: boolean;
  images: Img[];
  initialIndex?: number;
  onRequestClose: () => void;
}

export default function ZoomGallery({
  visible,
  images,
  initialIndex = 0,
  onRequestClose,
}: Props) {
  const [index, setIndex] = useState(initialIndex);
  const current = useMemo(() => images[index]?.uri ?? '', [images, index]);
  const { t } = useContext(I18nContext);
  const flatListRef = useRef<FlatList<Img>>(null);

  const screenDimensions = Dimensions.get('window');
  const screenWidth = screenDimensions.width;
  const screenHeight = screenDimensions.height;

  useEffect(() => {
    if (visible && initialIndex >= 0 && initialIndex < images.length) {
      setIndex(initialIndex);
      const timer = setTimeout(() => {
        flatListRef.current?.scrollToIndex({
          index: initialIndex,
          animated: false,
        });
      }, 80);
      return () => clearTimeout(timer);
    }
  }, [visible, initialIndex, images.length]);

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems && viewableItems.length > 0) {
      const first = viewableItems[0];
      if (first && typeof first.index === 'number') {
        setIndex(first.index);
      }
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 45,
  }).current;

  const downloadCurrent = useCallback(async () => {
    if (!current) return;
    await downloadFileFromUrl(current, t);
  }, [current, t]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onRequestClose}
      statusBarTranslucent
    >
      <GestureHandlerRootView style={styles.root}>
        <StatusBar hidden />
        <View style={styles.modalBackground}>
          {/* Top Floating Header */}
          <View style={styles.topHeader}>
            <TouchableOpacity
              onPress={onRequestClose}
              activeOpacity={0.7}
              style={styles.headerButton}
            >
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>

            {images.length > 1 && (
              <View style={styles.counterBadge}>
                <Text style={styles.counterText}>
                  {index + 1} / {images.length}
                </Text>
              </View>
            )}

            <TouchableOpacity
              onPress={downloadCurrent}
              activeOpacity={0.7}
              style={styles.downloadButton}
            >
              <Ionicons name="download-outline" size={20} color="#fff" />
              <Text style={styles.downloadText}>{t('download')}</Text>
            </TouchableOpacity>
          </View>

          {/* Vertical Scroll List */}
          <FlatList
            ref={flatListRef}
            data={images}
            keyExtractor={(item, idx) => `${item.uri}-${idx}`}
            showsVerticalScrollIndicator={images.length > 1}
            scrollEnabled={images.length > 1}
            contentContainerStyle={[
              styles.scrollListContent,
              images.length === 1 && styles.singleImageContent,
            ]}
            initialNumToRender={Math.max(10, images.length)}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            onScrollToIndexFailed={(info) => {
              setTimeout(() => {
                flatListRef.current?.scrollToIndex({
                  index: info.index,
                  animated: false,
                });
              }, 120);
            }}
            renderItem={({ item }) => (
              <ZoomableImageItem
                uri={item.uri}
                screenWidth={screenWidth}
                screenHeight={screenHeight}
                isSingle={images.length === 1}
              />
            )}
          />
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  modalBackground: {
    flex: 1,
    backgroundColor: '#000000',
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: Platform.OS === 'ios' ? 52 : 36,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
  },
  counterText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  downloadText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  scrollListContent: {
    paddingTop: 88,
    paddingBottom: 48,
    alignItems: 'center',
  },
  singleImageContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 0,
    paddingBottom: 0,
  },
  imageItemContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  singleImageItemContainer: {
    flex: 1,
    marginVertical: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageWrapper: {
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#121212',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullImage: {
    width: '100%',
    height: '100%',
  },
});
