/**
 * Convert message HTML (from the admin panel editor) into plain text.
 * Images are dropped, block-level tags become line breaks.
 */
export function htmlToPlainText(html: string | null | undefined): string {
  if (!html) return '';

  return html
    .replace(/<img\b[^>]*>/gi, '') // Remove img tags
    .replace(/<br\s*\/?>/gi, '\n') // Convert <br> to newline
    .replace(/<\/(?:p|div|li|h[1-6])>/gi, '\n') // Block-level closing tags to newline
    .replace(/<[^>]+>/g, '') // Remove all remaining HTML tags
    .replace(/&nbsp;/g, ' ') // Decode common entities
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n') // Collapse excessive newlines
    .trim();
}

/**
 * Single-line preview of a message, used where space is tight (e.g. widget).
 */
export function toPreviewText(html: string | null | undefined): string {
  return htmlToPlainText(html).replace(/\s+/g, ' ').trim();
}
