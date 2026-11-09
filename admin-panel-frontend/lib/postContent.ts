function hasImageTag(value: string): boolean {
  const lower = value.toLowerCase();
  let from = 0;
  while (from < lower.length) {
    const start = lower.indexOf("<img", from);
    if (start === -1) return false;
    const boundary = lower.charAt(start + 4);
    if (
      boundary === "" ||
      boundary === " " ||
      boundary === "\n" ||
      boundary === "\t" ||
      boundary === "\r" ||
      boundary === "/" ||
      boundary === ">"
    ) {
      return true;
    }
    from = start + 4;
  }
  return false;
}

function textOutsideTags(value: string): string {
  let result = "";
  let inTag = false;
  for (const char of value) {
    if (char === "<") {
      inTag = true;
      continue;
    }
    if (char === ">") {
      inTag = false;
      result += " ";
      continue;
    }
    if (!inTag) result += char;
  }
  return result;
}

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function hasVisibleHtml(value?: string | null): boolean {
  if (!value) return false;
  if (hasImageTag(value)) return true;
  const text = textOutsideTags(value)
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > 0;
}

export function plainPollText(value: string): string {
  return collapseWhitespace(value.replace(/[<>]/g, ""));
}
