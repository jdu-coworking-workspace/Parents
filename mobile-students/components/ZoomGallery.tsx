import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  Alert,
  Dimensions,
  Image,
  Modal,
  Platform,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';

import { I18nContext } from '@/contexts/i18n-context';

type Img = { uri: string };

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
  const [scale, setScale] = useState(1);
  const [lastScale, setLastScale] = useState(1);
  const [translateX, setTranslateX] = useState(0);
  const [translateY, setTranslateY] = useState(0);
  const [lastTranslateX, setLastTranslateX] = useState(0);
  const [lastTranslateY, setLastTranslateY] = useState(0);

  useEffect(() => {
    setIndex(initialIndex);
  }, [initialIndex]);

  useEffect(() => {
    setScale(1);
    setLastScale(1);
    setTranslateX(0);
    setTranslateY(0);
    setLastTranslateX(0);
    setLastTranslateY(0);
  }, [index]);

  useEffect(() => {
    if (!visible) {
      return;
    }

    setScale(1);
    setLastScale(1);
    setTranslateX(0);
    setTranslateY(0);
    setLastTranslateX(0);
    setLastTranslateY(0);
  }, [visible, index]);

  const onPinchGestureEvent = (event: any) => {
    if (!event || typeof event.scale !== 'number') return;

    const newScale = lastScale * event.scale;
    const clampedScale = Math.min(Math.max(newScale, 1), 3);

    if (isFinite(clampedScale)) {
      setScale(clampedScale);

      if (clampedScale <= 1) {
        setTranslateX(0);
        setTranslateY(0);
      }
    }
  };

  const onPinchEnd = () => {
    if (!isFinite(scale)) {
      return;
    }

    setLastScale(scale);

    if (scale <= 1.1) {
      setScale(1);
      setLastScale(1);
      setTranslateX(0);
      setTranslateY(0);
      setLastTranslateX(0);
      setLastTranslateY(0);
    } else {
      setLastTranslateX(translateX);
      setLastTranslateY(translateY);
    }
  };

  const onPanGestureEvent = (event: any) => {
    if (
      !event ||
      typeof event.translationX !== 'number' ||
      typeof event.translationY !== 'number'
    ) {
      return;
    }

    if (scale > 1.1) {
      const newTranslateX = lastTranslateX + event.translationX;
      const newTranslateY = lastTranslateY + event.translationY;
      const maxTranslate = 100 * scale;

      setTranslateX(
        Math.min(Math.max(newTranslateX, -maxTranslate), maxTranslate)
      );
      setTranslateY(
        Math.min(Math.max(newTranslateY, -maxTranslate), maxTranslate)
      );
    }
  };

  const onPanEnd = () => {
    setLastTranslateX(translateX);
    setLastTranslateY(translateY);
  };

  const pinchGesture = Gesture.Pinch()
    .onUpdate(onPinchGestureEvent)
    .onEnd(onPinchEnd)
    .runOnJS(true);

  const panGesture = Gesture.Pan()
    .onUpdate(onPanGestureEvent)
    .onEnd(onPanEnd)
    .runOnJS(true);

  const combinedGesture = Gesture.Simultaneous(pinchGesture, panGesture);

  const isExpoGo = Constants.executionEnvironment === 'storeClient';

  const shareDownloadedImage = useCallback(
    async (localUri: string) => {
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        throw new Error(t('downloadError'));
      }

      await Sharing.shareAsync(localUri, {
        mimeType: 'image/jpeg',
        dialogTitle: t('download'),
      });
    },
    [t]
  );

  const saveToLibrary = useCallback(
    async (localUri: string) => {
      const { status, canAskAgain } =
        await MediaLibrary.requestPermissionsAsync(true, ['photo']);

      if (status !== 'granted') {
        if (canAskAgain) {
          const retry = await MediaLibrary.requestPermissionsAsync(true, [
            'photo',
          ]);
          if (retry.status !== 'granted') {
            throw new Error(t('permissionDenied'));
          }
        } else {
          throw new Error(t('permissionDenied'));
        }
      }

      await MediaLibrary.saveToLibraryAsync(localUri);
    },
    [t]
  );

  const downloadCurrent = useCallback(async () => {
    try {
      if (!current) return;

      if (Platform.OS === 'web') {
        const anchor = document.createElement('a');
        anchor.href = current;
        anchor.download = `image-${Date.now()}.jpg`;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        return;
      }

      const filename = `image-${Date.now()}.jpg`;
      const localPath = (FileSystem.cacheDirectory || '') + filename;
      const downloadResult = await FileSystem.downloadAsync(current, localPath, {});

      if (isExpoGo) {
        await shareDownloadedImage(downloadResult.uri);
        Alert.alert(t('download'), t('imageShareHint'));
        return;
      }

      try {
        await saveToLibrary(downloadResult.uri);
        Alert.alert(t('imageSaved'), t('imageSavedMessage'));
      } catch (libraryError) {
        console.warn('MediaLibrary save failed, falling back to share:', libraryError);
        await shareDownloadedImage(downloadResult.uri);
        Alert.alert(t('download'), t('imageShareHint'));
      }
    } catch (err: any) {
      console.error('Download error:', err);

      let errorMessage = t('downloadError');

      if (
        err?.message?.includes('Permission denied') ||
        err?.message?.includes('permission')
      ) {
        errorMessage = t('permissionDenied');
      } else if (
        err?.message?.includes('Expo Go') ||
        err?.message?.includes('development build')
      ) {
        errorMessage = t('expoGoImageSaveMessage');
      } else if (err?.message?.includes('development builds')) {
        errorMessage = t('unableToSaveInDevelopment');
      }

      Alert.alert(t('downloadFailedImage'), errorMessage);
    }
  }, [current, isExpoGo, saveToLibrary, shareDownloadedImage, t]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onRequestClose}
      statusBarTranslucent
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <StatusBar hidden />
        <View style={{ flex: 1, backgroundColor: 'black' }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          {images[index] && (
            <GestureDetector gesture={combinedGesture}>
              <View
                style={{
                  transform: [
                    { scale: isFinite(scale) && scale > 0 ? scale : 1 },
                    { translateX: isFinite(translateX) ? translateX : 0 },
                    { translateY: isFinite(translateY) ? translateY : 0 },
                  ],
                }}
              >
                <Image
                  source={{ uri: images[index].uri }}
                  style={{
                    width: Dimensions.get('window').width,
                    height: Dimensions.get('window').height - 100,
                  }}
                  resizeMode="contain"
                />
              </View>
            </GestureDetector>
          )}
        </View>

        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingVertical: 10,
            paddingTop: 50,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 1000,
          }}
        >
          <TouchableOpacity
            onPress={onRequestClose}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: 'rgba(0,0,0,0.5)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={downloadCurrent}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: 'rgba(0,0,0,0.5)',
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 20,
              gap: 6,
            }}
          >
            <Ionicons name="download-outline" size={20} color="#fff" />
            <Text style={{ color: '#fff', fontWeight: '600' }}>{t('download')}</Text>
          </TouchableOpacity>
        </View>

        {images.length > 1 && index > 0 && (
          <TouchableOpacity
            style={{
              position: 'absolute',
              left: 20,
              top: '50%',
              width: 50,
              height: 50,
              borderRadius: 25,
              backgroundColor: 'rgba(0,0,0,0.5)',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 999,
            }}
            onPress={() => setIndex(index - 1)}
          >
            <Ionicons name="chevron-back" size={30} color="#fff" />
          </TouchableOpacity>
        )}

        {images.length > 1 && index < images.length - 1 && (
          <TouchableOpacity
            style={{
              position: 'absolute',
              right: 20,
              top: '50%',
              width: 50,
              height: 50,
              borderRadius: 25,
              backgroundColor: 'rgba(0,0,0,0.5)',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 999,
            }}
            onPress={() => setIndex(index + 1)}
          >
            <Ionicons name="chevron-forward" size={30} color="#fff" />
          </TouchableOpacity>
        )}

        {images.length > 1 && (
          <View
            style={{
              position: 'absolute',
              bottom: 50,
              alignSelf: 'center',
              backgroundColor: 'rgba(0,0,0,0.5)',
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 15,
              zIndex: 999,
            }}
          >
            <Text style={{ color: '#fff', fontSize: 14, fontWeight: '500' }}>
              {index + 1} / {images.length}
            </Text>
          </View>
        )}
      </View>
      </GestureHandlerRootView>
    </Modal>
  );
}
