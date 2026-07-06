const S3_BASE_URL = process.env.EXPO_PUBLIC_S3_BASE_URL ?? '';

export function getMessageImageUrl(filename: string): string {
  if (!filename) {
    return '';
  }

  if (filename.startsWith('http://') || filename.startsWith('https://')) {
    return filename;
  }

  if (!S3_BASE_URL) {
    return filename;
  }

  const base = S3_BASE_URL.replace(/\/$/, '');
  return `${base}/${filename}`;
}

export function getMessageImageUrls(
  images: string | string[] | null | undefined
): string[] {
  if (!images) {
    return [];
  }

  const filenames = Array.isArray(images) ? images : [images];
  return filenames.filter(Boolean).map(filename => getMessageImageUrl(filename));
}
