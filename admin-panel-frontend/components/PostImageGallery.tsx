"use client";

import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type PostImageGalleryProps = {
  images: string[];
  alt?: string;
};

export default function PostImageGallery({
  images,
  alt = "",
}: PostImageGalleryProps) {
  if (!images.length) return null;

  return (
    <div className="my-2 flex flex-wrap gap-2">
      {images.map((image, index) => {
        const src = image.startsWith("/") ? image : `/${image}`;

        return (
          <Dialog key={`${image}-${index}`}>
            <DialogTrigger asChild>
              <button type="button" className="p-0 border-0 bg-transparent">
                <Image
                  src={src}
                  alt={alt}
                  width={200}
                  height={100}
                  className="rounded object-cover"
                />
              </button>
            </DialogTrigger>
            <DialogContent>
              <DialogTitle className="whitespace-pre-wrap text-center">
                {alt}
              </DialogTitle>
              <DialogDescription className="flex flex-col justify-center items-center">
                <Image
                  src={src}
                  alt={alt}
                  width={800}
                  height={400}
                  className="rounded object-contain"
                />
              </DialogDescription>
            </DialogContent>
          </Dialog>
        );
      })}
    </div>
  );
}
