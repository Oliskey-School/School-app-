import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import Login from '../Login';
import { renderWithProviders } from '../../../test-utils';
import { authenticateUser } from '../../../lib/auth';

// Mock the auth service
vi.mock('../../../lib/auth', () => ({
    authenticateUser: vi.fn(),
    logoutUser: vi.fn(),
}));

// Mock api to prevent AuthContext initialization errors
vi.mock('../../../lib/api', () => ({
    api: {
        getMe: vi.fn().mockResolvedValue(null),
        getMemberships: vi.fn().mockResolvedValue([]),
    }
}));

const mockSwitchDemoRole = vi.fn().mockResolvedValue(undefined);

// Mock AuthContext to provide signIn function and prevent auto-initialization
vi.mock('../../../context/AuthContext', () => ({
    useAuth: () => ({
        signIn: vi.fn().mockResolvedValue(undefined),
        signInWithGoogle: vi.fn(),
        switchDemoRole: mockSwitchDemoRole,
        loading: false,
        user: null,
    }),
    AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

describe('Login Component Integration Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
    });

    it('renders login form by default', async () => {
        mockSwitchDemoRole.mockClear();
        renderWithProviders(<Login onNavigateToSignup={vi.fn()} onNavigateToCreateSchool={vi.fn()} />);
        
        // Use findBy to wait for AuthProvider loading to finish
        expect(await screen.findByText(/School Portal Sign In/i)).toBeDefined();
        expect(await screen.findByPlaceholderText(/Email or Username/i)).toBeDefined();
        expect(await screen.findByPlaceholderText(/Password/i)).toBeDefined();
    });

    describe('Manual Login Flow', () => {
        it('signs in successfully with valid credentials', async () => {
            (authenticateUser as any).mockResolvedValue({
                success: true,
                user: { id: '123', email: 'test@example.com' },
                userId: '123',
                email: 'test@example.com',
                userType: 'admin',
                profile: { name: 'Test User' },
                school: { id: 'school123', name: 'Test School' }
            });

            renderWithProviders(<Login onNavigateToSignup={vi.fn()} />);

            const emailInput = await screen.findByPlaceholderText(/Email or Username/i);
            const passwordInput = await screen.findByPlaceholderText(/Password/i);
            const signInBtn = await screen.findByRole('button', { name: /Sign In/i });

            fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
            fireEvent.change(passwordInput, { target: { value: 'password123' } });
            fireEvent.click(signInBtn);

            await waitFor(() => {
                expect(authenticateUser).toHaveBeenCalledWith('test@example.com', 'password123');
            });
        });

        it('shows error message on failed login', async () => {
            (authenticateUser as any).mockResolvedValue({
                success: false,
                error: 'Invalid credentials'
            });

            renderWithProviders(<Login onNavigateToSignup={vi.fn()} />);

            const emailInput = await screen.findByPlaceholderText(/Email or Username/i);
            const passwordInput = await screen.findByPlaceholderText(/Password/i);
            const signInBtn = await screen.findByRole('button', { name: /Sign In/i });

            fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
            fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
            fireEvent.click(signInBtn);

            await waitFor(() => {
                expect(screen.getByText(/Invalid credentials/i)).toBeDefined();
            });
        });
    });

    describe('Quick Login Flow (Demo)', () => {
        it('signs in successfully via demo mode', async () => {
            (authenticateUser as any).mockResolvedValue({
                success: true,
                userId: 'demo-admin-id',
                email: 'admin@demo.com',
                userType: 'admin'
            });

            renderWithProviders(<Login onNavigateToSignup={vi.fn()} />);

            const tryDemoBtn = await screen.findByText(/Try Demo School/i);
            fireEvent.click(tryDemoBtn);

            const adminBtn = await screen.findAllByText(/Admin/i);
            fireEvent.click(adminBtn[0]);

            await waitFor(() => {
                expect(mockSwitchDemoRole).toHaveBeenCalledWith('admin');
            });
        });
    });
});
