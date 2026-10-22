import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { api } from '../../../lib/api';
import { DashboardType } from '../../../types';
import AIMarkdown, { plainMaths } from '../AIMarkdown';
import AIChatHistoryPanel, { relativeTime } from '../AIChatHistoryPanel';

const auth = vi.hoisted(() => ({ isDemo: false }));
vi.mock('../../../context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u-ada', full_name: 'Ada Obi', avatar_url: '' }, role: 'student', isDemo: auth.isDemo }) }));
vi.mock('../../../lib/ai', () => ({ isAIAllowedClient: () => true, AI_LOCKED_MESSAGE: 'locked' }));
vi.mock('../../ui/Header', () => ({ default: ({ title }: any) => <header>{title}</header> }));
vi.mock('../LiveSession', () => ({ default: () => <div>live</div> }));
vi.mock('../MediaGenerator', () => ({ default: () => <div>media</div> }));
vi.mock('../AskAIWidget', () => ({ default: () => <div>ask</div> }));

import AIChatScreen, { suggestedPrompts } from '../AIChatScreen';

const a = api as any;
const conv = (id: string, title: string) => ({ id, title, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), message_count: 2, preview: 'preview text' });

describe('AIMarkdown', () => {
    it('renders headings, lists, bold and a horizontally scrollable table', () => {
        const md = '### 📚 Results\n- **Maths**: 70\n- English: 80\n\n| Subject | Score |\n|---|---|\n| Maths | 70 |\n\nUse `code` here.';
        const { container } = render(<AIMarkdown>{md}</AIMarkdown>);
        expect(screen.getByText(/Results/).tagName).toBe('H4');
        expect(container.querySelectorAll('ul li')).toHaveLength(2);
        expect(screen.getByText('Maths', { selector: 'strong' })).toBeInTheDocument();
        const region = screen.getByRole('region', { name: 'Table' });
        expect(region.className).toContain('overflow-x-auto');
        expect(within(region).getByRole('table')).toBeInTheDocument();
        expect(screen.getByText('code').tagName).toBe('CODE');
    });
});

describe('plainMaths', () => {
    it('turns common LaTeX into readable text and leaves code alone', () => {
        const R = String.raw;
        expect(plainMaths(R`Solve \(3x + 5 = 20\) now`)).toBe('Solve 3x + 5 = 20 now');
        expect(plainMaths(R`\[ x = \frac{15}{3} \]`)).toContain('x = 15/3');
        expect(plainMaths(R`$\frac{a+1}{b}$ and 5 \times 4 \div 2`)).toBe('(a+1)/(b) and 5 × 4 ÷ 2');
        expect(plainMaths('It costs $5 and $10')).toBe('It costs $5 and $10');
        const code = '```\n' + R`\frac{a}{b}` + '\n```';
        expect(plainMaths(code)).toBe(code);
    });
});

describe('AIChatHistoryPanel', () => {
    const base = { activeId: null, activeClass: 'bg-orange-100', onSelect: vi.fn(), onNew: vi.fn(), onDelete: vi.fn(), onRename: vi.fn(), onRetry: vi.fn() };

    it('renames inline: Save calls onRename, Escape cancels', async () => {
        const onRename = vi.fn().mockResolvedValue(undefined);
        render(<AIChatHistoryPanel {...base} onRename={onRename} status="ready" conversations={[conv('c1', 'My attendance')]} />);
        const renameBtn = screen.getByRole('button', { name: 'Rename chat: My attendance' });
        expect(renameBtn.className).toContain('w-11');
        fireEvent.click(renameBtn);
        const input = screen.getByLabelText('Chat name');
        fireEvent.keyDown(input, { key: 'Escape' });
        expect(onRename).not.toHaveBeenCalled();
        expect(screen.queryByLabelText('Chat name')).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Rename chat: My attendance' }));
        fireEvent.change(screen.getByLabelText('Chat name'), { target: { value: '  Term 1 attendance  ' } });
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));
        await waitFor(() => expect(onRename).toHaveBeenCalledWith('c1', 'Term 1 attendance'));
    });

    it('lists chats and opens one', () => {
        const onSelect = vi.fn();
        render(<AIChatHistoryPanel {...base} onSelect={onSelect} status="ready" conversations={[conv('c1', 'My attendance'), conv('c2', 'Fractions help')]} />);
        fireEvent.click(screen.getByText('Fractions help'));
        expect(onSelect).toHaveBeenCalledWith('c2');
    });

    it('asks for confirmation before deleting', async () => {
        const onDelete = vi.fn().mockResolvedValue(undefined);
        render(<AIChatHistoryPanel {...base} onDelete={onDelete} status="ready" conversations={[conv('c1', 'My attendance')]} />);
        fireEvent.click(screen.getByRole('button', { name: 'Delete chat: My attendance' }));
        expect(onDelete).not.toHaveBeenCalled();
        expect(screen.getByText('Delete this chat?')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
        await waitFor(() => expect(onDelete).toHaveBeenCalledWith('c1'));
    });

    it('shows empty and error states', () => {
        const onRetry = vi.fn();
        const { rerender } = render(<AIChatHistoryPanel {...base} status="ready" conversations={[]} />);
        expect(screen.getByText('No saved chats yet')).toBeInTheDocument();
        rerender(<AIChatHistoryPanel {...base} onRetry={onRetry} status="error" conversations={[]} />);
        fireEvent.click(screen.getByRole('button', { name: /try again/i }));
        expect(onRetry).toHaveBeenCalled();
    });

    it('formats relative times', () => {
        const now = Date.parse('2026-10-08T12:00:00Z');
        expect(relativeTime('2026-10-08T11:59:50Z', now)).toBe('Just now');
        expect(relativeTime('2026-10-08T11:30:00Z', now)).toBe('30 min ago');
        expect(relativeTime('2026-10-07T10:00:00Z', now)).toBe('Yesterday');
    });
});

