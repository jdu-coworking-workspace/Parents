import React, { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const languageData = [
  { language: "O'zbekcha", flag: '🇺🇿' },
  { language: 'Русский', flag: '🇷🇺' },
  { language: '日本語', flag: '🇯🇵' },
  { language: 'English', flag: '🇬🇧' },
];

function RadioCircle({ selected }: { selected: boolean }) {
  return (
    <View
      style={[
        styles.radioOuter,
        { borderColor: selected ? '#3887FE' : '#C6C6C6' },
      ]}
    >
      {selected ? <View style={styles.radioInner} /> : null}
    </View>
  );
}

function LanguageSelection({
  language,
  flag,
  selectedLanguage,
  onSelect,
  isDark,
}: {
  language: string;
  flag: string;
  selectedLanguage: string;
  onSelect: (language: string) => void;
  isDark: boolean;
}) {
  const selected = selectedLanguage === language;
  return (
    <TouchableOpacity
      key={language}
      style={[
        styles.languageRow,
        selected && { backgroundColor: isDark ? '#226fc9' : '#EAF2FF' },
      ]}
      onPress={() => onSelect(language)}
      activeOpacity={0.8}
    >
      <View style={styles.row}>
        <ThemedText style={styles.flag}>{flag}</ThemedText>
        <ThemedText style={{ fontSize: 16 }}>{language}</ThemedText>
      </View>
      <RadioCircle selected={selected} />
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const backgroundColor = Colors[colorScheme].background;

  const [isLanguageOpen, setIsLanguageOpen] = useState(false);
  const [isTextSizeOpen, setIsTextSizeOpen] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState("O'zbekcha");
  const [textSize, setTextSize] = useState<'Small' | 'Medium' | 'Large'>(
    'Medium'
  );
  const [darkModeEnabled, setDarkModeEnabled] = useState(isDark);

  const previewFontSize = useMemo(() => {
    if (textSize === 'Small') return 14;
    if (textSize === 'Large') return 20;
    return 16;
  }, [textSize]);

  const displayName = 'Student';
  const displayPhone = '+998 (__) ___-__-__';

  return (
    <View style={{ flex: 1, backgroundColor }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1 }}
        style={[styles.container, { backgroundColor }]}
      >
        <View style={[styles.container, { backgroundColor }]}>
          <View style={styles.infoCard}>
            <ThemedText style={styles.sectionTitle}>Personal info</ThemedText>
            <View style={styles.infoRow}>
              <View style={styles.row}>
                <Ionicons
                  name="person-outline"
                  size={22}
                  color={isDark ? '#9BA1A6' : '#687076'}
                  style={styles.infoIcon}
                />
                <View>
                  <ThemedText
                    style={[
                      styles.profileInitial,
                      { color: isDark ? '#9BA1A6' : '#687076' },
                    ]}
                  >
                    Name
                  </ThemedText>
                  <ThemedText style={styles.profileText}>{displayName}</ThemedText>
                </View>
              </View>

              <View style={styles.row}>
                <Ionicons
                  name="call-outline"
                  size={22}
                  color={isDark ? '#9BA1A6' : '#687076'}
                  style={styles.infoIcon}
                />
                <View>
                  <ThemedText
                    style={[
                      styles.profileInitial,
                      { color: isDark ? '#9BA1A6' : '#687076' },
                    ]}
                  >
                    Phone number
                  </ThemedText>
                  <ThemedText style={styles.profileText}>{displayPhone}</ThemedText>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.infoCard}>
            <ThemedText style={styles.sectionTitle}>Preferences</ThemedText>

            <Pressable onPress={() => setIsLanguageOpen(true)} style={styles.row}>
              <View style={[styles.rowIcon, { backgroundColor: '#64748B' }]}>
                <Ionicons color="#fff" name="language-outline" size={20} />
              </View>
              <ThemedText style={styles.rowLabel}>Language</ThemedText>
              <View style={styles.rowSpacer} />
              <Ionicons color="#C6C6C6" name="chevron-forward" size={20} />
            </Pressable>

            <Pressable onPress={() => setIsTextSizeOpen(true)} style={styles.row}>
              <View style={[styles.rowIcon, { backgroundColor: '#64748B' }]}>
                <Ionicons color="#fff" name="text" size={20} />
              </View>
              <ThemedText style={styles.rowLabel}>Text size</ThemedText>
              <View style={styles.rowSpacer} />
              <Ionicons color="#C6C6C6" name="chevron-forward" size={20} />
            </Pressable>

            <View style={[styles.row, { paddingRight: 8 }]}>
              <View style={[styles.rowIcon, { backgroundColor: '#64748B' }]}>
                <Ionicons color="#fff" name="moon-outline" size={20} />
              </View>
              <ThemedText style={styles.rowLabel}>Dark mode</ThemedText>
              <View style={styles.rowSpacer} />
              <Switch
                value={darkModeEnabled}
                onValueChange={setDarkModeEnabled}
              />
            </View>
          </View>

          <View style={{ marginTop: 40, marginBottom: 20 }}>
            <Pressable style={styles.logoutButton} onPress={() => {}}>
              <Ionicons name="log-out-outline" size={26} color="#FF4444" />
              <ThemedText style={styles.logoutText}>Log out</ThemedText>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={isLanguageOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsLanguageOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            onPress={() => setIsLanguageOpen(false)}
            style={{ flex: 1 }}
          />
          <View
            style={[
              styles.modalSheet,
              { backgroundColor: Colors[colorScheme].background },
            ]}
          >
            <ThemedText style={styles.modalTitle}>Language</ThemedText>
            <ThemedView style={{ width: '100%' }}>
              {languageData.map(l => (
                <LanguageSelection
                  key={l.language}
                  language={l.language}
                  flag={l.flag}
                  selectedLanguage={selectedLanguage}
                  onSelect={lng => {
                    setSelectedLanguage(lng);
                    setIsLanguageOpen(false);
                  }}
                  isDark={isDark}
                />
              ))}
            </ThemedView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={isTextSizeOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsTextSizeOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable onPress={() => setIsTextSizeOpen(false)} style={{ flex: 1 }} />
          <View
            style={[
              styles.modalSheet,
              { backgroundColor: Colors[colorScheme].background },
            ]}
          >
            <ThemedText style={[styles.sampleText, { fontSize: previewFontSize }]}>
              Choose the text size that suits you best for a more comfortable reading
              experience.
            </ThemedText>

            <View style={styles.textSizeSelector}>
              {(['Small', 'Medium', 'Large'] as const).map(size => {
                const selected = textSize === size;
                return (
                  <Pressable
                    key={size}
                    onPress={() => setTextSize(size)}
                    style={[
                      styles.textSizePill,
                      selected && styles.textSizePillSelected,
                    ]}
                  >
                    <ThemedText
                      style={[
                        styles.textSizePillText,
                        selected && { color: '#fff' },
                      ]}
                    >
                      {size}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
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
  logoutButton: {
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
  logoutText: {
    fontWeight: 'bold',
    color: '#FF4444',
    fontSize: 16,
  },
  // Language modal UI
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
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
  languageRow: {
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
  radioOuter: {
    height: 22,
    width: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  radioInner: {
    height: 12,
    width: 12,
    borderRadius: 6,
    backgroundColor: '#3887FE',
  },
  // Text size modal UI
  sampleText: {
    marginTop: 18,
    marginBottom: 18,
    lineHeight: 22,
  },
  textSizeSelector: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 10,
  },
  textSizePill: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#C6C6C6',
  },
  textSizePillSelected: {
    backgroundColor: '#3887FE',
    borderColor: '#3887FE',
  },
  textSizePillText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
