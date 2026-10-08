/**
 * AI Assistant chat history — saved to the user's account.
 *
 * OWNERSHIP
 * A conversation belongs to exactly one user. Every read, write and delete
 * below filters on BOTH the signed-in user's id and their school id, taken
 * from the verified session by the controller. Nobody else can list, open,
 * rename or delete it — not an admin, not a teacher, not another branch — and
 * a conversation that is not yours is reported as "not found" so its
 * existence is not revealed. Row-level security additionally keeps every row
 * inside its own school and branch.
 *
 * COST
 * Only the most recent MODEL_WINDOW messages are sent to the model on each
 * turn, so a long conversation does not grow the prompt without limit. The
 * stored transcript is capped at MAX_STORED_MESSAGES.
 */
import prisma from '../config/database';
import { AIGateway } from './aiGateway.service';
import { withOliskeyKnowledge } from './aiKnowledge.service';
import { buildPersonalContext, PersonalContextUser } from './aiPersonalContext.service';
import { moderateStudentText, isStudentRole } from './aiModeration.service';

export const MODEL_WINDOW = 12;
export const MAX_STORED_MESSAGES = 200;
export const MAX_CONVERSATIONS_PER_USER = 100;
export const MAX_MESSAGE_CHARS = 4000;
const MAX_IMAGE_CHARS = 6_000_000; // ~4.5 MB image as a data URL
const LIST_LIMIT = 50;

export type StoredMessage = { role: 'user' | 'assistant'; content: string; at: string; image?: boolean };
export type ChatMode = 'standard' | 'steps' | 'research' | 'places';

export type ConversationOwner = PersonalContextUser & { id: string; school_id: string };

const httpError = (status: number, message: string) => Object.assign(new Error(message), { status });

const MODE_INSTRUCTIONS: Record<Exclude<ChatMode, 'standard'>, string> = {
    steps: 'Step-by-step mode: reason carefully and show the working as short numbered steps before the final answer, like a good teacher on a whiteboard.',
    research: 'Research mode: answer like a research assistant. You have NO live internet access, so say plainly when a fact could be out of date (prices, officials, recent events) and end with 2-3 reliable places to check (official websites, WAEC/NECO resources, textbooks).',
    places: 'Places mode: answer geography and location questions descriptively (landmarks, distances, regions, travel context, Nigeria-aware). You cannot see live maps, so for directions or current travel times suggest a maps app and focus on teaching the geography.',
};

/** A conversation title from the first question: one line, at most 60 chars. */
export function titleFrom(text: string): string {
    const t = String(text || '').replace(/\s+/g, ' ').trim();
    if (!t) return 'New chat';
    return t.length > 60 ? `${t.slice(0, 57).trimEnd()}…` : t;
}

function asMessages(value: unknown): StoredMessage[] {
    return Array.isArray(value) ? (value as StoredMessage[]).filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string') : [];
}

/** The one ownership filter every query uses. */
const ownWhere = (owner: ConversationOwner, id?: string) => ({
    ...(id ? { id } : {}),
    user_id: owner.id,
    school_id: owner.school_id,
});

