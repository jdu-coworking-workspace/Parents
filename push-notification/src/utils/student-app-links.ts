import { ENVIRONMENT } from '../config/environment';

const normalizeScheme = (scheme: string): string =>
    scheme.replace(/:\/\/+$/, '');

export const getStudentAppScheme = (): string =>
    normalizeScheme(ENVIRONMENT.STUDENT_APP_SCHEME);

export const buildStudentNotificationMessageUrl = (
    studentId: string | number,
    messageId: string | number
): string =>
    `${getStudentAppScheme()}://student/${studentId}/message/${messageId}`;
