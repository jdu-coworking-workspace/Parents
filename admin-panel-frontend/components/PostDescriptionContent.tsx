"use client";

import parse, {
  DOMNode,
  Element,
  HTMLReactParserOptions,
} from "html-react-parser";
import ReactLinkify from "react-linkify";
import ImageLightbox from "@/components/ImageLightbox";
import { cn } from "@/lib/utils";

type PostDescriptionContentProps = {
  description?: string | null;
  className?: string;
};

function isElement(node: DOMNode): node is Element {
  return node instanceof Element;
}

export default function PostDescriptionContent({
  description,
  className,
}: PostDescriptionContentProps) {
  if (!description) return null;

  const options: HTMLReactParserOptions = {
    replace: (node) => {
      if (!isElement(node)) return undefined;

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
        const href = node.attribs?.href ?? "";
        return (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="text-blue-600 underline underline-offset-2"
          >
            {node.children?.map((child) =>
              "data" in child ? child.data : null
            )}
          </a>
        );
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
