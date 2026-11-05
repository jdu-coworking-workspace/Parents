import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface PollOption {
  id: number;
  text: string;
  votes: number | null;
  percent: number | null;
}

export interface Poll {
  id: number;
  question?: string | null;
  options: PollOption[];
  total_votes: number | null;
  my_option_id: number | null;
  results_visible: boolean;
}

type Props = {
  poll: Poll;
  language: string;
  isDark: boolean;
  textColor: string;
  onVote: (optionId: number) => Promise<void>;
  onRemoveVote: () => Promise<void>;
  fallbackQuestion?: string | null;
};

const STRINGS: Record<
  string,
  {
    title: string;
    hint: string;
    votes: string;
    retract: string;
    error: string;
    votedBadge: string;
  }
> = {
  uz: {
    title: "So'rovnoma",
    hint: "Natijani ko'rish uchun tanlang",
    votes: 'ovoz',
    retract: 'Ovozni qaytarish',
    error: 'Xatolik yuz berdi. Qayta urinib ko‘ring.',
    votedBadge: 'Ovoz berildi',
  },
  ru: {
    title: 'Опрос',
    hint: 'Выберите вариант для просмотра',
    votes: 'голосов',
    retract: 'Отменить голос',
    error: 'Произошла ошибка. Попробуйте снова.',
    votedBadge: 'Вы проголосовали',
  },
  ja: {
    title: 'アンケート',
    hint: '選択して結果を確認',
    votes: '票',
    retract: '投票を取り消す',
    error: 'エラーが発生しました。もう一度お試しください。',
    votedBadge: '投票済み',
  },
  en: {
    title: 'Poll',
    hint: 'Vote to see results',
    votes: 'votes',
    retract: 'Retract vote',
    error: 'Something went wrong. Please try again.',
    votedBadge: 'Voted',
  },
};

const ACCENT = '#3B82F6';

