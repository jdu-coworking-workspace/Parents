import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  Text,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/contexts/auth-context';
import { ThemedView } from '@/components/themed-view';
import { useRouter } from 'expo-router';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { FontSizeSlider, SampleText } from '@/components/FontSizeSlider';

const mockStudentData = {
  given_name: 'Sunnatilla',
  family_name: 'Sobitjonov',
  phone_number: '998974551319',
};

const languageData = [
  { language: "O'zbekcha", flag: '🇺🇿' },
  { language: 'Русский', flag: '🇷🇺' },
  { language: '日本語', flag: '🇯🇵' },
  { language: 'English', flag: '🇬🇧' },
];

const RadioCircle = ({ selected }: { selected: boolean }) => (
  <View
    style={{
      height: 22,
      width: 22,
      borderRadius: 11,
      borderWidth: 2,
      borderColor: selected ? '#3887FE' : '#C6C6C6',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'transparent',
    }}
  >
    {selected ? (
      <View
        style={{
          height: 12,
          width: 12,
          borderRadius: 6,
          backgroundColor: '#3887FE',
        }}
      />
    ) : null}
  </View>
);

const LanguageSelection: React.FC<{
  language: string;
  selectedLanguage: string;
  onSelect: (language: string) => void;
  flag: string;
  isDark: boolean;
}> = ({ language, selectedLanguage, onSelect, flag, isDark }) => {
  const selected = selectedLanguage === language;
  return (
    <TouchableOpacity
      style={[
        styles.langItem,
        selected && { backgroundColor: isDark ? '#226fc9' : '#EAF2FF' },
      ]}
      onPress={() => onSelect(language)}
      activeOpacity={0.8}
    >
      <View style={styles.row}>
        <Text style={styles.flag}>{flag}</Text>
        <ThemedText style={{ fontSize: 16 }}>{language}</ThemedText>
      </View>
      <RadioCircle selected={selected} />
    </TouchableOpacity>
  );
};


