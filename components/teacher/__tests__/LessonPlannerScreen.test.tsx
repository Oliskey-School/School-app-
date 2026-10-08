import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../hooks/useAutoSync', () => ({ useAutoSync: () => {} }));
vi.mock('../../../hooks/useTeacherClasses', () => ({
    useTeacherClasses: () => ({
        classes: [{ id: 'cls-1', grade: 10, section: 'A' }],
        subjects: [{ id: 'sub-1', name: 'Mathematics' }],
        assignments: [{ classId: 'cls-1', subjectId: 'sub-1' }],
        loading: false,
    }),
}));
vi.mock('../../../lib/ai', () => ({ isAIAllowedClient: () => true, AI_LOCKED_MESSAGE: 'locked' }));
vi.mock('react-hot-toast', () => {
    const toast: any = vi.fn();
    toast.success = vi.fn(); toast.error = vi.fn();
    return { toast, default: toast };
});

// A tiny in-memory stand-in for the generated_resources table: save upserts
// by (subject, class, content_type) like the real service, get returns rows.
let rows: any[] = [];
vi.mock('../../../lib/api', () => ({
    api: {
        getGeneratedResources: vi.fn(async () => rows.map(r => ({ ...r }))),
        saveGeneratedResource: vi.fn(async (_school: string, data: any) => {
            rows = rows.filter(r => !(r.subject === data.subject && r.class_name === data.class_name && r.content_type === data.content_type));
            rows.push({ ...data, updated_at: new Date().toISOString() });
            return data;
        }),
        aiChat: vi.fn(),
    },
}));

import { api } from '../../../lib/api';
import LessonPlannerScreen from '../LessonPlannerScreen';

