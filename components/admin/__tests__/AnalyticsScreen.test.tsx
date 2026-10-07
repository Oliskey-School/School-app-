import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import AnalyticsScreen from '../AnalyticsScreen';
import { fetchAnalyticsMetrics } from '../../../lib/database';
import { visibleItems, hiddenCount, enrollmentPoints, dayLabels } from '../analyticsChartData';

vi.mock('../../../lib/database', () => ({ fetchAnalyticsMetrics: vi.fn() }));
vi.mock('../../../hooks/useAutoSync', () => ({ useAutoSync: vi.fn() }));
vi.mock('../../../lib/api');

const subjects = Array.from({ length: 12 }, (_, i) => ({ label: `Subject ${i + 1}`, value: 50 + i, a11yLabel: `Subject ${i + 1}` }));
const teachers = Array.from({ length: 7 }, (_, i) => ({ label: `T${i + 1}`, name: `Teacher ${i + 1}`, value: 10 + i, lessons: 5 }));
const base = {
    performance: subjects,
    fees: { paid: 50, overdue: 25, unpaid: 25, paidCount: 2, overdueCount: 1, unpaidCount: 1, total: 4 },
    workload: teachers,
    attendance: [],
    attendanceTrend: [{ date: '2026-09-28', rate: 80, present: 7, late: 1, total: 10 }],
    enrollment: [{ year: 2026, label: '2026-06', count: 1 }, { year: 2026, label: '2026-09', count: 24 }],
};

describe('analyticsChartData helpers', () => {
    it('slices the first N items and keeps order', () => {
        expect(visibleItems([1, 2, 3, 4], 2, false)).toEqual([1, 2]);
        expect(visibleItems([1, 2, 3, 4], 2, true)).toEqual([1, 2, 3, 4]);
        expect(hiddenCount([1, 2, 3, 4], 2)).toBe(2);
        expect(hiddenCount([1], 2)).toBe(0);
    });
    it('fills missing enrollment months with 0', () => {
        const pts = enrollmentPoints(base.enrollment);
        expect(pts.map((p) => [p.short, p.count])).toEqual([['Jun 26', 1], ['Jul 26', 0], ['Aug 26', 0], ['Sep 26', 24]]);
        expect(enrollmentPoints([])).toEqual([]);
    });
    it('labels days without timezone drift', () => {
        expect(dayLabels('2026-09-28').short).toBe('Mon 28');
    });
});

describe('AnalyticsScreen', () => {
    beforeEach(() => vi.mocked(fetchAnalyticsMetrics).mockReset());

    it('shows the first 10 subjects and expands / folds the rest in place', async () => {
        vi.mocked(fetchAnalyticsMetrics).mockResolvedValue(base as any);
        render(<AnalyticsScreen schoolId="s1" currentBranchId={null} />);
        expect(await screen.findByText('Subject 10')).toBeInTheDocument();
        expect(screen.queryByText('Subject 11')).not.toBeInTheDocument();
        const subjBtn = () => screen.getAllByRole('button').find((b) => b.getAttribute('aria-controls') === 'analytics-subjects')!;
        expect(subjBtn()).toHaveTextContent('See more (2)');
        fireEvent.click(subjBtn());
        expect(screen.getByText('Subject 12')).toBeInTheDocument();
        expect(subjBtn()).toHaveTextContent('See less');
        fireEvent.click(subjBtn());
        expect(screen.queryByText('Subject 11')).not.toBeInTheDocument();
    });

    it('offers See more for teachers beyond the first 5', async () => {
        vi.mocked(fetchAnalyticsMetrics).mockResolvedValue(base as any);
        render(<AnalyticsScreen schoolId="s1" currentBranchId={null} />);
        await screen.findByText('Subject 1');
        const teacherBtn = screen.getAllByRole('button').find((b) => b.getAttribute('aria-controls') === 'analytics-teachers');
        expect(teacherBtn).toBeTruthy();
        expect(teacherBtn).toHaveTextContent('See more (2)');
        fireEvent.click(teacherBtn!);
        expect(teacherBtn).toHaveAttribute('aria-expanded', 'true');
        expect(teacherBtn).toHaveTextContent('See less');
    });

    it('shows "No fees set up yet" when there are no fees', async () => {
        vi.mocked(fetchAnalyticsMetrics).mockResolvedValue({ ...base, fees: { paid: 0, overdue: 0, unpaid: 0, total: 0 } } as any);
        render(<AnalyticsScreen schoolId="s1" currentBranchId={null} />);
        expect(await screen.findByText('No fees set up yet')).toBeInTheDocument();
    });

    it('shows an error state (not empty charts) when loading fails', async () => {
        vi.mocked(fetchAnalyticsMetrics).mockResolvedValue(null as any);
        render(<AnalyticsScreen schoolId="s1" currentBranchId={null} />);
        expect((await screen.findAllByText("Couldn't load this data")).length).toBeGreaterThan(0);
        expect(screen.queryByText('No fees set up yet')).not.toBeInTheDocument();
    });
});
