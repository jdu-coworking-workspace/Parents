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
    <div className="my-2 flex flex-wrap gap-2">
      {images.map((image, index) => (
        <ImageLightbox
          key={`${image}-${index}`}
          src={image}
          alt={alt}
          className="h-[100px] w-[200px] rounded object-cover"
        />
      ))}
    </div>
  );
}