describe('AIChatScreen', () => {
    beforeEach(() => {
        a.aiListConversations = vi.fn().mockResolvedValue([conv('old', 'Earlier chat')]);
        a.aiGetConversation = vi.fn().mockResolvedValue({ ...conv('old', 'Earlier chat'), messages: [
            { role: 'user', content: 'What is my attendance?', at: '2026-10-01T10:00:00Z' },
            { role: 'assistant', content: '### ✅ Attendance\n- **92%** present', at: '2026-10-01T10:00:05Z' },
        ] });
        a.aiDeleteConversation = vi.fn().mockResolvedValue({ deleted: true });
        a.aiSendMessage = vi.fn().mockResolvedValue({
            conversation: { id: 'new1', title: "What's my attendance this term?", updated_at: new Date().toISOString(), message_count: 2 },
            message: { role: 'user', content: 'x', at: new Date().toISOString() },
            reply: { role: 'assistant', content: '### 📅 This term\n- **95%** present', at: new Date().toISOString() },
        });
    });

    it('greets the user and shows prompts for their role (no "tabs below")', async () => {
        render(<AIChatScreen onBack={vi.fn()} dashboardType={DashboardType.Student} />);
        expect(screen.getByText('Hi Ada 👋')).toBeInTheDocument();
        expect(screen.queryByText(/tabs below/i)).not.toBeInTheDocument();
        for (const p of suggestedPrompts(DashboardType.Student)) expect(screen.getByRole('button', { name: p })).toBeInTheDocument();
        await waitFor(() => expect(screen.getAllByText('Earlier chat').length).toBeGreaterThan(0));
    });

    it('role prompts differ per role', () => {
        expect(suggestedPrompts(DashboardType.Parent)[0]).toBe('How is my child doing?');
        expect(suggestedPrompts(DashboardType.Teacher)[0]).toBe('What classes do I teach today?');
    });

    it('sends a suggested prompt and renders the formatted reply', async () => {
        render(<AIChatScreen onBack={vi.fn()} dashboardType={DashboardType.Student} />);
        fireEvent.click(screen.getByRole('button', { name: "What's my attendance this term?" }));
        await waitFor(() => expect(screen.getByText('95%', { selector: 'strong' })).toBeInTheDocument());
        expect(a.aiSendMessage).toHaveBeenCalledWith(expect.objectContaining({ conversation_id: null, text: "What's my attendance this term?", mode: 'standard' }));
        expect(screen.getAllByText("What's my attendance this term?").length).toBeGreaterThan(0);
    });

    it('reopens a saved chat from history', async () => {
        render(<AIChatScreen onBack={vi.fn()} dashboardType={DashboardType.Student} />);
        const items = await screen.findAllByText('Earlier chat');
        fireEvent.click(items[0]);
        await waitFor(() => expect(screen.getByText('92%', { selector: 'strong' })).toBeInTheDocument());
        expect(a.aiGetConversation).toHaveBeenCalledWith('old');
    });

    it('renames a saved chat on the account (real user)', async () => {
        a.aiRenameConversation = vi.fn().mockResolvedValue({ id: 'old', title: 'Renamed chat' });
        render(<AIChatScreen onBack={vi.fn()} dashboardType={DashboardType.Student} />);
        await screen.findAllByText('Earlier chat');
        fireEvent.click(screen.getAllByRole('button', { name: 'Rename chat: Earlier chat' })[0]);
        fireEvent.change(screen.getByLabelText('Chat name'), { target: { value: 'Renamed chat' } });
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));
        await waitFor(() => expect(screen.getAllByText('Renamed chat').length).toBeGreaterThan(0));
        expect(a.aiRenameConversation).toHaveBeenCalledWith('old', 'Renamed chat');
    });

    it('a failed send keeps the message and offers Retry (no endless spinner)', async () => {
        a.aiSendMessage = vi.fn()
            .mockRejectedValueOnce(new Error('AI temporarily unavailable'))
            .mockResolvedValueOnce({
                conversation: { id: 'n2', title: 'Hello', updated_at: new Date().toISOString(), message_count: 2 },
                message: { role: 'user', content: 'Hello', at: new Date().toISOString() },
                reply: { role: 'assistant', content: 'Hi **there**', at: new Date().toISOString() },
            });
        render(<AIChatScreen onBack={vi.fn()} dashboardType={DashboardType.Teacher} />);
        fireEvent.change(screen.getByLabelText('Message the assistant'), { target: { value: 'Hello' } });
        fireEvent.click(screen.getByRole('button', { name: 'Send message' }));
        expect(await screen.findByText("Your message wasn't sent")).toBeInTheDocument();
        expect(screen.getByText('AI temporarily unavailable')).toBeInTheDocument();
        expect(screen.queryByRole('status', { name: 'The assistant is writing' })).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: /retry/i }));
        await waitFor(() => expect(screen.getByText('there', { selector: 'strong' })).toBeInTheDocument());
        expect(a.aiSendMessage).toHaveBeenCalledTimes(2);
    });

    it('explains answer styles instead of unexplained chips', () => {
        render(<AIChatScreen onBack={vi.fn()} dashboardType={DashboardType.Student} />);
        fireEvent.click(screen.getByRole('button', { name: /answer style/i }));
        const list = screen.getByRole('listbox', { name: 'Answer style' });
        expect(within(list).getByText(/No live internet/)).toBeInTheDocument();
        fireEvent.click(within(list).getByText('Step by step'));
        expect(screen.getByRole('button', { name: /answer style/i })).toHaveTextContent('Step by step');
    });
});

