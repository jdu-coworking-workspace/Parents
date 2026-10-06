"use client";

import React, { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import ImageLightbox from "@/components/ImageLightbox";
import { getPostImageSrc } from "@/lib/postImages";
import { cn } from "@/lib/utils";

/**
 * Telegram-style mosaic image grid matching mobile-students MessageImageGrid
 * When any image is clicked, it opens a full-screen carousel lightbox to browse the whole group!
 */
export function MessageImageGrid({ images }: { images: string[] }) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const count = images.length;

  if (count === 0) return null;

  return (
    <>
      {/* 1 ta rasm */}
      {count === 1 && (
        <div className="my-3 overflow-hidden rounded-xl border bg-muted/20">
          <button
            type="button"
            onClick={() => setLightboxIndex(0)}
            className="block h-[320px] w-full cursor-zoom-in overflow-hidden border-0 bg-transparent p-0"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={getPostImageSrc(images[0])}
              alt=""
              className="h-full w-full object-cover transition-transform duration-200 hover:scale-102"
            />
          </button>
        </div>
      )}

      {/* 2 ta rasm: Yonma-yon 50% dan */}
      {count === 2 && (
        <div className="my-3 flex gap-1 overflow-hidden rounded-xl border bg-muted/10">
          <button
            type="button"
            onClick={() => setLightboxIndex(0)}
            className="relative h-[240px] flex-1 cursor-zoom-in overflow-hidden border-0 bg-transparent p-0"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={getPostImageSrc(images[0])}
              alt=""
              className="h-full w-full object-cover transition-transform duration-200 hover:scale-105"
            />
          </button>
          <button
            type="button"
            onClick={() => setLightboxIndex(1)}
            className="relative h-[240px] flex-1 cursor-zoom-in overflow-hidden border-0 bg-transparent p-0"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={getPostImageSrc(images[1])}
              alt=""
              className="h-full w-full object-cover transition-transform duration-200 hover:scale-105"
            />
          </button>
        </div>
      )}

      {/* 3 ta rasm: 1 ta katta tepada, 2 ta kichik pastda */}
      {count === 3 && (
        <div className="my-3 flex flex-col gap-1 overflow-hidden rounded-xl border bg-muted/10">
          <button
            type="button"
            onClick={() => setLightboxIndex(0)}
            className="relative h-[210px] w-full cursor-zoom-in overflow-hidden border-0 bg-transparent p-0"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={getPostImageSrc(images[0])}
              alt=""
              className="h-full w-full object-cover transition-transform duration-200 hover:scale-105"
            />
          </button>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setLightboxIndex(1)}
              className="relative h-[160px] flex-1 cursor-zoom-in overflow-hidden border-0 bg-transparent p-0"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getPostImageSrc(images[1])}
                alt=""
                className="h-full w-full object-cover transition-transform duration-200 hover:scale-105"
              />
            </button>
            <button
              type="button"
              onClick={() => setLightboxIndex(2)}
              className="relative h-[160px] flex-1 cursor-zoom-in overflow-hidden border-0 bg-transparent p-0"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getPostImageSrc(images[2])}
                alt=""
                className="h-full w-full object-cover transition-transform duration-200 hover:scale-105"
              />
            </button>
          </div>
        </div>
      )}

      {/* 4 ta rasm: 2x2 panjara (grid) */}
      {count === 4 && (
        <div className="my-3 flex flex-col gap-1 overflow-hidden rounded-xl border bg-muted/10">
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setLightboxIndex(0)}
              className="relative h-[160px] flex-1 cursor-zoom-in overflow-hidden border-0 bg-transparent p-0"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getPostImageSrc(images[0])}
                alt=""
                className="h-full w-full object-cover transition-transform duration-200 hover:scale-105"
              />
            </button>
            <button
              type="button"
              onClick={() => setLightboxIndex(1)}
              className="relative h-[160px] flex-1 cursor-zoom-in overflow-hidden border-0 bg-transparent p-0"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getPostImageSrc(images[1])}
                alt=""
                className="h-full w-full object-cover transition-transform duration-200 hover:scale-105"
              />
            </button>
          </div>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setLightboxIndex(2)}
              className="relative h-[160px] flex-1 cursor-zoom-in overflow-hidden border-0 bg-transparent p-0"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getPostImageSrc(images[2])}
                alt=""
                className="h-full w-full object-cover transition-transform duration-200 hover:scale-105"
              />
            </button>
            <button
              type="button"
              onClick={() => setLightboxIndex(3)}
              className="relative h-[160px] flex-1 cursor-zoom-in overflow-hidden border-0 bg-transparent p-0"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getPostImageSrc(images[3])}
                alt=""
                className="h-full w-full object-cover transition-transform duration-200 hover:scale-105"
              />
            </button>
          </div>
        </div>
      )}

      {/* 5 yoki undan ortiq rasm: 2x2 panjara, 4-rasmda +N belgisi */}
      {count >= 5 && (
        <div className="my-3 flex flex-col gap-1 overflow-hidden rounded-xl border bg-muted/10">
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setLightboxIndex(0)}
              className="relative h-[160px] flex-1 cursor-zoom-in overflow-hidden border-0 bg-transparent p-0"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getPostImageSrc(images[0])}
                alt=""
                className="h-full w-full object-cover transition-transform duration-200 hover:scale-105"
              />
            </button>
            <button
              type="button"
              onClick={() => setLightboxIndex(1)}
              className="relative h-[160px] flex-1 cursor-zoom-in overflow-hidden border-0 bg-transparent p-0"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getPostImageSrc(images[1])}
                alt=""
                className="h-full w-full object-cover transition-transform duration-200 hover:scale-105"
              />
            </button>
          </div>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setLightboxIndex(2)}
              className="relative h-[160px] flex-1 cursor-zoom-in overflow-hidden border-0 bg-transparent p-0"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getPostImageSrc(images[2])}
                alt=""
                className="h-full w-full object-cover transition-transform duration-200 hover:scale-105"
              />
            </button>
            <button
              type="button"
              onClick={() => setLightboxIndex(3)}
              className="relative h-[160px] flex-1 cursor-zoom-in overflow-hidden border-0 bg-transparent p-0"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getPostImageSrc(images[3])}
                alt=""
                className="h-full w-full object-cover transition-transform duration-200 hover:scale-105"
              />
              {count > 4 && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-xs">
                  <span className="text-xl font-bold text-white">
                    +{count - 4}
                  </span>
                </div>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Full-Screen Carousel Lightbox on Click */}
      <ImageLightbox
        images={images}
        initialIndex={lightboxIndex ?? 0}
        open={lightboxIndex !== null}
        onOpenChange={(open) => {
          if (!open) setLightboxIndex(null);
        }}
        showTrigger={false}
      />
    </>
  );
}

