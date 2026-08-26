import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import StudentCBTPlayerScreen from '../cbt/StudentCBTPlayerScreen';

vi.mock('../../../context/AuthContext', () => ({
    useAuth: () => ({ currentSchool: { id: 'school-123', name: 'Test School' } })
}));

const { mockApi, mockSync } = vi.hoisted(() => ({
    mockApi: {
        getQuizQuestions: vi.fn(),
        submitQuiz: vi.fn()
    },
    mockSync: vi.fn().mockResolvedValue(true)
}));

vi.mock('../../../lib/api', () => ({ api: mockApi }));
vi.mock('../../../lib/database', () => ({ syncCBTToGradebook: mockSync }));
vi.mock('react-hot-toast', () => ({
    toast: { success: vi.fn(), error: vi.fn() }
}));

// The server strips the answer key before sending questions to a student, so the
// questions the browser receives never carry correct_answer / isCorrect.
const QUESTIONS_WITHOUT_ANSWER_KEY = [
    { id: 'q1', question_text: 'What is 2 + 2?', options: ['3', '4', '5'], points: 1 },
    { id: 'q2', question_text: 'Capital of Nigeria?', options: ['Lagos', 'Abuja'], points: 1 }
];

const TEST: any = { id: 'quiz-1', title: 'Maths CBT', duration: 30, questions: [] };
const STORAGE_KEY = 'cbt-attempt:quiz-1:student-9';

const renderPlayer = () =>
    render(<StudentCBTPlayerScreen test={TEST} studentId={'student-9'} handleBack={vi.fn()} />);

const click = async (matcher: RegExp) => {
    const el = await screen.findByRole('button', { name: matcher });
    fireEvent.click(el);
    return el;
};

const startExam = async () => {
    await screen.findByText('Exam Instructions');
    await click(/I Am Ready, Start Exam/i);
};

beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    mockApi.getQuizQuestions.mockResolvedValue(QUESTIONS_WITHOUT_ANSWER_KEY);
    mockApi.submitQuiz.mockResolvedValue({ score: 50, total_questions: 2 });
});

afterEach(() => {
    vi.useRealTimers();
});

describe('StudentCBTPlayerScreen — exam integrity', () => {
    it('persists the attempt so a reload does not lose the answers', async () => {
        const { unmount } = renderPlayer();
        await startExam();

        await click(/4/);

        await waitFor(() => {
            const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
            expect(stored.answers).toEqual({ q1: '4' });
        });

        // Simulate a reload: unmount and mount fresh against the same storage.
        unmount();
        renderPlayer();

        // The instructions are skipped and the answer is restored as selected.
        await waitFor(() => {
            expect(screen.queryByText('Exam Instructions')).not.toBeInTheDocument();
        });
        const restored = await screen.findByRole('button', { name: /4/ });
        expect(restored.className).toContain('border-indigo-500');
    });

    it('stores an absolute deadline, so reloading cannot hand back more time', async () => {
        const { unmount } = renderPlayer();
        await startExam();

        const first = await waitFor(() => {
            const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
            expect(typeof stored.deadlineAt).toBe('number');
            return stored.deadlineAt as number;
        });

        unmount();
        renderPlayer();

        await waitFor(() => {
            const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
            // The same deadline is reused — the clock is not restarted.
            expect(stored.deadlineAt).toBe(first);
        });
    });

    it('does not resume an attempt whose deadline has already passed', async () => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            deadlineAt: Date.now() - 1000,
            answers: { q1: '4' },
            currentQuestionIndex: 0,
            focusViolations: 0
        }));

        renderPlayer();

        // Falls back to the instructions screen rather than resuming a dead attempt.
        expect(await screen.findByText('Exam Instructions')).toBeInTheDocument();
        await waitFor(() => expect(localStorage.getItem(STORAGE_KEY)).toBeNull());
    });

    it('sends no client-computed score, student_id or school_id', async () => {
        renderPlayer();
        await startExam();

        await click(/4/);
        await click(/Next/i);
        await click(/Abuja/);
        await click(/Submit Test/i);

        await waitFor(() => expect(mockApi.submitQuiz).toHaveBeenCalledTimes(1));
        const [, payload] = mockApi.submitQuiz.mock.calls[0];
        expect(payload).toEqual({
            quiz_id: 'quiz-1',
            answers: { q1: '4', q2: 'Abuja' },
            focus_violations: 0
        });
        expect(payload).not.toHaveProperty('score');
        expect(payload).not.toHaveProperty('student_id');
        expect(payload).not.toHaveProperty('school_id');
    });

    it('shows the score the server returned, not a locally computed zero', async () => {
        renderPlayer();
        await startExam();

        await click(/4/);
        await click(/Next/i);
        await click(/Submit Test/i);

        expect(await screen.findByText('Test Submitted!')).toBeInTheDocument();
        expect(screen.getByText('50%')).toBeInTheDocument();
        expect(screen.getByText('1 / 2')).toBeInTheDocument();
    });

    it('keeps the attempt recoverable when submission fails', async () => {
        mockApi.submitQuiz.mockRejectedValueOnce(new Error('network down'));
        renderPlayer();
        await startExam();

        await click(/4/);
        await click(/Next/i);
        await click(/Submit Test/i);

        // The success screen must NOT appear, and the saved attempt must survive.
        await waitFor(() => {
            expect(screen.getByRole('button', { name: /Retry Submit/i })).toBeEnabled();
        });
        expect(screen.queryByText('Test Submitted!')).not.toBeInTheDocument();
        expect(JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}').answers).toEqual({ q1: '4' });

        // Retrying succeeds and clears the stored attempt.
        mockApi.submitQuiz.mockResolvedValueOnce({ score: 50, total_questions: 2 });
        await click(/Retry Submit/i);

        expect(await screen.findByText('Test Submitted!')).toBeInTheDocument();
        await waitFor(() => expect(localStorage.getItem(STORAGE_KEY)).toBeNull());
    });

    it('clears the saved attempt only after a successful submission', async () => {
        renderPlayer();
        await startExam();

        await click(/4/);
        await waitFor(() => expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull());

        await click(/Next/i);
        await click(/Submit Test/i);

        await screen.findByText('Test Submitted!');
        expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    });

    it('does not write a real student result into the demo school when context is missing', async () => {
        renderPlayer();
        await startExam();

        await click(/4/);
        await click(/Next/i);
        await click(/Submit Test/i);

        await screen.findByText('Test Submitted!');
        // The mocked school context resolves, so the sync uses it — and never the
        // hardcoded demo school id that used to be the fallback.
        await waitFor(() => expect(mockSync).toHaveBeenCalled());
        const schoolIdArg = mockSync.mock.calls[0][3];
        expect(schoolIdArg).toBe('school-123');
        expect(schoolIdArg).not.toBe('d0ff3e95-9b4c-4c12-989c-e5640d3cacd1');
    });
});
