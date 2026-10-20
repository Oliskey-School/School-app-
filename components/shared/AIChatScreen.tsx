import React, { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { History, Plus, X, ImagePlus, Mic, Square, Send, Volume2, ChevronDown, RotateCw, Lock, Video } from 'lucide-react';
import { THEME_CONFIG, AIIcon, SearchIcon, MicrophoneIcon, SparklesIcon } from '../../constants';
import { DashboardType } from '../../types';
import { api, AiChatMode, AiConversationSummary, AiSendResult } from '../../lib/api';
import { isAIAllowedClient, AI_LOCKED_MESSAGE } from '../../lib/ai';
import { useAuth } from '../../context/AuthContext';
import Header from '../ui/Header';
import AskAIWidget from './AskAIWidget';
import LiveSession from './LiveSession';
import MediaGenerator from './MediaGenerator';
import AIMarkdown from './AIMarkdown';
import AIChatHistoryPanel from './AIChatHistoryPanel';
import { isDemoMode } from '../../lib/apiHelpers';
import { listLocal, getLocal, saveLocal, deleteLocal, localHistoryKey } from '../../lib/aiLocalHistory';

/** Same window the server uses for saved chats. */
const MODEL_WINDOW = 12;
const titleFromText = (t: string) => {
    const s = String(t || '').replace(/\s+/g, ' ').trim() || 'Photo question';
    return s.length > 60 ? `${s.slice(0, 57).trimEnd()}…` : s;
};

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    at: string;
    image?: boolean;
    imageUrl?: string;           // this session's preview only
}

interface AIChatScreenProps {
    onBack: () => void;
    dashboardType: DashboardType;
}

type Tab = 'chat' | 'school' | 'live' | 'create';
type PendingImage = { dataUrl: string; previewUrl: string } | null;

/** No answer within this time → stop waiting and offer Retry (never an endless spinner). */
export const SEND_TIMEOUT_MS = 75_000;

/** Starter questions, by role: own records first, then schoolwork, then the app. */
export function suggestedPrompts(role: DashboardType): string[] {
    switch (role) {
        case DashboardType.Student:
            return ["What's my attendance this term?", "What's on my timetable today?", 'Which assignments are due soon?', 'Help me understand photosynthesis', 'How do I submit an assignment in the app?'];
        case DashboardType.Parent:
            return ['How is my child doing?', 'Do I owe any school fees?', 'Is any homework still outstanding?', 'How can I help my child with maths at home?', 'How do I pay school fees in the app?'];
        case DashboardType.Teacher:
            return ['What classes do I teach today?', 'Which of my classes has the lowest attendance?', 'How much marking is pending?', 'Give me a 5-minute starter activity on fractions', 'How do I enter results?'];
        case DashboardType.Admin:
        case DashboardType.Proprietor:
            return ["Give me today's school snapshot", 'How much in fees is still outstanding?', 'How many leave requests are pending?', 'Draft a short notice about the mid-term break', 'How do I add a student?'];
        default:
            return ['What can you help me with?', 'How do I use Oliskey for my role?', 'Summarise good practice for school record keeping', 'Explain a topic simply for a student'];
    }
}

const MODES: Array<{ id: AiChatMode; label: string; hint: string }> = [
    { id: 'standard', label: 'Standard', hint: 'Clear, short answers.' },
    { id: 'steps', label: 'Step by step', hint: 'Shows the working, like a teacher on a whiteboard. A little slower.' },
    { id: 'research', label: 'Research', hint: 'Careful answers with places to check. No live internet: it flags facts that may be out of date.' },
    { id: 'places', label: 'Places', hint: 'Geography and locations, described. It cannot see live maps.' },
];

const PATTERN_STYLE: React.CSSProperties = {
    backgroundImage: "url('https://i.pinimg.com/736x/8c/98/99/8c98994518b575bfd8c949e91d20548b.jpg')",
    backgroundRepeat: 'repeat',
    backgroundSize: '400px',
};

const readAsDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Could not read that image.'));
    reader.readAsDataURL(file);
});

const prefersReducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        const t = setTimeout(() => reject(Object.assign(new Error('The assistant took too long to answer.'), { timeout: true })), ms);
        p.then(v => { clearTimeout(t); resolve(v); }, e => { clearTimeout(t); reject(e); });
    });
}

