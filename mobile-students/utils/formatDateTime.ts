function parseApiDateTime(value: string): Date | null {
  if (value.includes('T')) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})(?: (\d{2}):(\d{2}))?$/);
  if (!match) {
    return null;
  }

  const [, year, month, day, hour = '0', minute = '0'] = match;
  const date = new Date(
    Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute)
    )
  );

  return Number.isNaN(date.getTime()) ? null : date;
}

/** Backend UTC datetime → local display (matches mobile-frontend). */
export function formatMessageDateTime(
  value: string | null | undefined
): string {
  if (!value) {
    return '';
  }

  const parsed = parseApiDateTime(value);
  if (!parsed) {
    return value;
  }

  const day = String(parsed.getDate()).padStart(2, '0');
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const year = parsed.getFullYear();
  const hours = String(parsed.getHours()).padStart(2, '0');
  const minutes = String(parsed.getMinutes()).padStart(2, '0');

  return `${day}.${month}.${year}   ${hours}:${minutes}`;
}
