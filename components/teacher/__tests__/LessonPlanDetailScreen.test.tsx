import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('../../../lib/api', () => ({ api: {} }));
vi.mock('../../../lib/ai', () => ({ getAIClient: vi.fn(), SchemaType: {} }));

import LessonPlanDetailScreen from '../LessonPlanDetailScreen';

const resources: any = {
    subject: 'Mathematics', className: 'SSS 1 A',
    terms: [
        { term: 'First Term', schemeOfWork: [], lessonPlans: [], assessments: [] },
        {
            term: 'Second Term', schemeOfWork: [{ week: 2, topic: 'Indices', subTopics: [] }],
            lessonPlans: [{ week: 2, topic: 'Indices', objectives: ['State the laws of indices'], materials: ['Chalkboard'], teachingSteps: [{ step: 'Introduction', description: 'Recall powers.' }], duration: '40 minutes', keyVocabulary: ['index'], assessmentMethods: ['Oral'] }],
            assessments: [{ week: 2, type: 'Week 2 evaluation', totalMarks: 5, questions: [{ id: 1, question: 'Simplify 2^3 x 2^2.', type: 'theory', marks: 5 }] }],
        },
    ],
    detailedNotes: [{ topic: 'Indices', note: '### Laws\nFirst law', term: 'Second Term', week: 2 }],
};

describe('LessonPlanDetailScreen', () => {
    it('opens on the requested term and shows objectives, steps and the lesson note', () => {
        render(<LessonPlanDetailScreen resources={resources} initialTerm="Second Term" navigateTo={vi.fn()} />);
        expect(screen.getByRole('tab', { name: /Second Term/ })).toHaveAttribute('aria-selected', 'true');
        expect(screen.getByText('State the laws of indices')).toBeInTheDocument();
        expect(screen.getByText('Recall powers.')).toBeInTheDocument();
        expect(screen.getByText('Laws')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('tab', { name: /Assessments/ }));
        expect(screen.getByText('Simplify 2^3 x 2^2.')).toBeInTheDocument();
    });

    it('shows a helpful empty state for a term without plans', () => {
        render(<LessonPlanDetailScreen resources={resources} initialTerm="First Term" navigateTo={vi.fn()} />);
        expect(screen.getByText('No lesson plans for this term yet')).toBeInTheDocument();
    });

    it('opens plans saved in the old format instead of showing nothing', () => {
        const legacy: any = { subject: 'Mathematics', className: 'SSS 1 A', terms: [{ term: 'First Term', weeks: [{ week: 1, topic: 'Number bases', learningObjectives: ['Convert bases'], resources: ['Textbook'] }] }] };
        render(<LessonPlanDetailScreen resources={legacy} navigateTo={vi.fn()} />);
        expect(screen.getByText('Number bases')).toBeInTheDocument();
        expect(screen.getByText('Convert bases')).toBeInTheDocument();
    });

    it('falls back to the first term with plans when the requested term is not in the plan', () => {
        const { rerender } = render(<LessonPlanDetailScreen resources={resources} initialTerm="Third Term" navigateTo={vi.fn()} />);
        expect(screen.getByRole('tab', { name: /Second Term/ })).toHaveAttribute('aria-selected', 'true');
        expect(screen.getByText('State the laws of indices')).toBeInTheDocument();
        // Re-opened with another plan without remounting: still never blank.
        const other: any = { subject: 'English', className: 'JSS 1 A', terms: [{ term: 'First Term', schemeOfWork: [], lessonPlans: [{ week: 1, topic: 'Nouns', objectives: ['Define a noun'], materials: [], teachingSteps: [], duration: '', keyVocabulary: [], assessmentMethods: [] }], assessments: [] }] };
        rerender(<LessonPlanDetailScreen resources={other} initialTerm="Second Term" navigateTo={vi.fn()} />);
        expect(screen.getByText('Define a noun')).toBeInTheDocument();
    });
});
