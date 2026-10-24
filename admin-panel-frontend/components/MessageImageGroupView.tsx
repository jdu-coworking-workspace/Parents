"use client";

import React, { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import ImageLightbox from "@/components/ImageLightbox";
import { cn } from "@/lib/utils";

export type ImageGroupLayout = "sequential" | "carousel" | "group";

export interface MessageImageGroupViewProps {
  images: string[];
  layout?: ImageGroupLayout;
  alt?: string;
  className?: string;
  variant?: "default" | "modal";
}

export default function MessageImageGroupView({
  images,
  layout = "sequential",
  alt = "",
  className,
  variant = "default",
}: MessageImageGroupViewProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!images || images.length === 0) return null;

  const isModal = variant === "modal";

  // If only 1 image, layout differences are minimal, render single clean image
  if (images.length === 1) {
    return (
      <div
        className={cn(
          isModal ? "my-2.5 max-w-full overflow-hidden" : "my-3 max-w-full overflow-hidden",
          className
        )}
      >
        <ImageLightbox
          src={images[0]}
          alt={alt}
          className={cn(
            "w-full rounded-lg border border-border bg-muted/30 object-contain shadow-sm",
            isModal ? "max-h-[300px] sm:max-h-[340px]" : "max-h-[420px]"
          )}
        />
      </div>
    );
  }

  // 1. CAROUSEL
  if (layout === "carousel") {
    const handlePrev = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
    };

    const handleNext = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
    };

    const activeImage = images[currentIndex] || images[0];

    return (
      <div
        className={cn(
          "relative overflow-hidden rounded-xl border border-border bg-muted/30 shadow-sm",
          isModal ? "my-2.5 w-full max-w-full" : "my-3 max-w-2xl",
          className
        )}
      >
        {/* Main slide image */}
        <div
          className={cn(
            "relative flex items-center justify-center bg-black/5 dark:bg-black/20",
            isModal
              ? "min-h-[190px] max-h-[300px] sm:max-h-[340px]"
              : "min-h-[240px] max-h-[440px]"
          )}
        >
          <ImageLightbox
            src={activeImage}
            alt={`${alt} ${currentIndex + 1}/${images.length}`}
            className={cn(
              "w-full object-contain",
              isModal ? "max-h-[300px] sm:max-h-[340px]" : "max-h-[440px]"
            )}
          />

          {/* Left Arrow */}
          <button
            type="button"
            aria-label="Previous image"
            onClick={handlePrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm transition-all hover:bg-black/80 hover:scale-105 active:scale-95 shadow-md"
          >
            <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>

          {/* Right Arrow */}
          <button
            type="button"
            aria-label="Next image"
            onClick={handleNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm transition-all hover:bg-black/80 hover:scale-105 active:scale-95 shadow-md"
          >
            <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>

          {/* Badge indicator */}
          <div className="absolute top-2 right-2 rounded-full bg-black/60 px-2.5 py-0.5 text-xs font-medium text-white backdrop-blur-sm pointer-events-none">
            {currentIndex + 1} / {images.length}
          </div>
        </div>

        {/* Dots Pagination */}
        <div className="flex items-center justify-center gap-1.5 py-2 sm:py-2.5 bg-background/80 border-t border-border/60">
          {images.map((_, idx) => (
            <button
              key={idx}
              type="button"
              aria-label={`Go to slide ${idx + 1}`}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setCurrentIndex(idx);
              }}
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                idx === currentIndex
                  ? "w-6 bg-primary"
                  : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
              )}
            />
          ))}
        </div>
      </div>
    );
  }

  // 2. GROUP (Grid / Collage)
  if (layout === "group") {
    // 2 images: 2-col grid
    if (images.length === 2) {
      return (
        <div
          className={cn(
            "grid grid-cols-2 gap-2",
            isModal ? "my-2.5 w-full max-w-full" : "my-3 max-w-2xl",
            className
          )}
        >
          {images.map((img, idx) => (
            <div
              key={idx}
              className="relative aspect-[4/3] overflow-hidden rounded-lg border border-border bg-muted/40"
            >
              <ImageLightbox
                src={img}
                alt={`${alt} ${idx + 1}`}
                className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
              />
            </div>
          ))}
        </div>
      );
    }

    // 3 images: 1 large on left, 2 stacked on right
    if (images.length === 3) {
      return (
        <div
          className={cn(
            "grid grid-cols-2 gap-2 aspect-[16/10]",
            isModal ? "my-2.5 w-full max-w-full" : "my-3 max-w-2xl",
            className
          )}
        >
          <div className="relative h-full overflow-hidden rounded-lg border border-border bg-muted/40">
            <ImageLightbox
              src={images[0]}
              alt={`${alt} 1`}
              className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
            />
          </div>
          <div className="grid grid-rows-2 gap-2 h-full">
            {images.slice(1, 3).map((img, idx) => (
              <div
                key={idx + 1}
                className="relative h-full overflow-hidden rounded-lg border border-border bg-muted/40"
              >
                <ImageLightbox
                  src={img}
                  alt={`${alt} ${idx + 2}`}
                  className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                />
              </div>
            ))}
          </div>
        </div>
      );
    }

    // 4 images: 2x2 grid
    if (images.length === 4) {
      return (
        <div
          className={cn(
            "grid grid-cols-2 gap-2",
            isModal ? "my-2.5 w-full max-w-full" : "my-3 max-w-2xl",
            className
          )}
        >
          {images.map((img, idx) => (
            <div
              key={idx}
              className="relative aspect-video overflow-hidden rounded-lg border border-border bg-muted/40"
            >
              <ImageLightbox
                src={img}
                alt={`${alt} ${idx + 1}`}
                className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
              />
            </div>
          ))}
        </div>
      );
    }

    // 5 or more images: 3-column responsive grid
    return (
      <div
        className={cn(
          "grid grid-cols-2 sm:grid-cols-3 gap-2",
          isModal ? "my-2.5 w-full max-w-full" : "my-3 max-w-2xl",
          className
        )}
      >
        {images.map((img, idx) => (
          <div
            key={idx}
            className="relative aspect-square overflow-hidden rounded-lg border border-border bg-muted/40"
          >
            <ImageLightbox
              src={img}
              alt={`${alt} ${idx + 1}`}
              className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
            />
          </div>
        ))}
      </div>
    );
  }

  // 3. SEQUENTIAL (Ketma-ket)
  return (
    <div
      className={cn(
        "flex flex-col gap-2.5 sm:gap-3",
        isModal ? "my-2.5 w-full max-w-full" : "my-3 max-w-2xl",
        className
      )}
    >
      {images.map((img, idx) => (
        <div
          key={idx}
          className="relative max-w-full overflow-hidden rounded-lg border border-border bg-muted/40 shadow-sm"
        >
          <ImageLightbox
            src={img}
            alt={`${alt} ${idx + 1}`}
            className={cn(
              "w-full object-contain",
              isModal ? "max-h-[300px] sm:max-h-[340px]" : "max-h-[420px]"
            )}
          />
        </div>
      ))}
    </div>
  );
}
