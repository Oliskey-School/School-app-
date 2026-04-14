import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SchoolLogoIcon, UserIcon, LockIcon, EyeIcon, EyeOffIcon, BuildingLibraryIcon, GlobeIcon, CheckCircleIcon, ArrowRightIcon, ChevronLeftIcon, PhoneIcon, MapPinIcon } from '../../constants';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useProfile } from '../../context/ProfileContext';
import { api } from '../../lib/api';
import { toast } from 'react-hot-toast';
import ImageUpload from '../shared/ImageUpload';
import { DashboardType } from '../../types';

interface CreateSchoolSignupProps {
    onNavigateToLogin: () => void;
}

const CreateSchoolSignup: React.FC<CreateSchoolSignupProps> = ({ onNavigateToLogin }) => {
    const { signIn } = useAuth();
    const navigate = useNavigate();

    const [step, setStep] = useState(1);

    const [formData, setFormData] = useState({
        schoolName: '',
        schoolCode: '',
        motto: '',
        address: '',
        logoUrl: '',
        adminName: '',
        adminEmail: '',
        adminPassword: '',
        phone: ''
    });

    const [hasBranches, setHasBranches] = useState(false);
    const [numBranches, setNumBranches] = useState(1);
    const [branchNames, setBranchNames] = useState<Array<{ name: string; code: string }>>([{ name: 'Main Campus', code: 'MAIN' }]);

    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const [otpCode, setOtpCode] = useState('');
    const [verificationData, setVerificationData] = useState<any>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleBranchNameChange = (index: number, value: string) => {
        const newNames = [...branchNames];
        newNames[index] = { ...newNames[index], name: value };
        setBranchNames(newNames);
    };

    const handleBranchCodeChange = (index: number, value: string) => {
        const newNames = [...branchNames];
        newNames[index] = { ...newNames[index], code: value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6) };
        setBranchNames(newNames);
    };

    const handleNumBranchesChange = (val: number) => {
        const n = Math.max(1, Math.min(10, val));
        setNumBranches(n);
        
        const newNames = [...branchNames];
        while (newNames.length < n + 1) {
            newNames.push({ name: `Branch ${newNames.length}`, code: `BRN${newNames.length}` });
        }
        while (newNames.length > n + 1) {
            newNames.pop();
        }
        setBranchNames(newNames);
    };

    const validateStep1 = () => {
        if (!formData.schoolName.trim()) {
            setError('School name is required');
            return false;
        }
        if (!formData.schoolCode.trim()) {
            setError('School code is required (e.g., EXCEL)');
            return false;
        }
        if (formData.schoolCode.length < 3 || formData.schoolCode.length > 10) {
            setError('School code must be 3-10 characters');
            return false;
        }
        if (branchNames.some(b => !b.name.trim() || !b.code.trim())) {
            setError('All branch names and codes must be filled');
            return false;
        }
        return true;
    };

    const validateStep2 = () => {
        if (!formData.adminName.trim()) {
            setError('Admin name is required');
            return false;
        }
        if (!formData.adminEmail.trim()) {
            setError('Admin email is required');
            return false;
        }
        if (!/\S+@\S+\.\S+/.test(formData.adminEmail)) {
            setError('Please enter a valid email address');
            return false;
        }
        if (!formData.adminPassword || formData.adminPassword.length < 8) {
            setError('Password must be at least 8 characters');
            return false;
        }
        return true;
    };

    const nextStep = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (step === 1 && !validateStep1()) return;
        if (step === 2 && !validateStep2()) return;

        setStep(prev => prev + 1);
    };

    const prevStep = () => {
        setStep(prev => Math.max(1, prev - 1));
        setError('');
    };

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            
            const data: any = await api.post('/schools/onboard', {
                schoolName: formData.schoolName,
                schoolCode: formData.schoolCode.toUpperCase(),
                motto: formData.motto,
                address: formData.address,
                phone: formData.phone,
                logoUrl: formData.logoUrl,
                adminName: formData.adminName,
                adminEmail: formData.adminEmail,
                adminPassword: formData.adminPassword,
                branchNames: branchNames.map(b => b.name),
                mainBranchCode: branchNames[0]?.code || 'MAIN',
                additionalBranches: branchNames.slice(1).map(b => ({
                    name: b.name,
                    code: b.code
                })),
                planType: 'free'
            });

            setVerificationData({
                userId: data.data?.adminUserId,
                email: data.data?.adminEmail,
                fullName: data.adminName
            });

            toast.success(data.message || 'School created! Check your email for verification code.');
            setStep(3);

        } catch (err: any) {
            console.error("Signup Error:", err);
            let msg = err.message || 'Failed to create school';
            
            if (msg.includes("duplicate key") || msg.includes("already exists")) {
                msg = "An account with this email already exists";
            }
            setError(msg);
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        if (otpCode.length !== 6) {
            setError('Please enter the 6-digit code from your email');
            setIsLoading(false);
            return;
        }

        try {
            const data: any = await api.post('/verification/verify', {
                email: verificationData?.email,
                code: otpCode,
                purpose: 'email_verification'
            });

            toast.success('Email verified! Logging you in...');

            // Auto login
            if (data.token && data.user) {
                const dashRole = data.user.role?.toLowerCase() === 'admin' ? DashboardType.Admin : DashboardType.Teacher;
                await signIn(dashRole, { ...data.user, token: data.token });
                navigate('/');
            }

        } catch (err: any) {
            setError(err.message || 'Invalid verification code');
        } finally {
            setIsLoading(false);
        }
    };

    const handleResendCode = async () => {
        if (!verificationData?.email) return;
        
        setIsLoading(true);
        try {
            const data: any = await api.post('/verification/resend', {
                email: verificationData.email,
                purpose: 'email_verification'
            });

            toast.success('New verification code sent!');
            setOtpCode('');
            
        } catch (err: any) {
            toast.error(err.message || 'Failed to resend code');
        } finally {
            setIsLoading(false);
        }
    };

    const renderSteps = () => (
        <div className="flex flex-col gap-8">
            <div className="flex items-center gap-3 mb-4">
                <div className="bg-white/10 p-2 rounded-lg backdrop-blur-md border border-white/10">
                    <BuildingLibraryIcon className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl font-bold tracking-tight text-white">SchoolApp</span>
            </div>

            <div className="space-y-6">
                <div>
                    <h2 className="text-2xl font-bold text-white mb-2">Start your journey</h2>
                    <p className="text-indigo-200 text-sm">Join thousands of schools managing their operations efficiently.</p>
                </div>

                <div className="space-y-0 relative">
                    <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-indigo-500/30 z-0 hidden lg:block" />

                    {[1, 2, 3].map((s) => (
                        <div key={s} className="relative z-10 flex items-center gap-4 py-2">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all duration-300 ${
                                step >= s
                                    ? 'bg-white border-white text-indigo-600'
                                    : 'bg-transparent border-indigo-400 text-indigo-200'
                            }`}>
                                {step > s ? <CheckCircleIcon className="w-5 h-5" /> : s}
                            </div>
                            <span className={`text-sm font-medium transition-colors duration-300 ${
                                step >= s ? 'text-white' : 'text-indigo-300'
                            }`}>
                                {s === 1 && 'School Details'}
                                {s === 2 && 'Admin Setup'}
                                {s === 3 && 'Verify Email'}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="mt-auto pt-8 text-xs text-indigo-300">
                © 2026 SchoolApp Inc.
            </div>
        </div>
    );

    return (
        <div className="flex min-h-screen w-full bg-slate-50 font-sans overflow-hidden">
            <div className="hidden lg:flex w-80 flex-col bg-indigo-600 p-8 fixed left-0 top-0 h-full z-20 shadow-2xl overflow-hidden">
                <motion.div
                    animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }}
                    transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                    className="absolute -top-20 -right-20 w-64 h-64 bg-indigo-500 rounded-full blur-3xl opacity-30"
                />
                <motion.div
                    animate={{ scale: [1, 1.3, 1], rotate: [0, -90, 0] }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="absolute -bottom-20 -left-20 w-64 h-64 bg-indigo-400 rounded-full blur-3xl opacity-20"
                />

                <div className="relative z-10 h-full flex flex-col">
                    {renderSteps()}
                </div>
            </div>

            <div className="flex-1 lg:ml-80 w-full relative flex flex-col min-h-screen">
                <div className="lg:hidden w-full bg-indigo-600 p-4 sticky top-0 z-30 shadow-lg">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <BuildingLibraryIcon className="w-6 h-6 text-white" />
                            <span className="text-xl font-bold text-white tracking-tight">SchoolApp</span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-indigo-500/50 backdrop-blur-sm border border-white/10 px-3 py-1.5 rounded-full">
                            <span className="text-[10px] uppercase font-black text-indigo-100">Step</span>
                            <span className="text-sm font-bold text-white">{step}</span>
                            <span className="text-[10px] uppercase font-black text-indigo-200">/ 3</span>
                        </div>
                    </div>
                </div>

                <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
                    <motion.div
                        animate={{ x: [0, 50, 0], y: [0, 30, 0], scale: [1, 1.1, 1] }}
                        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute top-[10%] left-[10%] w-96 h-96 bg-indigo-100 rounded-full blur-3xl opacity-40"
                    />
                    <motion.div
                        animate={{ x: [0, -40, 0], y: [0, 50, 0], scale: [1, 1.2, 1] }}
                        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute bottom-[10%] right-[10%] w-[500px] h-[500px] bg-purple-100 rounded-full blur-3xl opacity-30"
                    />
                </div>

                <div className="flex-1 flex flex-col justify-center items-center p-4 sm:p-8 lg:p-12 z-10">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={step}
                            initial={{ opacity: 0, y: 20, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -20, scale: 0.98 }}
                            transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                            className="w-full max-w-xl"
                        >
                            <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.08)] border border-white/50 p-6 sm:p-10 md:p-12 transition-all">
                                {step === 3 ? (
                                    <div className="text-center py-6 space-y-6">
                                        <div className="mb-8 text-center sm:text-left">
                                            <motion.span
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                className="inline-block px-3 py-1 bg-green-50 text-green-600 text-[10px] font-black uppercase tracking-widest rounded-full mb-3"
                                            >
                                                Final Step
                                            </motion.span>
                                            <h2 className="text-4xl font-black text-slate-900 mb-2 tracking-tight">
                                                Verify Your Email
                                            </h2>
                                            <p className="text-slate-500 font-medium">
                                                We've sent a 6-digit code to <strong>{verificationData?.email}</strong>
                                            </p>
                                        </div>

                                        <form onSubmit={handleVerify} className="space-y-6 text-left">
                                            {error && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    className="p-4 bg-red-50 text-red-600 text-sm font-bold rounded-2xl border border-red-100 flex items-center gap-3"
                                                >
                                                    <div className="w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center text-xs">!</div>
                                                    {error}
                                                </motion.div>
                                            )}
                                            
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">6-Digit Code</label>
                                                <input
                                                    type="text"
                                                    required
                                                    value={otpCode}
                                                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                                    className="w-full px-4 py-4 bg-slate-50/50 border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-600 focus:bg-white outline-none transition-all font-bold text-center text-2xl tracking-[0.5em] text-slate-800 uppercase"
                                                    placeholder="000000"
                                                    maxLength={6}
                                                />
                                            </div>

                                            <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                                                <button
                                                    type="button"
                                                    onClick={handleResendCode}
                                                    disabled={isLoading}
                                                    className="w-full sm:w-auto px-8 py-4 text-indigo-600 font-bold hover:text-indigo-700 hover:bg-indigo-50 rounded-2xl transition-all"
                                                >
                                                    Resend Code
                                                </button>

                                                <button
                                                    type="submit"
                                                    disabled={isLoading || otpCode.length < 6}
                                                    className="w-full sm:w-auto min-w-[200px] bg-indigo-600 text-white font-black py-4 px-8 rounded-2xl shadow-xl shadow-indigo-600/20 hover:bg-indigo-700 hover:shadow-indigo-600/40 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:scale-100"
                                                >
                                                    {isLoading ? (
                                                        <Loader2 className="w-5 h-5 animate-spin" />
                                                    ) : 'Verify & Login'}
                                                </button>
                                            </div>
                                        </form>
                                    </div>
                                ) : (
                                    <>
                                        <div className="mb-10 text-center sm:text-left">
                                            <motion.span
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                className="inline-block px-3 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-widest rounded-full mb-3"
                                            >
                                                Step {step} of 2
                                            </motion.span>
                                            <h2 className="text-4xl font-black text-slate-900 mb-2 tracking-tight">
                                                {step === 1 ? 'School Identity' : 'Admin Account'}
                                            </h2>
                                            <p className="text-slate-500 font-medium">
                                                {step === 1 ? 'Tell us about your institution.' : 'Create your administrator account.'}
                                            </p>
                                        </div>

                                        <form onSubmit={step === 1 ? nextStep : handleSignup} className="space-y-6">
                                            {error && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    className="p-4 bg-red-50 text-red-600 text-sm font-bold rounded-2xl border border-red-100 flex items-center gap-3"
                                                >
                                                    <div className="w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center text-xs">!</div>
                                                    {error}
                                                </motion.div>
                                            )}

                                            {step === 1 && (
                                                <>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                                        <div className="col-span-1 md:col-span-2">
                                                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">School Name *</label>
                                                            <div className="relative group">
                                                                <BuildingLibraryIcon className="absolute left-4 top-4 w-5 h-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                                                                <input
                                                                    name="schoolName"
                                                                    required
                                                                    value={formData.schoolName}
                                                                    onChange={handleChange}
                                                                    className="w-full pl-12 pr-4 py-4 bg-slate-50/50 border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-600 focus:bg-white outline-none transition-all font-medium text-slate-700"
                                                                    placeholder="Royal Academy International"
                                                                />
                                                            </div>
                                                        </div>

                                                        <div>
                                                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">School Code * (3-10 chars)</label>
                                                            <div className="relative group">
                                                                <LockIcon className="absolute left-4 top-4 w-5 h-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                                                                <input
                                                                    name="schoolCode"
                                                                    required
                                                                    value={formData.schoolCode}
                                                                    onChange={handleChange}
                                                                    className="w-full pl-12 pr-4 py-4 bg-slate-50/50 border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-600 focus:bg-white outline-none transition-all font-medium text-slate-700 uppercase"
                                                                    placeholder="EXCEL"
                                                                    maxLength={10}
                                                                />
                                                            </div>
                                                            <p className="text-[10px] text-slate-400 mt-1 px-1">This will be part of all user IDs (e.g., EXCEL_MAIN_STU_0001)</p>
                                                        </div>

                                                        <div>
                                                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Phone</label>
                                                            <div className="relative group">
                                                                <PhoneIcon className="absolute left-4 top-4 w-5 h-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                                                                <input
                                                                    name="phone"
                                                                    value={formData.phone}
                                                                    onChange={handleChange}
                                                                    className="w-full pl-12 pr-4 py-4 bg-slate-50/50 border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-600 focus:bg-white outline-none transition-all font-medium text-slate-700"
                                                                    placeholder="+234..."
                                                                />
                                                            </div>
                                                        </div>

                                                        <div className="col-span-1 md:col-span-2">
                                                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Address</label>
                                                            <div className="relative group">
                                                                <MapPinIcon className="absolute left-4 top-4 w-5 h-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                                                                <input
                                                                    name="address"
                                                                    value={formData.address}
                                                                    onChange={handleChange}
                                                                    className="w-full pl-12 pr-4 py-4 bg-slate-50/50 border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-600 focus:bg-white outline-none transition-all font-medium text-slate-700"
                                                                    placeholder="City, State, Country"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="pt-4 border-t border-slate-100">
                                                        <label className="flex items-center gap-3 cursor-pointer group">
                                                            <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${hasBranches ? 'bg-indigo-600 border-indigo-600' : 'border-slate-200 group-hover:border-indigo-300'}`}>
                                                                {hasBranches && <CheckCircleIcon className="w-4 h-4 text-white" />}
                                                            </div>
                                                            <input 
                                                                type="checkbox" 
                                                                className="sr-only" 
                                                                checked={hasBranches} 
                                                                onChange={(e) => setHasBranches(e.target.checked)} 
                                                            />
                                                            <span className="text-sm font-bold text-slate-600">This institution has multiple branches</span>
                                                        </label>

                                                        {hasBranches && (
                                                            <motion.div 
                                                                initial={{ opacity: 0, height: 0 }}
                                                                animate={{ opacity: 1, height: 'auto' }}
                                                                className="mt-6 p-6 bg-indigo-50/50 border-2 border-indigo-100 rounded-[2rem] space-y-6"
                                                            >
                                                                <div className="flex items-center gap-2 mb-2">
                                                                    <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                                                                        <BuildingLibraryIcon className="w-4 h-4 text-indigo-600" />
                                                                    </div>
                                                                    <h3 className="font-black text-xs text-indigo-900 uppercase tracking-widest">Branch Setup</h3>
                                                                </div>

                                                                <div>
                                                                    <label className="block text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-2 px-1">Number of Additional Branches</label>
                                                                    <input 
                                                                        type="number" 
                                                                        min="1" 
                                                                        max="10" 
                                                                        value={numBranches} 
                                                                        onChange={(e) => handleNumBranchesChange(parseInt(e.target.value) || 1)}
                                                                        className="w-full px-4 py-3 bg-white border-2 border-indigo-100 rounded-xl focus:border-indigo-600 outline-none transition-all font-bold text-indigo-900"
                                                                    />
                                                                </div>

                                                                <div className="space-y-4">
                                                                    <div className="grid grid-cols-2 gap-4">
                                                                        <div className="relative">
                                                                            <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1 px-1">Main Branch Name</label>
                                                                            <input 
                                                                                value={branchNames[0]?.name || ''} 
                                                                                onChange={(e) => handleBranchNameChange(0, e.target.value)}
                                                                                className="w-full px-4 py-3 bg-white border-2 border-indigo-100 rounded-xl focus:border-indigo-600 outline-none transition-all font-medium text-slate-700"
                                                                                placeholder="Main Campus"
                                                                            />
                                                                        </div>
                                                                        <div className="relative">
                                                                            <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1 px-1">Code</label>
                                                                            <input 
                                                                                value={branchNames[0]?.code || ''} 
                                                                                onChange={(e) => handleBranchCodeChange(0, e.target.value)}
                                                                                className="w-full px-4 py-3 bg-white border-2 border-indigo-100 rounded-xl focus:border-indigo-600 outline-none transition-all font-medium text-slate-700 uppercase"
                                                                                placeholder="MAIN"
                                                                                maxLength={6}
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                    {Array.from({ length: numBranches }).map((_, idx) => (
                                                                        <div key={idx + 1} className="grid grid-cols-2 gap-4">
                                                                            <div className="relative">
                                                                                <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1 px-1">Branch {idx + 1} Name</label>
                                                                                <input 
                                                                                    value={branchNames[idx + 1]?.name || ''} 
                                                                                    onChange={(e) => handleBranchNameChange(idx + 1, e.target.value)}
                                                                                    className="w-full px-4 py-3 bg-white border-2 border-indigo-100 rounded-xl focus:border-indigo-600 outline-none transition-all font-medium text-slate-700"
                                                                                    placeholder={`Branch ${idx + 1}`}
                                                                                />
                                                                            </div>
                                                                            <div className="relative">
                                                                                <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1 px-1">Code</label>
                                                                                <input 
                                                                                    value={branchNames[idx + 1]?.code || ''} 
                                                                                    onChange={(e) => handleBranchCodeChange(idx + 1, e.target.value)}
                                                                                    className="w-full px-4 py-3 bg-white border-2 border-indigo-100 rounded-xl focus:border-indigo-600 outline-none transition-all font-medium text-slate-700 uppercase"
                                                                                    placeholder={`BRN${idx + 1}`}
                                                                                    maxLength={6}
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </motion.div>
                                                        )}
                                                    </div>
                                                </>
                                            )}

                                            {step === 2 && (
                                                <div className="space-y-6">
                                                    <div>
                                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Admin Full Name *</label>
                                                        <div className="relative group">
                                                            <UserIcon className="absolute left-4 top-4 w-5 h-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                                                            <input
                                                                name="adminName"
                                                                required
                                                                value={formData.adminName}
                                                                onChange={handleChange}
                                                                className="w-full pl-12 pr-4 py-4 bg-slate-50/50 border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-600 focus:bg-white outline-none transition-all font-medium text-slate-700"
                                                                placeholder="John Doe"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Admin Email *</label>
                                                        <div className="relative group">
                                                            <GlobeIcon className="absolute left-4 top-4 w-5 h-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                                                            <input
                                                                name="adminEmail"
                                                                type="email"
                                                                required
                                                                value={formData.adminEmail}
                                                                onChange={handleChange}
                                                                className="w-full pl-12 pr-4 py-4 bg-slate-50/50 border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-600 focus:bg-white outline-none transition-all font-medium text-slate-700"
                                                                placeholder="admin@school.com"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Password * (min 8 chars)</label>
                                                        <div className="relative group">
                                                            <LockIcon className="absolute left-4 top-4 w-5 h-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                                                            <input
                                                                name="adminPassword"
                                                                type={showPassword ? 'text' : 'password'}
                                                                required
                                                                value={formData.adminPassword}
                                                                onChange={handleChange}
                                                                className="w-full pl-12 pr-12 py-4 bg-slate-50/50 border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-600 focus:bg-white outline-none transition-all font-medium text-slate-700"
                                                                placeholder="Create a secure password"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => setShowPassword(!showPassword)}
                                                                className="absolute right-4 top-4 text-slate-400 hover:text-indigo-600 transition-colors"
                                                            >
                                                                {showPassword ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
                                                {step > 1 ? (
                                                    <button
                                                        type="button"
                                                        onClick={prevStep}
                                                        className="w-full sm:w-auto px-8 py-4 text-slate-500 font-bold hover:text-slate-700 hover:bg-slate-100 rounded-2xl transition-all flex items-center justify-center gap-2"
                                                    >
                                                        <ChevronLeftIcon className="w-5 h-5" /> Back
                                                    </button>
                                                ) : (
                                                    <div className="hidden sm:block" />
                                                )}

                                                <button
                                                    type="submit"
                                                    disabled={isLoading}
                                                    className="w-full sm:w-auto min-w-[200px] bg-indigo-600 text-white font-black py-4 px-8 rounded-2xl shadow-xl shadow-indigo-600/20 hover:bg-indigo-700 hover:shadow-indigo-600/40 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                                                >
                                                    {isLoading ? (
                                                        <Loader2 className="w-5 h-5 animate-spin" />
                                                    ) : (
                                                        <>
                                                            {step === 1 ? 'Continue' : 'Create School & Send Code'}
                                                            {step === 1 && <ArrowRightIcon className="w-5 h-5" />}
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </form>
                                    </>
                                )}
                            </div>

                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.5 }}
                                className="mt-10 text-center"
                            >
                                <p className="text-sm text-slate-500 font-medium">
                                    Already have an account?{' '}
                                    <button onClick={onNavigateToLogin} className="text-indigo-600 font-black hover:underline underline-offset-4">
                                        Sign in
                                    </button>
                                </p>
                            </motion.div>
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};

export default CreateSchoolSignup;
