export const MAX_POST_IMAGES = 10;
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export function getPostImageSrc(image?: string | null): string {
  if (!image) return "";
  if (
    image.startsWith("data:") ||
    image.startsWith("blob:") ||
    image.startsWith("http://") ||
    image.startsWith("https://")
  ) {
    return image;
  }
  const base = process.env.NEXT_PUBLIC_IMAGES_URL ?? "";
  const path = image.startsWith("/") ? image : `/${image}`;
  return `${base}${path}`;
}

export function normalizePostImages(
  image?: string | null,
  images?: string[] | null
): string[] {
  if (Array.isArray(images) && images.length > 0) {
    return images.filter(
      (item): item is string => typeof item === "string" && item.length > 0
    );
  }
  return image ? [image] : [];
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }
      reject(new Error("invalid_image_format"));
    };
    reader.onerror = () => reject(reader.error ?? new Error("read_failed"));
    reader.readAsDataURL(file);
  });
}
