import React, { useCallback, useContext, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@rneui/themed';
import { ThemedText } from '@/components/ThemedText';
import { I18nContext } from '@/contexts/i18n-context';
import { fetchParentFaqs, type ParentFaq } from '@/services/parent-faq';

export default function FaqScreen() {
  const { language, i18n } = useContext(I18nContext);
  const { theme } = useTheme();
  const isDark = theme.mode === 'dark';
  const [faqs, setFaqs] = useState<ParentFaq[]>([]);
  const [openId, setOpenId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const loadFaqs = useCallback(async () => {
    setIsLoading(true);
    setHasError(false);
    try {
      const loadedFaqs = await fetchParentFaqs();
      setFaqs(loadedFaqs);
      setOpenId(loadedFaqs[0]?.id ?? null);
    } catch {
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Loading remote FAQ data is the screen's external synchronization.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadFaqs();
  }, [loadFaqs]);

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={styles.content}
    >
      <ThemedText style={styles.intro}>{i18n[language].needHelp}</ThemedText>
      {isLoading ? (
        <ActivityIndicator color={theme.colors.primary} style={styles.loader} />
      ) : null}
      {hasError ? (
        <View style={styles.errorBox}>
          <ThemedText style={styles.errorText}>
            {i18n[language].faqLoadError}
          </ThemedText>
          <Pressable onPress={() => void loadFaqs()}>
            <ThemedText style={[styles.retry, { color: theme.colors.primary }]}>
              {i18n[language].tryAgain}
            </ThemedText>
          </Pressable>
        </View>
      ) : null}
      {!isLoading && !hasError && faqs.length === 0 ? (
        <ThemedText style={styles.empty}>{i18n[language].faqEmpty}</ThemedText>
      ) : null}
      {faqs.map(item => {
        const open = openId === item.id;
        return (
          <View
            key={item.id}
            style={[
              styles.card,
              { borderColor: isDark ? '#2C2C2E' : '#E5E5EA' },
            ]}
          >
            <Pressable
              style={styles.questionRow}
              onPress={() => setOpenId(open ? null : item.id)}
            >
              <ThemedText style={styles.question}>{item.question}</ThemedText>
              <Ionicons
                name={open ? 'chevron-up' : 'chevron-down'}
                size={18}
                color='#8E8E93'
              />
            </Pressable>
            {open ? (
              <ThemedText style={styles.answer}>{item.answer}</ThemedText>
            ) : null}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 10,
  },
  intro: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },
  loader: {
    marginVertical: 12,
  },
  errorBox: {
    alignItems: 'center',
    gap: 8,
  },
  errorText: {
    textAlign: 'center',
  },
  retry: {
    fontWeight: '600',
  },
  empty: {
    opacity: 0.7,
    textAlign: 'center',
    marginTop: 16,
  },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  questionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  question: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  answer: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
    opacity: 0.8,
  },
});
