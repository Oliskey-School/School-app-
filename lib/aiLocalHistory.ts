/**
 * AI Assistant history for DEMO sessions, kept on this device only.
 *
 * Demo accounts are shared by every visitor, so their chats must never be
 * saved to the (shared) account; the server refuses to store them anyway.
 * Conversations live in localStorage, keyed per demo user and role, and every
 * access is guarded so the assistant still works when storage is unavailable.
 */
import type { AiConversationDetail, AiConversationSummary, AiStoredMessage } from './api';

const MAX_CONVERSATIONS = 30;
const MAX_MESSAGES = 100;

export const localHistoryKey = (userId: string, role: string) => `oliskey_ai_demo_chats:${userId || 'demo'}:${role || 'user'}`;

function readAll(key: string): AiConversationDetail[] {
    try {
        const raw = localStorage.getItem(key);
        const list = raw ? JSON.parse(raw) : [];
        return Array.isArray(list) ? list : [];
    } catch {
        return [];
    }
}

function writeAll(key: string, list: AiConversationDetail[]) {
    try { localStorage.setItem(key, JSON.stringify(list.slice(0, MAX_CONVERSATIONS))); } catch { /* storage full or blocked */ }
}

const previewOf = (msgs: AiStoredMessage[]) => {
    const last = msgs[msgs.length - 1];
    return last ? last.content.replace(/[#*_`>|]/g, '').replace(/\s+/g, ' ').trim().slice(0, 90) : '';
};

export function listLocal(key: string): AiConversationSummary[] {
    return readAll(key)
        .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
        .map(c => ({ id: c.id, title: c.title, created_at: c.created_at, updated_at: c.updated_at, message_count: c.messages.length, preview: previewOf(c.messages) }));
}

export function getLocal(key: string, id: string): AiConversationDetail | null {
    return readAll(key).find(c => c.id === id) || null;
}

/** Create or update a conversation; returns its summary. */
export function saveLocal(key: string, conv: { id?: string | null; title: string; messages: AiStoredMessage[] }): AiConversationSummary {
    const now = new Date().toISOString();
    const all = readAll(key);
    const existing = conv.id ? all.find(c => c.id === conv.id) : undefined;
    // Images are not stored: keep a marker, as the server does for real users.
    const messages = conv.messages.slice(-MAX_MESSAGES).map(({ role, content, at, image }) => ({ role, content, at, ...(image ? { image: true } : {}) }));
    const next: AiConversationDetail = {
        id: existing?.id || conv.id || `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
        title: existing?.title || conv.title,
        created_at: existing?.created_at || now,
        updated_at: now,
        messages,
    };
    writeAll(key, [next, ...all.filter(c => c.id !== next.id)]);
    return { id: next.id, title: next.title, created_at: next.created_at, updated_at: now, message_count: messages.length, preview: previewOf(messages) };
}

/** Rename a device-only demo chat. Returns the saved title, or null if it no longer exists. */
export function renameChat(key: string, id: string, title: string): string | null {
    const clean = String(title || '').replace(/\s+/g, ' ').trim().slice(0, 60);
    if (!clean) return null;
    const all = readAll(key);
    const conv = all.find(c => c.id === id);
    if (!conv) return null;
    conv.title = clean;
    writeAll(key, all);
    return clean;
}

export function deleteLocal(key: string, id: string) {
    writeAll(key, readAll(key).filter(c => c.id !== id));
}
