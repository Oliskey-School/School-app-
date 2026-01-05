import React, { useState, useEffect } from 'react';
import { SchoolLogoIcon, UserIcon, LockIcon, EyeIcon, EyeOffIcon } from '../../constants';
import { DashboardType } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useProfile } from '../../context/ProfileContext';
import { fetchSchools } from '../../lib/database';
import { toast } from 'react-hot-toast';

interface SignupProps {
    onLogin?: (dashboard: DashboardType, user?: any) => void;
    onNavigateToLogin: () => void;
}

const Signup: React.FC<SignupProps> = ({ onNavigateToLogin }) => {
    const { signIn } = useAuth();
    const { setProfile } = useProfile();

    const [schools, setSchools] = useState<{ id: number; name: string }[]>([]);
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        password: '',
        role: 'student',
        schoolId: ''
    });
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        loadSchools();
    }, []);

    const loadSchools = async () => {
        try {
            const data = await fetchSchools();
            // Ensure we have at least the demo school if DB is empty but typically verify_phase1 ensures seed
            if (data.length === 0) {
                setSchools([{ id: 1, name: 'Demo International School (Fallback)' }]); // Fallback for UI testing
            } else {
                setSchools(data);
            }
        } catch (err) {
            console.error("Failed to load schools", err);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        if (!formData.fullName || !formData.email || !formData.password || !formData.schoolId) {
            setError('Please fill in all fields.');
            setIsLoading(false);
            return;
        }

        try {
            // MOCK SIGNUP LOGIC (To match Login.tsx pattern)
            // In production, this would be supabase.auth.signUp()

            await new Promise(resolve => setTimeout(resolve, 1000));

            const mockUserId = 'new-user-' + Math.random().toString(36).substr(2, 9);
            const dashboardType = DashboardType.Student; // Defaulting for simplicity or based on role

            const selectedSchool = schools.find(s => s.id.toString() === formData.schoolId);

            const mockProfile = {
                id: mockUserId,
                name: formData.fullName,
                email: formData.email,
                role: formData.role.charAt(0).toUpperCase() + formData.role.slice(1) as any,
                school_id: formData.schoolId, // The verified School ID!
                school_name: selectedSchool?.name || 'Unknown School',
                phone: '123-456-7890',
                avatarUrl: `https://i.pravatar.cc/150?u=${mockUserId}`
            };

            setProfile(mockProfile);

            // Auto-login
            signIn(dashboardType, {
                userId: mockUserId,
                email: formData.email,
                userType: formData.role,
            });

            toast.success("Account created successfully!");

        } catch (err) {
            setError('Registration failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen w-full bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-4">
            <div className="w-full max-w-md mx-auto bg-white/80 backdrop-blur-lg rounded-3xl p-8 shadow-2xl transition-all border border-white/50">

                {/* Header */}
                <div className="flex flex-col items-center mb-6">
                    <SchoolLogoIcon className="text-indigo-500 h-14 w-14 mb-3" />
                    <h1 className="text-2xl font-bold text-gray-800">Create Account</h1>
                    <p className="text-gray-500 text-xs mt-1">Join your school community</p>
                </div>

                <form className="space-y-4" onSubmit={handleSignup}>

                    {/* Full Name */}
                    <div className="relative group">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                            <UserIcon className="text-gray-400 h-5 w-5" />
                        </span>
                        <input
                            name="fullName"
                            type="text"
                            value={formData.fullName}
                            onChange={handleChange}
                            className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                            placeholder="Full Name"
                        />
                    </div>

                    {/* Email */}
                    <div className="relative group">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                            <UserIcon className="text-gray-400 h-5 w-5" />
                        </span>
                        <input
                            name="email"
                            type="email"
                            value={formData.email}
                            onChange={handleChange}
                            className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                            placeholder="Email Address"
                        />
                    </div>

                    {/* Password */}
                    <div className="relative group">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                            <LockIcon className="text-gray-400 h-5 w-5" />
                        </span>
                        <input
                            name="password"
                            type={showPassword ? 'text' : 'password'}
                            value={formData.password}
                            onChange={handleChange}
                            className="w-full pl-11 pr-12 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                            placeholder="Create Password"
                        />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400">
                            {showPassword ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                        </button>
                    </div>

                    {/* Role Select */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">I am a...</label>
                        <select name="role" value={formData.role} onChange={handleChange} className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500">
                            <option value="student">Student</option>
                            <option value="parent">Parent</option>
                            <option value="teacher">Teacher</option>
                        </select>
                    </div>

                    {/* School Select */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">School</label>
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                                <SchoolLogoIcon className="text-gray-400 h-5 w-5" />
                            </span>
                            <select name="schoolId" value={formData.schoolId} onChange={handleChange} className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 appearance-none">
                                <option value="">Select your School</option>
                                {schools.map(school => (
                                    <option key={school.id} value={school.id}>{school.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {error && <div className="text-red-500 text-xs text-center">{error}</div>}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3 rounded-xl text-white font-bold shadow-lg shadow-indigo-500/30 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 transition-all"
                    >
                        {isLoading ? 'Creating Account...' : 'Sign Up'}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <p className="text-gray-500 text-sm">
                        Already have an account?{' '}
                        <button onClick={onNavigateToLogin} className="text-indigo-600 font-bold hover:underline">
                            Log in
                        </button>
                    </p>
                </div>

            </div>
        </div>
    );
};

export default Signup;
