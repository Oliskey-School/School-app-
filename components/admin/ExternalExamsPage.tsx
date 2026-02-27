import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeftIcon } from '../../constants';
import { ExamCandidateRegistration, ExamCandidateRegistrationHandle } from './ExamCandidateRegistration';

/**
 * ExternalExamsPage - A standalone desktop-optimized page for exam registration.
 * Matches the layout and premium design requested in the user's screenshot.
 */
const ExternalExamsPage: React.FC = () => {
    const navigate = useNavigate();
    const registrationRef = useRef<ExamCandidateRegistrationHandle>(null);
    const [selectedCount, setSelectedCount] = useState(0);
    const [isRegistering, setIsRegistering] = useState(false);
    
    return (
        <div className="min-h-screen bg-[#F8F9FC] font-sans text-gray-900 pb-12">
            {/* Top Navigation / Breadcrumb area */}
            <div className="max-w-[1600px] mx-auto pt-4 px-6 mb-2">
                 <button 
                    onClick={() => navigate(-1)}
                    className="flex items-center text-sm text-indigo-600 font-semibold hover:text-indigo-800 transition-colors"
                >
                    <ChevronLeftIcon className="w-4 h-4 mr-1" />
                    Back to Dashboard
                </button>
            </div>

            <main className="max-w-[1600px] mx-auto px-6">
                {/* Header Section from screenshot */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-[28px] font-extrabold text-[#1A1C21] tracking-tight">
                            External Exam Registration
                        </h1>
                        <p className="text-gray-500 text-base mt-1">
                            Register students for WAEC, NECO, IGCSE and other bodies.
                        </p>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <button
                            id="header-export-csv"
                            onClick={() => registrationRef.current?.handleExport()}
                            className="flex items-center bg-[#F3F4F6] text-[#374151] px-5 py-2.5 rounded-xl font-bold text-sm border border-gray-200 hover:bg-gray-200 transition-all shadow-sm group"
                        >
                            <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Export CSV
                        </button>
                        <button
                            id="header-register-selected"
                            onClick={() => registrationRef.current?.handleBulkRegister()}
                            disabled={selectedCount === 0 || isRegistering}
                            className="flex items-center bg-[#5850EC] text-white px-6 py-2.5 rounded-xl font-extrabold text-sm shadow-lg shadow-indigo-100 ring-2 ring-indigo-50 hover:bg-[#4338CA] transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:scale-100 disabled:shadow-none"
                        >
                            <svg className="w-5 h-5 mr-2 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            {isRegistering ? 'Registering...' : `Register Selected (${selectedCount})`}
                        </button>
                    </div>
                </div>

                {/* Main Content Card Wrapper */}
                <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden min-h-[70vh]">
                    <ExamCandidateRegistration 
                        ref={registrationRef}
                        onSelectionChange={setSelectedCount}
                        externalActions={{
                            registering: isRegistering,
                            setRegistering: setIsRegistering
                        }}
                    />
                </div>
            </main>
        </div>
    );
};

export default ExternalExamsPage;
