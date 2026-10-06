"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Download,
  FileText,
  GalleryHorizontal,
  LayoutGrid,
  List,
} from "lucide-react";
import ImageLightbox from "@/components/ImageLightbox";
import { getPostImageSrc } from "@/lib/postImages";
import {
  MessageImageCarousel,
  MessageImageGrid,
} from "@/components/MessageImageGroupView";

type PostImageGalleryProps = {
  images: string[];
  alt?: string;
};

function getFileName(src: string, index: number) {
  try {
    const clean = src.split("?")[0];
    const segment = clean.split("/").filter(Boolean).pop();
    if (segment) return decodeURIComponent(segment);
  } catch {
    // fallback
  }
  return `File-${index + 1}`;
}

export default function PostImageGallery({
  images,
  alt = "",
}: PostImageGalleryProps) {
  const t = useTranslations("ThisMessage");
  const [viewMode, setViewMode] = useState<"cards" | "grid" | "carousel">("cards");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (!images.length) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-12 text-center text-muted-foreground">
        <FileText className="h-10 w-10 stroke-[1.5] text-muted-foreground/50" />
        <p className="mt-3 text-sm font-semibold text-foreground">
          {t("noFiles")}
        </p>
        <p className="mt-1 text-xs">{t("noFilesDescription")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* View Switcher Controls */}
      {images.length > 1 && (
        <div className="flex items-center justify-between gap-2 border-b pb-3">
          <span className="text-xs text-muted-foreground">
            {images.length} {t("filesTab").toLowerCase()}
          </span>
          <div className="flex items-center gap-1 rounded-lg border bg-muted/40 p-0.5">
            <button
              type="button"
              onClick={() => setViewMode("cards")}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition ${
                viewMode === "cards"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <List className="h-3.5 w-3.5" />
              <span>Ro‘yxat</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition ${
                viewMode === "grid"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span>Guruh</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("carousel")}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition ${
                viewMode === "carousel"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <GalleryHorizontal className="h-3.5 w-3.5" />
              <span>Karusel</span>
            </button>
          </div>
        </div>
      )}

      {viewMode === "grid" && <MessageImageGrid images={images} />}

      {viewMode === "carousel" && <MessageImageCarousel images={images} />}

      {viewMode === "cards" && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {images.map((image, index) => {
            const fullSrc = getPostImageSrc(image);
            const fileName = getFileName(image, index);

            return (
              <div
                key={`${image}-${index}`}
                className="group flex flex-col overflow-hidden rounded-xl border bg-card transition hover:border-foreground/30 hover:shadow-sm"
              >
                <button
                  type="button"
                  onClick={() => setLightboxIndex(index)}
                  className="relative aspect-[4/3] w-full cursor-zoom-in overflow-hidden border-0 bg-muted/30 p-0"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={fullSrc}
                    alt={alt || fileName}
                    className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                  />
                </button>
                <div className="flex items-center justify-between gap-2 border-t bg-muted/15 p-3">
                  <div className="min-w-0 flex-1">
                    <p
                      className="truncate text-xs font-medium text-foreground"
                      title={fileName}
                    >
                      {fileName}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {index + 1} / {images.length}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <a
                      href={fullSrc}
                      download={fileName}
                      target="_blank"
                      rel="noreferrer"
                      title={t("download")}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border bg-background text-muted-foreground transition hover:bg-accent hover:text-foreground"
                    >
                      <Download className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Full-Screen Carousel Lightbox on Click in Card mode */}
      <ImageLightbox
        images={images}
        initialIndex={lightboxIndex ?? 0}
        open={lightboxIndex !== null}
        onOpenChange={(open) => {
          if (!open) setLightboxIndex(null);
        }}
        showTrigger={false}
      />
    </div>
  );
}
