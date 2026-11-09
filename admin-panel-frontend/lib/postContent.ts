export function hasVisibleHtml(value?: string | null): boolean {
  if (!value) return false;
  if (/<img\b/i.test(value)) return true;
  const text = value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > 0;
}

export function plainPollText(value: string): string {
  return value.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}
