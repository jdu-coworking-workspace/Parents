"use no memo"; // Widget trees are plain functions, keep the React Compiler out
import React from 'react';
import {
  FlexWidget,
  ListWidget,
  TextWidget,
} from 'react-native-android-widget';
import type { ColorProp } from 'react-native-android-widget';
import { DateTime } from 'luxon';
import translations from '@/translations/translation';
import type { Language } from '@/types/i18n';
import {
  buildMessageDeepLink,
  type WidgetMessage,
  type WidgetSnapshot,
} from '@/widgets/widget-storage';

type Palette = {
  background: ColorProp;
  itemBackground: ColorProp;
  title: ColorProp;
  text: ColorProp;
  muted: ColorProp;
  accent: ColorProp;
};

const PALETTES: Record<'light' | 'dark', Palette> = {
  light: {
    background: '#FFFFFF',
    itemBackground: '#F3F6FB',
    title: '#111827',
    text: '#374151',
    muted: '#6B7280',
    accent: '#3B81F6',
  },
  dark: {
    background: '#1C1C1E',
    itemBackground: '#2C2C2E',
    title: '#F3F4F6',
    text: '#D1D5DB',
    muted: '#9CA3AF',
    accent: '#60A5FA',
  },
};

const PRIORITY_COLORS: Record<WidgetMessage['priority'], ColorProp> = {
  high: '#EF4444',
  medium: '#F59E0B',
  low: '#22C55E',
};

function formatSentTime(sentTime: string) {
  const utc = sentTime.includes('T')
    ? DateTime.fromISO(sentTime, { zone: 'utc' })
    : DateTime.fromFormat(sentTime, 'yyyy-MM-dd HH:mm', { zone: 'utc' });
  if (!utc.isValid) return '';

  const local = utc.toLocal();
  return local.hasSame(DateTime.local(), 'day')
    ? local.toFormat('HH:mm')
    : local.toFormat('dd.MM');
}

type Props = {
  snapshot: WidgetSnapshot;
  language: Language;
  mode: 'light' | 'dark';
  refreshing?: boolean;
};

function MessageItem({
  message,
  palette,
}: {
  message: WidgetMessage;
  palette: Palette;
}) {
  return (
    <FlexWidget
      clickAction='OPEN_URI'
      clickActionData={{
        uri: buildMessageDeepLink(message.studentId, message.id),
      }}
      style={{
        width: 'match_parent',
        flexDirection: 'row',
        backgroundColor: palette.itemBackground,
        borderRadius: 12,
        marginBottom: 6,
        padding: 10,
      }}
    >
      <FlexWidget
        style={{
          width: 4,
          height: 'match_parent',
          borderRadius: 2,
          marginRight: 10,
          backgroundColor: PRIORITY_COLORS[message.priority] ?? '#22C55E',
        }}
      />
      <FlexWidget style={{ flex: 1, flexDirection: 'column' }}>
        <FlexWidget
          style={{
            width: 'match_parent',
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          {message.unread ? (
            <FlexWidget
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                marginRight: 6,
                backgroundColor: palette.accent,
              }}
            />
          ) : null}
          <FlexWidget style={{ flex: 1 }}>
            <TextWidget
              text={message.title || ' '}
              maxLines={1}
              truncate='END'
              style={{
                fontSize: 14,
                fontWeight: message.unread ? '700' : '500',
                color: palette.title,
              }}
            />
          </FlexWidget>
          <TextWidget
            text={formatSentTime(message.sentTime)}
            style={{ fontSize: 11, color: palette.muted, marginLeft: 8 }}
          />
        </FlexWidget>
        {message.preview ? (
          <TextWidget
            text={message.preview}
            maxLines={2}
            truncate='END'
            style={{ fontSize: 12, color: palette.text, marginTop: 2 }}
          />
        ) : null}
        {message.studentName ? (
          <TextWidget
            text={message.studentName}
            maxLines={1}
            truncate='END'
            style={{ fontSize: 11, color: palette.muted, marginTop: 2 }}
          />
        ) : null}
      </FlexWidget>
    </FlexWidget>
  );
}

function RecentMessagesWidgetView({
  snapshot,
  language,
  mode,
  refreshing,
}: Props) {
  const palette = PALETTES[mode];
  const t = translations[language] ?? translations.en;
  const emptyText = snapshot.signedIn ? t.widgetEmpty : t.widgetSignIn;

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        backgroundColor: palette.background,
        borderRadius: 20,
        padding: 12,
      }}
    >
      <FlexWidget
        style={{
          width: 'match_parent',
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: 8,
        }}
      >
        <FlexWidget
          clickAction='OPEN_APP'
          style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}
        >
          <TextWidget
            text={t.widgetTitle}
            style={{ fontSize: 16, fontWeight: '700', color: palette.title }}
          />
          {snapshot.unreadCount > 0 ? (
            <TextWidget
              text={String(snapshot.unreadCount)}
              style={{
                fontSize: 11,
                fontWeight: '700',
                color: '#FFFFFF',
                backgroundColor: palette.accent,
                borderRadius: 9,
                paddingHorizontal: 6,
                paddingVertical: 1,
                marginLeft: 8,
              }}
            />
          ) : null}
        </FlexWidget>
        <TextWidget
          text={refreshing ? '…' : '↻'}
          clickAction='REFRESH'
          accessibilityLabel='Refresh'
          style={{
            fontSize: 18,
            color: palette.accent,
            paddingHorizontal: 8,
          }}
        />
      </FlexWidget>

      {snapshot.messages.length > 0 ? (
        <ListWidget style={{ height: 'match_parent', width: 'match_parent' }}>
          {snapshot.messages.map(message => (
            <MessageItem key={message.id} message={message} palette={palette} />
          ))}
        </ListWidget>
      ) : (
        <FlexWidget
          clickAction='OPEN_APP'
          style={{
            flex: 1,
            width: 'match_parent',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <TextWidget
            text={emptyText}
            style={{ fontSize: 13, color: palette.muted, textAlign: 'center' }}
          />
        </FlexWidget>
      )}
    </FlexWidget>
  );
}

/**
 * Light and dark variants; Android picks one based on the system theme.
 */
export function renderRecentMessagesWidget(
  snapshot: WidgetSnapshot,
  language: Language,
  refreshing = false
) {
  return {
    light: (
      <RecentMessagesWidgetView
        snapshot={snapshot}
        language={language}
        mode='light'
        refreshing={refreshing}
      />
    ),
    dark: (
      <RecentMessagesWidgetView
        snapshot={snapshot}
        language={language}
        mode='dark'
        refreshing={refreshing}
      />
    ),
  };
}
