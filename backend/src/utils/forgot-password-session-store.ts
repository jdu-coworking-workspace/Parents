import { promises as fs } from 'fs';
import path from 'path';

export type ForgotPasswordSession = {
    token: string;
    expiresAt: number;
    verificationCode?: string;
};

const STORE_DIR = path.join(process.cwd(), '.data');
const STORE_FILE = path.join(STORE_DIR, 'forgot-password-sessions.json');

type SessionRecord = Record<string, ForgotPasswordSession>;

async function ensureStoreFile(): Promise<void> {
    await fs.mkdir(STORE_DIR, { recursive: true });
    try {
        await fs.access(STORE_FILE);
    } catch {
        await fs.writeFile(STORE_FILE, '{}', 'utf8');
    }
}

async function readAll(): Promise<SessionRecord> {
    await ensureStoreFile();
    try {
        const raw = await fs.readFile(STORE_FILE, 'utf8');
        const parsed = JSON.parse(raw) as SessionRecord;
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
        return {};
    }
}

async function writeAll(sessions: SessionRecord): Promise<void> {
    await ensureStoreFile();
    await fs.writeFile(STORE_FILE, JSON.stringify(sessions), 'utf8');
}

function isExpired(session: ForgotPasswordSession, now = Date.now()): boolean {
    return !session?.expiresAt || session.expiresAt <= now;
}

export async function getForgotPasswordSession(
    identifier: string
): Promise<ForgotPasswordSession | null> {
    const sessions = await readAll();
    const session = sessions[identifier];

    if (!session) {
        return null;
    }

    if (isExpired(session)) {
        delete sessions[identifier];
        await writeAll(sessions);
        return null;
    }

    return session;
}

export async function setForgotPasswordSession(
    identifier: string,
    session: ForgotPasswordSession
): Promise<void> {
    const sessions = await readAll();

    for (const [key, value] of Object.entries(sessions)) {
        if (isExpired(value)) {
            delete sessions[key];
        }
    }

    sessions[identifier] = session;
    await writeAll(sessions);
}

export async function deleteForgotPasswordSession(
    identifier: string
): Promise<void> {
    const sessions = await readAll();
    if (!(identifier in sessions)) {
        return;
    }
    delete sessions[identifier];
    await writeAll(sessions);
}
