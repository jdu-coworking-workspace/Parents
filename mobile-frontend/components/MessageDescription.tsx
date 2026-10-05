import { useMemo, useState } from 'react';
import { Image, Linking, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Autolink } from 'react-native-autolink';
import { ThemedText } from '@/components/ThemedText';

type MessageDescriptionProps = {
  content: string;
  textColor: string;
  fontSize: number;
  onImagePress?: (uri: string) => void;
};

type TextPart = {
  type: 'text';
  value: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  href: string | null;
};

type DescriptionBlock =
  | { type: 'text'; parts: TextPart[] }
  | { type: 'image'; src: string };

function decodeHtml(value: string) {
  return value.replace(/&(?:nbsp|amp|lt|gt|quot|#39);/g, entity => {
    const entities: Record<string, string> = {
      '&nbsp;': ' ',
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&#39;': "'",
    };
    return entities[entity] ?? entity;
  });
}

function extractHref(tag: string) {
  const match = tag.match(
    /\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/i
  );
  const href = decodeHtml((match?.[1] ?? match?.[2] ?? match?.[3] ?? '').trim());
  if (!href || /^(javascript|data):/i.test(href)) return null;
  return href;
}

function normalizeMessageLink(href: string) {
  const value = href.trim();
  if (!value || /^(javascript|data):/i.test(value)) return null;
  if (/^(https?:\/\/|mailto:|tel:)/i.test(value)) return value;
  if (value.startsWith('//')) return `https:${value}`;
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return null;
  return `https://${value}`;
}

function openMessageLink(href: string) {
  const url = normalizeMessageLink(href);
  if (!url) return;
  Linking.openURL(url).catch(() => {});
}

function parseDescription(content: string): DescriptionBlock[] {
  const blocks: DescriptionBlock[] = [];
  const pendingTextParts: TextPart[] = [];
  const tagRegex =
    /<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>|<\/?([a-z][a-z0-9]*)\b[^>]*>/gi;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let boldDepth = 0;
  let italicDepth = 0;
  let underlineDepth = 0;
  let linkHref: string | null = null;

  const appendText = (value: string) => {
    const decoded = decodeHtml(value);
    if (!decoded) return;

    const textPart: TextPart = {
      type: 'text',
      value: decoded,
      bold: boldDepth > 0,
      italic: italicDepth > 0,
      underline: underlineDepth > 0,
      href: linkHref,
    };
    const last = pendingTextParts[pendingTextParts.length - 1];

    if (
      last &&
      last.bold === textPart.bold &&
      last.italic === textPart.italic &&
      last.underline === textPart.underline &&
      last.href === textPart.href
    ) {
      last.value += textPart.value;
      return;
    }

    pendingTextParts.push(textPart);
  };

  const flushTextBlock = () => {
    if (pendingTextParts.length === 0) return;
    blocks.push({ type: 'text', parts: pendingTextParts.splice(0) });
  };

  while ((match = tagRegex.exec(content))) {
    appendText(content.slice(lastIndex, match.index));

    if (match[1]) {
      flushTextBlock();
      blocks.push({ type: 'image', src: decodeHtml(match[1]) });
      lastIndex = match.index + match[0].length;
      continue;
    }

    const rawTag = match[0];
    const tag = (match[2] ?? '').toLowerCase();
    const isClosingTag = rawTag.startsWith('</');

    if (tag === 'a') {
      linkHref = isClosingTag ? null : extractHref(rawTag);
    }
    if (tag === 'br') appendText('\n');
    if (
      isClosingTag &&
      ['p', 'div', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tag)
    ) {
      appendText('\n');
    }
    if (tag === 'strong' || tag === 'b') {
      boldDepth = Math.max(0, boldDepth + (isClosingTag ? -1 : 1));
    }
    if (tag === 'em' || tag === 'i') {
      italicDepth = Math.max(0, italicDepth + (isClosingTag ? -1 : 1));
    }
    if (tag === 'u') {
      underlineDepth = Math.max(0, underlineDepth + (isClosingTag ? -1 : 1));
    }

    lastIndex = match.index + match[0].length;
  }

  appendText(content.slice(lastIndex));
  flushTextBlock();

  return blocks.length > 0
    ? blocks
    : [
        {
          type: 'text',
          parts: [
            {
              type: 'text',
              value: content,
              bold: false,
              italic: false,
              underline: false,
              href: null,
            },
          ],
        },
      ];
}

function resolveImageUri(src: string) {
  if (
    src.startsWith('http://') ||
    src.startsWith('https://') ||
    src.startsWith('data:')
  ) {
    return src;
  }

  const baseUrl = process.env.EXPO_PUBLIC_S3_BASE_URL ?? '';
  const normalizedSrc = src.startsWith('/') ? src.slice(1) : src;
  return baseUrl ? `${baseUrl}/${normalizedSrc}` : normalizedSrc;
}

function hasFormatting(parts: TextPart[]) {
  return parts.some(
    part => part.bold || part.italic || part.underline || part.href
  );
}

export default function MessageDescription({
  content,
  textColor,
  fontSize,
  onImagePress,
}: MessageDescriptionProps) {
  const blocks = useMemo(() => parseDescription(content), [content]);
  const [imageRatios, setImageRatios] = useState<Record<string, number>>({});

  return (
    <View style={styles.container}>
      {blocks.map((block, index) => {
        if (block.type === 'text') {
          if (!hasFormatting(block.parts)) {
            return (
              <Autolink
                key={`text-${index}`}
                email
                hashtag='instagram'
                mention='instagram'
                text={block.parts.map(part => part.value).join('')}
                style={[styles.text, { color: textColor, fontSize }]}
              />
            );
          }

          return (
            <ThemedText
              key={`text-${index}`}
              style={[styles.text, { color: textColor, fontSize }]}
            >
              {block.parts.map((part, partIndex) => (
                <ThemedText
                  key={`text-${index}-${partIndex}`}
                  style={[
                    part.bold && styles.bold,
                    part.italic && styles.italic,
                    part.href ? styles.link : part.underline && styles.underline,
                  ]}
                  onPress={
                    part.href ? () => openMessageLink(part.href!) : undefined
                  }
                >
                  {part.value}
                </ThemedText>
              ))}
            </ThemedText>
          );
        }

        const uri = resolveImageUri(block.src);
        const ratio = imageRatios[uri] ?? 1.5;

        return (
          <TouchableOpacity
            key={`image-${uri}-${index}`}
            activeOpacity={0.9}
            onPress={() => onImagePress?.(uri)}
          >
            <Image
              source={{ uri }}
              resizeMode='contain'
              style={[styles.image, { aspectRatio: ratio }]}
              onLoad={event => {
                const { width, height } = event.nativeEvent.source;
                if (width && height) {
                  setImageRatios(prev => ({
                    ...prev,
                    [uri]: width / height,
                  }));
                }
              }}
            />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
    width: '100%',
  },
  text: {
    lineHeight: 24,
  },
  image: {
    width: '100%',
    maxHeight: 320,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  bold: {
    fontWeight: '700',
  },
  italic: {
    fontStyle: 'italic',
  },
  underline: {
    textDecorationLine: 'underline',
  },
  link: {
    color: '#2563EB',
    textDecorationLine: 'underline',
  },
});
