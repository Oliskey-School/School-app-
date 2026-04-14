import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { CheckCircle, XCircle, Loader2, School } from 'lucide-react';

/**
 * InviteAcceptScreen
 *
 * Handles the invite-link landing flow:
 *   1. Extracts access_token / refresh_token from the URL fragment
 *   2. Creates a Supabase session
 *   3. Calls POST /api/invite/complete to generate school_generated_id
 *   4. Shows a brief welcome message
 *   5. Redirects the user to their role-appropriate dashboard
 */

type Status = 'processing' | 'success' | 'error';

const ROLE_DASHBOARD: Record<string, string> = {
    admin:               '/admin/dashboard',
    proprietor:          '/admin/dashboard',
    teacher:             '/teacher/dashboard',
    parent:              '/parent/dashboard',
    student:             '/student/dashboard',
    inspector:           '/inspector/dashboard',
    examofficer:         '/admin/dashboard',
    complianceofficer:   '/admin/dashboard',
    counselor:           '/admin/dashboard',
};

const InviteAcceptScreen: React.FC = () => {
    const [status, setStatus] = useState<Status>('processing');
    const [message, setMessage] = useState('Setting up your account...');
    const [schoolGeneratedId, setSchoolGeneratedId] = useState<string | null>(null);
    const [role, setRole] = useState<string>('');
    const [errorDetails, setErrorDetails] = useState<string | null>(null);

    useEffect(() => {
        const run = async () => {
            try {
                // 1. Parse URL for tokens and context
                // Supabase appends tokens as fragment: ...?role=x&school_id=y#access_token=...
                const fullUrl = window.location.href;
                let tokenParams = new URLSearchParams();
                let contextParams = new URLSearchParams();

                if (fullUrl.includes('access_token')) {
                    const fragStart = fullUrl.indexOf('access_token');
                    tokenParams = new URLSearchParams(fullUrl.substring(fragStart));
                }

                // Context params sit before the fragment — extract from hash path portion
                const hashPart = window.location.hash; // #/invite/accept?role=...&school_id=...#access_token...
                const contextStart = hashPart.indexOf('?');
                const contextEnd = hashPart.indexOf('#', 1);
                if (contextStart !== -1) {
                    const raw = contextEnd !== -1
                        ? hashPart.substring(contextStart + 1, contextEnd)
                        : hashPart.substring(contextStart + 1);
                    contextParams = new URLSearchParams(raw);
                }

                const accessToken = tokenParams.get('access_token');
                // const refreshToken = tokenParams.get('refresh_token'); // Not used currently in local backend flow
                const inviteRole = contextParams.get('role') || '';

                setRole(inviteRole);

                const errorCode = tokenParams.get('error');
                if (errorCode) {
                    throw new Error(tokenParams.get('error_description')?.replace(/\+/g, ' ') || 'Invite link error');
                }

                // If no token in URL, check localStorage
                const localToken = localStorage.getItem('auth_token');
                const tokenToUse = accessToken || localToken;

                if (!tokenToUse) {
                    throw new Error('No valid tokens found. The invite link may have expired.');
                }

                // 2. Set the session (local token storage)
                setMessage('Verifying your invitation...');
                if (accessToken) {
                    localStorage.setItem('auth_token', accessToken);
                }

                // 3. Call the backend to generate school_generated_id
                setMessage('Generating your school ID...');
                const currentToken = localStorage.getItem('auth_token');
                if (!currentToken) throw new Error('Session could not be established.');

                const data: any = await api.post('/invite/complete', {}, {
                    headers: {
                        Authorization: `Bearer ${currentToken}`,
                    },
                });

                const genId = data.school_generated_id || null;
                setSchoolGeneratedId(genId);
                // Non-critical: if complete fails, user can still log in

                setStatus('success');
                setMessage('Welcome! Your account is ready.');

                // 4. Redirect after brief welcome display
                // Attempt to get role from user metadata or fallback
                const finalRole = inviteRole || 'admin';
                const destination = ROLE_DASHBOARD[finalRole.toLowerCase()] || '/';

                setTimeout(() => {
                    window.location.href = destination;
                }, 2200);

            } catch (err: any) {
                console.error('[InviteAcceptScreen]', err);
                setStatus('error');
                setMessage('Could not process invitation');
                setErrorDetails(err.message || 'The link may be expired or already used.');
            }
        };

        run();
    }, []);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-white px-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 text-center border border-gray-100">

                {status === 'processing' && (
                    <div className="space-y-5">
                        <div className="flex justify-center">
                            <div className="relative">
                                <div className="h-20 w-20 rounded-full border-4 border-indigo-100 border-t-indigo-600 animate-spin" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <School className="h-8 w-8 text-indigo-400" />
                                </div>
                            </div>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900">{message}</h2>
                        <p className="text-sm text-gray-500">This will only take a moment.</p>
                    </div>
                )}

                {status === 'success' && (
                    <div className="space-y-5">
                        <div className="flex justify-center">
                            <div className="h-20 w-20 bg-green-100 rounded-full flex items-center justify-center">
                                <CheckCircle className="h-10 w-10 text-green-600" />
                            </div>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900">{message}</h2>
                        {schoolGeneratedId && (
                            <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3">
                                <p className="text-xs text-indigo-500 font-medium uppercase tracking-wide mb-1">Your School ID</p>
                                <p className="text-lg font-bold text-indigo-700 font-mono">{schoolGeneratedId}</p>
                            </div>
                        )}
                        {role && (
                            <p className="text-sm text-gray-500">
                                You have been added as a{' '}
                                <span className="font-semibold text-gray-700 capitalize">{role}</span>.
                                Redirecting to your dashboard...
                            </p>
                        )}
                        <div className="flex justify-center">
                            <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
                        </div>
                    </div>
                )}

                {status === 'error' && (
                    <div className="space-y-5">
                        <div className="flex justify-center">
                            <div className="h-20 w-20 bg-red-100 rounded-full flex items-center justify-center">
                                <XCircle className="h-10 w-10 text-red-600" />
                            </div>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900">{message}</h2>
                        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl p-3">
                            {errorDetails}
                        </p>
                        <button
                            onClick={() => { window.location.href = '/'; }}
                            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-all"
                        >
                            Go to Login
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default InviteAcceptScreen;
