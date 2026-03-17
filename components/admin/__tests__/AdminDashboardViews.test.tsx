import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AdminSidebar } from '../../ui/DashboardSidebar';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock required contexts or hooks used by sidebar if any
vi.mock('../../../context/AuthContext', () => ({
    useAuth: () => ({
        user: { id: 'test-user-id', email: 'admin@test.com' },
        currentSchool: { id: 'school-123', name: 'Test School' },
    })
}));

const queryClient = new QueryClient();

describe('AdminSidebar Navigation Labels', () => {
    it('contains the correct navigation labels', async () => {
        const setActiveScreen = vi.fn();
        
        render(
            <QueryClientProvider client={queryClient}>
                <MemoryRouter>
                    <AdminSidebar 
                        activeScreen="home" 
                        setActiveScreen={setActiveScreen}
                        onLogout={vi.fn()}
                        schoolName="Test School"
                    />
                </MemoryRouter>
            </QueryClientProvider>
        );

        // Check for labels to match actual implementation
        // Based on the sidebar code, we expect these:
        expect(await screen.findByText(/Approvals/i)).toBeInTheDocument();
        expect(await screen.findByText(/Fee Management/i)).toBeInTheDocument();
        expect(await screen.findByText(/Branches/i)).toBeInTheDocument();
        expect(await screen.findByText(/Settings/i)).toBeInTheDocument();
    });

    it('triggers setActiveScreen on click', async () => {
        const setActiveScreen = vi.fn();
        
        render(
            <QueryClientProvider client={queryClient}>
                <MemoryRouter>
                    <AdminSidebar 
                        activeScreen="home" 
                        setActiveScreen={setActiveScreen}
                        onLogout={vi.fn()}
                        schoolName="Test School"
                    />
                </MemoryRouter>
            </QueryClientProvider>
        );

        const approvalsLink = await screen.findByText(/Approvals/i);
        fireEvent.click(approvalsLink);
        
        // It might be nested or have a specific ID, but clicking the text should work if it's a button or link
        expect(setActiveScreen).toHaveBeenCalled();
    });
});
