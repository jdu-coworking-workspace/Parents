"use client";

import React from "react";
import parse, {
  DOMNode,
  Element,
  HTMLReactParserOptions,
} from "html-react-parser";
import ReactLinkify from "react-linkify";
import ImageLightbox from "@/components/ImageLightbox";
import {
  MessageImageCarousel,
  MessageImageGrid,
} from "@/components/MessageImageGroupView";
import { cn } from "@/lib/utils";

type PostDescriptionContentProps = {
  description?: string | null;
  className?: string;
};

function isElement(node: DOMNode): node is Element {
  return node instanceof Element;
}

function collectImageSources(node: Element): string[] {
  const images: string[] = [];
  const walk = (n: any) => {
    if (n && n.name === "img" && n.attribs?.src) {
      images.push(n.attribs.src);
    }
    if (n && Array.isArray(n.children)) {
      n.children.forEach(walk);
    }
  };
  node.children?.forEach(walk);
  return images;
}

/**
 * Image Group dispatcher matching mobile-students MessageDescription
 */
function PostDescriptionImageGroup({
  layout,
  images,
}: {
  layout: "carousel" | "grid" | "stack";
  images: string[];
}) {
  if (images.length === 0) return null;

  if (layout === "grid") {
    return <MessageImageGrid images={images} />;
  }

  if (layout === "carousel") {
    return <MessageImageCarousel images={images} />;
  }

  // layout === "stack"
  return (
    <div className="my-4 flex flex-col items-center gap-3">
      {images.map((src, idx) => (
        <div
          key={`${src}-${idx}`}
          className="flex max-h-[460px] w-full items-center justify-center overflow-hidden rounded-xl border bg-muted/20 p-1"
        >
          <ImageLightbox
            src={src}
            className="max-h-[440px] max-w-full rounded-lg object-contain"
          />
        </div>
      ))}
    </div>
  );
}

export default function PostDescriptionContent({
  description,
  className,
}: PostDescriptionContentProps) {
  if (!description) return null;

  const options: HTMLReactParserOptions = {
    replace: (node) => {
      if (!isElement(node)) return undefined;

      // Handle custom image groups: carousel, grid, stack
      if (
        node.name === "div" &&
        (node.attribs?.["data-image-group"] ||
          node.attribs?.class?.includes("message-image-group"))
      ) {
        const layoutAttr = node.attribs?.["data-layout"];
        const classAttr = node.attribs?.class || "";
        const layout: "carousel" | "grid" | "stack" =
          layoutAttr === "grid" || classAttr.includes("message-image-group-grid")
            ? "grid"
            : layoutAttr === "stack" ||
                classAttr.includes("message-image-group-stack")
              ? "stack"
              : "carousel";

        const images = collectImageSources(node);
        if (images.length > 0) {
          return <PostDescriptionImageGroup layout={layout} images={images} />;
        }
      }

      // Standalone image fallback
      if (node.name === "img") {
        const src = node.attribs?.src;
        if (!src) return <></>;

        return (
          <ImageLightbox
            src={src}
            alt={node.attribs?.alt ?? ""}
            className="my-3 max-h-[420px] max-w-full rounded-md border border-border bg-muted/40 object-contain"
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
    <div className={cn("break-words leading-relaxed", className)}>
      {hasHtml ? (
        parse(description, options)
      ) : (
        <ReactLinkify>{description}</ReactLinkify>
      )}
    </div>
  );
}