const AIChatScreen: React.FC<AIChatScreenProps> = ({ onBack, dashboardType }) => {
    const theme = THEME_CONFIG[dashboardType] || THEME_CONFIG[DashboardType.Admin];
    const { user, isDemo: authDemo } = useAuth() as any;
    // Demo accounts are shared by all visitors: their chats stay on this device.
    const isDemo = !!authDemo || isDemoMode();
    const localKey = localHistoryKey(String(user?.id || ''), String(dashboardType));
    const firstName = String(user?.full_name || user?.user_metadata?.full_name || '').trim().split(/\s+/)[0] || '';
    const [activeTab, setActiveTab] = useState<Tab>('chat');

    // History
    const [conversations, setConversations] = useState<AiConversationSummary[]>([]);
    const [historyStatus, setHistoryStatus] = useState<'loading' | 'ready' | 'error'>('loading');
    const [historyOpen, setHistoryOpen] = useState(false);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [activeTitle, setActiveTitle] = useState<string>('New chat');
    const [opening, setOpening] = useState(false);

    // Conversation
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputText, setInputText] = useState('');
    const [pendingImage, setPendingImage] = useState<PendingImage>(null);
    const [isSending, setIsSending] = useState(false);
    const [sendError, setSendError] = useState<{ message: string; text: string; image: PendingImage } | null>(null);
    const [mode, setMode] = useState<AiChatMode>('standard');
    const [modeMenuOpen, setModeMenuOpen] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [liveStarted, setLiveStarted] = useState(false);

    const aiAllowed = isAIAllowedClient();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const recognitionRef = useRef<any>(null);
    const drawerCloseRef = useRef<HTMLButtonElement>(null);

    // ── History ───────────────────────────────────────────────────────────
    const loadHistory = useCallback(async () => {
        setHistoryStatus('loading');
        try {
            const list = isDemo ? listLocal(localKey) : await api.aiListConversations();
            setConversations(Array.isArray(list) ? list : []);
            setHistoryStatus('ready');
        } catch {
            setHistoryStatus('error');
        }
    }, [isDemo, localKey]);

    useEffect(() => { loadHistory(); }, [loadHistory]);

    const startNewChat = () => {
        setActiveId(null);
        setActiveTitle('New chat');
        setMessages([]);
        setSendError(null);
        setHistoryOpen(false);
        setActiveTab('chat');
        requestAnimationFrame(() => textareaRef.current?.focus());
    };

    const openConversation = async (id: string) => {
        setHistoryOpen(false);
        setActiveTab('chat');
        if (id === activeId) return;
        setOpening(true);
        setSendError(null);
        try {
            const c = isDemo ? getLocal(localKey, id) : await api.aiGetConversation(id);
            if (!c) throw new Error('Conversation not found');
            setActiveId(c.id);
            setActiveTitle(c.title);
            setMessages(c.messages.map(m => ({ ...m })));
        } catch (err: any) {
            toast.error(/not found/i.test(err?.message || '') ? 'That chat no longer exists.' : 'That chat could not be opened. Please try again.');
            loadHistory();
        } finally {
            setOpening(false);
        }
    };

    const deleteConversation = async (id: string) => {
        try {
            if (isDemo) deleteLocal(localKey, id); else await api.aiDeleteConversation(id);
            setConversations(list => list.filter(c => c.id !== id));
            if (id === activeId) startNewChat();
            toast.success('Chat deleted');
        } catch {
            toast.error('That chat could not be deleted. Please try again.');
        }
    };

    // Mobile drawer: Escape closes it, focus moves into it.
    useEffect(() => {
        if (!historyOpen) return;
        drawerCloseRef.current?.focus();
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setHistoryOpen(false); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [historyOpen]);

    // ── Sending ───────────────────────────────────────────────────────────
    // Demo: chat through /api/ai/chat (with the visitor's own demo records) and
    // keep the conversation on this device only. Nothing is saved server-side.
    const sendDemo = async (userMsg: ChatMessage, text: string, image: PendingImage): Promise<AiSendResult> => {
        const history = [...messages, userMsg].slice(-MODEL_WINDOW).map(m => ({ role: m.role, content: m.content }));
        if (image) history[history.length - 1] = { role: 'user', content: [{ type: 'text', text: userMsg.content }, { type: 'image_url', image_url: { url: image.dataUrl } }] as any };
        while (history.length > 1 && history[0].role === 'assistant') history.shift();
        const r = await api.aiChat({
            messages: history,
            max_tokens: 1400,
            ...(mode === 'steps' ? { model: 'deepseek-ai/deepseek-v4-flash' } : { thinking: false }),
            context: { personal: true, page: 'AI Assistant', module: 'AI Assistant chat', mode },
        });
        const reply = { role: 'assistant' as const, content: (r?.text || '').trim() || "Sorry, I couldn't put an answer together. Please try asking another way.", at: new Date().toISOString() };
        const { imageUrl: _preview, ...stored } = userMsg;
        const summary = saveLocal(localKey, { id: activeId, title: titleFromText(text), messages: [...messages, stored, reply] });
        return { conversation: { id: summary.id, title: summary.title, updated_at: summary.updated_at, message_count: summary.message_count }, message: stored, reply };
    };

    const send = async (rawText: string, image: PendingImage = pendingImage) => {
        const text = rawText.trim();
        if ((!text && !image) || isSending) return;
        if (!aiAllowed) { toast.error(AI_LOCKED_MESSAGE); return; }

        setIsSending(true);
        setSendError(null);
        setInputText('');
        setPendingImage(null);
        setModeMenuOpen(false);
        const optimistic: ChatMessage = { role: 'user', content: text || 'What can you tell me about this photo?', at: new Date().toISOString(), image: !!image, imageUrl: image?.previewUrl };
        setMessages(prev => [...prev, optimistic]);

        try {
            const res = await withTimeout(
                isDemo
                    ? sendDemo(optimistic, text, image)
                    : api.aiSendMessage({ conversation_id: activeId, text, image: image?.dataUrl || null, mode, page: 'AI Assistant' }),
                SEND_TIMEOUT_MS,
            );
            setMessages(prev => [...prev, { ...res.reply }]);
            setActiveId(res.conversation.id);
            setActiveTitle(res.conversation.title);
            setConversations(list => {
                const rest = list.filter(c => c.id !== res.conversation.id);
                const summary: AiConversationSummary = {
                    id: res.conversation.id, title: res.conversation.title, created_at: res.conversation.updated_at,
                    updated_at: res.conversation.updated_at, message_count: res.conversation.message_count,
                    preview: res.reply.content.replace(/[#*_`>|]/g, '').replace(/\s+/g, ' ').trim().slice(0, 90),
                };
                return [summary, ...rest];
            });
            setHistoryStatus(s => (s === 'error' ? 'ready' : s));
        } catch (err: any) {
            // Keep what they typed: remove the optimistic bubble and offer Retry.
            setMessages(prev => prev.filter(m => m !== optimistic));
            const raw = String(err?.message || '');
            const message = /advanced plan/i.test(raw) ? AI_LOCKED_MESSAGE
                : err?.timeout ? 'The assistant took too long to answer. Please try again.'
                : raw && raw.length < 160 && !/internal|unexpected|request failed|fetch/i.test(raw) ? raw
                : 'The assistant could not answer just now. Please try again.';
            setSendError({ message, text, image });
            if (err?.timeout) loadHistory();
        } finally {
            setIsSending(false);
        }
    };

    const retry = () => {
        if (!sendError) return;
        send(sendError.text, sendError.image);
    };

    const onPickImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        if (!file.type.startsWith('image/')) { toast.error('Please choose a photo.'); return; }
        if (file.size > 4 * 1024 * 1024) { toast.error('That photo is larger than 4 MB. Please choose a smaller one.'); return; }
        try {
            const dataUrl = await readAsDataUrl(file);
            setPendingImage({ dataUrl, previewUrl: URL.createObjectURL(file) });
            textareaRef.current?.focus();
        } catch (err: any) {
            toast.error(err?.message || 'Could not read that photo.');
        }
    };

    // ── Voice typing / read aloud (browser speech, no extra cost) ────────────
    const startRecording = () => {
        const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SR) { toast.error('Voice typing needs Chrome or Edge. Please type your question instead.'); return; }
        try {
            const rec = new SR();
            rec.lang = 'en-NG';
            rec.interimResults = false;
            rec.continuous = false;
            rec.onresult = (e: any) => {
                const transcript = Array.from(e.results).map((r: any) => r[0].transcript).join(' ');
                if (transcript) setInputText(prev => (prev + ' ' + transcript).trim());
            };
            rec.onend = () => setIsRecording(false);
            rec.onerror = (e: any) => {
                setIsRecording(false);
                if (e?.error !== 'no-speech' && e?.error !== 'aborted') toast.error('Could not hear you. Please try again.');
            };
            recognitionRef.current = rec;
            rec.start();
            setIsRecording(true);
        } catch {
            toast.error('Could not use the microphone.');
        }
    };
    const stopRecording = () => { recognitionRef.current?.stop(); setIsRecording(false); };

    const readAloud = (text: string) => {
        if (!('speechSynthesis' in window)) { toast.error('Read aloud is not supported in this browser.'); return; }
        window.speechSynthesis.cancel();
        const clean = text.replace(/[*_#`>|[\]]/g, '').replace(/\n+/g, '. ');
        window.speechSynthesis.speak(new SpeechSynthesisUtterance(clean));
    };

    useEffect(() => () => {
        try { recognitionRef.current?.abort?.(); } catch { /* ignore */ }
        try { window.speechSynthesis?.cancel(); } catch { /* ignore */ }
    }, []);

    // Keep the newest message in view.
    useEffect(() => {
        const el = scrollRef.current;
        if (el && typeof el.scrollTo === 'function') el.scrollTo({ top: el.scrollHeight, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    }, [messages, isSending, sendError]);

    // Grow the textarea with its content (up to ~6 lines).
    useEffect(() => {
        const ta = textareaRef.current;
        if (!ta) return;
        ta.style.height = 'auto';
        ta.style.height = `${Math.min(Math.max(ta.scrollHeight, 44), 160)}px`;
    }, [inputText]);

    const currentMode = MODES.find(m => m.id === mode)!;
    const tabs: Array<{ id: Tab; label: string; short: string; icon: React.FC<any> }> = [
        { id: 'chat', label: 'Smart Chat', short: 'Chat', icon: AIIcon },
        // Quick answers from the signed-in user's own records.
        { id: 'school', label: 'My School', short: 'My School', icon: SearchIcon },
        { id: 'live', label: 'Live Voice', short: 'Voice', icon: MicrophoneIcon },
        { id: 'create', label: 'Creative Studio', short: 'Create', icon: SparklesIcon },
    ];

    // Inside the Parent dashboard this screen fills the dashboard's content
    // area; everywhere else it is a full-screen view.
    const rootHeight = dashboardType === DashboardType.Parent ? 'h-full' : 'h-[100dvh]';
    const historyPanel = (
        <AIChatHistoryPanel
            conversations={conversations} activeId={activeId} status={historyStatus} activeClass={theme.activeNav}
            onSelect={openConversation} onNew={startNewChat} onDelete={deleteConversation} onRetry={loadHistory}
        />
    );

    return (
        <div className={`flex flex-col ${rootHeight} min-h-0 bg-gray-50 overflow-hidden`}>
            <Header
                title="AI Assistant"
                avatarUrl={user?.avatar_url || ''}
                bgColor={theme.mainBg}
                onBack={onBack}
                className="flex-shrink-0"
            />

            {/* Tools */}
            <div className="flex-shrink-0 bg-white border-b border-gray-200 z-10">
                <div role="tablist" aria-label="Assistant tools" className="flex max-w-5xl mx-auto overflow-x-auto no-scrollbar">
                    {tabs.map(tab => {
                        const active = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                role="tab"
                                aria-selected={active}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex-1 min-w-[4.5rem] min-h-12 px-2 flex items-center justify-center gap-2 border-b-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 ${active ? `${theme.iconColor} border-current` : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50'}`}
                            >
                                <tab.icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                                <span className="sm:hidden whitespace-nowrap">{tab.short}</span>
                                <span className="hidden sm:inline whitespace-nowrap">{tab.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="flex-1 min-h-0 relative flex">
                {activeTab === 'school' && <div className="flex-1 min-w-0"><AskAIWidget embedded /></div>}

                {activeTab === 'live' && (
                    liveStarted
                        ? <div className="flex-1 relative"><LiveSession onClose={() => setLiveStarted(false)} /></div>
                        : (
                            <div className="flex-1 overflow-y-auto">
                                <div className="max-w-md mx-auto px-4 py-10 text-center">
                                    <div className={`w-14 h-14 mx-auto rounded-2xl flex items-center justify-center ${theme.cardIconBg}`}>
                                        <Video className={`w-7 h-7 ${theme.iconColor}`} aria-hidden="true" />
                                    </div>
                                    <h2 className="mt-4 text-lg font-semibold text-gray-900">Talk to the assistant</h2>
                                    <p className="mt-2 text-sm text-gray-600 leading-relaxed">Speak your question and hear the answer read back. It uses your microphone, and your camera so you can show your homework. Works best in Chrome or Edge.</p>
                                    {!aiAllowed && <p className="mt-3 text-sm text-gray-700">{AI_LOCKED_MESSAGE}</p>}
                                    <button
                                        type="button"
                                        disabled={!aiAllowed}
                                        onClick={() => setLiveStarted(true)}
                                        className={`mt-6 inline-flex items-center gap-2 min-h-11 px-5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 ${theme.mainBg}`}
                                    >
                                        <Mic className="w-4 h-4" aria-hidden="true" /> Start voice session
                                    </button>
                                    <p className="mt-3 text-xs text-gray-500">Your browser will ask for permission first.</p>
                                </div>
                            </div>
                        )
                )}

                {activeTab === 'create' && <div className="flex-1 min-w-0"><MediaGenerator /></div>}

                {activeTab === 'chat' && (
                    <>
                        {/* Saved chats: side panel on large screens */}
                        <aside className="hidden lg:flex lg:flex-col w-72 xl:w-80 flex-shrink-0 bg-white border-r border-gray-200" aria-label="Saved chats">
                            {historyPanel}
                        </aside>

                        {/* Saved chats: drawer on phones and tablets */}
                        {historyOpen && (
                            <div className="lg:hidden fixed inset-0 z-[60] flex" role="dialog" aria-modal="true" aria-label="Saved chats">
                                <button type="button" tabIndex={-1} className="absolute inset-0 bg-black/40 cursor-default" aria-label="Close saved chats" onClick={() => setHistoryOpen(false)} />
                                <div className="relative w-[85%] max-w-sm h-full bg-white shadow-xl flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
                                    <div className="flex justify-end px-2 pt-2">
                                        <button ref={drawerCloseRef} type="button" onClick={() => setHistoryOpen(false)} aria-label="Close" className="w-11 h-11 flex items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                                            <X className="w-5 h-5" aria-hidden="true" />
                                        </button>
                                    </div>
                                    <div className="flex-1 min-h-0">{historyPanel}</div>
                                </div>
                            </div>
                        )}

                        <section className="flex-1 min-w-0 flex flex-col" aria-label="Conversation">
                            {/* Conversation bar */}
                            <div className="flex-shrink-0 flex items-center gap-2 px-2 sm:px-4 h-14 bg-white border-b border-gray-100">
                                <button type="button" onClick={() => setHistoryOpen(true)} className="lg:hidden inline-flex items-center gap-1.5 min-h-11 px-3 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                                    <History className="w-5 h-5" aria-hidden="true" /> <span>Chats</span>
                                </button>
                                <h2 className="flex-1 min-w-0 truncate text-sm font-semibold text-gray-900 lg:pl-1">{activeTitle}</h2>
                                <button type="button" onClick={startNewChat} aria-label="New chat" className="lg:hidden w-11 h-11 flex items-center justify-center rounded-xl text-gray-700 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                                    <Plus className="w-5 h-5" aria-hidden="true" />
                                </button>
                            </div>

                            {/* Messages */}
                            <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto overscroll-contain" style={PATTERN_STYLE} aria-busy={isSending || opening}>
                                <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 min-h-full flex flex-col">
                                    {opening && (
                                        <div className="space-y-4" aria-label="Opening chat">
                                            {[0, 1].map(i => <div key={i} className="h-20 rounded-2xl bg-white/80 animate-pulse motion-reduce:animate-none" />)}
                                        </div>
                                    )}

                                    {!opening && messages.length === 0 && !sendError && !isSending && (
                                        <div className="my-auto py-4">
                                            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 sm:p-7">
                                                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${theme.cardIconBg}`}>
                                                    <AIIcon className={`w-6 h-6 ${theme.iconColor}`} aria-hidden="true" />
                                                </div>
                                                <h3 className="mt-4 text-xl font-semibold text-gray-900">{firstName ? `Hi ${firstName} 👋` : 'Hi there 👋'}</h3>
                                                <p className="mt-1.5 text-[15px] text-gray-600 leading-relaxed max-w-prose">
                                                    Ask about your own school records, your schoolwork, or how to do something in Oliskey. I can only see your own information.
                                                </p>
                                                {aiAllowed ? (
                                                    <ul className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-2" aria-label="Suggested questions">
                                                        {suggestedPrompts(dashboardType).map(p => (
                                                            <li key={p}>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => send(p, null)}
                                                                    className="w-full h-full min-h-12 text-left px-4 py-3 rounded-2xl bg-gray-50 border border-gray-100 text-sm text-gray-800 hover:bg-gray-100 hover:border-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition-colors"
                                                                >
                                                                    {p}
                                                                </button>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                ) : (
                                                    <p className="mt-5 flex items-start gap-2 text-sm text-gray-700 bg-gray-50 rounded-2xl p-4">
                                                        <Lock className="w-4 h-4 mt-0.5 flex-shrink-0" aria-hidden="true" /> {AI_LOCKED_MESSAGE}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {!opening && messages.length > 0 && (
                                        <ol className="space-y-5" aria-label="Messages" aria-live="polite">
                                            {messages.map((msg, i) => (
                                                <li key={`${msg.at}-${i}`} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                                    {msg.role === 'user' ? (
                                                        <div className="max-w-[85%] sm:max-w-[75%] rounded-2xl rounded-br-md bg-blue-600 text-white px-4 py-2.5 shadow-sm">
                                                            {msg.imageUrl && <img src={msg.imageUrl} alt="Your photo" className="rounded-lg mb-2 max-h-48 object-cover" />}
                                                            {msg.image && !msg.imageUrl && <p className="text-xs text-blue-100 mb-1">📷 Photo attached</p>}
                                                            <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>
                                                        </div>
                                                    ) : (
                                                        <div className="w-full max-w-[95%] sm:max-w-[85%]">
                                                            <div className="rounded-2xl rounded-bl-md bg-white border border-gray-100 px-4 py-3 shadow-sm">
                                                                <AIMarkdown>{msg.content}</AIMarkdown>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => readAloud(msg.content)}
                                                                className="mt-1 inline-flex items-center gap-1.5 min-h-11 px-2 rounded-lg text-xs font-medium text-gray-600 bg-white/80 hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                                                            >
                                                                <Volume2 className="w-4 h-4" aria-hidden="true" /> Read aloud
                                                            </button>
                                                        </div>
                                                    )}
                                                </li>
                                            ))}
                                        </ol>
                                    )}

                                    {isSending && (
                                        <div className="mt-5 flex justify-start" role="status" aria-label="The assistant is writing">
                                            <div className="bg-white border border-gray-100 px-4 py-3 rounded-2xl rounded-bl-md shadow-sm flex items-center gap-2">
                                                {[0, 150, 300].map(d => <span key={d} className="w-2 h-2 bg-gray-400 rounded-full animate-bounce motion-reduce:animate-none" style={{ animationDelay: `${d}ms` }} />)}
                                                <span className="text-sm text-gray-500 ml-1">Thinking…</span>
                                            </div>
                                        </div>
                                    )}

                                    {sendError && (
                                        <div className="mt-5 bg-white border border-red-100 rounded-2xl p-4 shadow-sm" role="alert">
                                            <p className="text-sm font-medium text-gray-900">Your message wasn't sent</p>
                                            <p className="mt-1 text-sm text-gray-600">{sendError.message}</p>
                                            {sendError.text && <p className="mt-2 text-sm text-gray-500 italic truncate">"{sendError.text}"</p>}
                                            <div className="mt-3 flex flex-wrap gap-2">
                                                <button type="button" onClick={retry} className={`inline-flex items-center gap-1.5 min-h-11 px-4 rounded-xl text-sm font-semibold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 ${theme.mainBg}`}>
                                                    <RotateCw className="w-4 h-4" aria-hidden="true" /> Retry
                                                </button>
                                                <button type="button" onClick={() => { setInputText(sendError.text); setPendingImage(sendError.image); setSendError(null); textareaRef.current?.focus(); }} className="min-h-11 px-4 rounded-xl text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                                                    Edit message
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Input dock: part of the layout (not fixed), so it sits directly under the conversation and rises with the keyboard. */}
                            <div className="flex-shrink-0 bg-white border-t border-gray-200" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
                                <div className="max-w-3xl mx-auto px-3 sm:px-6 pt-1.5 pb-3">
                                    <div className="relative flex items-center justify-between gap-2 mb-1">
                                        <button
                                            type="button"
                                            onClick={() => setModeMenuOpen(o => !o)}
                                            aria-haspopup="listbox"
                                            aria-expanded={modeMenuOpen}
                                            className="inline-flex items-center gap-1 min-h-11 px-2 -ml-1 rounded-lg text-sm text-gray-600 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                                        >
                                            <span className="text-gray-500">Answer style:</span>
                                            <span className="font-medium text-gray-900">{currentMode.label}</span>
                                            <ChevronDown className="w-4 h-4" aria-hidden="true" />
                                        </button>
                                        <span className="hidden sm:block text-xs text-gray-500 truncate">{isDemo ? 'Demo chats are saved on this device only' : 'Saved to your account · only you can see it'}</span>
                                        {modeMenuOpen && (
                                            <ul role="listbox" aria-label="Answer style" className="absolute bottom-full left-0 mb-2 w-[min(20rem,calc(100vw-2rem))] bg-white rounded-2xl border border-gray-200 shadow-lg p-1.5 z-20">
                                                {MODES.map(m => (
                                                    <li key={m.id}>
                                                        <button
                                                            type="button"
                                                            role="option"
                                                            aria-selected={m.id === mode}
                                                            onClick={() => { setMode(m.id); setModeMenuOpen(false); textareaRef.current?.focus(); }}
                                                            className={`w-full text-left px-3 py-2.5 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${m.id === mode ? theme.activeNav : 'hover:bg-gray-50'}`}
                                                        >
                                                            <span className="block text-sm font-medium">{m.label}</span>
                                                            <span className="block text-xs text-gray-500 mt-0.5 leading-snug">{m.hint}</span>
                                                        </button>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>

                                    {pendingImage && (
                                        <div className="mb-2 inline-flex items-center gap-2 bg-gray-100 rounded-xl p-1.5 pr-1">
                                            <img src={pendingImage.previewUrl} alt="Photo to send" className="w-10 h-10 rounded-lg object-cover" />
                                            <span className="text-sm text-gray-700">Photo attached</span>
                                            <button type="button" onClick={() => setPendingImage(null)} aria-label="Remove photo" className="w-11 h-11 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                                                <X className="w-4 h-4" aria-hidden="true" />
                                            </button>
                                        </div>
                                    )}

                                    <div className="flex items-end gap-2">
                                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={onPickImage} />
                                        <button type="button" onClick={() => fileInputRef.current?.click()} disabled={!aiAllowed} aria-label="Attach a photo" className="flex-shrink-0 w-11 h-11 flex items-center justify-center rounded-full text-gray-600 hover:bg-gray-100 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                                            <ImagePlus className="w-5 h-5" aria-hidden="true" />
                                        </button>
                                        <label htmlFor="ai-chat-input" className="sr-only">Message the assistant</label>
                                        <textarea
                                            id="ai-chat-input"
                                            ref={textareaRef}
                                            value={inputText}
                                            onChange={e => setInputText(e.target.value)}
                                            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !(e.nativeEvent as any).isComposing) { e.preventDefault(); send(inputText); } }}
                                            placeholder={aiAllowed ? 'Ask anything…' : 'AI is not available on your plan'}
                                            disabled={!aiAllowed}
                                            maxLength={4000}
                                            rows={1}
                                            className="flex-1 min-w-0 h-11 max-h-40 resize-none rounded-2xl bg-gray-100 px-4 py-2.5 text-base sm:text-[15px] leading-6 text-gray-900 placeholder:text-gray-500 outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                                        />
                                        {inputText.trim() || pendingImage ? (
                                            <button type="button" onClick={() => send(inputText)} disabled={isSending} aria-label="Send message" className={`flex-shrink-0 w-11 h-11 flex items-center justify-center rounded-full text-white shadow-sm disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 ${theme.mainBg}`}>
                                                <Send className="w-5 h-5" aria-hidden="true" />
                                            </button>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={isRecording ? stopRecording : startRecording}
                                                disabled={!aiAllowed}
                                                aria-label={isRecording ? 'Stop voice typing' : 'Voice typing'}
                                                aria-pressed={isRecording}
                                                className={`flex-shrink-0 w-11 h-11 flex items-center justify-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50 ${isRecording ? 'bg-red-500 text-white animate-pulse motion-reduce:animate-none' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                                            >
                                                {isRecording ? <Square className="w-4 h-4" aria-hidden="true" /> : <Mic className="w-5 h-5" aria-hidden="true" />}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </section>
                    </>
                )}
            </div>
        </div>
    );
};

export default AIChatScreen;
