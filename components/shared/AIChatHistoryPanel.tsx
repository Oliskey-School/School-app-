import React, { useState } from 'react';
import { Plus, Trash2, MessageSquare, RotateCw, Pencil } from 'lucide-react';
import type { AiConversationSummary } from '../../lib/api';

/** "Just now", "5 min ago", "Yesterday", "3 Oct". */
export function relativeTime(iso: string, now = Date.now()): string {
    const t = new Date(iso).getTime();
    if (Number.isNaN(t)) return '';
    const mins = Math.round((now - t) / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins} min ago`;
    const hours = Math.round(mins / 60);
    if (hours < 24) return `${hours} h ago`;
    if (hours < 48) return 'Yesterday';
    return new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

interface Props {
    conversations: AiConversationSummary[];
    activeId: string | null;
    status: 'loading' | 'ready' | 'error';
    activeClass: string;          // theme.activeNav — the app's own selected style
    onSelect: (id: string) => void;
    onNew: () => void;
    onDelete: (id: string) => Promise<void> | void;
    onRename: (id: string, title: string) => Promise<void> | void;
    onRetry: () => void;
}

/**
 * The saved-chats list. Used as a side panel on large screens and inside a
 * drawer on phones and tablets (the parent decides where it sits).
 */
const AIChatHistoryPanel: React.FC<Props> = ({ conversations, activeId, status, activeClass, onSelect, onNew, onDelete, onRename, onRetry }) => {
    const [confirmId, setConfirmId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [editId, setEditId] = useState<string | null>(null);
    const [draft, setDraft] = useState('');
    const [savingId, setSavingId] = useState<string | null>(null);

    const startRename = (c: AiConversationSummary) => { setConfirmId(null); setEditId(c.id); setDraft(c.title); };
    const saveRename = async (c: AiConversationSummary) => {
        const title = draft.replace(/\s+/g, ' ').trim();
        if (!title || title === c.title) { setEditId(null); return; }
        setSavingId(c.id);
        try { await onRename(c.id, title); setEditId(null); } finally { setSavingId(null); }
    };

    const confirmDelete = async (id: string) => {
        setDeletingId(id);
        try { await onDelete(id); } finally { setDeletingId(null); setConfirmId(null); }
    };

    return (
        <div className="flex flex-col h-full min-h-0">
            <div className="flex items-center justify-between gap-2 px-4 pt-4 pb-3">
                <h2 className="text-sm font-semibold text-gray-900">Your chats</h2>
                <button
                    type="button"
                    onClick={onNew}
                    className="inline-flex items-center gap-1.5 min-h-11 px-3 rounded-xl text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition-colors"
                >
                    <Plus className="w-4 h-4" aria-hidden="true" /> New chat
                </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto px-2 pb-4" aria-busy={status === 'loading'}>
                {status === 'loading' && (
                    <ul className="space-y-1 px-2" aria-label="Loading chats">
                        {[0, 1, 2].map(i => (
                            <li key={i} className="h-14 rounded-xl bg-gray-100 animate-pulse motion-reduce:animate-none" />
                        ))}
                    </ul>
                )}

                {status === 'error' && (
                    <div className="px-3 py-6 text-center">
                        <p className="text-sm text-gray-600">Your saved chats couldn't be loaded.</p>
                        <button type="button" onClick={onRetry} className="mt-3 inline-flex items-center gap-1.5 min-h-11 px-4 rounded-xl text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                            <RotateCw className="w-4 h-4" aria-hidden="true" /> Try again
                        </button>
                    </div>
                )}

                {status === 'ready' && conversations.length === 0 && (
                    <div className="px-3 py-6 text-center">
                        <MessageSquare className="w-6 h-6 mx-auto text-gray-300" aria-hidden="true" />
                        <p className="mt-2 text-sm font-medium text-gray-700">No saved chats yet</p>
                        <p className="mt-1 text-sm text-gray-500">Your conversations are saved here automatically, only for you.</p>
                    </div>
                )}

                {status === 'ready' && conversations.length > 0 && (
                    <ul className="space-y-0.5" aria-label="Saved chats">
                        {conversations.map(c => {
                            const active = c.id === activeId;
                            const confirming = confirmId === c.id;
                            return (
                                <li key={c.id} className={`group relative flex items-stretch rounded-xl ${active ? activeClass : 'hover:bg-gray-50'}`}>
                                    {editId === c.id ? (
                                        <form
                                            className="flex flex-1 items-center gap-1 px-2 py-1.5"
                                            onSubmit={e => { e.preventDefault(); saveRename(c); }}
                                        >
                                            <label htmlFor={`rename-${c.id}`} className="sr-only">Chat name</label>
                                            <input
                                                id={`rename-${c.id}`}
                                                autoFocus
                                                value={draft}
                                                maxLength={60}
                                                onChange={e => setDraft(e.target.value)}
                                                onKeyDown={e => { if (e.key === 'Escape') { e.preventDefault(); setEditId(null); } }}
                                                className="flex-1 min-w-0 h-11 rounded-lg bg-white border border-gray-200 px-3 text-base sm:text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                            <button type="button" onClick={() => setEditId(null)} className="min-h-11 px-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">Cancel</button>
                                            <button type="submit" disabled={savingId === c.id || !draft.trim()} className="min-h-11 px-3 rounded-lg text-sm font-semibold text-gray-900 bg-gray-100 hover:bg-gray-200 disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                                                {savingId === c.id ? 'Saving…' : 'Save'}
                                            </button>
                                        </form>
                                    ) : confirming ? (
                                        <div className="flex flex-1 items-center justify-between gap-2 px-3 py-2">
                                            <span className="text-sm text-gray-800 truncate">Delete this chat?</span>
                                            <div className="flex items-center gap-1 flex-shrink-0">
                                                <button type="button" onClick={() => setConfirmId(null)} className="min-h-11 px-3 rounded-lg text-sm text-gray-700 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">Cancel</button>
                                                <button
                                                    type="button"
                                                    onClick={() => confirmDelete(c.id)}
                                                    disabled={deletingId === c.id}
                                                    className="min-h-11 px-3 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                                                >
                                                    {deletingId === c.id ? 'Deleting…' : 'Delete'}
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <button
                                                type="button"
                                                onClick={() => onSelect(c.id)}
                                                aria-current={active ? 'true' : undefined}
                                                className="flex-1 min-w-0 text-left px-3 py-2.5 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                                            >
                                                <span className="block text-sm font-medium text-gray-900 truncate">{c.title}</span>
                                                <span className="block text-xs text-gray-500 truncate mt-0.5">
                                                    {relativeTime(c.updated_at)}{c.preview ? ` · ${c.preview}` : ''}
                                                </span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => startRename(c)}
                                                aria-label={`Rename chat: ${c.title}`}
                                                className="flex-shrink-0 w-11 flex items-center justify-center rounded-xl text-gray-400 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                                            >
                                                <Pencil className="w-4 h-4" aria-hidden="true" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setConfirmId(c.id)}
                                                aria-label={`Delete chat: ${c.title}`}
                                                className="flex-shrink-0 w-11 flex items-center justify-center rounded-xl text-gray-400 hover:text-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                                            >
                                                <Trash2 className="w-4 h-4" aria-hidden="true" />
                                            </button>
                                        </>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </div>
    );
};

export default AIChatHistoryPanel;
