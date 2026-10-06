"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, Download, X } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { getPostImageSrc } from "@/lib/postImages";
import { cn } from "@/lib/utils";

type ImageLightboxProps = {
  src?: string;
  images?: string[];
  initialIndex?: number;
  alt?: string;
  className?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  showTrigger?: boolean;
  children?: React.ReactNode;
};

function getFileName(src: string, index: number) {
  try {
    const clean = src.split("?")[0];
    const segment = clean.split("/").filter(Boolean).pop();
    if (segment) return decodeURIComponent(segment);
  } catch {
    // fallback
  }
  return `image-${index + 1}.jpg`;
}

export default function ImageLightbox({
  src,
  images,
  initialIndex = 0,
  alt = "",
  className,
  open: openProp,
  onOpenChange,
  showTrigger = true,
  children,
}: ImageLightboxProps) {
  const t = useTranslations("sendmessage");
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : uncontrolledOpen;

  const allImages = useMemo(() => {
    if (Array.isArray(images) && images.length > 0) {
      return images;
    }
    return src ? [src] : [];
  }, [images, src]);

  const [activeIdx, setActiveIdx] = useState(initialIndex);

  useEffect(() => {
    if (open) {
      setActiveIdx(Math.min(Math.max(0, initialIndex), Math.max(0, allImages.length - 1)));
    }
  }, [open, initialIndex, allImages.length]);

  useEffect(() => {
    if (!open || allImages.length <= 1) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setActiveIdx((prev) => Math.max(0, prev - 1));
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setActiveIdx((prev) => Math.min(allImages.length - 1, prev + 1));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, allImages.length]);

  const setOpen = (next: boolean) => {
    if (!isControlled) {
      setUncontrolledOpen(next);
    }
    onOpenChange?.(next);
  };

  const safeIdx = Math.min(Math.max(0, activeIdx), Math.max(0, allImages.length - 1));
  const currentRawSrc = allImages[safeIdx] ?? src ?? "";
  const resolved = getPostImageSrc(currentRawSrc);
  const label = alt || t("picture");
  const currentFileName = getFileName(currentRawSrc, safeIdx);

  if (allImages.length === 0 && !src) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {showTrigger ? (
        <DialogTrigger asChild>
          {children ? (
            children
          ) : (
            <button
              type="button"
              className="block shrink-0 cursor-zoom-in border-0 bg-transparent p-0"
              aria-label={label}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={resolved}
                alt={alt}
                className={cn("block", className)}
              />
            </button>
          )}
        </DialogTrigger>
      ) : null}

      <DialogContent
        hideCloseButton
        className="flex w-auto max-w-[min(96vw,1200px)] flex-col items-center justify-center border-0 bg-transparent p-2 text-white shadow-none md:w-auto sm:rounded-none [&_button]:rounded-full [&_button]:bg-black/70 [&_button]:p-1.5 [&_button]:text-white [&_button]:opacity-100"
      >
        <DialogTitle className="sr-only">{label}</DialogTitle>
        <DialogDescription className="sr-only">{label}</DialogDescription>

        {/* Top Header inside Lightbox: Counter badge on left, Download and Close buttons side-by-side on right */}
        <div className="mb-2 flex w-full max-w-[min(92vw,1100px)] items-center justify-between px-2">
          {allImages.length > 1 ? (
            <div className="rounded-full bg-black/75 px-3 py-1 text-xs font-semibold text-white shadow-md backdrop-blur-xs">
              {safeIdx + 1} / {allImages.length}
            </div>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <a
              href={resolved}
              download={currentFileName}
              target="_blank"
              rel="noreferrer"
              title="Download image"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/75 text-white transition hover:bg-black/95 shadow-md"
            >
              <Download className="h-4 w-4" />
            </a>

            <DialogClose asChild>
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/75 text-white transition hover:bg-black/95 shadow-md"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </DialogClose>
          </div>
        </div>

        {/* Main View Area with Prev / Next Arrow buttons */}
        <div className="relative flex max-h-[80vh] w-auto max-w-[min(92vw,1100px)] items-center justify-center overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={resolved}
            alt={alt}
            className="h-auto max-h-[76vh] w-auto max-w-[min(92vw,1100px)] rounded-lg object-contain shadow-2xl"
          />

          {allImages.length > 1 && (
            <>
              <button
                type="button"
                disabled={safeIdx === 0}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveIdx((prev) => Math.max(0, prev - 1));
                }}
                className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/75 p-2 text-white shadow-lg transition hover:bg-black/95 disabled:opacity-20"
                aria-label="Previous image"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>

              <button
                type="button"
                disabled={safeIdx === allImages.length - 1}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveIdx((prev) => Math.min(allImages.length - 1, prev + 1));
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/75 p-2 text-white shadow-lg transition hover:bg-black/95 disabled:opacity-20"
                aria-label="Next image"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}
        </div>

        {/* Thumbnails row below main image for fast switching */}
        {allImages.length > 1 && (
          <div className="mt-3 flex max-w-[min(92vw,800px)] gap-2 overflow-x-auto rounded-xl bg-black/60 p-2 backdrop-blur-xs">
            {allImages.map((imgSrc, idx) => {
              const thumbResolved = getPostImageSrc(imgSrc);
              return (
                <button
                  key={`${imgSrc}-${idx}`}
                  type="button"
                  onClick={() => setActiveIdx(idx)}
                  className={cn(
                    "relative h-12 w-12 shrink-0 overflow-hidden rounded-md border-2 transition-all",
                    idx === safeIdx
                      ? "border-primary opacity-100 ring-2 ring-primary/50"
                      : "border-transparent opacity-60 hover:opacity-100"
                  )}
                  aria-label={`Jump to image ${idx + 1}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={thumbResolved}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </button>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
