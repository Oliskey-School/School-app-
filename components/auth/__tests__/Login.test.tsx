import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// MOCKS MUST BE DEFINED BEFORE IMPORTS THAT USE THEM
// 1. Mock AuthContext
const mockSignIn = vi.fn();
vi.mock('../../../context/AuthContext', () => ({
    useAuth: () => ({
        signIn: mockSignIn,
        user: null,
        loading: false
    })
}));

// 2. Mock Supabase Client
vi.mock('../../../lib/supabase', () => ({
    supabase: {
        auth: {
            signInWithPassword: vi.fn(),
            signInWithOAuth: vi.fn()
        },
        from: vi.fn(() => ({
            select: vi.fn(() => ({
                eq: vi.fn(() => ({
                    maybeSingle: vi.fn(() => ({ data: null, error: null }))
                }))
            }))
        }))
    }
}));

// 3. Mock Navigation
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
    useNavigate: () => mockNavigate
}));

// 4. Mock authenticateUser
vi.mock('../../../lib/auth', () => ({
    authenticateUser: vi.fn(() => new Promise(() => { }))
}));

import Login from '../Login';
import { AuthProvider } from '../../../context/AuthContext';
import { supabase } from '../../../lib/supabase';
import { authenticateUser } from '../../../lib/auth';
import React from 'react';


// ============================================
// TEST SUITE
// ============================================
describe('Login Component Integration Tests', () => {

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders the login form correctly', () => {
        render(<Login onNavigateToSignup={vi.fn()} onNavigateToCreateSchool={vi.fn()} />);

        expect(screen.getByPlaceholderText(/Gmail/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/Password/i)).toBeInTheDocument();
        expect(screen.getByText('Sign In')).toBeInTheDocument();
    });

    describe('Manual Login Flow', () => {
        /**
         * TRACEABILITY:
         * Start: User enters email/password and clicks "Sign In".
         * Trigger: handleLogin() -> authenticateUser()
         * End: mockSignIn() called with DashboardType
         */
        it('handles successful manual login', async () => {
            // Override mock to return success
            (authenticateUser as any).mockResolvedValue({
                success: true,
                userType: 'admin',
                userId: '123',
                email: 'admin@demo.com',
                token: 'mock-jwt',
                schoolGeneratedId: 'SCH-123',
                userData: { school_id: '000-000' }
            });

            render(<Login onNavigateToSignup={vi.fn()} />);

            // 1. User Interaction
            fireEvent.change(screen.getByPlaceholderText(/Gmail/i), { target: { value: 'admin@demo.com' } });
            fireEvent.change(screen.getByPlaceholderText(/Password/i), { target: { value: 'password123' } });

            const btn = screen.getByText('Sign In');
            fireEvent.click(btn);

            // 2. State verification - Loading
            expect(screen.getByText('Signing In...')).toBeInTheDocument();
            expect(btn).toBeDisabled();

            // 3. State verification - Success
            await waitFor(() => {
                expect(mockSignIn).toHaveBeenCalledWith(
                    expect.anything(),
                    expect.objectContaining({ userId: '123' })
                );
            });
        });

        it('displays error on empty fields', async () => {
            // ... existing test ...
            render(<Login onNavigateToSignup={vi.fn()} />);

            fireEvent.click(screen.getByText('Sign In'));

            // Verification using regex for robustness
            expect(await screen.findByText(/please enter both email and password/i)).toBeInTheDocument();
        });
    });

    describe('Quick Login Flow (Demo)', () => {
        /**
        * TRACEABILITY:
        * Start: User clicks "Admin" quick login button.
        * Trigger: handleQuickLogin('admin') -> supabase.auth.signInWithPassword()
        * End: mockSignIn() called with Admin role
        */
        it('attempts valid auth for Admin quick login', async () => {
            // ... existing test ...
            // Mock successful Supabase response for seeded user
            (supabase.auth.signInWithPassword as any).mockResolvedValue({
                data: {
                    user: { id: 'test-id', email: 'admin@demo.com' },
                    session: { access_token: 'valid-token' }
                },
                error: null
            });

            render(<Login onNavigateToSignup={vi.fn()} />);

            // Switch to Demo View first
            fireEvent.click(screen.getByText(/Try Demo School/i));

            // Find Admin button
            const adminBtn = screen.getByText('Admin');
            expect(adminBtn).toBeInTheDocument();

            // Click
            fireEvent.click(adminBtn);

            // Verification: Ensure Supabase was called with CORRECT seeded credentials
            await waitFor(() => {
                expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
                    email: 'admin@demo.com', // Must match seeding!
                    password: 'password123'
                });
            });

            // Ensure AuthContext.signIn was called
            await waitFor(() => {
                expect(mockSignIn).toHaveBeenCalledWith(
                    expect.stringMatching(/admin/i), // DashboardType
                    expect.objectContaining({
                        email: 'admin@demo.com',
                        isDemo: true
                    })
                );
            });
        });

        it('shows error if quick login fails (Real Auth Fail)', async () => {
            // Mock failure (e.g. invalid credentials on backend)
            (supabase.auth.signInWithPassword as any).mockResolvedValue({
                data: { user: null, session: null },
                error: { message: 'Failed to login as admin.' }
            });

            render(<Login onNavigateToSignup={vi.fn()} />);

            // Go to demo view
            fireEvent.click(screen.getByText(/Try Demo School/i));

            // Click Admin
            fireEvent.click(screen.getByText('Admin'));

            // Verify Error Message
            // Relaxed assertion to catch any error message
            expect(await screen.findByText(/failed|error/i)).toBeInTheDocument();

            // Ensure mockSignIn was NOT called
            expect(mockSignIn).not.toHaveBeenCalled();
        });
    });
});