/**
 * Swipeable/button carousel matching mobile-students MessageImageCarousel
 */
export function MessageImageCarousel({ images }: { images: string[] }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  if (images.length === 0) return null;

  const safeIdx = Math.min(Math.max(0, activeIdx), images.length - 1);

  if (images.length === 1) {
    return (
      <div className="my-3 overflow-hidden rounded-xl border bg-muted/20">
        <button
          type="button"
          onClick={() => setLightboxOpen(true)}
          className="block w-full cursor-zoom-in border-0 bg-transparent p-0"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={getPostImageSrc(images[0])}
            alt=""
            className="max-h-[380px] w-full object-contain"
          />
        </button>
        <ImageLightbox
          images={images}
          initialIndex={0}
          open={lightboxOpen}
          onOpenChange={setLightboxOpen}
          showTrigger={false}
        />
      </div>
    );
  }

  return (
    <div className="my-3 flex flex-col items-center overflow-hidden rounded-xl border bg-card p-2 shadow-xs">
      {/* Main Image with Nav buttons and counter */}
      <div className="relative flex max-h-[380px] min-h-[220px] w-full items-center justify-center overflow-hidden rounded-lg bg-black/5 dark:bg-black/40">
        <button
          type="button"
          onClick={() => setLightboxOpen(true)}
          className="flex h-full w-full cursor-zoom-in items-center justify-center border-0 bg-transparent p-0"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={getPostImageSrc(images[safeIdx])}
            alt=""
            className="max-h-[360px] max-w-full object-contain"
          />
        </button>

        {/* Prev / Next buttons */}
        <button
          type="button"
          disabled={safeIdx === 0}
          onClick={(e) => {
            e.stopPropagation();
            setActiveIdx((prev) => Math.max(0, prev - 1));
          }}
          className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-1.5 text-white shadow-md transition disabled:opacity-20 hover:bg-black/80"
          aria-label="Previous"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <button
          type="button"
          disabled={safeIdx === images.length - 1}
          onClick={(e) => {
            e.stopPropagation();
            setActiveIdx((prev) => Math.min(images.length - 1, prev + 1));
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-1.5 text-white shadow-md transition disabled:opacity-20 hover:bg-black/80"
          aria-label="Next"
        >
          <ChevronRight className="h-5 w-5" />
        </button>

        {/* Counter Badge */}
        <div className="absolute top-2 right-2 rounded-full bg-black/65 px-2.5 py-0.5 text-xs font-semibold text-white shadow-xs">
          {safeIdx + 1} / {images.length}
        </div>
      </div>

      {/* Dots Indicator (xuddi mobile students kabi) */}
      <div className="flex items-center justify-center gap-1.5 py-2">
        {images.map((_, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => setActiveIdx(idx)}
            className={cn(
              "h-1.5 rounded-full transition-all duration-200",
              idx === safeIdx
                ? "w-5 bg-primary"
                : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/60"
            )}
            aria-label={`Go to slide ${idx + 1}`}
          />
        ))}
      </div>

      {/* Thumbnails row */}
      <div className="flex w-full max-w-full gap-1.5 overflow-x-auto px-1 pb-1">
        {images.map((src, idx) => (
          <button
            key={`${src}-${idx}`}
            type="button"
            onClick={() => setActiveIdx(idx)}
            className={cn(
              "relative h-12 w-12 shrink-0 overflow-hidden rounded-md border transition-all",
              idx === safeIdx
                ? "ring-2 ring-primary border-transparent opacity-100"
                : "opacity-60 hover:opacity-100"
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={getPostImageSrc(src)}
              alt=""
              className="h-full w-full object-cover"
            />
          </button>
        ))}
      </div>

      {/* Full-Screen Carousel Lightbox on Click */}
      <ImageLightbox
        images={images}
        initialIndex={safeIdx}
        open={lightboxOpen}
        onOpenChange={setLightboxOpen}
        showTrigger={false}
      />
    </div>
  );
}
