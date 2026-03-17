/**
 * test-utils.tsx
 * Custom render helper that wraps components with all required providers.
 * Use `renderWithProviders` instead of `render` in tests that need context.
 */
import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

import { AuthProvider } from './context/AuthContext';
import { ProfileProvider } from './context/ProfileContext';
import { BranchProvider } from './context/BranchContext';

const defaultQueryClient = new QueryClient({
    defaultOptions: {
        queries: { retry: false, gcTime: 0, staleTime: Infinity },
        mutations: { retry: false },
    },
});

function AllProviders({ children }: { children: React.ReactNode }) {
    return (
        <QueryClientProvider client={defaultQueryClient}>
            <MemoryRouter>
                <AuthProvider>
                    <ProfileProvider>
                        <BranchProvider>
                            {children}
                        </BranchProvider>
                    </ProfileProvider>
                </AuthProvider>
            </MemoryRouter>
        </QueryClientProvider>
    );
}

interface RenderWithProvidersOptions extends Omit<RenderOptions, 'wrapper'> {}

export function renderWithProviders(
    ui: ReactElement,
    options: RenderWithProvidersOptions = {}
) {
    return render(ui, { wrapper: AllProviders, ...options });
}

// Also export a createTestQueryClient helper
export function createTestQueryClient() {
    return new QueryClient({
        defaultOptions: {
            queries: { retry: false, gcTime: 0 },
            mutations: { retry: false },
        },
    });
}

// Re-export everything from testing-library for convenience
export * from '@testing-library/react';