export default function SettingsScreen() {
  const { signOut, user } = useAuth();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const isDark = colorScheme === 'dark';
  const [isLanguageOpen, setIsLanguageOpen] = useState(false);
  const [isFontSizeOpen, setIsFontSizeOpen] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState("O'zbekcha");
  const [isLightModeOn, setIsLightModeOn] = useState(true);

  const handleLanguageSelect = (language: string) => {
    setSelectedLanguage(language);
    setIsLanguageOpen(false);
  };

  const handleToggleLight = useCallback(() => {
    setIsLightModeOn(!isLightModeOn);
  }, [isLightModeOn]);

  const displayName = useMemo(() => {
    const given = (mockStudentData.given_name ?? '').trim();
    const family = (mockStudentData.family_name ?? '').trim();
    return [given, family].filter(Boolean).join(' ') || '';
  }, []);

  const handleLogout = useCallback(() => {
    Alert.alert(
      'Chiqish',
      'Siz rostdan ham tizimdan chiqmoqchisiz?',
      [
        { text: 'Bekor qilish', style: 'cancel' },
        {
          text: 'Chiqish',
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/sign-in');
          },
        },
      ]
    );
  }, [signOut, router]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1 }}
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <View style={styles.infoCard}>
            <ThemedText style={styles.sectionTitle}>
              Shaxsiy ma'lumotlar
            </ThemedText>
            <View style={styles.infoRow}>
              {displayName ? (
                <View style={styles.row}>
                  <Ionicons
                    name="person-outline"
                    size={22}
                    color={colors.icon}
                    style={styles.infoIcon}
                  />
                  <View>
                    <ThemedText style={[styles.profileInitial, { color: colors.icon }]}>
                      Ism
                    </ThemedText>
                    <ThemedText style={styles.profileText}>{displayName}</ThemedText>
                  </View>
                </View>
              ) : null}
              <View style={styles.row}>
                <Ionicons
                  name="call-outline"
                  size={22}
                  color={colors.icon}
                  style={styles.infoIcon}
                />
                <View>
                  <ThemedText style={[styles.profileInitial, { color: colors.icon }]}>
                    Telefon raqam
                  </ThemedText>
                  <ThemedText style={styles.profileText}>
                    {user?.email ?? ''}
                  </ThemedText>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.infoCard}>
            <ThemedText style={styles.sectionTitle}>Sozlamalar</ThemedText>

            <Pressable onPress={() => setIsLanguageOpen(true)} style={styles.row}>
              <View style={[styles.rowIcon, { backgroundColor: '#64748B' }]}>
                <Ionicons color="#fff" name="language-outline" size={20} />
              </View>
              <ThemedText style={styles.rowLabel}>Ilova tili</ThemedText>
              <View style={styles.rowSpacer} />
              <Ionicons color="#C6C6C6" name="chevron-forward" size={20} />
            </Pressable>

            <Pressable style={styles.row}>
              <View style={[styles.rowIcon, { backgroundColor: '#64748B' }]}>
                <Ionicons color="#fff" name="lock-closed-outline" size={20} />
              </View>
              <ThemedText style={styles.rowLabel}>Parolni o'zgartirish</ThemedText>
              <View style={styles.rowSpacer} />
              <Ionicons color="#C6C6C6" name="chevron-forward" size={20} />
            </Pressable>

            <Pressable style={styles.row} onPress={() => setIsFontSizeOpen(true)}>
              <View style={[styles.rowIcon, { backgroundColor: '#64748B' }]}>
                <Ionicons color="#fff" name="text" size={20} />
              </View>
              <ThemedText style={styles.rowLabel}>Matn o'lchami</ThemedText>
              <View style={styles.rowSpacer} />
              <Ionicons color="#C6C6C6" name="chevron-forward" size={20} />
            </Pressable>

            <Pressable style={styles.row} onPress={handleToggleLight}>
              <View style={[styles.rowIcon, { backgroundColor: '#64748B' }]}>
                <Ionicons color="#fff" name="sunny-outline" size={20} />
              </View>
              <ThemedText style={styles.rowLabel}>Yorug' rejim</ThemedText>
              <View style={styles.rowSpacer} />
              <View style={[styles.toggleSwitch, { backgroundColor: isLightModeOn ? '#3B82F6' : '#E5E7EB' }]}>
                <View style={[
                  styles.toggleDot,
                  {
                    backgroundColor: isLightModeOn ? '#fff' : '#999',
                    alignSelf: isLightModeOn ? 'flex-end' : 'flex-start',
                  }
                ]} />
              </View>
            </Pressable>
          </View>

          <View style={{ marginTop: 40, marginBottom: 20 }}>
            <Pressable style={styles.submitButton} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={30} color="#FF4444" />
              <Text style={styles.logoutText}>Chiqish</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      {/* Til tanlash Modal */}
      <Modal
        visible={isLanguageOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsLanguageOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable onPress={() => setIsLanguageOpen(false)} style={{ flex: 1 }} />
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <ThemedText style={styles.modalTitle}>Til</ThemedText>
            <ThemedView style={{ width: '100%' }}>
              {languageData.map((l) => (
                <LanguageSelection
                  key={l.language}
                  language={l.language}
                  selectedLanguage={selectedLanguage}
                  onSelect={handleLanguageSelect}
                  flag={l.flag}
                  isDark={isDark}
                />
              ))}
            </ThemedView>
          </View>
        </View>
      </Modal>

      {/* Matn o'lchami Modal - FAQAT UI */}
      <Modal
        visible={isFontSizeOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsFontSizeOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable onPress={() => setIsFontSizeOpen(false)} style={{ flex: 1 }} />
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <SampleText />
            <FontSizeSlider />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    rowGap: 10,
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
  },
  submitButton: {
    padding: 10,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 25,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: '#FF4444',
    backgroundColor: 'transparent',
    flexDirection: 'row',
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 20,
  },
  infoRow: {
    gap: 20,
    width: '90%',
  },
  infoIcon: {
    marginRight: 15,
  },
  profileText: {
    fontSize: 16,
    fontWeight: '400',
  },
  profileInitial: {
    fontSize: 12,
    color: '#999',
    marginBottom: 2,
  },
  infoCard: {
    marginHorizontal: 20,
    marginTop: 20,
    padding: 15,
    borderWidth: 1,
    borderColor: '#bec0c2',
    borderRadius: 20,
    alignItems: 'flex-start',
    position: 'relative',
  },
  langItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 4,
    width: '100%',
    backgroundColor: 'transparent',
    paddingVertical: 7,
    paddingHorizontal: 16,
  },
  flag: {
    fontSize: 22,
    marginRight: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    minHeight: 50,
    borderRadius: 8,
    marginHorizontal: 5,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 3,
    marginRight: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {
    fontSize: 17,
    fontWeight: '400',
  },
  rowSpacer: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
  },
  logoutText: {
    marginLeft: 0,
    fontWeight: 'bold',
    color: '#FF4444',
    fontSize: 16,
  },
  toggleSwitch: {
    width: 50,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 8,
    paddingBottom: 30,
    paddingHorizontal: 15,
  },
  modalTitle: {
    marginTop: 18,
    marginBottom: 18,
    fontSize: 18,
    alignSelf: 'flex-start',
  },
  // Font Size Slider stillari
  sliderContainer: {
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
  sampleContainer: {
    alignItems: 'center',
    padding: 15,
    borderRadius: 12,
    marginTop: 20,
    backgroundColor: '#F2F2F7',
  },
  sampleText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#000',
  },
});