export class AiConversationService {
    static async list(owner: ConversationOwner) {
        const rows = await prisma.aiConversation.findMany({
            where: ownWhere(owner),
            select: { id: true, title: true, created_at: true, updated_at: true, messages: true },
            orderBy: { updated_at: 'desc' },
            take: LIST_LIMIT,
        });
        return rows.map(r => {
            const msgs = asMessages(r.messages);
            const last = msgs[msgs.length - 1];
            return {
                id: r.id, title: r.title, created_at: r.created_at, updated_at: r.updated_at,
                message_count: msgs.length,
                preview: last ? last.content.replace(/[#*_`>|]/g, '').replace(/\s+/g, ' ').trim().slice(0, 90) : '',
            };
        });
    }

    static async get(owner: ConversationOwner, id: string) {
        const row = await prisma.aiConversation.findFirst({
            where: ownWhere(owner, id),
            select: { id: true, title: true, created_at: true, updated_at: true, messages: true },
        });
        if (!row) throw httpError(404, 'Conversation not found');
        return { ...row, messages: asMessages(row.messages) };
    }

    static async rename(owner: ConversationOwner, id: string, title: string) {
        const clean = titleFrom(title);
        const { count } = await prisma.aiConversation.updateMany({ where: ownWhere(owner, id), data: { title: clean } });
        if (count === 0) throw httpError(404, 'Conversation not found');
        return { id, title: clean };
    }

    static async remove(owner: ConversationOwner, id: string) {
        const { count } = await prisma.aiConversation.deleteMany({ where: ownWhere(owner, id) });
        if (count === 0) throw httpError(404, 'Conversation not found');
        return { id, deleted: true };
    }

    /**
     * Send one message. Creates the conversation when `conversationId` is
     * absent, saves the question, asks the model with the last MODEL_WINDOW
     * messages plus the Oliskey knowledge and the user's own records, then
     * saves and returns the reply.
     */
    static async send(owner: ConversationOwner, input: { conversationId?: string | null; text?: string; image?: string | null; mode?: string | null; page?: string | null }) {
        const text = String(input.text ?? '').trim();
        const image = typeof input.image === 'string' && input.image.startsWith('data:image/') ? input.image : null;
        if (!text && !image) throw httpError(400, 'Type a message first.');
        if (text.length > MAX_MESSAGE_CHARS) throw httpError(400, `Messages can be up to ${MAX_MESSAGE_CHARS} characters.`);
        if (image && image.length > MAX_IMAGE_CHARS) throw httpError(400, 'That image is too large. Please use a smaller photo.');
        const mode: ChatMode = (['steps', 'research', 'places'] as const).includes(input.mode as any) ? input.mode as ChatMode : 'standard';

        // Load (and so authorise) an existing conversation, or start a new one.
        let conversation: { id: string; title: string; messages: StoredMessage[] };
        if (input.conversationId) {
            const existing = await this.get(owner, input.conversationId);
            conversation = { id: existing.id, title: existing.title, messages: existing.messages };
        } else {
            const created = await prisma.aiConversation.create({
                data: {
                    school_id: owner.school_id,
                    branch_id: owner.branch_id || null,
                    user_id: owner.id,
                    title: titleFrom(text || 'Photo question'),
                    messages: [],
                },
                select: { id: true, title: true },
            });
            conversation = { id: created.id, title: created.title, messages: [] };
            await this.prune(owner);
        }

        const now = new Date().toISOString();
        const userMsg: StoredMessage = { role: 'user', content: text || 'What can you tell me about this photo?', at: now, ...(image ? { image: true } : {}) };
        const history = [...conversation.messages, userMsg];

        // Model input: the newest MODEL_WINDOW turns. The image travels with
        // this turn only; it is not stored (history keeps a marker instead).
        const window = history.slice(-MODEL_WINDOW).map((m, i, arr) => {
            const isNewest = i === arr.length - 1;
            if (isNewest && image) {
                return { role: 'user', content: [{ type: 'text', text: userMsg.content }, { type: 'image_url', image_url: { url: image } }] };
            }
            return { role: m.role, content: m.image && !isNewest ? `${m.content}\n[The user attached a photo to this message.]` : m.content };
        });
        // Providers require the first non-system turn to be the user's.
        while (window.length > 1 && window[0].role === 'assistant') window.shift();

        const personalContext = await buildPersonalContext(owner);
        const extraSystem = mode !== 'standard' ? [{ role: 'system', content: MODE_INSTRUCTIONS[mode] }] : [];
        const body = withOliskeyKnowledge({
            messages: [...extraSystem, ...window],
            // The default model "thinks" before answering and that hidden pass is
            // billed against max_tokens (long answers came back empty). Answer
            // directly; Step-by-step is the one mode that keeps reasoning on.
            ...(mode === 'steps' ? { model: 'deepseek-ai/deepseek-v4-flash' } : { thinking: false }),
            max_tokens: 1400,
        } as any, {
            role: owner.role,
            userId: owner.id,
            schoolId: owner.school_id,
            branchId: owner.active_branch_id || owner.branch_id,
            page: input.page ? String(input.page).slice(0, 120) : 'AI Assistant',
            module: 'AI Assistant chat',
            personalContext,
        });

        // Students: a message about self-harm, abuse or explicit content gets a
        // kind, fixed reply pointing to a trusted adult; the model is not asked.
        const moderation = isStudentRole(owner.role) ? moderateStudentText(text) : { flagged: false as const };
        let result: { text: string; provider: string };
        try {
            result = moderation.flagged
                ? { text: moderation.reply, provider: 'safety' }
                : await AIGateway.chat(body, owner.id);
        } catch (err) {
            // Nothing was answered: don't leave an empty conversation behind.
            // The client keeps the typed message so the user can retry.
            if (!input.conversationId) {
                await prisma.aiConversation.deleteMany({ where: ownWhere(owner, conversation.id) }).catch(() => {});
            }
            throw err;
        }
        const replyText = (result.text || '').trim() || "Sorry, I couldn't put an answer together. Please try asking another way.";
        const reply: StoredMessage = { role: 'assistant', content: replyText, at: new Date().toISOString() };

        const stored = [...history, reply].slice(-MAX_STORED_MESSAGES);
        const title = conversation.messages.length === 0 ? titleFrom(text || 'Photo question') : conversation.title;
        const { count } = await prisma.aiConversation.updateMany({
            where: ownWhere(owner, conversation.id),
            data: { messages: stored as any, title },
        });
        if (count === 0) throw httpError(404, 'Conversation not found'); // deleted mid-request

        return {
            conversation: { id: conversation.id, title, updated_at: new Date().toISOString(), message_count: stored.length },
            message: userMsg,
            reply,
            provider: result.provider,
        };
    }

    /** Keep at most MAX_CONVERSATIONS_PER_USER; the oldest are removed. */
    private static async prune(owner: ConversationOwner) {
        const extra = await prisma.aiConversation.findMany({
            where: ownWhere(owner),
            select: { id: true },
            orderBy: { updated_at: 'desc' },
            skip: MAX_CONVERSATIONS_PER_USER,
        });
        if (extra.length) {
            await prisma.aiConversation.deleteMany({ where: { ...ownWhere(owner), id: { in: extra.map(e => e.id) } } });
        }
    }
}
