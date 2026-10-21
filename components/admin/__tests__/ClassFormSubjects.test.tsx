import React from 'react';
import { render, screen, fireEvent, waitFor, act, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ClassFormScreen from '../ClassFormScreen';

const apiMock = vi.hoisted(() => ({
    getSubjects: vi.fn(),
    getClasses: vi.fn(),
    getClassSubjectImpact: vi.fn(),
    addClassSubject: vi.fn(),
    removeClassSubject: vi.fn(),
    updateClass: vi.fn(),
    createClass: vi.fn(),
}));
vi.mock('../../../lib/api', () => ({ default: apiMock, api: apiMock }));
vi.mock('react-hot-toast', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const ss1a = { id: 'c-a', name: 'SSS 1', grade: 10, section: 'A', subjects: [{ id: 's-eng', name: 'English' }] } as any;
const ss1b = { id: 'c-b', name: 'SSS 1', grade: 10, section: 'B', subjects: [{ id: 's-eng', name: 'English' }] } as any;

const renderForm = () => render(<QueryClientProvider client={new QueryClient()}>
    <ClassFormScreen classToEdit={ss1a} schoolId="sch" currentBranchId="br" handleBack={vi.fn()} forceUpdate={vi.fn()} /></QueryClientProvider>
);

const pickerInput = () => screen.getByText('Subjects (taught in this class)').parentElement!.querySelector('input') as HTMLInputElement;

const openPickerAndChoose = async (option: string) => {
    fireEvent.focus(pickerInput());
    fireEvent.click(await screen.findByText(option));
};

describe('Edit Class → subject add/remove prompts', () => {
    beforeEach(() => {
        Object.values(apiMock).forEach(f => f.mockReset());
        apiMock.getSubjects.mockResolvedValue([{ id: 's-eng', name: 'English' }, { id: 's-bio', name: 'Biology' }]);
        apiMock.getClasses.mockResolvedValue([ss1a, ss1b, { id: 'c-j', grade: 7, section: 'A', subjects: [] }]);
        apiMock.addClassSubject.mockResolvedValue({ subject: { id: 's-bio', name: 'Biology' } });
        apiMock.removeClassSubject.mockResolvedValue({});
    });

    it('asks which arms (with Select all), then asks about custom-list students, then saves', async () => {
        apiMock.getClassSubjectImpact.mockResolvedValue({ customCount: 3, inheritCount: 10, classes: [] });
        renderForm();
        await waitFor(() => expect(apiMock.getClasses).toHaveBeenCalled());
        await act(async () => { await Promise.resolve(); });
        await openPickerAndChoose('Biology');

        // Arm picker: only this level's arms, current one ticked
        expect(await screen.findByText('Add Biology')).toBeTruthy();
        const selectAll = screen.getByLabelText('Select all') as HTMLInputElement;
        expect(selectAll.checked).toBe(false);
        expect(screen.queryByText(/JSS 1/)).toBeNull();
        fireEvent.click(selectAll);
        fireEvent.click(screen.getByText('Continue'));

        // Custom-list prompt with the count
        expect(await screen.findByText(/3 students have a custom subject list/)).toBeTruthy();
        expect(apiMock.getClassSubjectImpact).toHaveBeenCalledWith('c-a', 'Biology', ['c-a', 'c-b']);
        fireEvent.click(screen.getByText('Yes, add it'));

        await waitFor(() => expect(apiMock.addClassSubject).toHaveBeenCalledWith('c-a', { subject_id: 's-bio', class_ids: ['c-a', 'c-b'], add_to_custom: true }));
        await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    });

    it('skips the custom-list question when nobody has a custom list, and "No" is honoured', async () => {
        apiMock.getClassSubjectImpact.mockResolvedValueOnce({ customCount: 0, inheritCount: 5, classes: [] });
        renderForm();
        await waitFor(() => expect(apiMock.getClasses).toHaveBeenCalled());
        await act(async () => { await Promise.resolve(); });
        await openPickerAndChoose('Biology');
        fireEvent.click(await screen.findByText('Continue'));
        await waitFor(() => expect(apiMock.addClassSubject).toHaveBeenCalledWith('c-a', { subject_id: 's-bio', class_ids: ['c-a'], add_to_custom: false }));

        apiMock.getClassSubjectImpact.mockResolvedValueOnce({ customCount: 1, inheritCount: 5, classes: [] });
        apiMock.addClassSubject.mockClear();
        apiMock.addClassSubject.mockResolvedValue({ subject: { id: 's-new', name: 'Robotics' } });
        fireEvent.change(pickerInput(), { target: { value: 'Robotics' } });
        fireEvent.click(await screen.findByText(/Add new subject/));
        fireEvent.click(await screen.findByText('Continue'));
        expect(await screen.findByText(/1 student has a custom subject list/)).toBeTruthy();
        fireEvent.click(screen.getByText('No'));
        await waitFor(() => expect(apiMock.addClassSubject).toHaveBeenCalledWith('c-a', { name: 'Robotics', class_ids: ['c-a'], add_to_custom: false }));
    });

    it('remove asks for confirmation, says past results are kept, and Cancel changes nothing', async () => {
        renderForm();
        await waitFor(() => expect(apiMock.getClasses).toHaveBeenCalled());
        await act(async () => { await Promise.resolve(); });
        const chip = screen.getByText('English').closest('span')!;
        fireEvent.click(chip.querySelector('button')!);

        expect(await screen.findByText('Remove English')).toBeTruthy();
        expect(screen.getByText(/Past results, grades and scores for English are kept/)).toBeTruthy();
        fireEvent.click(within(screen.getByRole('dialog')).getByText('Cancel'));
        await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
        expect(apiMock.removeClassSubject).not.toHaveBeenCalled();
        expect(screen.getByText('English')).toBeTruthy();

        fireEvent.click(screen.getByText('English').closest('span')!.querySelector('button')!);
        fireEvent.click(within(await screen.findByRole('dialog')).getByText('Remove', { selector: 'button' }));
        await waitFor(() => expect(apiMock.removeClassSubject).toHaveBeenCalledWith('c-a', 's-eng', ['c-a']));
        await waitFor(() => expect(screen.queryByText('English')).toBeNull());
    });

    it('Update on an existing class no longer resends the subject list', async () => {
        apiMock.updateClass.mockResolvedValue({});
        const { container } = renderForm();
        fireEvent.submit(container.querySelector('form')!);
        await waitFor(() => expect(apiMock.updateClass).toHaveBeenCalled());
        expect(apiMock.updateClass.mock.calls[0][1]).not.toHaveProperty('subjects');
    });
});
