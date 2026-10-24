"use client";

import parse, {
  DOMNode,
  Element,
  HTMLReactParserOptions,
} from "html-react-parser";
import ReactLinkify from "react-linkify";
import ImageLightbox from "@/components/ImageLightbox";
import MessageImageGroupView, {
  ImageGroupLayout,
} from "@/components/MessageImageGroupView";
import { cn } from "@/lib/utils";

type PostDescriptionContentProps = {
  description?: string | null;
  className?: string;
  variant?: "default" | "modal";
};

function isElement(node: DOMNode): node is Element {
  return node instanceof Element;
}

function extractImageSources(element: Element): string[] {
  const sources: string[] = [];
  const walk = (n: any) => {
    if (isElement(n)) {
      if (n.name === "img" && n.attribs?.src) {
        sources.push(n.attribs.src);
      }
      if (n.children) {
        n.children.forEach(walk);
      }
    }
  };
  walk(element);
  return sources;
}

export default function PostDescriptionContent({
  description,
  className,
  variant = "default",
}: PostDescriptionContentProps) {
  if (!description) return null;

  const isModal = variant === "modal";

  const options: HTMLReactParserOptions = {
    replace: (node) => {
      if (!isElement(node)) return undefined;

      // Check for image group container
      if (
        node.attribs?.["data-image-layout"] ||
        node.attribs?.class?.includes("message-image-group")
      ) {
        const layout = (node.attribs?.["data-image-layout"] ||
          "sequential") as ImageGroupLayout;

        let images: string[] = [];
        if (node.attribs?.["data-images"]) {
          try {
            const raw = node.attribs["data-images"]
              .replace(/&quot;/g, '"')
              .replace(/&#34;/g, '"');
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) {
              images = parsed;
            }
          } catch {
            // fallback to extracting child img tags
          }
        }

        if (images.length === 0) {
          images = extractImageSources(node);
        }

        if (images.length > 0) {
          return (
            <MessageImageGroupView
              images={images}
              layout={layout}
              alt=""
              variant={variant}
            />
          );
        }
      }

      if (node.name === "img") {
        const src = node.attribs?.src;
        if (!src) return <></>;

        return (
          <ImageLightbox
            src={src}
            alt={node.attribs?.alt ?? ""}
            className={cn(
              "w-full rounded-md border border-border bg-muted/40 object-contain",
              isModal
                ? "my-2.5 max-h-[300px] sm:max-h-[340px]"
                : "my-3 max-h-[420px] max-w-full"
            )}
          />
        );
      }

      if (node.name === "a") {
        node.attribs = {
          ...node.attribs,
          target: "_blank",
          rel: "noreferrer noopener",
          class: "text-blue-600 underline underline-offset-2",
        };
        return undefined;
      }

      return undefined;
    },
  };

  const hasHtml = /<\/?[a-z][\s\S]*>/i.test(description);

  return (
    <div
      className={cn(
        "break-words leading-relaxed",
        !hasHtml && "whitespace-pre-wrap",
        className
      )}
    >
      {hasHtml ? (
        parse(description, options)
      ) : (
        <ReactLinkify>{description}</ReactLinkify>
      )}
    </div>
  );
}
