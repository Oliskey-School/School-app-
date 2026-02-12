import React, { useState } from 'react';
import { SchoolLogoIcon, UserIcon } from '../../constants';
import { toast } from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { DashboardType } from '../../types';

interface SchoolSignupProps {
    onComplete: (email: string, role: string) => void;
    onBack: () => void;
}

const SchoolSignup: React.FC<SchoolSignupProps> = ({ onComplete, onBack }) => {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Eye Icons
    const EyeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>;
    const EyeOffIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>;

    // Form Data
    const [formData, setFormData] = useState({
        schoolName: '',
        schoolEmail: '',
        phone: '',
        address: '',
        adminName: '',
        adminEmail: '',
        password: '',
        confirmPassword: ''
    });

    // Branch State
    const [hasBranches, setHasBranches] = useState(false);
    const [numBranches, setNumBranches] = useState(1);
    const [branchNames, setBranchNames] = useState<string[]>([]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleBranchNameChange = (index: number, value: string) => {
        const newNames = [...branchNames];
        newNames[index] = value;
        setBranchNames(newNames);
    };

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (file.size > 2 * 1024 * 1024) {
                toast.error("File size must be less than 2MB");
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setLogoPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const nextStep = () => {
        // Validation Step 1
        if (step === 1) {
            if (!formData.schoolName || !formData.schoolEmail || !formData.phone) {
                toast.error("Please fill in all required school details.");
                return;
            }
            if (hasBranches) {
                if (!branchNames[0]) {
                     toast.error("Please enter the Main Branch name.");
                     return;
                }
            }
        }
        // Validation Step 2
        if (step === 2) {
            if (!formData.adminName || !formData.adminEmail || !formData.password) {
                toast.error("Please fill in all required admin details.");
                return;
            }
            if (formData.password !== formData.confirmPassword) {
                toast.error("Passwords do not match.");
                return;
            }
            if (formData.password.length < 6) {
                toast.error("Password must be at least 6 characters.");
                return;
            }
        }
        setStep(prev => prev + 1);
    };

    const prevStep = () => setStep(prev => prev - 1);

    const handleCreateAccount = async () => {
        setLoading(true);

        try {
            // 1. Pre-generate School ID (Standard UUID)
            const schoolId = crypto.randomUUID();
            const logoUrl = logoPreview ? `https://ui-avatars.com/api/?name=${formData.schoolName.replace(/ /g, '+')}&background=random` : null;

            // 2. Create Auth User with early-binded school_id
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: formData.adminEmail,
                password: formData.password,
                options: {
                    data: {
                        full_name: formData.adminName,
                        role: 'admin',
                        school_id: schoolId, // CRITICAL: This ensures the JWT is valid from minute zero
                    }
                }
            });

            if (authError) throw authError;
            if (!authData.user) throw new Error("User creation failed. Please try again.");

            // 3. Create School Entry with pre-defined ID
            const { data: schoolData, error: schoolError } = await supabase
                .from('schools')
                .insert({
                    id: schoolId,
                    name: formData.schoolName,
                    email: formData.schoolEmail,
                    phone: formData.phone,
                    address: formData.address,
                    logo_url: logoUrl,
                    subscription_status: 'trial',
                    slug: formData.schoolName.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Math.floor(Math.random() * 1000)
                })
                .select()
                .single();

            if (schoolError) throw schoolError;

            // 3b. Create Branches if requested
            if (hasBranches) {
                // Main Branch
                const mainBranchName = branchNames[0] || 'Main Campus';
                await supabase.from('branches').insert({
                    school_id: schoolId,
                    name: mainBranchName,
                    is_main: true
                });

                // Additional Branches
                const otherBranches = [];
                for (let i = 0; i < numBranches; i++) {
                    const bName = branchNames[i + 1] || `Branch ${i + 1}`;
                    if (bName) { // Ensure we don't add empty if logic is weird, though loop handles it
                        otherBranches.push({
                            school_id: schoolId,
                            name: bName,
                            is_main: false
                        });
                    }
                }
                if (otherBranches.length > 0) {
                    await supabase.from('branches').insert(otherBranches);
                }
            } else {
                // Always create a Main Branch for consistency? 
                // Let's create one default branch effectively representing the school itself, 
                // so we can use branch_id everywhere if we want.
                // But for now, if no branches, we leave it empty to imply "Single Branch School".
            }

            // 4. Create Basic Subscription (Free Tier)
            await supabase.from('subscriptions').insert({
                school_id: schoolId,
                plan_id: 1, // Basic
                status: 'trial',
                start_date: new Date().toISOString(),
            });

            // 5. Update Users (Primary Record) instead of legacy profiles
            // Admin is NOT linked to a specific branch (branch_id = null) to oversee all.
            await supabase.from('users').update({
                school_id: schoolId,
                role: 'admin',
                name: formData.adminName,
            }).eq('id', authData.user.id);

            toast.success("School Portal Created (Free Tier Ready)!");

            setTimeout(() => {
                onComplete(formData.adminEmail, 'admin');
            }, 1500);

        } catch (error: any) {
            console.error("Signup Error", error);
            toast.error(error.message || "Failed to create account.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex bg-slate-50 min-h-screen">
            {/* Sidebar (Purple) */}
            <div className="hidden lg:flex flex-col w-80 bg-indigo-600 text-white p-8 justify-between relative overflow-hidden transition-all duration-300">
                {/* Background decorative circles */}
                <div className="absolute top-0 left-0 w-64 h-64 bg-indigo-500 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 opacity-50"></div>
                <div className="absolute bottom-0 right-0 w-64 h-64 bg-purple-500 rounded-full blur-3xl translate-x-1/2 translate-y-1/2 opacity-50"></div>

                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-10">
                        <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                            <SchoolLogoIcon className="w-6 h-6 text-white" />
                        </div>
                        <h1 className="font-bold text-xl tracking-tight">SchoolApp</h1>
                    </div>

                    <div className="space-y-8">
                        <div>
                            <h2 className="text-2xl font-bold mb-2">Start your journey</h2>
                            <p className="text-indigo-200 text-sm leading-relaxed">Join thousands of schools managing their operations efficiently with our all-in-one platform.</p>
                        </div>

                        {/* Steps Indicator */}
                        <div className="space-y-6 mt-8">
                            <StepIndicator number={1} title="School Details" active={step >= 1} current={step === 1} />
                            <div className={`h-8 w-0.5 ml-4 ${step > 1 ? 'bg-indigo-400' : 'bg-indigo-800'}`}></div>
                            <StepIndicator number={2} title="Admin Setup" active={step >= 2} current={step === 2} />
                            <div className={`h-8 w-0.5 ml-4 ${step > 2 ? 'bg-indigo-400' : 'bg-indigo-800'}`}></div>
                            <StepIndicator number={3} title="Confirmation" active={step >= 3} current={step === 3} />
                        </div>
                    </div>
                </div>

                <div className="relative z-10 text-xs text-indigo-300">
                    &copy; 2026 SchoolApp Inc.
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col relative w-full">
                {/* Mobile Header / Back Button */}
                <div className="p-6 flex justify-between items-center bg-white border-b lg:border-none">
                    <div className="lg:hidden flex items-center gap-2">
                        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                            <SchoolLogoIcon className="w-4 h-4 text-white" />
                        </div>
                        <span className="font-bold text-gray-800">SchoolApp</span>
                    </div>
                    <button onClick={onBack} className="text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors flex items-center gap-1 ml-auto">
                        Back to Login
                    </button>
                </div>

                {/* Mobile Step Indicator */}
                <div className="lg:hidden px-6 pt-4 pb-2">
                    <div className="flex items-center justify-between">
                        {[1, 2, 3].map((s) => (
                            <div key={s} className="flex flex-col items-center gap-1 w-1/3">
                                <div className={`h-1 w-full rounded-full ${step >= s ? 'bg-indigo-600' : 'bg-gray-200'}`}></div>
                                <span className={`text-[10px] font-bold uppercase ${step === s ? 'text-indigo-600' : 'text-gray-400'}`}>
                                    {s === 1 ? 'School' : s === 2 ? 'Admin' : 'Confirm'}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex-1 flex items-center justify-center p-4 lg:p-8 overflow-y-auto">
                    <div className="w-full max-w-lg bg-white p-0 lg:p-10 rounded-2xl shadow-sm lg:shadow-xl border border-gray-100/50">
                        {step === 1 && (
                            <div className="animate-fade-in space-y-6 p-6 lg:p-0">
                                <h2 className="text-2xl font-bold text-gray-800">School Details</h2>
                                <p className="text-sm text-gray-500 -mt-4">Tell us about your institution.</p>

                                <div className="space-y-4">
                                    {/* Logo Upload */}
                                    <div className="flex justify-center mb-6">
                                        <div className="relative group cursor-pointer">
                                            <div className={`w-24 h-24 rounded-full border-2 border-dashed flex items-center justify-center overflow-hidden transition-all ${logoPreview ? 'border-indigo-500' : 'border-gray-300 group-hover:border-indigo-400 bg-gray-50'}`}>
                                                {logoPreview ? (
                                                    <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="text-center text-gray-400">
                                                        <svg className="w-8 h-8 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                                        <span className="text-[10px] uppercase font-bold">Upload Logo</span>
                                                    </div>
                                                )}
                                            </div>
                                            <input type="file" onChange={handleLogoChange} className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" />
                                            <div className="absolute bottom-0 right-0 bg-indigo-600 p-1.5 rounded-full text-white shadow-md">
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                            </div>
                                        </div>
                                    </div>

                                    <Input label="School Name" name="schoolName" value={formData.schoolName} onChange={handleChange} placeholder="e.g. Springfield High School" />
                                    <Input label="School Email" name="schoolEmail" type="email" value={formData.schoolEmail} onChange={handleChange} placeholder="info@springfield.edu" />
                                    <Input label="Phone Number" name="phone" value={formData.phone} onChange={handleChange} placeholder="+234 800 000 0000" />
                                    <Input label="Address (Optional)" name="address" value={formData.address} onChange={handleChange} placeholder="123 Education Lane, Lagos" />
                                
                                    {/* Branch Setup Trigger */}
                                    <div className="pt-2">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input 
                                                type="checkbox" 
                                                checked={hasBranches} 
                                                onChange={(e) => setHasBranches(e.target.checked)} 
                                                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300"
                                            />
                                            <span className="text-sm font-medium text-gray-700">This school has multiple branches</span>
                                        </label>
                                    </div>

                                    {hasBranches && (
                                        <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 space-y-4 animate-fade-in">
                                            <div className="flex items-center gap-2">
                                                <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                                                <h3 className="text-sm font-bold text-indigo-900">Branch Configuration</h3>
                                            </div>
                                            
                                            <Input 
                                                label="Number of Additional Branches" 
                                                type="number" 
                                                min="1" 
                                                max="10" 
                                                value={numBranches} 
                                                onChange={(e: any) => setNumBranches(parseInt(e.target.value) || 1)} 
                                            />

                                            <div className="space-y-3 pl-2 border-l-2 border-indigo-200">
                                                <Input 
                                                    label="Main Branch Name" 
                                                    value={branchNames[0] || ''} 
                                                    onChange={(e: any) => handleBranchNameChange(0, e.target.value)} 
                                                    placeholder="e.g. Main Campus (Lekki)"
                                                />
                                                {Array.from({ length: numBranches }).map((_, idx) => (
                                                    <Input 
                                                        key={idx + 1}
                                                        label={`Branch ${idx + 1} Name`}
                                                        value={branchNames[idx + 1] || ''} 
                                                        onChange={(e: any) => handleBranchNameChange(idx + 1, e.target.value)} 
                                                        placeholder={`e.g. Branch ${idx + 1}`}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="pt-4">
                                    <Button onClick={nextStep}>Next Step</Button>
                                </div>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="animate-fade-in space-y-6 p-6 lg:p-0">
                                <h2 className="text-2xl font-bold text-gray-800">Admin Setup</h2>
                                <p className="text-sm text-gray-500 -mt-4">Create the principal/admin account.</p>

                                <div className="space-y-4">
                                    <Input label="Admin Name (Principal)" name="adminName" value={formData.adminName} onChange={handleChange} placeholder="Dr. John Doe" />
                                    <Input label="Admin Login Email" name="adminEmail" type="email" value={formData.adminEmail} onChange={handleChange} placeholder="principal@springfield.edu" />
                                    <Input
                                        label="Password"
                                        name="password"
                                        type={showPassword ? "text" : "password"}
                                        value={formData.password}
                                        onChange={handleChange}
                                        placeholder="••••••••"
                                        showToggle
                                        onToggle={() => setShowPassword(!showPassword)}
                                        isToggled={showPassword}
                                    />
                                    <Input
                                        label="Confirm Password"
                                        name="confirmPassword"
                                        type={showConfirmPassword ? "text" : "password"}
                                        value={formData.confirmPassword}
                                        onChange={handleChange}
                                        placeholder="••••••••"
                                        showToggle
                                        onToggle={() => setShowConfirmPassword(!showConfirmPassword)}
                                        isToggled={showConfirmPassword}
                                    />
                                </div>
                                <div className="pt-4 flex gap-3">
                                    <Button onClick={prevStep} secondary>Back</Button>
                                    <Button onClick={nextStep}>Next Step</Button>
                                </div>
                            </div>
                        )}

                        {step === 3 && (
                            <div className="animate-fade-in space-y-6 p-6 lg:p-0">
                                <div className="text-center mb-6">
                                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    </div>
                                    <h2 className="text-2xl font-bold text-gray-800">Account Tier</h2>
                                    <p className="text-sm text-gray-500">Choose how you want to start.</p>
                                </div>

                                <div className="space-y-4">
                                    {/* Free Tier Card */}
                                    <div className="bg-slate-50 p-4 rounded-xl border-2 border-indigo-100 relative overflow-hidden">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <h3 className="font-bold text-slate-800">Free Tier</h3>
                                                <p className="text-[11px] text-slate-500 uppercase font-black tracking-widest">3 Users Limit</p>
                                            </div>
                                            <span className="bg-indigo-600 text-white text-[10px] px-2 py-1 rounded-full font-bold">ACTIVE BY DEFAULT</span>
                                        </div>
                                        <p className="text-xs text-slate-600 leading-relaxed">Perfect for testing. Add up to 3 Students, Teachers, or Parents. Upgrade anytime to add more.</p>
                                    </div>

                                    {/* Professional Pricing Disclosure */}
                                    <div className="bg-amber-50 p-5 rounded-xl border border-amber-100 space-y-3">
                                        <h3 className="text-xs font-black text-amber-800 uppercase tracking-widest flex items-center gap-2">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                            Professional Package
                                        </h3>

                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-slate-600">Setup Fee (One-time)</span>
                                                <span className="font-bold text-slate-900">₦50,000.00</span>
                                            </div>
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-slate-600">Per Student (Every Term)</span>
                                                <span className="font-bold text-slate-900">₦3,000.00</span>
                                            </div>
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-slate-600">AI Features (Optional)</span>
                                                <span className="font-bold text-slate-900">₦5,000.00 / term</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 flex gap-3">
                                    <Button onClick={prevStep} secondary>Back</Button>
                                    <Button onClick={handleCreateAccount} loading={loading}>Create Free Portal</Button>
                                </div>
                                <p className="text-[10px] text-center text-gray-400 mt-2 px-6">
                                    By clicking Create Free Portal, you agree to our Terms. You can pay the setup fee later from your admin dashboard.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// Sub-components for cleaner code
const StepIndicator: React.FC<{ number: number, title: string, active: boolean, current: boolean }> = ({ number, title, active, current }) => (
    <div className={`flex items-center gap-4 ${active ? 'opacity-100' : 'opacity-40'}`}>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${current ? 'bg-white text-indigo-600 shadow-lg scale-110' : active ? 'bg-indigo-500 text-white' : 'bg-indigo-900/50 text-indigo-300'}`}>
            {active && !current ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
            ) : number}
        </div>
        <span className={`font-medium ${current ? 'text-white' : 'text-indigo-200'}`}>{title}</span>
    </div>
);

const Input: React.FC<any> = ({ label, showToggle, onToggle, isToggled, ...props }) => (
    <div className="space-y-1.5">
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide ml-1">{label}</label>
        <div className="relative">
            <input {...props} className={`w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-sm ${showToggle ? 'pr-12' : ''}`} />
            {showToggle && (
                <button
                    type="button"
                    onClick={onToggle}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-indigo-600 transition-colors p-1"
                >
                    {isToggled ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                    )}
                </button>
            )}
        </div>
    </div>
);

const Button: React.FC<any> = ({ children, secondary, loading, ...props }) => (
    <button {...props} disabled={loading} className={`w-full py-3.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2 active:scale-95 ${secondary
        ? 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
        : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg hover:shadow-indigo-500/30'
        }`}>
        {loading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
        {children}
    </button>
);

const ReviewItem: React.FC<{ label: string, value: string }> = ({ label, value }) => (
    <div className="flex justify-between items-center border-b border-gray-200/50 pb-2 last:border-0 last:pb-0">
        <span className="text-sm text-gray-500">{label}</span>
        <span className="text-sm font-semibold text-gray-800 text-right">{value}</span>
    </div>
);

export default SchoolSignup;