export default function PollView({
  poll,
  language,
  isDark,
  textColor,
  onVote,
  onRemoveVote,
  fallbackQuestion,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const s = STRINGS[language] ?? STRINGS.en;

  const run = async (fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    setError(false);
    try {
      await fn();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  const isVoted = poll.my_option_id !== null;
  const visible = poll.results_visible || isVoted;
  const cardBorder = isDark ? '#2D3139' : '#E2E8F0';
  const cardBg = isDark ? '#1C1E22' : '#FFFFFF';
  const questionTitle = poll.question || fallbackQuestion;

  return (
    <View style={[styles.card, { borderColor: cardBorder, backgroundColor: cardBg }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View
            style={[
              styles.iconWrapper,
              {
                backgroundColor: isDark
                  ? 'rgba(59, 130, 246, 0.16)'
                  : 'rgba(59, 130, 246, 0.1)',
              },
            ]}
          >
            <Ionicons name="bar-chart" size={17} color={ACCENT} />
          </View>
          <Text style={[styles.title, { color: textColor }]}>{s.title}</Text>
        </View>

        {busy ? (
          <ActivityIndicator size="small" color={ACCENT} />
        ) : isVoted ? (
          <View
            style={[
              styles.badge,
              {
                backgroundColor: isDark
                  ? 'rgba(16, 185, 129, 0.16)'
                  : 'rgba(16, 185, 129, 0.1)',
              },
            ]}
          >
            <Ionicons name="checkmark-circle" size={13} color="#10B981" />
            <Text style={styles.badgeText}>{s.votedBadge}</Text>
          </View>
        ) : null}
      </View>

      {/* Question */}
      {questionTitle ? (
        <Text style={[styles.questionText, { color: textColor }]}>
          {questionTitle}
        </Text>
      ) : null}

      {/* Options List */}
      <View style={styles.optionsList}>
        {poll.options.map((option) => {
          const selected = poll.my_option_id === option.id;
          const percent = visible ? (option.percent ?? 0) : 0;

          const optionBg = selected
            ? isDark
              ? 'rgba(59, 130, 246, 0.1)'
              : 'rgba(59, 130, 246, 0.05)'
            : isDark
              ? '#23272F'
              : '#F8FAFC';

          const optionBorder = selected
            ? ACCENT
            : isDark
              ? '#2E333D'
              : '#E2E8F0';

          return (
            <Pressable
              key={option.id}
              disabled={busy || selected}
              onPress={() => run(() => onVote(option.id))}
              style={({ pressed }) => [
                styles.option,
                {
                  backgroundColor: optionBg,
                  borderColor: optionBorder,
                  opacity: pressed && !busy && !selected ? 0.8 : 1,
                },
              ]}
            >
              {/* Progress Fill Bar */}
              {visible ? (
                <View
                  style={[
                    styles.bar,
                    {
                      width: `${percent}%`,
                      backgroundColor: selected
                        ? isDark
                          ? 'rgba(59, 130, 246, 0.35)'
                          : 'rgba(59, 130, 246, 0.22)'
                        : isDark
                          ? 'rgba(255, 255, 255, 0.08)'
                          : 'rgba(148, 163, 184, 0.18)',
                    },
                  ]}
                />
              ) : null}

              {/* Option Content */}
              <View style={styles.optionContent}>
                {selected ? (
                  <Ionicons name="checkmark-circle" size={20} color={ACCENT} />
                ) : (
                  <View
                    style={[
                      styles.radioCircle,
                      {
                        borderColor: isDark ? '#4B5563' : '#94A3B8',
                      },
                    ]}
                  />
                )}
                <Text
                  style={[
                    styles.optionText,
                    {
                      color: textColor,
                      fontWeight: selected ? '600' : '400',
                    },
                  ]}
                >
                  {option.text}
                </Text>
                {visible ? (
                  <Text
                    style={[
                      styles.percent,
                      {
                        color: selected ? ACCENT : isDark ? '#9CA3AF' : '#64748B',
                      },
                    ]}
                  >
                    {Math.round(percent)}%
                  </Text>
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* Footer Info & Actions */}
      <View
        style={[
          styles.footer,
          {
            borderTopColor: isDark ? '#2D3139' : '#F1F5F9',
          },
        ]}
      >
        <View style={styles.metaRow}>
          <Ionicons
            name={visible ? 'people-outline' : 'information-circle-outline'}
            size={15}
            color={isDark ? '#9CA3AF' : '#64748B'}
          />
          <Text style={[styles.metaText, { color: isDark ? '#9CA3AF' : '#64748B' }]}>
            {visible ? `${poll.total_votes ?? 0} ${s.votes}` : s.hint}
          </Text>
        </View>

        {isVoted ? (
          <Pressable
            disabled={busy}
            onPress={() => run(onRemoveVote)}
            style={({ pressed }) => [
              styles.retractButton,
              {
                backgroundColor: isDark
                  ? 'rgba(239, 68, 68, 0.12)'
                  : 'rgba(239, 68, 68, 0.08)',
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <Ionicons name="close-circle-outline" size={14} color="#EF4444" />
            <Text style={styles.retractText}>{s.retract}</Text>
          </Pressable>
        ) : null}
      </View>

      {/* Error Message */}
      {error ? (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle-outline" size={15} color="#EF4444" />
          <Text style={styles.errorText}>{s.error}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginTop: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  iconWrapper: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  questionText: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
    marginBottom: 12,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 20,
  },
  badgeText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '600',
  },
  optionsList: {
    gap: 9,
  },
  option: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
    minHeight: 50,
    justifyContent: 'center',
    position: 'relative',
  },
  bar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 11,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.8,
  },
  optionText: {
    flex: 1,
    fontSize: 14.5,
    lineHeight: 20,
  },
  percent: {
    fontSize: 14.5,
    fontWeight: '700',
    marginLeft: 6,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    flexWrap: 'wrap',
    gap: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 12.5,
    fontWeight: '500',
  },
  retractButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4.5,
    borderRadius: 14,
  },
  retractText: {
    color: '#EF4444',
    fontWeight: '600',
    fontSize: 12,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12.5,
  },
});