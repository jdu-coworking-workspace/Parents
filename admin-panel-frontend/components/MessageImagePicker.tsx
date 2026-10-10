"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { X, Plus, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import useApiMutation from "@/lib/useApiMutation";
import ImageLightbox from "@/components/ImageLightbox";
import {
  MAX_IMAGE_BYTES,
  MAX_POST_IMAGES,
  compressAndReadFileAsDataUrl,
} from "@/lib/postImages";

type UploadImageResponse = {
  image?: string;
  images?: string[];
};

type MessageImagePickerProps = {
  value: string[];
  onChange: (images: string[]) => void;
  onUploadingChange?: (uploading: boolean) => void;
};

export default function MessageImagePicker({
  value,
  onChange,
  onUploadingChange,
}: MessageImagePickerProps) {
  const t = useTranslations("sendmessage");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileKey, setFileKey] = useState(0);
  const [pendingPreviews, setPendingPreviews] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const uploadImageMutation = useApiMutation<
    UploadImageResponse,
    { images: string[] }
  >(`post/image`, "POST", ["postImage"], {
    onSuccess: (data) => {
      const uploaded = Array.isArray(data.images)
        ? data.images.filter(Boolean)
        : data.image
          ? [data.image]
          : [];
      onChange([...value, ...uploaded].slice(0, MAX_POST_IMAGES));
      toast({
        title: t("uploadImageFinished"),
      });
    },
    onError: () => {
      toast({
        title: t("error"),
        description: t("imageUploadFailed"),
      });
    },
    onSettled: () => {
      setPendingPreviews([]);
      onUploadingChange?.(false);
    },
  });

  const displayedImages = [...value, ...pendingPreviews];
  const remainingSlots = MAX_POST_IMAGES - value.length;

  const processAndUploadFiles = async (rawFiles: File[]) => {
    const files = rawFiles.filter((f) => f.type.startsWith("image/"));
    if (files.length === 0) return;

    if (remainingSlots <= 0) {
      toast({
        title: t("error"),
        description: t("tooManyImages", { max: MAX_POST_IMAGES }),
      });
      return;
    }

    const accepted = files.slice(0, remainingSlots);
    if (files.length > remainingSlots) {
      toast({
        title: t("error"),
        description: t("tooManyImages", { max: MAX_POST_IMAGES }),
      });
    }

    const oversized = accepted.filter((file) => file.size > MAX_IMAGE_BYTES);
    if (oversized.length > 0) {
      toast({
        title: t("error"),
        description: t("imageTooLarge"),
      });
    }

    const validFiles = accepted.filter((file) => file.size <= MAX_IMAGE_BYTES);
    if (validFiles.length === 0) return;

    try {
      onUploadingChange?.(true);
      const dataUrls = await Promise.all(
        validFiles.map((file) => compressAndReadFileAsDataUrl(file))
      );
      setPendingPreviews(dataUrls);
      uploadImageMutation.mutate({ images: dataUrls });
    } catch {
      onUploadingChange?.(false);
      setPendingPreviews([]);
      toast({
        title: t("error"),
        description: t("imageUploadFailed"),
      });
    }
  };

  const handleFilesSelected = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length > 0) {
      processAndUploadFiles(files);
    }
  };

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (remainingSlots <= 0 || uploadImageMutation.isPending) return;
      const items = Array.from(e.clipboardData?.items ?? []);
      const imageFiles: File[] = [];
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) imageFiles.push(file);
        }
      }
      if (imageFiles.length > 0) {
        processAndUploadFiles(imageFiles);
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [remainingSlots, uploadImageMutation.isPending, value]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!uploadImageMutation.isPending && remainingSlots > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (uploadImageMutation.isPending || remainingSlots <= 0) return;
    const files = Array.from(e.dataTransfer.files ?? []);
    if (files.length > 0) {
      processAndUploadFiles(files);
    }
  };

  const handleRemove = (index: number) => {
    if (index >= value.length) return;
    onChange(value.filter((_, itemIndex) => itemIndex !== index));
    setFileKey((prev) => prev + 1);
  };

  const chosenLabel =
    displayedImages.length === 0
      ? t("noFileChosen")
      : t("filesChosen", { count: displayedImages.length });

  return (
    <div
      className={`space-y-3 rounded-lg border-2 p-3 transition-colors ${
        isDragging
          ? "border-primary bg-primary/5"
          : "border-transparent"
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex items-center gap-2 flex-wrap">
        <Input
          type="file"
          accept="image/*"
          multiple
          key={fileKey}
          ref={fileInputRef}
          className="hidden"
          onChange={handleFilesSelected}
        />
        <Button
          type="button"
          variant="outline"
          disabled={remainingSlots <= 0 || uploadImageMutation.isPending}
          onClick={() => fileInputRef.current?.click()}
        >
          <ImageIcon className="h-4 w-4 mr-1.5" />
          {t("chooseFile")}
        </Button>
        <span className="text-sm text-muted-foreground">{chosenLabel}</span>
        <span className="text-xs text-muted-foreground/70 hidden sm:inline ml-auto">
          (Ctrl+V yoki rasmni sudrab tashlang)
        </span>
      </div>
      {displayedImages.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {displayedImages.map((image, index) => (
            <div key={`${image}-${index}`} className="relative">
              {index < value.length && (
                <button
                  type="button"
                  className="absolute top-0 right-0 translate-x-[25%] -translate-y-[25%] z-10"
                  onClick={() => handleRemove(index)}
                  aria-label={t("delete")}
                >
                  <X className="h-7 w-7 bg-red-500 rounded-full cursor-pointer hover:bg-red-600 aspect-square p-1 font-bold text-white" />
                </button>
              )}
              <ImageLightbox
                src={image}
                alt={t("picture")}
                className="h-[120px] w-[120px] rounded border border-border bg-muted/40 object-cover"
              />
            </div>
          ))}
          {remainingSlots > 0 && (
            <button
              type="button"
              disabled={uploadImageMutation.isPending}
              onClick={() => fileInputRef.current?.click()}
              className="h-[120px] w-[120px] rounded border-2 border-dashed border-border bg-muted/40 flex items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Add more images"
            >
              <Plus className="h-8 w-8" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