const aiAnswer = (body: any) => {
    const prompt: string = body.messages[1].content;
    const weeks = [...prompt.matchAll(/- Week (\d+): ([^(\n]+)/g)].map(m => ({
        week: Number(m[1]), topic: m[2].trim(),
        objectives: ['Convert numbers between bases'], materials: ['Chalkboard'], keyVocabulary: ['base'],
        steps: [{ step: 'Introduction', description: 'Teacher asks.' }], assessment: ['Oral'],
        questions: ['Convert 12 to base 2.'], note: '### Definition\nA base is…',
    }));
    return { text: JSON.stringify({ weeks }) };
};

const setup = () => {
    const navigateTo = vi.fn();
    const utils = render(<LessonPlannerScreen navigateTo={navigateTo} teacherId="t-1" schoolId="s-1" currentBranchId="b-1" />);
    return { navigateTo, ...utils };
};

const fillForm = () => {
    fireEvent.change(screen.getByLabelText('Class Name'), { target: { value: 'cls-1' } });
    fireEvent.change(screen.getByLabelText('Subject'), { target: { value: 'sub-1' } });
    fireEvent.change(screen.getByPlaceholderText('Main Topic for the Week'), { target: { value: 'Number bases' } });
};

describe('LessonPlannerScreen', () => {
    beforeEach(() => {
        rows = [];
        localStorage.clear();
        vi.mocked(api.aiChat).mockReset();
        vi.mocked(api.saveGeneratedResource).mockClear();
    });

    it('generates the active term with AI, saves it and opens the plan', async () => {
        vi.mocked(api.aiChat).mockImplementation(async (body: any) => aiAnswer(body) as any);
        const { navigateTo } = setup();
        fillForm();
        fireEvent.click(screen.getByRole('button', { name: /Generate AI Resources/ }));

        await waitFor(() => expect(navigateTo).toHaveBeenCalledWith('lessonPlanDetail', 'AI Plan: Mathematics', expect.anything()));
        expect(vi.mocked(api.aiChat).mock.calls[0][0]).toMatchObject({ thinking: false });
        expect(vi.mocked(api.aiChat).mock.calls[0][0].messages[1].content).toContain('Class: SSS 1');

        const saved = rows.find(r => r.content_type === 'generated_resources');
        const content = JSON.parse(saved.content);
        expect(content.terms[0]).toMatchObject({ term: 'First Term' });
        expect(content.terms[0].lessonPlans[0]).toMatchObject({ week: 1, topic: 'Number bases' });
        const props = navigateTo.mock.calls[0][2];
        expect(props.initialTerm).toBe('First Term');
        expect(props.resources.terms[0].lessonPlans).toHaveLength(1);
    });

    it('shows a clear error with Retry when the AI fails, and Retry succeeds', async () => {
        vi.mocked(api.aiChat).mockRejectedValue(new Error('AI is temporarily unavailable'));
        const { navigateTo } = setup();
        fillForm();
        fireEvent.click(screen.getByRole('button', { name: /Generate AI Resources/ }));

        const alert = await screen.findByRole('alert');
        expect(alert).toHaveTextContent(/busy/i);
        expect(alert).toHaveTextContent(/Nothing was saved/);
        expect(screen.queryByRole('status')).not.toBeInTheDocument(); // no endless spinner
        expect(rows).toHaveLength(0);

        vi.mocked(api.aiChat).mockImplementation(async (body: any) => aiAnswer(body) as any);
        fireEvent.click(within(alert).getByRole('button', { name: 'Retry' }));
        await waitFor(() => expect(navigateTo).toHaveBeenCalledWith('lessonPlanDetail', 'AI Plan: Mathematics', expect.anything()));
        expect(rows.some(r => r.content_type === 'generated_resources')).toBe(true);
    });

    it('Save Scheme persists, and Load Scheme brings it back after a fresh mount', async () => {
        const first = setup();
        fillForm();
        fireEvent.click(screen.getByRole('button', { name: 'Save Scheme' }));
        await waitFor(() => expect(rows.find(r => r.content_type === 'scheme')).toBeTruthy());
        expect(JSON.parse(rows[0].content).term1[0].topic).toBe('Number bases');
        first.unmount();

        localStorage.clear(); // simulate another device / cleared draft
        setup();
        expect(screen.getByPlaceholderText('Main Topic for the Week')).toHaveValue('');
        fireEvent.click(screen.getByRole('button', { name: 'Load Scheme' }));
        const dialog = await screen.findByRole('dialog');
        await within(dialog).findByText('SSS 1 A');
        fireEvent.click(within(dialog).getByRole('button', { name: 'Load' }));

        expect(screen.getByPlaceholderText('Main Topic for the Week')).toHaveValue('Number bases');
        expect(screen.getByLabelText('Class Name')).toHaveValue('cls-1');
        expect(screen.getByLabelText('Subject')).toHaveValue('sub-1');
    });

    it('a generated plan survives a fresh mount and opens from Saved Plans', async () => {
        vi.mocked(api.aiChat).mockImplementation(async (body: any) => aiAnswer(body) as any);
        const first = setup();
        fillForm();
        fireEvent.click(screen.getByRole('button', { name: /Generate AI Resources/ }));
        await waitFor(() => expect(first.navigateTo).toHaveBeenCalled());
        first.unmount();

        const { navigateTo } = setup();
        fireEvent.click(screen.getByRole('button', { name: 'Saved Plans' }));
        const dialog = await screen.findByRole('dialog');
        await within(dialog).findByText(/SSS 1 A · First Term/);
        fireEvent.click(within(dialog).getByRole('button', { name: 'View' }));
        expect(navigateTo).toHaveBeenCalledWith('lessonPlanDetail', 'AI Plan: Mathematics', expect.objectContaining({
            resources: expect.objectContaining({ terms: [expect.objectContaining({ term: 'First Term' })] }),
        }));
    });

    it('Generate Locally builds a template for the active term without calling the AI', async () => {
        const { navigateTo } = setup();
        fillForm();
        fireEvent.click(screen.getByRole('button', { name: 'Generate Locally (No AI)' }));
        await waitFor(() => expect(navigateTo).toHaveBeenCalledWith('lessonPlanDetail', 'Local Plan: Mathematics', expect.anything()));
        expect(api.aiChat).not.toHaveBeenCalled();
        const content = JSON.parse(rows.find(r => r.content_type === 'generated_resources').content);
        expect(content.terms.map((t: any) => t.term)).toEqual(['First Term']);
        expect(content.detailedNotes[0].note).not.toMatch(/ERROR/);
    });
});
