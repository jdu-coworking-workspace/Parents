"use client";

import ImageLightbox from "@/components/ImageLightbox";

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
    <div className="my-2 flex flex-wrap gap-2.5">
      {images.map((image, index) => (
        <ImageLightbox
          key={`${image}-${index}`}
          src={image}
          alt={alt}
          className="h-[110px] w-[180px] rounded-lg border border-border bg-muted/30 object-cover shadow-sm transition-transform hover:scale-[1.02]"
        />
      ))}
    </div>
  );
}
