import { useMemo, useState } from "react";
import { Image, Linking, StyleSheet, TouchableOpacity, View } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { getMessageImageUrls } from "@/utils/image-url";
import MessageImageCarousel from "@/components/MessageImageCarousel";
import MessageImageGrid from "@/components/MessageImageGrid";

type MessageDescriptionProps = {
  content: string;
  textColor: string;
  fontSize: number;
  onImagePress?: (
    uri: string,
    groupImages?: string[],
    groupIndex?: number
  ) => void;
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
  | {
      type: "image-group";
      layout: "carousel" | "grid" | "stack";
      images: string[];
    };

const IMAGE_EXTENSION_REGEX = /\.(jpe?g|png|gif|webp|svg|bmp)(\?.*)?$/i;
const IMAGE_URL_REGEX =
  /(https?:\/\/[^\s<>'"]+?\.(?:jpe?g|png|gif|webp|svg|bmp)(?:\?[^\s<>'"]*)?)/gi;

function isImageUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  const trimmed = url.trim();
  if (/^data:image\//i.test(trimmed)) return true;
  const cleanUrl = trimmed.split("?")[0].split("#")[0];
  return (
    IMAGE_EXTENSION_REGEX.test(cleanUrl) ||
    /\/images\/[a-f0-9]{32,64}\b/i.test(trimmed)
  );
}

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

function extractImgSrc(tag: string) {
  const match = tag.match(
    /\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/i
  );
  const src = decodeHtml((match?.[1] ?? match?.[2] ?? match?.[3] ?? "").trim());
  if (!src || /^javascript:/i.test(src)) return null;
  return src;
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

function parseDescription(content: string): DescriptionBlock[] {
  const rawBlocks: DescriptionBlock[] = [];
  let pendingTextParts: TextPart[] = [];
  const tagRegex =
    /!\[([^\]]*)\]\(([^)]+)\)|<img\b[^>]*>|<\/?([a-z][a-z0-9-]*)\b[^>]*>/gi;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let boldDepth = 0;
  let italicDepth = 0;
  let underlineDepth = 0;
  let currentLinkHref: string | null = null;
  let currentLinkIsImage = false;

  let inImageGroup = false;
  let currentGroupLayout: "carousel" | "grid" | "stack" = "carousel";
  let currentGroupImages: string[] = [];

  const flushTextBlock = () => {
    if (pendingTextParts.length === 0) return;
    rawBlocks.push({ type: "text", parts: pendingTextParts });
    pendingTextParts = [];
  };

  const flushImageGroup = () => {
    if (!inImageGroup) return;
    if (currentGroupImages.length > 0) {
      rawBlocks.push({
        type: "image-group",
        layout: currentGroupLayout,
        images: currentGroupImages,
      });
    }
    inImageGroup = false;
    currentGroupImages = [];
  };

  const appendText = (value: string) => {
    const decoded = decodeHtml(value);
    if (!decoded) return;

    if (currentLinkIsImage && currentLinkHref) {
      const trimmedVal = decoded.trim();
      if (
        !trimmedVal ||
        trimmedVal === currentLinkHref ||
        isImageUrl(trimmedVal)
      ) {
        return;
      }
    }

    const textPart: TextPart = {
      type: "text",
      value: decoded,
      bold: boldDepth > 0,
      italic: italicDepth > 0,
      underline: underlineDepth > 0,
      href: currentLinkHref,
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

  while ((match = tagRegex.exec(content))) {
    appendText(content.slice(lastIndex, match.index));
    const rawMatch = match[0];

    // 1. Markdown image: ![alt](url)
    if (match[2]) {
      flushTextBlock();
      const markdownSrc = decodeHtml(match[2].trim());
      if (markdownSrc) {
        if (inImageGroup) {
          currentGroupImages.push(markdownSrc);
        } else {
          rawBlocks.push({ type: "image", src: markdownSrc });
        }
      }
      lastIndex = match.index + rawMatch.length;
      continue;
    }

    // 2. HTML <img> tag
    if (/^<img\b/i.test(rawMatch)) {
      const src = extractImgSrc(rawMatch);
      if (src) {
        if (inImageGroup) {
          currentGroupImages.push(src);
        } else {
          flushTextBlock();
          rawBlocks.push({ type: "image", src });
        }
      }
      lastIndex = match.index + rawMatch.length;
      continue;
    }

    // 3. Other HTML tags
    const tag = (match[3] ?? "").toLowerCase();
    const isClosingTag = rawMatch.startsWith("</");
    const isSelfClosing = rawMatch.endsWith("/>");

    // data-image-group div detection
    if (tag === "div") {
      if (!isClosingTag && /\bdata-image-group\b/i.test(rawMatch)) {
        flushTextBlock();
        flushImageGroup();
        inImageGroup = true;
        const layoutMatch = rawMatch.match(/\bdata-layout\s*=\s*["']([^"']+)["']/i);
        currentGroupLayout =
          (layoutMatch?.[1]?.toLowerCase() as "carousel" | "grid" | "stack") ||
          "carousel";
        currentGroupImages = [];
        lastIndex = match.index + rawMatch.length;
        continue;
      }

      if (isClosingTag && inImageGroup) {
        flushTextBlock();
        flushImageGroup();
        lastIndex = match.index + rawMatch.length;
        continue;
      }
    }

    if (tag === "a") {
      if (isClosingTag) {
        currentLinkHref = null;
        currentLinkIsImage = false;
      } else {
        const href = extractHref(rawMatch);
        if (href && isImageUrl(href)) {
          flushTextBlock();
          if (inImageGroup) {
            currentGroupImages.push(href);
          } else {
            rawBlocks.push({ type: "image", src: href });
          }
          currentLinkHref = href;
          currentLinkIsImage = true;
        } else {
          currentLinkHref = isSelfClosing ? null : href;
          currentLinkIsImage = false;
        }
      }
    } else if (tag === "br") {
      appendText("\n");
    } else if (
      isClosingTag &&
      ["p", "div", "li", "h1", "h2", "h3", "h4", "h5", "h6"].includes(tag)
    ) {
      appendText("\n");
    } else if (tag === "strong" || tag === "b") {
      boldDepth = Math.max(0, boldDepth + (isClosingTag ? -1 : 1));
    } else if (tag === "em" || tag === "i") {
      italicDepth = Math.max(0, italicDepth + (isClosingTag ? -1 : 1));
    } else if (tag === "u") {
      underlineDepth = Math.max(0, underlineDepth + (isClosingTag ? -1 : 1));
    }

    lastIndex = match.index + rawMatch.length;
  }

  appendText(content.slice(lastIndex));
  flushTextBlock();
  flushImageGroup();

  // Split plain text parts that contain standalone image URLs
  const finalBlocks: DescriptionBlock[] = [];

  for (const block of rawBlocks) {
    if (block.type === "image-group") {
      finalBlocks.push(block);
      continue;
    }

    if (block.type === "image") {
      const last = finalBlocks[finalBlocks.length - 1];
      if (last && last.type === "image" && last.src === block.src) {
        continue;
      }
      finalBlocks.push(block);
      continue;
    }

    let currentParts: TextPart[] = [];

    for (const part of block.parts) {
      if (part.href && isImageUrl(part.href)) {
        if (currentParts.length > 0) {
          finalBlocks.push({ type: "text", parts: currentParts });
          currentParts = [];
        }
        const last = finalBlocks[finalBlocks.length - 1];
        if (!last || last.type !== "image" || last.src !== part.href) {
          finalBlocks.push({ type: "image", src: part.href });
        }
        if (
          part.value.trim() &&
          part.value.trim() !== part.href &&
          !isImageUrl(part.value.trim())
        ) {
          currentParts.push(part);
        }
        continue;
      }

      const text = part.value;
      let partLastIdx = 0;
      let urlMatch: RegExpExecArray | null;
      IMAGE_URL_REGEX.lastIndex = 0;
      let hasUrl = false;

      while ((urlMatch = IMAGE_URL_REGEX.exec(text))) {
        hasUrl = true;
        const before = text.slice(partLastIdx, urlMatch.index);
        if (before) {
          currentParts.push({ ...part, value: before });
        }
        if (currentParts.length > 0) {
          finalBlocks.push({ type: "text", parts: currentParts });
          currentParts = [];
        }
        const matchedUrl = urlMatch[1];
        const last = finalBlocks[finalBlocks.length - 1];
        if (!last || last.type !== "image" || last.src !== matchedUrl) {
          finalBlocks.push({ type: "image", src: matchedUrl });
        }
        partLastIdx = urlMatch.index + matchedUrl.length;
      }

      if (hasUrl) {
        const after = text.slice(partLastIdx);
        if (after) {
          currentParts.push({ ...part, value: after });
        }
      } else {
        currentParts.push(part);
      }
    }

    if (currentParts.length > 0) {
      finalBlocks.push({ type: "text", parts: currentParts });
    }
  }

  const cleanedBlocks = finalBlocks.filter((b) => {
    if (b.type === "image" || b.type === "image-group") return true;
    const text = b.parts.map((p) => p.value).join("").trim();
    return text.length > 0;
  });

  return cleanedBlocks.length > 0
    ? cleanedBlocks
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
          const resolvedGroup = block.images.map(resolveImageUri);
          if (block.layout === "carousel") {
            return (
              <MessageImageCarousel
                key={`group-carousel-${index}`}
                images={resolvedGroup}
                onImagePress={(imgIdx) => {
                  onImagePress?.(resolvedGroup[imgIdx], resolvedGroup, imgIdx);
                }}
              />
            );
          }

          if (block.layout === "grid") {
            return (
              <MessageImageGrid
                key={`group-grid-${index}`}
                images={resolvedGroup}
                onImagePress={(imgIdx) => {
                  onImagePress?.(resolvedGroup[imgIdx], resolvedGroup, imgIdx);
                }}
              />
            );
          }

          // stack layout
          return (
            <View key={`group-stack-${index}`} style={styles.stackContainer}>
              {resolvedGroup.map((uri, imgIdx) => {
                const ratio = imageRatios[uri];
                return (
                  <TouchableOpacity
                    key={`stack-img-${uri}-${imgIdx}`}
                    activeOpacity={0.9}
                    onPress={() => onImagePress?.(uri, resolvedGroup, imgIdx)}
                  >
                    <Image
                      source={{ uri }}
                      resizeMode="contain"
                      style={[
                        styles.image,
                        ratio ? { aspectRatio: ratio } : styles.imagePlaceholder,
                      ]}
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

        const uri = resolveImageUri(block.src);
        const ratio = imageRatios[uri];

        return (
          <TouchableOpacity
            key={`image-${uri}-${index}`}
            activeOpacity={0.9}
            onPress={() => onImagePress?.(uri, [uri], 0)}
          >
            <Image
              source={{ uri }}
              resizeMode="contain"
              style={[
                styles.image,
                ratio ? { aspectRatio: ratio } : styles.imagePlaceholder,
              ]}
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
  stackContainer: {
    gap: 10,
    width: "100%",
  },
  text: {
    lineHeight: 24,
  },
  image: {
    width: "100%",
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    overflow: "hidden" as const,
  },
  imagePlaceholder: {
    aspectRatio: 16 / 9,
    backgroundColor: "#E5E7EB",
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
