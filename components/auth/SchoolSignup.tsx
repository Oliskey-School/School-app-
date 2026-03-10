import React, { useState, useCallback } from 'react';
import { SchoolLogoIcon } from '../../constants';
import { toast } from 'react-hot-toast';

interface SchoolSignupProps {
    onComplete: (email: string, role: string) => void;
    onBack: () => void;
}

// Nigerian states for the dropdown
const NIGERIAN_STATES = [
    'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
    'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT - Abuja', 'Gombe',
    'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara',
    'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau',
    'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara',
];

const PLANS = [
    {
        key: 'free',
        label: 'Free',
        price: '₦0',
        period: 'forever',
        limit: 'Up to 50 students',
        features: ['Student & teacher management', 'Attendance tracking', 'Basic reports', 'Fee management'],
        highlight: false,
    },
    {
        key: 'basic',
        label: 'Basic',
        price: '₦3,000',
        period: 'per student/term',
        limit: 'Up to 200 students',
        features: ['Everything in Free', 'Advanced reports', 'Parent portal', 'Timetable management'],
        highlight: true,
    },
    {
        key: 'premium',
        label: 'Premium',
        price: 'Custom',
        period: 'contact us',
        limit: 'Unlimited students',
        features: ['Everything in Basic', 'AI-powered features', 'Multi-branch management', 'Priority support'],
        highlight: false,
    },
];

/** Suggest a school code from the school name */
function suggestSchoolCode(name: string): string {
    const words = name.trim().toUpperCase().replace(/[^A-Z0-9\s]/g, '').split(/\s+/).filter(Boolean);
    if (words.length === 0) return '';
    if (words.length === 1) return words[0].slice(0, 6);
    return words.map(w => w[0]).join('').slice(0, 6);
}

/** Suggest a branch code from the branch name */
function suggestBranchCode(name: string): string {
    const words = name.trim().toUpperCase().replace(/[^A-Z0-9\s]/g, '').split(/\s+/).filter(Boolean);
    if (words.length === 0) return '';
    if (words.length === 1) return words[0].slice(0, 5);
    return words.map(w => w[0]).join('').slice(0, 5);
}

const TOTAL_STEPS = 5;

