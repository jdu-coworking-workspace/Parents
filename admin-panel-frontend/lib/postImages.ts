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

export function compressAndReadFileAsDataUrl(
  file: File,
  maxDimension = 1920,
  quality = 0.82
): Promise<string> {
  if (
    typeof window === "undefined" ||
    !file.type.startsWith("image/") ||
    file.type === "image/svg+xml" ||
    file.type === "image/gif"
  ) {
    return readFileAsDataUrl(file);
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target?.result;
      if (typeof src !== "string") {
        return reject(new Error("invalid_image_format"));
      }

      const img = new window.Image();
      img.onload = () => {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          return resolve(src);
        }

        ctx.drawImage(img, 0, 0, width, height);

        try {
          const webpData = canvas.toDataURL("image/webp", quality);
          if (webpData.startsWith("data:image/webp")) {
            return resolve(webpData);
          }
        } catch {
          // Fallback to jpeg
        }

        const jpegData = canvas.toDataURL("image/jpeg", quality);
        resolve(jpegData);
      };
      img.onerror = () => resolve(src);
      img.src = src;
    };
    reader.onerror = () => reject(reader.error ?? new Error("read_failed"));
    reader.readAsDataURL(file);
  });
}
