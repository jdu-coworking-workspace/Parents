import React, { useContext, useEffect } from 'react';
import { StyleSheet, TouchableOpacity, View, BackHandler, useColorScheme as RNUseColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18nContext } from '@/contexts/i18n-context';
import { Ionicons } from '@expo/vector-icons';

const languageData = [
  { language: "O'zbekcha", flag: '🇺🇿', code: 'uz' },
  { language: '日本語', flag: '🇯🇵', code: 'ja' },
  { language: 'English', flag: '🇬🇧', code: 'en' },
  { language: 'Русский', flag: '🇷🇺', code: 'ru' },
];

export default function LanguageSelect() {
  const router = useRouter();
  const { setLanguage } = useContext(I18nContext);
  const systemColorScheme = RNUseColorScheme();

  const handleSelect = async (langCode: 'en' | 'ja' | 'uz' | 'ru') => {
    await AsyncStorage.setItem('language', langCode);
    await AsyncStorage.setItem('languageSelected', 'true');
    setLanguage(langCode);
    router.replace('/sign-in');
  };

  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        BackHandler.exitApp();
        return true;
      }
    );
    return () => backHandler.remove();
  }, []);

  const isDark = systemColorScheme === 'dark';
  const buttonBgColor = isDark ? '#2A2A3E' : '#EAF2FF';
  const textColor = isDark ? '#FFFFFF' : '#000000';
  const chevronColor = isDark ? '#64B5F6' : '#226fc9';
  const backgroundColor = isDark ? '#1a1a1a' : '#FFFFFF';

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor }]}
    >
      <View style={styles.innerContainer}>
        {languageData.map(({ language, flag, code }) => (
          <TouchableOpacity
            key={code}
            style={[styles.languageItem, { backgroundColor: buttonBgColor }]}
            onPress={() => handleSelect(code as 'en' | 'ja' | 'uz' | 'ru')}
            activeOpacity={0.7}
          >
            <View style={styles.row}>
              <ThemedText style={styles.flag}>{flag}</ThemedText>
              <ThemedText style={{ color: textColor }}>{language}</ThemedText>
            </View>
            <Ionicons color={chevronColor} name='chevron-forward' size={20} />
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingVertical: 24,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerContainer: {
    gap: 12,
    width: '90%', // 90% width of the screen 5% padding on each side
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  languageItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 15,
  },
  flag: {
    fontSize: 22,
    marginRight: 12,
  },
});