const SchoolSignup: React.FC<SchoolSignupProps> = ({ onComplete, onBack }) => {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Step 1 — School Info
    const [schoolName, setSchoolName] = useState('');
    const [schoolCode, setSchoolCode] = useState('');
    const [schoolCodeManual, setSchoolCodeManual] = useState(false);
    const [schoolEmail, setSchoolEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');
    const [state, setState] = useState('');

    // Step 2 — Branches
    const [mainBranchName, setMainBranchName] = useState('Main Branch');
    const [mainBranchCode, setMainBranchCode] = useState('MAIN');
    const [mainBranchCodeManual, setMainBranchCodeManual] = useState(false);
    const [hasExtra, setHasExtra] = useState(false);
    const [extraBranches, setExtraBranches] = useState<Array<{ name: string; code: string; codeManual: boolean }>>([]);

    // Step 3 — Admin
    const [adminName, setAdminName] = useState('');
    const [adminEmail, setAdminEmail] = useState('');
    const [adminPassword, setAdminPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // Step 4 — Plan
    const [planType, setPlanType] = useState<'free' | 'basic' | 'premium' | 'enterprise'>('free');

    const handleSchoolNameChange = useCallback((value: string) => {
        setSchoolName(value);
        if (!schoolCodeManual) setSchoolCode(suggestSchoolCode(value));
    }, [schoolCodeManual]);

    const handleMainBranchNameChange = useCallback((value: string) => {
        setMainBranchName(value);
        if (!mainBranchCodeManual) setMainBranchCode(suggestBranchCode(value));
    }, [mainBranchCodeManual]);

    const addExtraBranch = () => {
        setExtraBranches(prev => [...prev, { name: '', code: '', codeManual: false }]);
    };

    const updateExtraBranch = (idx: number, field: 'name' | 'code', value: string) => {
        setExtraBranches(prev => {
            const next = [...prev];
            if (field === 'name') {
                next[idx] = { ...next[idx], name: value, code: next[idx].codeManual ? next[idx].code : suggestBranchCode(value) };
            } else {
                next[idx] = { ...next[idx], code: value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10), codeManual: true };
            }
            return next;
        });
    };

    const removeExtraBranch = (idx: number) => {
        setExtraBranches(prev => prev.filter((_, i) => i !== idx));
    };

    const validateStep = (): boolean => {
        if (step === 1) {
            if (!schoolName.trim()) { toast.error('School name is required.'); return false; }
            if (!schoolCode.trim()) { toast.error('School code is required.'); return false; }
            if (!/^[A-Z0-9]{2,10}$/.test(schoolCode)) { toast.error('School code must be 2–10 letters/numbers (no spaces).'); return false; }
            if (!schoolEmail.trim()) { toast.error('School email is required.'); return false; }
            if (!phone.trim()) { toast.error('Phone number is required.'); return false; }
        }
        if (step === 2) {
            if (!mainBranchName.trim()) { toast.error('Main branch name is required.'); return false; }
            if (!mainBranchCode.trim() || !/^[A-Z0-9]{2,10}$/.test(mainBranchCode)) {
                toast.error('Branch code must be 2–10 letters/numbers.'); return false;
            }
            for (const b of extraBranches) {
                if (!b.name.trim()) { toast.error('All extra branch names are required.'); return false; }
                if (!b.code || !/^[A-Z0-9]{2,10}$/.test(b.code)) { toast.error(`Branch code for "${b.name}" is invalid.`); return false; }
            }
        }
        if (step === 3) {
            if (!adminName.trim()) { toast.error('Admin name is required.'); return false; }
            if (!adminEmail.trim()) { toast.error('Admin email is required.'); return false; }
            if (adminPassword.length < 8) { toast.error('Password must be at least 8 characters.'); return false; }
            if (adminPassword !== confirmPassword) { toast.error('Passwords do not match.'); return false; }
        }
        return true;
    };

    const nextStep = () => {
        if (validateStep()) setStep(s => s + 1);
    };

    const prevStep = () => setStep(s => s - 1);

    const handleLaunch = async () => {
        setLoading(true);
        try {
            const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
            const res = await fetch(`${API_BASE}/schools/onboard`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    schoolName,
                    schoolCode,
                    schoolEmail,
                    phone,
                    address,
                    state,
                    mainBranchName,
                    mainBranchCode,
                    additionalBranches: extraBranches.map(b => ({ name: b.name, code: b.code })),
                    adminName,
                    adminEmail,
                    adminPassword,
                    planType,
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Failed to create school.');

            toast.success(`${schoolName} is live! Your 30-day trial has started.`);
            setTimeout(() => onComplete(adminEmail, 'admin'), 1500);
        } catch (err: any) {
            toast.error(err.message || 'Something went wrong.');
        } finally {
            setLoading(false);
        }
    };

    const previewAdminId = `${schoolCode || 'SCHOOL'}_${mainBranchCode || 'MAIN'}_ADM_0001`;

    const stepLabels = ['School Info', 'Branches', 'Admin Account', 'Choose Plan', 'Review & Launch'];

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">

            {/* Left Sidebar */}
            <div className="hidden lg:flex flex-col w-72 xl:w-80 bg-indigo-700 text-white p-8 flex-shrink-0 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-56 h-56 bg-indigo-600 rounded-full blur-3xl opacity-40 translate-x-1/2 -translate-y-1/2" />
                <div className="absolute bottom-0 left-0 w-56 h-56 bg-violet-600 rounded-full blur-3xl opacity-30 -translate-x-1/2 translate-y-1/2" />
                <div className="relative z-10 flex flex-col h-full">
                    {/* Logo */}
                    <div className="flex items-center gap-3 mb-10">
                        <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center">
                            <SchoolLogoIcon className="w-5 h-5 text-white" />
                        </div>
                        <span className="font-bold text-lg">Oliskey</span>
                    </div>

                    <div className="mb-8">
                        <h2 className="text-xl font-bold mb-1">Set up your school</h2>
                        <p className="text-indigo-300 text-sm">30-day free trial. No card needed.</p>
                    </div>

                    {/* Step List */}
                    <div className="space-y-1">
                        {stepLabels.map((label, i) => {
                            const n = i + 1;
                            const done = step > n;
                            const current = step === n;
                            return (
                                <div key={n} className="flex items-center gap-3 py-2">
                                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all ${
                                        done ? 'bg-green-400 text-white' :
                                        current ? 'bg-white text-indigo-700 shadow-md scale-110' :
                                        'bg-indigo-600 text-indigo-300'
                                    }`}>
                                        {done ? (
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                            </svg>
                                        ) : n}
                                    </div>
                                    <span className={`text-sm ${current ? 'text-white font-semibold' : done ? 'text-indigo-200' : 'text-indigo-400'}`}>
                                        {label}
                                    </span>
                                </div>
                            );
                        })}
                    </div>

                    {/* Preview ID box */}
                    {(schoolCode || mainBranchCode) && (
                        <div className="mt-auto bg-white/10 rounded-xl p-4 border border-white/20">
                            <p className="text-indigo-300 text-xs font-medium mb-1">Your admin ID will be:</p>
                            <p className="text-white font-mono font-bold text-sm break-all">{previewAdminId}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-h-screen">
                {/* Mobile Top Bar */}
                <div className="lg:hidden flex items-center justify-between px-5 py-4 border-b bg-white">
                    <button onClick={onBack} className="text-sm text-slate-500 hover:text-indigo-600 font-medium">
                        ← Back
                    </button>
                    <span className="text-xs font-bold text-slate-500">Step {step} of {TOTAL_STEPS}</span>
                </div>

                {/* Mobile progress bar */}
                <div className="lg:hidden h-1 bg-gray-200">
                    <div
                        className="h-full bg-indigo-600 transition-all duration-300"
                        style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
                    />
                </div>

                <div className="flex-1 flex items-start justify-center p-5 sm:p-8 lg:p-10 overflow-y-auto">
                    <div className="w-full max-w-lg">

                        {/* ── Step 1: School Info ───────────────────── */}
                        {step === 1 && (
                            <div className="space-y-6 animate-fade-in">
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-800">Your school details</h2>
                                    <p className="text-sm text-slate-500 mt-1">This information appears across the platform.</p>
                                </div>
                                <FormField label="School Name *">
                                    <input value={schoolName} onChange={e => handleSchoolNameChange(e.target.value)}
                                        placeholder="e.g. Excellence Academy" className={inputCls} />
                                </FormField>
                                <FormField label="School Code *"
                                    hint={`Prefix for all IDs — e.g. ${schoolCode || 'EXCEL'}_MAIN_STU_0001`}>
                                    <div className="flex gap-2">
                                        <input
                                            value={schoolCode}
                                            onChange={e => {
                                                setSchoolCodeManual(true);
                                                setSchoolCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10));
                                            }}
                                            placeholder="e.g. EXCEL"
                                            maxLength={10}
                                            className={`${inputCls} font-mono uppercase tracking-widest`}
                                        />
                                        {schoolCodeManual && (
                                            <button
                                                type="button"
                                                onClick={() => { setSchoolCodeManual(false); setSchoolCode(suggestSchoolCode(schoolName)); }}
                                                className="px-3 py-2 text-xs text-indigo-600 border border-indigo-200 rounded-xl hover:bg-indigo-50 whitespace-nowrap"
                                            >
                                                Auto
                                            </button>
                                        )}
                                    </div>
                                </FormField>
                                <FormField label="School Email *">
                                    <input value={schoolEmail} onChange={e => setSchoolEmail(e.target.value)}
                                        type="email" placeholder="info@excellence.edu.ng" className={inputCls} />
                                </FormField>
                                <FormField label="Phone Number *">
                                    <input value={phone} onChange={e => setPhone(e.target.value)}
                                        placeholder="+234 800 000 0000" className={inputCls} />
                                </FormField>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <FormField label="State">
                                        <select value={state} onChange={e => setState(e.target.value)} className={inputCls}>
                                            <option value="">Select state</option>
                                            {NIGERIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </FormField>
                                    <FormField label="Address">
                                        <input value={address} onChange={e => setAddress(e.target.value)}
                                            placeholder="12 School Road" className={inputCls} />
                                    </FormField>
                                </div>
                                <StepActions onNext={nextStep} onBack={onBack} backLabel="Back to Login" />
                            </div>
                        )}

                        {/* ── Step 2: Branches ─────────────────────── */}
                        {step === 2 && (
                            <div className="space-y-6 animate-fade-in">
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-800">Branch setup</h2>
                                    <p className="text-sm text-slate-500 mt-1">Every school starts with a Main Branch. Add more if needed.</p>
                                </div>

                                <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-5 space-y-4">
                                    <p className="text-xs font-bold text-indigo-700 uppercase tracking-wide">Main Branch</p>
                                    <FormField label="Branch Name *">
                                        <input value={mainBranchName} onChange={e => handleMainBranchNameChange(e.target.value)}
                                            placeholder="e.g. Main Branch" className={inputCls} />
                                    </FormField>
                                    <FormField label="Branch Code *" hint="Short code used in user IDs">
                                        <div className="flex gap-2">
                                            <input
                                                value={mainBranchCode}
                                                onChange={e => {
                                                    setMainBranchCodeManual(true);
                                                    setMainBranchCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10));
                                                }}
                                                placeholder="MAIN"
                                                maxLength={10}
                                                className={`${inputCls} font-mono uppercase tracking-widest`}
                                            />
                                            {mainBranchCodeManual && (
                                                <button type="button"
                                                    onClick={() => { setMainBranchCodeManual(false); setMainBranchCode(suggestBranchCode(mainBranchName)); }}
                                                    className="px-3 py-2 text-xs text-indigo-600 border border-indigo-200 rounded-xl hover:bg-indigo-50"
                                                >Auto</button>
                                            )}
                                        </div>
                                    </FormField>
                                </div>

                                {/* Extra Branches */}
                                <div>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" checked={hasExtra} onChange={e => setHasExtra(e.target.checked)}
                                            className="w-4 h-4 rounded text-indigo-600 border-gray-300" />
                                        <span className="text-sm font-medium text-slate-700">Add more branches</span>
                                    </label>
                                </div>

                                {hasExtra && (
                                    <div className="space-y-3">
                                        {extraBranches.map((b, idx) => (
                                            <div key={idx} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 relative">
                                                <button type="button" onClick={() => removeExtraBranch(idx)}
                                                    className="absolute top-3 right-3 text-slate-400 hover:text-red-500 text-lg leading-none"
                                                >×</button>
                                                <p className="text-xs font-bold text-slate-500 uppercase">Branch {idx + 1}</p>
                                                <FormField label="Branch Name *">
                                                    <input value={b.name} onChange={e => updateExtraBranch(idx, 'name', e.target.value)}
                                                        placeholder="e.g. Lekki Branch" className={inputCls} />
                                                </FormField>
                                                <FormField label="Branch Code *">
                                                    <input value={b.code} onChange={e => updateExtraBranch(idx, 'code', e.target.value)}
                                                        placeholder="e.g. LK1" maxLength={10}
                                                        className={`${inputCls} font-mono uppercase tracking-widest`} />
                                                </FormField>
                                            </div>
                                        ))}
                                        <button type="button" onClick={addExtraBranch}
                                            className="w-full py-2.5 border-2 border-dashed border-indigo-300 text-indigo-600 rounded-xl text-sm font-semibold hover:bg-indigo-50 transition">
                                            + Add Branch
                                        </button>
                                    </div>
                                )}

                                <StepActions onNext={nextStep} onBack={prevStep} />
                            </div>
                        )}

                        {/* ── Step 3: Admin Account ─────────────────── */}
                        {step === 3 && (
                            <div className="space-y-6 animate-fade-in">
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-800">Admin account</h2>
                                    <p className="text-sm text-slate-500 mt-1">This becomes the school owner / principal login.</p>
                                </div>
                                <FormField label="Full Name *">
                                    <input value={adminName} onChange={e => setAdminName(e.target.value)}
                                        placeholder="Dr. Amara Okafor" className={inputCls} />
                                </FormField>
                                <FormField label="Email Address *">
                                    <input value={adminEmail} onChange={e => setAdminEmail(e.target.value)}
                                        type="email" placeholder="principal@excellence.edu.ng" className={inputCls} />
                                </FormField>
                                <FormField label="Password * (min 8 characters)">
                                    <div className="relative">
                                        <input value={adminPassword} onChange={e => setAdminPassword(e.target.value)}
                                            type={showPassword ? 'text' : 'password'} placeholder="••••••••"
                                            className={`${inputCls} pr-12`} />
                                        <button type="button" onClick={() => setShowPassword(s => !s)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1">
                                            {showPassword ? <EyeOff /> : <EyeOn />}
                                        </button>
                                    </div>
                                </FormField>
                                <FormField label="Confirm Password *">
                                    <div className="relative">
                                        <input value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                                            type={showConfirmPassword ? 'text' : 'password'} placeholder="••••••••"
                                            className={`${inputCls} pr-12`} />
                                        <button type="button" onClick={() => setShowConfirmPassword(s => !s)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1">
                                            {showConfirmPassword ? <EyeOff /> : <EyeOn />}
                                        </button>
                                    </div>
                                </FormField>
                                <StepActions onNext={nextStep} onBack={prevStep} />
                            </div>
                        )}

                        {/* ── Step 4: Plan Selection ────────────────── */}
                        {step === 4 && (
                            <div className="space-y-6 animate-fade-in">
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-800">Choose your plan</h2>
                                    <p className="text-sm text-slate-500 mt-1">
                                        All plans start with a <span className="font-semibold text-indigo-600">30-day free trial</span>. No card required.
                                    </p>
                                </div>

                                <div className="space-y-3">
                                    {PLANS.map(plan => (
                                        <button
                                            key={plan.key}
                                            type="button"
                                            onClick={() => setPlanType(plan.key as any)}
                                            className={`w-full text-left rounded-2xl p-4 border-2 transition-all ${
                                                planType === plan.key
                                                    ? 'border-indigo-500 bg-indigo-50'
                                                    : 'border-slate-200 bg-white hover:border-indigo-300'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                                                        planType === plan.key ? 'border-indigo-500' : 'border-slate-300'
                                                    }`}>
                                                        {planType === plan.key && <div className="w-2 h-2 rounded-full bg-indigo-500" />}
                                                    </div>
                                                    <span className="font-bold text-slate-800">{plan.label}</span>
                                                    {plan.highlight && (
                                                        <span className="bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">Popular</span>
                                                    )}
                                                </div>
                                                <div className="text-right">
                                                    <span className="font-bold text-slate-800">{plan.price}</span>
                                                    <span className="text-xs text-slate-500 ml-1">{plan.period}</span>
                                                </div>
                                            </div>
                                            <p className="text-xs text-slate-500 mb-2 ml-6">{plan.limit}</p>
                                            <ul className="ml-6 space-y-0.5">
                                                {plan.features.map(f => (
                                                    <li key={f} className="text-xs text-slate-600 flex items-center gap-1.5">
                                                        <span className="text-green-500">✓</span> {f}
                                                    </li>
                                                ))}
                                            </ul>
                                        </button>
                                    ))}
                                </div>

                                <StepActions onNext={nextStep} onBack={prevStep} />
                            </div>
                        )}

                        {/* ── Step 5: Review & Launch ───────────────── */}
                        {step === 5 && (
                            <div className="space-y-6 animate-fade-in">
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-800">Review & launch</h2>
                                    <p className="text-sm text-slate-500 mt-1">Check everything before we create your school.</p>
                                </div>

                                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100">
                                    <Section title="School">
                                        <Row label="Name" value={schoolName} />
                                        <Row label="Code" value={<span className="font-mono font-bold text-indigo-700">{schoolCode}</span>} />
                                        <Row label="Email" value={schoolEmail} />
                                        <Row label="Phone" value={phone} />
                                        {state && <Row label="State" value={state} />}
                                    </Section>
                                    <Section title="Branches">
                                        <Row label="Main Branch" value={`${mainBranchName} (${mainBranchCode})`} />
                                        {extraBranches.map((b, i) => (
                                            <Row key={i} label={`Branch ${i + 1}`} value={`${b.name} (${b.code})`} />
                                        ))}
                                    </Section>
                                    <Section title="Admin Account">
                                        <Row label="Name" value={adminName} />
                                        <Row label="Email" value={adminEmail} />
                                        <Row label="Admin ID" value={<span className="font-mono font-bold text-indigo-700">{previewAdminId}</span>} />
                                    </Section>
                                    <Section title="Plan">
                                        <Row label="Selected Plan" value={PLANS.find(p => p.key === planType)?.label || planType} />
                                        <Row label="Trial Period" value="30 days free — starts today" />
                                    </Section>
                                </div>

                                <p className="text-xs text-slate-400 text-center">
                                    By clicking Launch, you agree to Oliskey's Terms of Service and Privacy Policy.
                                </p>

                                <div className="flex flex-col sm:flex-row gap-3">
                                    <button type="button" onClick={prevStep}
                                        className="flex-none py-3 px-5 border border-slate-200 text-slate-600 font-semibold rounded-xl hover:bg-slate-50 text-sm transition">
                                        Back
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleLaunch}
                                        disabled={loading}
                                        className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 text-sm transition active:scale-95 disabled:opacity-70 flex items-center justify-center gap-2"
                                    >
                                        {loading ? (
                                            <>
                                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                Creating your school...
                                            </>
                                        ) : 'Launch My School'}
                                    </button>
                                </div>
                            </div>
                        )}

                    </div>
                </div>
            </div>
        </div>
    );
};

// ── Sub-components ────────────────────────────────────────────────────────────

const inputCls = 'w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm shadow-sm';

const FormField: React.FC<{ label: string; hint?: string; children: React.ReactNode }> = ({ label, hint, children }) => (
    <div className="space-y-1.5">
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</label>
        {children}
        {hint && <p className="text-[11px] text-indigo-500">{hint}</p>}
    </div>
);

const StepActions: React.FC<{ onNext: () => void; onBack: () => void; backLabel?: string }> = ({ onNext, onBack, backLabel = 'Back' }) => (
    <div className="flex gap-3 pt-2">
        <button type="button" onClick={onBack}
            className="flex-none py-3 px-5 border border-slate-200 text-slate-600 font-semibold rounded-xl hover:bg-slate-50 text-sm transition">
            {backLabel}
        </button>
        <button type="button" onClick={onNext}
            className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 text-sm transition active:scale-95">
            Continue
        </button>
    </div>
);

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="p-4">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">{title}</p>
        <div className="space-y-2">{children}</div>
    </div>
);

const Row: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
    <div className="flex items-center justify-between gap-4">
        <span className="text-sm text-slate-500 flex-shrink-0">{label}</span>
        <span className="text-sm text-slate-800 font-medium text-right">{value}</span>
    </div>
);

const EyeOn = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
    </svg>
);
const EyeOff = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
        <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
);

export default SchoolSignup;
