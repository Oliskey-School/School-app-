import React, { useState } from 'react';
import { SchoolLogoIcon, UserIcon, LockIcon, EyeIcon, EyeOffIcon, BuildingLibraryIcon, GlobeIcon, CheckCircleIcon, ArrowRightIcon, ChevronLeftIcon, PhoneIcon, MapPinIcon } from '../../constants';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useProfile } from '../../context/ProfileContext';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import ImageUpload from '../shared/ImageUpload';

interface CreateSchoolSignupProps {
    onNavigateToLogin: () => void;
}

const CreateSchoolSignup: React.FC<CreateSchoolSignupProps> = ({ onNavigateToLogin }) => {
    const { signIn } = useAuth();

    // Steps: 1 = School Details, 2 = Admin Setup, 3 = Processing/Done
    const [step, setStep] = useState(1);

    const [formData, setFormData] = useState({
        schoolName: '',
        motto: '',
        address: '',
        logoUrl: '',
        adminName: '',
        adminEmail: '',
        adminPassword: '',
        phone: '' // Added phone field as per screenshot often having it
    });

    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const nextStep = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Validation for Step 1
        if (step === 1) {
            if (!formData.schoolName) {
                setError('School Name is required.');
                return;
            }
            // Optional: Email validation if "School Email" is separate from Admin Email
        }

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

        if (!formData.adminName || !formData.adminEmail || !formData.adminPassword) {
            setError('Please complete all admin fields.');
            setIsLoading(false);
            return;
        }

        try {
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: formData.adminEmail,
                password: formData.adminPassword,
                options: {
                    emailRedirectTo: `${window.location.origin}/#/auth/callback?type=signup&role=admin`,
                    data: {
                        full_name: formData.adminName,
                        school_name: formData.schoolName,
                        motto: formData.motto,
                        address: formData.address,
                        role: 'admin',
                        signup_type: 'new_school'
                    }
                }
            });

            if (authError) throw authError;
            if (!authData.user) throw new Error("Authentication failed. No user returned.");

            // Move to Step 3 (Success/Confirmation)
            setStep(3);
            toast.success("Account created successfully!");

            // Redirect delay
            setTimeout(() => {
                window.location.hash = '#/auth/verify-email';
            }, 3000);

        } catch (err: any) {
            console.error("Signup Error Full Object:", JSON.stringify(err, null, 2));

            let msg = err.message || 'Portal creation failed.';
            if (msg.includes("Signup Trigger Failed:")) {
                msg = msg.replace("Signup Trigger Failed:", "").trim();
            }

            if (msg.includes("duplicate key") || msg.includes("already exists")) {
                msg = "An account with this email already exists.";
            }

            setError(msg);
        } finally {
            setIsLoading(false);
        }
    };

    // Render Sidebar/Header Steps
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
                    <p className="text-indigo-200 text-sm">Join thousands of schools managing their operations efficiently with our all-in-one platform.</p>
                </div>

                <div className="space-y-0 relative">
                    {/* Vertical Line */}
                    <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-indigo-500/30 z-0 hidden lg:block"></div>

                    {[1, 2, 3].map((s) => (
                        <div key={s} className="relative z-10 flex items-center gap-4 py-2">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all duration-300 ${step >= s
                                ? 'bg-white border-white text-indigo-600'
                                : 'bg-transparent border-indigo-400 text-indigo-200'
                                }`}>
                                {step > s ? <CheckCircleIcon className="w-5 h-5" /> : s}
                            </div>
                            <span className={`text-sm font-medium transition-colors duration-300 ${step >= s ? 'text-white' : 'text-indigo-300'
                                }`}>
                                {s === 1 && 'School Details'}
                                {s === 2 && 'Admin Setup'}
                                {s === 3 && 'Confirmation'}
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

            {/* Sidebar (Desktop) */}
            <div className="hidden lg:flex w-80 flex-col bg-indigo-600 p-8 fixed left-0 top-0 h-full z-20 shadow-2xl overflow-hidden">
                {/* Animated Background Blobs for Sidebar */}
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

            {/* Main Content Area */}
            <div className="flex-1 lg:ml-80 w-full relative flex flex-col min-h-screen">

                {/* Mobile Header */}
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

                {/* Animated Background for Content */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
                    <motion.div
                        animate={{
                            x: [0, 50, 0],
                            y: [0, 30, 0],
                            scale: [1, 1.1, 1]
                        }}
                        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute top-[10%] left-[10%] w-96 h-96 bg-indigo-100 rounded-full blur-3xl opacity-40"
                    />
                    <motion.div
                        animate={{
                            x: [0, -40, 0],
                            y: [0, 50, 0],
                            scale: [1, 1.2, 1]
                        }}
                        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute bottom-[10%] right-[10%] w-[500px] h-[500px] bg-purple-100 rounded-full blur-3xl opacity-30"
                    />
                </div>

                {/* Content Container */}
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
                                    // Success step...
                                    <div className="text-center py-8 space-y-6">
                                        <motion.div
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            transition={{ type: "spring", damping: 12, stiffness: 200 }}
                                            className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-200"
                                        >
                                            <CheckCircleIcon className="w-12 h-12 text-green-600" />
                                        </motion.div>
                                        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Registration Complete!</h2>
                                        <p className="text-slate-500 text-lg leading-relaxed">
                                            Your school portal has been created successfully. <br />
                                            Check <strong>{formData.adminEmail}</strong> for a verification link.
                                        </p>
                                        <div className="pt-8 pt-4">
                                            <button
                                                onClick={() => window.location.hash = '#/auth/verify-email'}
                                                className="w-full sm:w-auto px-10 py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-xl shadow-indigo-600/20 hover:bg-indigo-700 hover:scale-[1.02] active:scale-[0.98] transition-all"
                                            >
                                                Start Onboarding
                                            </button>
                                        </div>
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
                                                {step === 1 ? 'School Identity' : 'Portal Authority'}
                                            </h2>
                                            <p className="text-slate-500 font-medium">
                                                {step === 1 ? 'Establish your institution\'s digital presence.' : 'Create the primary administrative account.'}
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
                                                    {/* Logo Upload - Premium Circular */}
                                                    <div className="flex flex-col items-center justify-center mb-8">
                                                        <ImageUpload
                                                            value={formData.logoUrl}
                                                            onChange={(url) => setFormData(prev => ({ ...prev, logoUrl: url || '' }))}
                                                            bucket="school-logos"
                                                            folder="temp"
                                                            circular={true}
                                                            className="shadow-2xl shadow-indigo-200"
                                                        />
                                                        <span className="mt-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Institution Logo</span>
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                                        <div className="col-span-1 md:col-span-2">
                                                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">School Full Name</label>
                                                            <div className="relative group">
                                                                <BuildingLibraryIcon className="absolute left-4 top-4 w-5 h-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                                                                <input
                                                                    name="schoolName"
                                                                    required
                                                                    value={formData.schoolName}
                                                                    onChange={handleChange}
                                                                    className="w-full pl-12 pr-4 py-4 bg-slate-50/50 border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-600 focus:bg-white outline-none transition-all font-medium text-slate-700"
                                                                    placeholder="e.g. Royal Academy"
                                                                />
                                                            </div>
                                                        </div>

                                                        <div>
                                                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Primary Contact</label>
                                                            <div className="relative group">
                                                                <PhoneIcon className="absolute left-4 top-4 w-5 h-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                                                                <input
                                                                    name="phone"
                                                                    value={formData.phone}
                                                                    onChange={handleChange}
                                                                    className="w-full pl-12 pr-4 py-4 bg-slate-50/50 border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-600 focus:bg-white outline-none transition-all font-medium text-slate-700"
                                                                    placeholder="Official Number"
                                                                />
                                                            </div>
                                                        </div>

                                                        <div>
                                                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Motto</label>
                                                            <input
                                                                name="motto"
                                                                value={formData.motto}
                                                                onChange={handleChange}
                                                                className="w-full px-4 py-4 bg-slate-50/50 border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-600 focus:bg-white outline-none transition-all font-medium text-slate-700"
                                                                placeholder="Vision Statement"
                                                            />
                                                        </div>

                                                        <div className="col-span-1 md:col-span-2">
                                                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Physical Location</label>
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
                                                </>
                                            )}

                                            {step === 2 && (
                                                <div className="space-y-6">
                                                    <div>
                                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Proprietor Name</label>
                                                        <div className="relative group">
                                                            <UserIcon className="absolute left-4 top-4 w-5 h-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                                                            <input
                                                                name="adminName"
                                                                required
                                                                value={formData.adminName}
                                                                onChange={handleChange}
                                                                className="w-full pl-12 pr-4 py-4 bg-slate-50/50 border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-600 focus:bg-white outline-none transition-all font-medium text-slate-700"
                                                                placeholder="Lead Administrator"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Administrative Email</label>
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
                                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Security Key</label>
                                                        <div className="relative group">
                                                            <LockIcon className="absolute left-4 top-4 w-5 h-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                                                            <input
                                                                name="adminPassword"
                                                                type={showPassword ? 'text' : 'password'}
                                                                required
                                                                value={formData.adminPassword}
                                                                onChange={handleChange}
                                                                className="w-full pl-12 pr-12 py-4 bg-slate-50/50 border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-600 focus:bg-white outline-none transition-all font-medium text-slate-700"
                                                                placeholder="Min 8 characters"
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
                                                        <ChevronLeftIcon className="w-5 h-5" /> Phase 1
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
                                                            {step === 1 ? 'Go to Phase 2' : 'Initiate Portal'}
                                                            {step === 1 && <ArrowRightIcon className="w-5 h-5" />}
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </form>
                                    </>
                                )}
                            </div>

                            {/* Footer Login Link */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.5 }}
                                className="mt-10 text-center"
                            >
                                <p className="text-sm text-slate-500 font-medium">
                                    Member of the collective?{' '}
                                    <button onClick={onNavigateToLogin} className="text-indigo-600 font-black hover:underline underline-offset-4">
                                        Authenticate here
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
