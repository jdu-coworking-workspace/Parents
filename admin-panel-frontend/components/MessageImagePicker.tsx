"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import useApiMutation from "@/lib/useApiMutation";
import ImageLightbox from "@/components/ImageLightbox";
import {
  MAX_IMAGE_BYTES,
  MAX_POST_IMAGES,
  readFileAsDataUrl,
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

  const handleFilesSelected = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
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
      const dataUrls = await Promise.all(validFiles.map(readFileAsDataUrl));
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
    <div className="space-y-3">
      <div className="flex items-center gap-2">
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
          {t("chooseFile")}
        </Button>
        <span className="text-sm text-muted-foreground">{chosenLabel}</span>
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
