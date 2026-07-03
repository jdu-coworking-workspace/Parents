import { DateTime } from 'luxon';

/**
 * Backend UTC datetime → local display.
 * Same logic as mobile-frontend components/card.tsx.
 */
export function formatMessageDateTime(
  value: string | null | undefined
): string {
  if (!value) {
    return '';
  }

  const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Handle both ISO format (2025-08-30T10:30:00Z) and database format (2025-08-30 10:30)
  let utcDateTime: DateTime;
  if (value.includes('T')) {
    utcDateTime = DateTime.fromISO(value, { zone: 'utc' });
  } else {
    utcDateTime = DateTime.fromFormat(value, 'yyyy-MM-dd HH:mm', {
      zone: 'utc',
    });
  }

  if (!utcDateTime.isValid) {
    return value;
  }

  return utcDateTime.setZone(userTimeZone).toFormat('dd.MM.yyyy   HH:mm');
}
