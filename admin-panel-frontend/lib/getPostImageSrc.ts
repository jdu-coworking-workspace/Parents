export function getPostImageSrc(
  imagePreview?: string,
  imagePath?: string
): string {
  if (imagePreview) return imagePreview;
  if (!imagePath) return "";
  if (imagePath.startsWith("data:") || imagePath.startsWith("http")) {
    return imagePath;
  }
  const base = process.env.NEXT_PUBLIC_IMAGES_URL ?? "";
  const path = imagePath.startsWith("/") ? imagePath : `/${imagePath}`;
  return `${base}${path}`;
}