describe('AIChatScreen in the demo', () => {
    beforeEach(() => {
        auth.isDemo = true;
        localStorage.clear();
        a.aiListConversations = vi.fn();
        a.aiGetConversation = vi.fn();
        a.aiDeleteConversation = vi.fn();
        a.aiRenameConversation = vi.fn();
        a.aiSendMessage = vi.fn();
        a.aiChat = vi.fn().mockResolvedValue({ text: '### Demo answer\n- **88%** present' });
    });
    afterEach(() => { auth.isDemo = false; localStorage.clear(); });

    it('keeps history on this device and never calls the history API', async () => {
        const { unmount } = render(<AIChatScreen onBack={vi.fn()} dashboardType={DashboardType.Student} />);
        fireEvent.click(screen.getByRole('button', { name: "What's my attendance this term?" }));
        await waitFor(() => expect(screen.getByText('88%', { selector: 'strong' })).toBeInTheDocument());
        expect(a.aiChat).toHaveBeenCalledWith(expect.objectContaining({ context: expect.objectContaining({ personal: true, mode: 'standard' }) }));
        const stored = JSON.parse(localStorage.getItem('oliskey_ai_demo_chats:u-ada:STUDENT') || '[]');
        expect(stored).toHaveLength(1);
        expect(stored[0].messages.map((m: any) => m.role)).toEqual(['user', 'assistant']);
        expect(screen.getByText('Demo chats are saved on this device only')).toBeInTheDocument();
        unmount();

        // A new visit on the same device shows the saved chat; open and delete it locally.
        render(<AIChatScreen onBack={vi.fn()} dashboardType={DashboardType.Student} />);
        const item = (await screen.findAllByText("What's my attendance this term?"))[0];
        fireEvent.click(item);
        await waitFor(() => expect(screen.getByText('88%', { selector: 'strong' })).toBeInTheDocument());
        // Rename stays on the device too.
        fireEvent.click(screen.getAllByRole('button', { name: /Rename chat:/ })[0]);
        fireEvent.change(screen.getByLabelText('Chat name'), { target: { value: 'My demo chat' } });
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));
        await waitFor(() => expect(JSON.parse(localStorage.getItem('oliskey_ai_demo_chats:u-ada:STUDENT') || '[]')[0].title).toBe('My demo chat'));
        fireEvent.click(screen.getAllByRole('button', { name: /Delete chat:/ })[0]);
        fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
        await waitFor(() => expect(JSON.parse(localStorage.getItem('oliskey_ai_demo_chats:u-ada:STUDENT') || '[]')).toHaveLength(0));

        for (const fn of ['aiListConversations', 'aiGetConversation', 'aiDeleteConversation', 'aiRenameConversation', 'aiSendMessage']) {
            expect(a[fn], `${fn} must not be called in the demo`).not.toHaveBeenCalled();
        }
    });
});
