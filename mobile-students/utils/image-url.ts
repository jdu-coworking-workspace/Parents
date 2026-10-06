const S3_BASE_URL = process.env.EXPO_PUBLIC_S3_BASE_URL ?? '';

export function getMessageImageUrl(filename: string): string {
  if (!filename) {
    return '';
  }

  const trimmed = filename.trim();

  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:')
  ) {
    return trimmed;
  }

  if (!S3_BASE_URL) {
    return trimmed;
  }

  const base = S3_BASE_URL.replace(/\/$/, '');
  let normalized = trimmed.replace(/^\//, '');

  if (base.endsWith('/images') && normalized.startsWith('images/')) {
    normalized = normalized.slice('images/'.length);
  }

  return `${base}/${normalized}`;
}

export function getMessageImageUrls(
  images: string | string[] | null | undefined
): string[] {
  if (!images) {
    return [];
  }

  let filenames: string[] = [];

  if (Array.isArray(images)) {
    filenames = images;
  } else if (typeof images === 'string') {
    const trimmed = images.trim();
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          filenames = parsed;
        }
      } catch {
        filenames = [trimmed];
      }
    } else if (trimmed.includes(',')) {
      filenames = trimmed.split(',').map(s => s.trim());
    } else {
      filenames = [trimmed];
    }
  }

  return filenames
    .filter((filename): filename is string => typeof filename === 'string' && filename.trim().length > 0)
    .map(filename => getMessageImageUrl(filename.trim()));
}
