import React, { useState, useEffect } from 'react';
import { CameraIcon, UserIcon, MailIcon, PhoneIcon, ChevronLeftIcon } from '../../constants';
import { toast } from 'react-hot-toast';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { createUserAccount, sendVerificationEmail } from '../../lib/auth';
import CredentialsModal from '../ui/CredentialsModal';
import { useAuth } from '../../context/AuthContext';

interface AddBranchAdminScreenProps {
    forceUpdate: () => void;
    handleBack: () => void;
}

const AddBranchAdminScreen: React.FC<AddBranchAdminScreenProps> = ({ forceUpdate, handleBack }) => {
    const { currentSchool } = useAuth();
    const schoolId = currentSchool?.id;

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [selectedBranchId, setSelectedBranchId] = useState('');
    const [branches, setBranches] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [avatar, setAvatar] = useState<string | null>(null);
    const [showCredentialsModal, setShowCredentialsModal] = useState(false);
    const [credentials, setCredentials] = useState<{
        username: string;
        password: string;
        email: string;
    } | null>(null);

    useEffect(() => {
        const fetchBranches = async () => {
            if (!schoolId) return;
            const { data, error } = await supabase
                .from('branches')
                .select('*')
                .eq('school_id', schoolId)
                .order('name', { ascending: true });

            if (!error && data) {
                setBranches(data);
                if (data.length > 0) setSelectedBranchId(data[0].id);
            }
        };
        fetchBranches();
    }, [schoolId]);

    const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            const reader = new FileReader();
            reader.onloadend = () => { setAvatar(reader.result as string); };
            reader.readAsDataURL(event.target.files[0]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedBranchId) {
            toast.error("Please select a branch.");
            return;
        }

        setIsLoading(true);
        const toastId = toast.loading('Creating branch admin account...');

        try {
            const avatarUrl = avatar || `https://i.pravatar.cc/150?u=${name.replace(' ', '')}`;

            // 1. Create Login Credentials
            const authResult = await createUserAccount(name, 'Admin', email, schoolId || '');
            if (authResult.error) throw new Error(authResult.error);

            // 2. Update User Record in 'users' table (Backend API already upserted it by ID)
            const { error: userError } = await supabase
                .from('users')
                .update({
                    name: name,
                    role: 'admin',
                    branch_id: selectedBranchId,
                    avatar_url: avatarUrl
                })
                .eq('id', authResult.userId);

            if (userError) throw userError;

            // 3. Update Profiles table (Crucial for RLS and context resolution)
            const { error: profileError } = await supabase
                .from('profiles')
                .update({
                    full_name: name,
                    role: 'admin',
                    branch_id: selectedBranchId,
                    avatar_url: avatarUrl
                })
                .eq('id', authResult.userId);

            // Do not throw on profile error as a trigger might have delayed it, but log it
            if (profileError) console.warn("Notice: Syncing profile failed:", profileError);

            // 3. Send Verification Email
            await sendVerificationEmail(name, email, 'School Admin Account');

            toast.success('Branch Admin created successfully!', { id: toastId });
            setCredentials({ username: authResult.username, password: authResult.password, email });
            setShowCredentialsModal(true);

        } catch (error: any) {
            console.error('Error creating branch admin:', error);
            toast.error(error.message || 'Failed to create branch admin', { id: toastId });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-gray-50">
            <div className="p-4 bg-white border-b flex items-center gap-4">
                <button onClick={handleBack} className="p-2 hover:bg-gray-100 rounded-full">
                    <ChevronLeftIcon className="w-6 h-6 text-gray-600" />
                </button>
                <h2 className="font-bold text-lg text-gray-800">Add Branch Admin</h2>
            </div>

            <form onSubmit={handleSubmit} className="flex-grow flex flex-col p-4 space-y-6 overflow-y-auto">
                <div className="flex justify-center">
                    <div className="relative">
                        <div className="w-28 h-28 rounded-full bg-gray-200 flex items-center justify-center">
                            {avatar ? <img src={avatar} alt="Admin" className="w-full h-full rounded-full object-cover" /> : <UserIcon className="w-12 h-12 text-gray-400" />}
                        </div>
                        <label htmlFor="photo-upload" className="absolute bottom-0 right-0 bg-indigo-600 p-2 rounded-full border-2 border-white cursor-pointer hover:bg-indigo-700">
                            <CameraIcon className="text-white h-4 w-4" />
                            <input id="photo-upload" type="file" className="sr-only" accept="image/*" onChange={handleImageChange} />
                        </label>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border space-y-4 max-w-2xl mx-auto w-full">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400"><UserIcon className="w-5 h-5" /></span>
                            <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full pl-10 pr-3 py-3 bg-gray-50 border rounded-lg focus:ring-indigo-500 focus:border-indigo-500" placeholder="e.g. Mrs. Sarah Branch" required />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400"><MailIcon className="w-5 h-5" /></span>
                            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full pl-10 pr-3 py-3 bg-gray-50 border rounded-lg focus:ring-indigo-500 focus:border-indigo-500" placeholder="admin.lekki@school.com" required />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400"><PhoneIcon className="w-5 h-5" /></span>
                            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full pl-10 pr-3 py-3 bg-gray-50 border rounded-lg focus:ring-indigo-500 focus:border-indigo-500" placeholder="+234 ..." />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Assign to Branch</label>
                        <select
                            value={selectedBranchId}
                            onChange={e => setSelectedBranchId(e.target.value)}
                            className="w-full p-3 bg-gray-50 border rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                            required
                        >
                            <option value="">Select a Branch...</option>
                            {branches.map(b => (
                                <option key={b.id} value={b.id}>{b.name} {b.is_main ? '(Main)' : ''}</option>
                            ))}
                        </select>
                        <p className="text-[10px] text-gray-500 mt-1 uppercase font-bold tracking-tight">
                            Branch Admins can only manage data within their assigned branch.
                        </p>
                    </div>

                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={isLoading || !selectedBranchId}
                            className={`w-full py-3.5 rounded-xl text-white font-bold shadow-lg ${isLoading ? 'bg-gray-400' : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95'} transition-all`}
                        >
                            {isLoading ? 'Creating Account...' : 'Create Branch Admin'}
                        </button>
                    </div>
                </div>
            </form>

            {credentials && (
                <CredentialsModal
                    isOpen={showCredentialsModal}
                    userName={name}
                    username={credentials.username}
                    password={credentials.password}
                    email={credentials.email}
                    userType="Admin"
                    onClose={() => {
                        setShowCredentialsModal(false);
                        forceUpdate();
                        handleBack();
                    }}
                />
            )}
        </div>
    );
};

export default AddBranchAdminScreen;
