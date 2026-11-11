/**
 * Convert message HTML (from the admin panel editor) into plain text.
 * Images are dropped, block-level tags become line breaks.
 */
export function htmlToPlainText(html: string | null | undefined): string {
  if (!html) return '';

  const text = stripTags(
    html
      .replace(/<img\b[^>]*>/gi, '') // Remove img tags
      .replace(/<br\s*\/?>/gi, '\n') // Convert <br> to newline
      .replace(/<\/(?:p|div|li|h[1-6])>/gi, '\n'), // Block-level closing tags to newline
  );

  return decodeEntities(text)
    .replace(/\n{3,}/g, '\n\n') // Collapse excessive newlines
    .trim();
}

// Repeat until stable so removing one tag can never expose a new one
function stripTags(html: string): string {
  let previous: string;
  let current = html;
  do {
    previous = current;
    current = current.replace(/<[^>]*>/g, '');
  } while (current !== previous);
  return current;
}

const ENTITIES: Record<string, string> = {
  '&nbsp;': ' ',
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
};

// Single pass, so "&amp;lt;" becomes "&lt;" and is not decoded twice
function decodeEntities(text: string): string {
  return text.replace(/&(?:nbsp|amp|lt|gt|quot|#39);/g, (entity) => ENTITIES[entity]);
}
