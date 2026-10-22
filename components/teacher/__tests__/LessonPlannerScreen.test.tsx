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
        getGeneratedResources: vi.fn(),
        saveGeneratedResource: vi.fn(async (_school: string, data: any) => {
            rows = rows.filter(r => !(r.subject === data.subject && r.class_name === data.class_name && r.content_type === data.content_type));
            rows.push({ ...data, updated_at: new Date().toISOString() });
            return data;
        }),
        aiChat: vi.fn(),
    },
}));

import { api } from '../../../lib/api';
const defaultGet = async () => rows.map(r => ({ ...r }));
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

const fillForm = async (topic = 'Number bases') => {
    fireEvent.change(screen.getByLabelText('Class Name'), { target: { value: 'cls-1' } });
    fireEvent.change(screen.getByLabelText('Subject'), { target: { value: 'sub-1' } });
    fireEvent.change(screen.getByPlaceholderText('Main Topic for the Week'), { target: { value: topic } });
    // Generating waits until the saved plans have loaded.
    await waitFor(() => expect(screen.getByRole('button', { name: /Generate AI Resources/ })).toBeEnabled());
};

describe('LessonPlannerScreen', () => {
    beforeEach(() => {
        rows = [];
        localStorage.clear();
        vi.mocked(api.aiChat).mockReset();
        vi.mocked(api.saveGeneratedResource).mockClear();
        vi.mocked(api.getGeneratedResources).mockReset();
        vi.mocked(api.getGeneratedResources).mockImplementation(defaultGet);
    });

    it('generates the active term with AI, saves it and opens the plan', async () => {
        vi.mocked(api.aiChat).mockImplementation(async (body: any) => aiAnswer(body) as any);
        const { navigateTo } = setup();
        await fillForm();
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
        await fillForm();
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
        await fillForm();
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
        await fillForm();
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
        await fillForm();
        fireEvent.click(screen.getByRole('button', { name: 'Generate Locally (No AI)' }));
        await waitFor(() => expect(navigateTo).toHaveBeenCalledWith('lessonPlanDetail', 'Local Plan: Mathematics', expect.anything()));
        expect(api.aiChat).not.toHaveBeenCalled();
        const content = JSON.parse(rows.find(r => r.content_type === 'generated_resources').content);
        expect(content.terms.map((t: any) => t.term)).toEqual(['First Term']);
        expect(content.detailedNotes[0].note).not.toMatch(/ERROR/);
    });

    // --- data-loss guards -------------------------------------------------

    const seedSecondTerm = () => {
        rows = [{
            subject: 'Mathematics', class_name: 'SSS 1 A', content_type: 'generated_resources', updated_at: new Date().toISOString(),
            content: JSON.stringify({ subject: 'Mathematics', className: 'SSS 1 A', terms: [{ term: 'Second Term', schemeOfWork: [], lessonPlans: [{ week: 1, topic: 'Saved T2 topic', objectives: ['x'], materials: [], teachingSteps: [], duration: '', keyVocabulary: [], assessmentMethods: [] }], assessments: [] }], detailedNotes: [] }),
        }];
    };
    const savedTermsNow = () => JSON.parse(rows.find(r => r.content_type === 'generated_resources').content).terms.map((t: any) => t.term);

    it('waits for the saved plans before allowing Generate, and keeps the other saved terms', async () => {
        seedSecondTerm();
        let release!: () => void;
        vi.mocked(api.getGeneratedResources).mockImplementationOnce(() => new Promise<any[]>(res => { release = () => res(rows.map(r => ({ ...r }))); }));
        vi.mocked(api.aiChat).mockImplementation(async (body: any) => aiAnswer(body) as any);
        const { navigateTo } = setup();
        fireEvent.change(screen.getByLabelText('Class Name'), { target: { value: 'cls-1' } });
        fireEvent.change(screen.getByLabelText('Subject'), { target: { value: 'sub-1' } });
        fireEvent.change(screen.getByPlaceholderText('Main Topic for the Week'), { target: { value: 'Number bases' } });

        expect(screen.getByRole('button', { name: /Generate AI Resources/ })).toBeDisabled();
        expect(screen.getByRole('button', { name: 'Generate Locally (No AI)' })).toBeDisabled();
        expect(screen.getByText('Loading your saved plans…')).toBeInTheDocument();

        release();
        await waitFor(() => expect(screen.getByRole('button', { name: /Generate AI Resources/ })).toBeEnabled());
        fireEvent.click(screen.getByRole('button', { name: /Generate AI Resources/ }));
        await waitFor(() => expect(navigateTo).toHaveBeenCalled());
        expect(savedTermsNow()).toEqual(['First Term', 'Second Term']);
    });

    it('re-reads the saved plan from the server right before merging', async () => {
        vi.mocked(api.aiChat).mockImplementation(async (body: any) => aiAnswer(body) as any);
        const { navigateTo } = setup();
        await fillForm();
        seedSecondTerm(); // saved elsewhere after this screen loaded its list
        fireEvent.click(screen.getByRole('button', { name: /Generate Locally/ }));
        await waitFor(() => expect(navigateTo).toHaveBeenCalled());
        expect(vi.mocked(api.getGeneratedResources).mock.calls.some(c => (c[1] as any)?.fresh)).toBe(true);
        expect(savedTermsNow()).toEqual(['First Term', 'Second Term']);
    });

    it('does not save when the saved plan cannot be re-read', async () => {
        vi.mocked(api.aiChat).mockImplementation(async (body: any) => aiAnswer(body) as any);
        setup();
        await fillForm();
        vi.mocked(api.getGeneratedResources).mockRejectedValue(new Error('offline'));
        fireEvent.click(screen.getByRole('button', { name: /Generate AI Resources/ }));
        const alert = await screen.findByRole('alert');
        expect(alert).toHaveTextContent(/left unchanged/);
        expect(api.saveGeneratedResource).not.toHaveBeenCalled();
    });

    it('when the saved plans fail to load: Generate stays off, Retry loads them', async () => {
        vi.mocked(api.getGeneratedResources).mockRejectedValueOnce(new Error('offline'));
        setup();
        fireEvent.change(screen.getByLabelText('Class Name'), { target: { value: 'cls-1' } });
        fireEvent.change(screen.getByLabelText('Subject'), { target: { value: 'sub-1' } });
        fireEvent.change(screen.getByPlaceholderText('Main Topic for the Week'), { target: { value: 'Number bases' } });
        const alert = await screen.findByRole('alert');
        expect(alert).toHaveTextContent(/Could not load your saved plans/);
        expect(screen.getByRole('button', { name: /Generate AI Resources/ })).toBeDisabled();
        fireEvent.click(within(alert).getByRole('button', { name: 'Retry' }));
        await waitFor(() => expect(screen.getByRole('button', { name: /Generate AI Resources/ })).toBeEnabled());
    });

    it('Saved Plans shows loading, not "No generated plans yet", while the list loads', async () => {
        vi.mocked(api.getGeneratedResources).mockImplementationOnce(() => new Promise<any[]>(() => {}));
        setup();
        fireEvent.click(screen.getByRole('button', { name: 'Saved Plans' }));
        const dialog = await screen.findByRole('dialog');
        expect(within(dialog).getByRole('status')).toBeInTheDocument();
        expect(within(dialog).queryByText('No generated plans yet')).not.toBeInTheDocument();
    });

    it('a cancelled run never saves or opens, even after a new run starts', async () => {
        let releaseFirst!: () => void;
        const firstRunGate = new Promise<void>(res => { releaseFirst = res; });
        vi.mocked(api.aiChat).mockImplementation(async (body: any) => {
            if (body.messages[1].content.includes('Third Term')) await firstRunGate;
            return aiAnswer(body) as any;
        });
        const { navigateTo } = setup();
        await fillForm();
        fireEvent.click(screen.getByRole('tab', { name: 'Third Term' }));
        fireEvent.change(screen.getByPlaceholderText('Main Topic for the Week'), { target: { value: 'Variation' } });
        fireEvent.click(screen.getByRole('button', { name: /Generate AI Resources/ }));
        fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }));

        fireEvent.click(screen.getByRole('tab', { name: 'Second Term' }));
        fireEvent.change(screen.getByPlaceholderText('Main Topic for the Week'), { target: { value: 'Logarithms' } });
        fireEvent.click(screen.getByRole('button', { name: /Generate AI Resources/ }));
        await waitFor(() => expect(navigateTo).toHaveBeenCalledTimes(1));

        releaseFirst();                                   // the cancelled run's AI answers now arrive
        await new Promise(r => setTimeout(r, 50));
        expect(navigateTo).toHaveBeenCalledTimes(1);
        expect(navigateTo.mock.calls[0][2].initialTerm).toBe('Second Term');
        const savedBodies = vi.mocked(api.saveGeneratedResource).mock.calls.map(c => c[1].content as string);
        expect(savedBodies.some(b => b.includes('Variation'))).toBe(false);
        expect(savedTermsNow()).toEqual(['Second Term']);
    });

    it('leaving the screen stops a running generation from saving', async () => {
        let release!: () => void;
        const gate = new Promise<void>(res => { release = res; });
        vi.mocked(api.aiChat).mockImplementation(async (body: any) => { await gate; return aiAnswer(body) as any; });
        const { navigateTo, unmount } = setup();
        await fillForm();
        fireEvent.click(screen.getByRole('button', { name: /Generate AI Resources/ }));
        await screen.findByRole('button', { name: 'Cancel' });
        unmount();
        release();
        await new Promise(r => setTimeout(r, 50));
        expect(api.saveGeneratedResource).not.toHaveBeenCalled();
        expect(navigateTo).not.toHaveBeenCalled();
    });
});
