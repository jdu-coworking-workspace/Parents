"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { getPostImageSrc } from "@/lib/postImages";
import { cn } from "@/lib/utils";

type ImageLightboxProps = {
  src: string;
  alt?: string;
  className?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  showTrigger?: boolean;
};

export default function ImageLightbox({
  src,
  alt = "",
  className,
  open: openProp,
  onOpenChange,
  showTrigger = true,
}: ImageLightboxProps) {
  const t = useTranslations("sendmessage");
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : uncontrolledOpen;

  const setOpen = (next: boolean) => {
    if (!isControlled) {
      setUncontrolledOpen(next);
    }
    onOpenChange?.(next);
  };

  const resolved = getPostImageSrc(src);
  const label = alt || t("picture");

  if (!resolved) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {showTrigger ? (
        <DialogTrigger asChild>
          <button
            type="button"
            className="block shrink-0 cursor-zoom-in border-0 bg-transparent p-0"
            aria-label={label}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={resolved} alt={alt} className={cn("block", className)} />
          </button>
        </DialogTrigger>
      ) : null}
      <DialogContent className="flex w-auto max-w-[min(96vw,1140px)] items-center justify-center border-0 bg-transparent p-2 pt-12 text-white shadow-none md:w-auto sm:rounded-none [&_button]:rounded-full [&_button]:bg-black/70 [&_button]:p-1 [&_button]:text-white [&_button]:opacity-100">
        <DialogTitle className="sr-only">{label}</DialogTitle>
        <DialogDescription className="sr-only">{label}</DialogDescription>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={resolved}
          alt={alt}
          className="h-auto max-h-[85vh] w-auto max-w-[min(92vw,1100px)] rounded-md object-contain"
        />
      </DialogContent>
    </Dialog>
  );
}
