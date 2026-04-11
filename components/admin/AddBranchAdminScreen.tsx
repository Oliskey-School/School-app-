import React, { useState, useEffect } from 'react';
import { CameraIcon, UserIcon, MailIcon, PhoneIcon, ChevronLeftIcon } from '../../constants';
import { toast } from 'react-hot-toast';
import { api } from '../../lib/api';
import { createUserAccount, sendVerificationEmail } from '../../lib/auth';
import CredentialsModal from '../ui/CredentialsModal';
import { useAuth } from '../../context/AuthContext';

interface AddBranchAdminScreenProps {
    forceUpdate: () => void;
    handleBack: () => void;
    branchId?: string;
}

const AddBranchAdminScreen: React.FC<AddBranchAdminScreenProps> = ({ forceUpdate, handleBack, branchId }) => {
    const { currentSchool } = useAuth();
    const schoolId = currentSchool?.id;

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [selectedBranchId, setSelectedBranchId] = useState(branchId || '');
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
            try {
                const data = await api.getBranches(schoolId);
                setBranches(data || []);
                if (branchId) {
                    setSelectedBranchId(branchId);
                } else if (data && data.length > 0 && !selectedBranchId) {
                    setSelectedBranchId(data[0].id);
                }
            } catch (err) {
                console.error('Error fetching branches:', err);
            }
        };
        fetchBranches();
    }, [schoolId, branchId]);


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

            // Create account with branch assignment handled by the backend
            const authResult = await createUserAccount(
                name, 
                'Admin', 
                email, 
                schoolId || '', 
                undefined, 
                selectedBranchId, 
                avatarUrl
            );

            if (authResult.error) throw new Error(authResult.error);

            // Send Verification Email
            await sendVerificationEmail(name, email, currentSchool?.name || 'School Admin Account');

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
                <button onClick={handleBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <ChevronLeftIcon className="w-6 h-6 text-gray-600" />
                </button>
                <h2 className="font-bold text-lg text-gray-800 tracking-tight">Add Branch Admin</h2>
            </div>

            <form onSubmit={handleSubmit} className="flex-grow flex flex-col p-4 space-y-6 overflow-y-auto">
                <div className="flex justify-center mt-4">
                    <div className="relative group">
                        <div className="w-28 h-28 rounded-full bg-indigo-50 border-2 border-dashed border-indigo-200 flex items-center justify-center overflow-hidden shadow-inner ring-4 ring-white">
                            {avatar ? (
                                <img src={avatar} alt="Admin" className="w-full h-full object-cover" />
                            ) : (
                                <UserIcon className="w-12 h-12 text-indigo-200" />
                            )}
                        </div>
                        <label htmlFor="photo-upload" className="absolute bottom-0 right-0 bg-indigo-600 p-2.5 rounded-full border-2 border-white cursor-pointer hover:bg-indigo-700 shadow-lg transform group-hover:scale-110 transition-transform">
                            <CameraIcon className="text-white h-4 w-4" />
                            <input id="photo-upload" type="file" className="sr-only" accept="image/*" onChange={handleImageChange} />
                        </label>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 space-y-5 max-w-2xl mx-auto w-full">
                    <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Full Name</label>
                        <div className="relative group">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-gray-400 group-focus-within:text-indigo-500 transition-colors">
                                <UserIcon className="w-5 h-5" />
                            </span>
                            <input 
                                type="text" 
                                value={name} 
                                onChange={e => setName(e.target.value)} 
                                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white outline-none transition-all placeholder:text-slate-400" 
                                placeholder="e.g. Mrs. Sarah Branch" 
                                required 
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Email Address</label>
                        <div className="relative group">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-gray-400 group-focus-within:text-indigo-500 transition-colors">
                                <MailIcon className="w-5 h-5" />
                            </span>
                            <input 
                                type="email" 
                                value={email} 
                                onChange={e => setEmail(e.target.value)} 
                                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white outline-none transition-all placeholder:text-slate-400" 
                                placeholder="admin.lekki@school.com" 
                                required 
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Phone Number</label>
                        <div className="relative group">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-gray-400 group-focus-within:text-indigo-500 transition-colors">
                                <PhoneIcon className="w-5 h-5" />
                            </span>
                            <input 
                                type="tel" 
                                value={phone} 
                                onChange={e => setPhone(e.target.value)} 
                                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white outline-none transition-all placeholder:text-slate-400" 
                                placeholder="+234 ..." 
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Assign to Branch</label>
                        <select
                            value={selectedBranchId}
                            onChange={e => setSelectedBranchId(e.target.value)}
                            className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white outline-none transition-all cursor-pointer"
                            required
                        >
                            <option value="">Select a Branch...</option>
                            {branches.map(b => (
                                <option key={b.id} value={b.id}>{b.name} {b.is_main ? '(Main)' : ''}</option>
                            ))}
                        </select>
                        <p className="text-[10px] text-slate-400 mt-2 uppercase font-bold tracking-wider flex items-center gap-1">
                            <span className="w-1 h-1 bg-amber-500 rounded-full"></span>
                            Branch Admins can only manage data within their assigned branch.
                        </p>
                    </div>

                    <div className="pt-6">
                        <button
                            type="submit"
                            disabled={isLoading || !selectedBranchId}
                            className={`w-full py-4 rounded-xl text-white font-black uppercase tracking-widest shadow-xl shadow-indigo-600/20 ${isLoading ? 'bg-slate-300' : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95'} transition-all`}
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
