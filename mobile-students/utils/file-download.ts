import { Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

export const DOWNLOAD_DIRECTORY_KEY = 'student-notification-download-directory';

export function getDownloadFileName(uri: string): string {
  const fallbackName = `image-${Date.now()}.jpg`;

  try {
    const url = new URL(uri);
    const lastSegment = url.pathname.split('/').filter(Boolean).pop();

    if (lastSegment) {
      return decodeURIComponent(lastSegment.split('?')[0]) || fallbackName;
    }
  } catch {
    // Keep timestamped fallback for non-URL sources.
  }

  return fallbackName;
}

export function splitFileName(fileName: string) {
  const safeName = fileName.replace(/[\\/:*?"<>|]/g, '-');
  const extensionIndex = safeName.lastIndexOf('.');
  const suffix = Date.now();

  if (extensionIndex <= 0 || extensionIndex === safeName.length - 1) {
    return { name: `${safeName}-${suffix}`, mimeType: 'image/jpeg' };
  }

  const extension = safeName.slice(extensionIndex + 1).toLowerCase();
  const mimeType =
    extension === 'png'
      ? 'image/png'
      : extension === 'webp'
        ? 'image/webp'
        : 'image/jpeg';

  return {
    name: `${safeName.slice(0, extensionIndex)}-${suffix}`,
    mimeType,
  };
}

async function requestAndroidDownloadDirectory(t: (k: any) => string) {
  const initialUri =
    FileSystem.StorageAccessFramework.getUriForDirectoryInRoot('Download');
  const permissions =
    await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync(
      initialUri
    );

  if (!permissions.granted) {
    throw new Error(t('permissionDenied'));
  }

  await AsyncStorage.setItem(DOWNLOAD_DIRECTORY_KEY, permissions.directoryUri);
  return permissions.directoryUri;
}

async function saveToAndroidDirectory(
  localUri: string,
  fileName: string,
  t: (k: any) => string
) {
  const { name, mimeType } = splitFileName(fileName);
  let directoryUri = await AsyncStorage.getItem(DOWNLOAD_DIRECTORY_KEY);

  if (!directoryUri) {
    directoryUri = await requestAndroidDownloadDirectory(t);
  }

  const base64 = await FileSystem.readAsStringAsync(localUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  try {
    const fileUri = await FileSystem.StorageAccessFramework.createFileAsync(
      directoryUri,
      name,
      mimeType
    );
    await FileSystem.StorageAccessFramework.writeAsStringAsync(
      fileUri,
      base64,
      { encoding: FileSystem.EncodingType.Base64 }
    );
  } catch {
    await AsyncStorage.removeItem(DOWNLOAD_DIRECTORY_KEY);
    const freshDirectoryUri = await requestAndroidDownloadDirectory(t);
    const fileUri = await FileSystem.StorageAccessFramework.createFileAsync(
      freshDirectoryUri,
      name,
      mimeType
    );
    await FileSystem.StorageAccessFramework.writeAsStringAsync(
      fileUri,
      base64,
      { encoding: FileSystem.EncodingType.Base64 }
    );
  }
}

async function shareDownloadedImage(localUri: string, t: (k: any) => string) {
  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    throw new Error(t('downloadError'));
  }

  await Sharing.shareAsync(localUri, {
    mimeType: 'image/jpeg',
    dialogTitle: t('download'),
  });
}

export async function downloadFileFromUrl(
  uri: string,
  t: (key: any) => string
): Promise<boolean> {
  try {
    if (!uri) return false;

    const filename = getDownloadFileName(uri);

    if (Platform.OS === 'web') {
      const anchor = document.createElement('a');
      anchor.href = uri;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      return true;
    }

    const localPath = (FileSystem.cacheDirectory || '') + filename;
    const downloadResult = await FileSystem.downloadAsync(uri, localPath, {});

    if (Platform.OS === 'android') {
      await saveToAndroidDirectory(downloadResult.uri, filename, t);
      Alert.alert(t('imageSaved'), t('imageSavedMessage'));
      return true;
    }

    await shareDownloadedImage(downloadResult.uri, t);
    Alert.alert(t('download'), t('imageShareHint'));
    return true;
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
    return false;
  }
}
