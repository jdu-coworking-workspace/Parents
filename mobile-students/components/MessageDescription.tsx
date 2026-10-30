import { useMemo, useState } from "react";
import { Image, Linking, StyleSheet, TouchableOpacity, View } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { getMessageImageUrls } from "@/utils/image-url";
import MessageImageGroupView, {
  ImageGroupLayout,
} from "@/components/MessageImageGroupView";

type MessageDescriptionProps = {
  content: string;
  textColor: string;
  fontSize: number;
  onImagePress?: (images: string[], index: number) => void;
};

type TextPart = {
  type: "text";
  value: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  href: string | null;
};

type DescriptionBlock =
  | { type: "text"; parts: TextPart[] }
  | { type: "image"; src: string }
  | { type: "image-group"; layout: ImageGroupLayout; images: string[] };

function decodeHtml(value: string) {
  return value.replace(/&(?:nbsp|amp|lt|gt|quot|#39);/g, (entity) => {
    const entities: Record<string, string> = {
      "&nbsp;": " ",
      "&amp;": "&",
      "&lt;": "<",
      "&gt;": ">",
      "&quot;": '"',
      "&#39;": "'",
    };
    return entities[entity] ?? entity;
  });
}

function extractHref(tag: string) {
  const match = tag.match(
    /\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/i
  );
  const href = decodeHtml((match?.[1] ?? match?.[2] ?? match?.[3] ?? "").trim());
  if (!href || /^(javascript|data):/i.test(href)) return null;
  return href;
}

function normalizeMessageLink(href: string) {
  const value = href.trim();
  if (!value || /^(javascript|data):/i.test(value)) return null;
  if (/^(https?:\/\/|mailto:|tel:)/i.test(value)) return value;
  if (value.startsWith("//")) return `https:${value}`;
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return null;
  return `https://${value}`;
}

function openMessageLink(href: string) {
  const url = normalizeMessageLink(href);
  if (!url) return;
  Linking.openURL(url).catch(() => {});
}

function extractGroupLayout(divAttributes: string): ImageGroupLayout {
  const match = divAttributes.match(
    /\bdata-image-layout\s*=\s*["']([^"']+)["']/i
  );
  const layout = (match?.[1] ?? "").toLowerCase();
  if (layout === "carousel" || layout === "group" || layout === "sequential") {
    return layout;
  }
  if (divAttributes.includes("message-image-group-carousel")) return "carousel";
  if (divAttributes.includes("message-image-group-group")) return "group";
  return "sequential";
}

function extractGroupImages(divAttributes: string, innerHtml: string): string[] {
  // 1. Try parsing JSON array from data-images
  const dataImagesMatch = divAttributes.match(
    /\bdata-images\s*=\s*(?:"([^"]*)"|'([^']*)')/i
  );
  if (dataImagesMatch) {
    const raw = (dataImagesMatch[1] ?? dataImagesMatch[2] ?? "")
      .replace(/&quot;/g, '"')
      .replace(/&#34;/g, '"')
      .replace(/&amp;/g, "&");
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.filter(
          (item): item is string => typeof item === "string" && Boolean(item)
        );
      }
    } catch {
      // Fallback to searching img tags
    }
  }

  // 2. Fallback: extract img src from innerHtml
  const images: string[] = [];
  const imgRegex = /<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi;
  let match: RegExpExecArray | null;
  while ((match = imgRegex.exec(innerHtml))) {
    if (match[1]) {
      images.push(decodeHtml(match[1]));
    }
  }
  return images;
}

function parseInlineContent(content: string): DescriptionBlock[] {
  if (!content) return [];

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
      type: "text",
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
    blocks.push({ type: "text", parts: pendingTextParts.splice(0) });
  };

  while ((match = tagRegex.exec(content))) {
    appendText(content.slice(lastIndex, match.index));

    if (match[1]) {
      flushTextBlock();
      blocks.push({ type: "image", src: decodeHtml(match[1]) });
      lastIndex = match.index + match[0].length;
      continue;
    }

    const rawTag = match[0];
    const tag = (match[2] ?? "").toLowerCase();
    const isClosingTag = rawTag.startsWith("</");

    if (tag === "a") {
      linkHref = isClosingTag ? null : extractHref(rawTag);
    }
    if (tag === "br") appendText("\n");
    if (
      isClosingTag &&
      ["p", "div", "li", "h1", "h2", "h3", "h4", "h5", "h6"].includes(tag)
    ) {
      appendText("\n");
    }
    if (tag === "strong" || tag === "b") {
      boldDepth = Math.max(0, boldDepth + (isClosingTag ? -1 : 1));
    }
    if (tag === "em" || tag === "i") {
      italicDepth = Math.max(0, italicDepth + (isClosingTag ? -1 : 1));
    }
    if (tag === "u") {
      underlineDepth = Math.max(0, underlineDepth + (isClosingTag ? -1 : 1));
    }

    lastIndex = match.index + match[0].length;
  }

  appendText(content.slice(lastIndex));
  flushTextBlock();

  return blocks;
}

function parseDescription(content: string): DescriptionBlock[] {
  if (!content) return [];

  const blocks: DescriptionBlock[] = [];
  const groupRegex =
    /<div\b(?=[^>]*\b(?:message-image-group|data-image-layout))([^>]*)>([\s\S]*?)<\/div>/gi;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = groupRegex.exec(content))) {
    const beforeText = content.slice(lastIndex, match.index);
    if (beforeText.length > 0) {
      blocks.push(...parseInlineContent(beforeText));
    }

    const divAttributes = match[1] ?? "";
    const innerHtml = match[2] ?? "";
    const layout = extractGroupLayout(divAttributes);
    const images = extractGroupImages(divAttributes, innerHtml);

    if (images.length > 0) {
      blocks.push({
        type: "image-group",
        layout,
        images,
      });
    }

    lastIndex = match.index + match[0].length;
  }

  const remaining = content.slice(lastIndex);
  if (remaining.length > 0 || blocks.length === 0) {
    blocks.push(...parseInlineContent(remaining));
  }

  return blocks.length > 0
    ? blocks
    : [
        {
          type: "text",
          parts: [
            {
              type: "text",
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
  return getMessageImageUrls(src)[0] ?? src;
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
        if (block.type === "text") {
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

        if (block.type === "image-group") {
          return (
            <MessageImageGroupView
              key={`group-${index}`}
              images={block.images}
              layout={block.layout}
              onImagePress={(imgs, idx) => onImagePress?.(imgs, idx)}
            />
          );
        }

        const uri = resolveImageUri(block.src);
        const ratio = imageRatios[uri] ?? 1.5;

        return (
          <TouchableOpacity
            key={`image-${uri}-${index}`}
            activeOpacity={0.9}
            onPress={() => onImagePress?.([uri], 0)}
          >
            <Image
              source={{ uri }}
              resizeMode="contain"
              style={[styles.image, { aspectRatio: ratio }]}
              onLoad={(event) => {
                const { width, height } = event.nativeEvent.source;
                if (width && height) {
                  setImageRatios((prev) => ({
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
    width: "100%",
  },
  text: {
    lineHeight: 24,
  },
  image: {
    width: "100%",
    maxHeight: 320,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
  },
  bold: {
    fontWeight: "700",
  },
  italic: {
    fontStyle: "italic",
  },
  underline: {
    textDecorationLine: "underline",
  },
  link: {
    color: "#2563EB",
    textDecorationLine: "underline",
  },
});
