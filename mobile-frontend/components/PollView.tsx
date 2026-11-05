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
};

const STRINGS: Record<
  string,
  {
    title: string;
    hint: string;
    votes: string;
    retract: string;
    error: string;
  }
> = {
  uz: {
    title: "So'rovnoma",
    hint: "Natijani ko'rish uchun ovoz bering",
    votes: 'ovoz',
    retract: 'Ovozni bekor qilish',
    error: 'Xatolik yuz berdi. Qayta urinib ko‘ring.',
  },
  ru: {
    title: 'Опрос',
    hint: 'Проголосуйте, чтобы увидеть результаты',
    votes: 'голосов',
    retract: 'Отменить голос',
    error: 'Произошла ошибка. Попробуйте снова.',
  },
  ja: {
    title: 'アンケート',
    hint: '投票すると結果が表示されます',
    votes: '票',
    retract: '投票を取り消す',
    error: 'エラーが発生しました。もう一度お試しください。',
  },
  en: {
    title: 'Poll',
    hint: 'Vote to see the results',
    votes: 'votes',
    retract: 'Retract vote',
    error: 'Something went wrong. Please try again.',
  },
};

const ACCENT = '#3B81F6';

export default function PollView({
  poll,
  language,
  isDark,
  textColor,
  onVote,
  onRemoveVote,
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

  const visible = poll.results_visible;
  const border = isDark ? '#2C2C2E' : '#E5E5EA';
  const rowBg = isDark ? '#2A2A2C' : '#F2F2F7';

  return (
    <View
      style={[
        styles.card,
        { borderColor: border, backgroundColor: isDark ? '#1C1C1E' : '#fff' },
      ]}
    >
      <View style={styles.header}>
        <Ionicons name='stats-chart' size={18} color={ACCENT} />
        <Text style={[styles.title, { color: textColor }]}>{s.title}</Text>
        {busy ? (
          <ActivityIndicator size='small' color={ACCENT} style={styles.loader} />
        ) : null}
      </View>

      {poll.options.map(option => {
        const selected = poll.my_option_id === option.id;
        const percent = visible ? (option.percent ?? 0) : 0;

        return (
          <Pressable
            key={option.id}
            disabled={busy || selected}
            onPress={() => run(() => onVote(option.id))}
            style={[
              styles.option,
              {
                backgroundColor: rowBg,
                borderColor: selected ? ACCENT : 'transparent',
              },
            ]}
          >
            {visible ? (
              <View
                style={[
                  styles.bar,
                  {
                    width: `${percent}%`,
                    backgroundColor: selected ? '#3B81F644' : '#9CA3AF33',
                  },
                ]}
              />
            ) : null}
            <View style={styles.optionContent}>
              <Ionicons
                name={
                  selected
                    ? 'checkmark-circle'
                    : 'ellipse-outline'
                }
                size={22}
                color={selected ? ACCENT : '#9CA3AF'}
              />
              <Text style={[styles.optionText, { color: textColor }]}>
                {option.text}
              </Text>
              {visible ? (
                <Text style={[styles.percent, { color: textColor }]}>
                  {Math.round(option.percent ?? 0)}%
                </Text>
              ) : null}
            </View>
          </Pressable>
        );
      })}

      {visible ? (
        <Text style={styles.meta}>
          {poll.total_votes ?? 0} {s.votes}
        </Text>
      ) : (
        <Text style={styles.meta}>{s.hint}</Text>
      )}

      {poll.my_option_id !== null ? (
        <Pressable
          disabled={busy}
          onPress={() => run(onRemoveVote)}
          style={styles.retract}
        >
          <Text style={styles.retractText}>{s.retract}</Text>
        </Pressable>
      ) : null}

      {error ? <Text style={styles.error}>{s.error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    gap: 8,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 16, fontWeight: '700' },
  loader: { marginLeft: 'auto' },
  option: {
    borderWidth: 1.5,
    borderRadius: 10,
    overflow: 'hidden',
    minHeight: 46,
    justifyContent: 'center',
  },
  bar: { position: 'absolute', left: 0, top: 0, bottom: 0 },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  optionText: { flex: 1, fontSize: 15 },
  percent: { fontSize: 14, fontWeight: '700' },
  meta: { fontSize: 12, color: '#8E8E93' },
  retract: { alignSelf: 'flex-start', paddingVertical: 4 },
  retractText: { color: ACCENT, fontWeight: '600', fontSize: 14 },
  error: { color: '#DC2626', fontSize: 13 },
});