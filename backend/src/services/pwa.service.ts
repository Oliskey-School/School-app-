import prisma from '../config/database';

/**
 * PWA install-prompt analytics + cross-device dismissal state.
 * Records each interaction a user has with the "Install School App" prompt and
 * exposes a per-user status so the prompt can be hidden across all of a user's
 * devices once they install or dismiss it.
 */

export type PwaAction =
    | 'shown'
    | 'install_clicked'
    | 'installed'
    | 'dismissed'
    | 'instructions_shown'
    | 'prompt_declined';

const VALID_ACTIONS: PwaAction[] = [
    'shown',
    'install_clicked',
    'installed',
    'dismissed',
    'instructions_shown',
    'prompt_declined',
];

// "Not Now" hides the prompt for 24h — matches the frontend localStorage window.
const DISMISS_WINDOW_MS = 24 * 60 * 60 * 1000;

interface RecordEventInput {
    user_id: string;
    school_id?: string | null;
    branch_id?: string | null;
    action: string;
    platform?: string | null;
    user_agent?: string | null;
}

export async function recordEvent(input: RecordEventInput): Promise<void> {
    if (!input.user_id) {
        throw Object.assign(new Error('user_id is required'), { status: 400 });
    }
    if (!VALID_ACTIONS.includes(input.action as PwaAction)) {
        throw Object.assign(new Error(`Invalid action: ${input.action}`), { status: 400 });
    }

    await prisma.pwaInstallEvent.create({
        data: {
            user_id: input.user_id,
            school_id: input.school_id ?? null,
            branch_id: input.branch_id ?? null,
            action: input.action,
            platform: input.platform ?? null,
            user_agent: input.user_agent ? input.user_agent.slice(0, 400) : null,
        },
    });
}

export interface PwaStatus {
    installed: boolean;
    dismissed: boolean;
    dismissedUntil: string | null;
}

export async function getStatus(userId: string): Promise<PwaStatus> {
    if (!userId) return { installed: false, dismissed: false, dismissedUntil: null };

    const [installedEvent, lastDismiss] = await Promise.all([
        prisma.pwaInstallEvent.findFirst({
            where: { user_id: userId, action: 'installed' },
            select: { id: true },
        }),
        prisma.pwaInstallEvent.findFirst({
            where: { user_id: userId, action: 'dismissed' },
            orderBy: { created_at: 'desc' },
            select: { created_at: true },
        }),
    ]);

    const dismissedUntil = lastDismiss
        ? new Date(lastDismiss.created_at.getTime() + DISMISS_WINDOW_MS)
        : null;
    const dismissed = dismissedUntil ? dismissedUntil.getTime() > Date.now() : false;

    return {
        installed: !!installedEvent,
        dismissed,
        dismissedUntil: dismissedUntil ? dismissedUntil.toISOString() : null,
    };
}
