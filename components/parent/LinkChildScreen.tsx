import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { linkStudentToParent, unlinkStudentFromParent } from '../../services/studentService';
import { ChevronLeftIcon, ShieldCheckIcon, TrashIcon } from '../../constants';
import { UserPlus, Users } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import ConfirmationModal from '../ui/ConfirmationModal';
import { api } from '../../lib/api';

interface LinkChildScreenProps {
    handleBack: () => void;
    forceUpdate: () => void;
}

const LinkChildScreen: React.FC<LinkChildScreenProps> = ({ handleBack, forceUpdate }) => {
    const { userProfile } = useAuth();
    const [studentCode, setStudentCode] = useState('');
    const [relationship, setRelationship] = useState('Parent');
    const [loading, setLoading] = useState(false);
    const [linkedChildren, setLinkedChildren] = useState<any[]>([]);
    const [fetchingChildren, setFetchingChildren] = useState(true);
    const [showUnlinkModal, setShowUnlinkModal] = useState(false);
    const [childToUnlink, setChildToUnlink] = useState<any>(null);

    const loadLinkedChildren = async () => {
        if (!userProfile?.id) return;
        setFetchingChildren(true);
        try {
            const children = await api.getMyChildren();
            if (children) {
                const mappedStudents = children.map((s: any) => ({
                    id: s.id,
                    name: s.name || s.full_name || 'Unknown',
                    avatarUrl: s.avatar_url,
                    grade: s.grade || s.class?.name || '',
                    section: s.section || '',
                    schoolGeneratedId: s.school_generated_id || ''
                }));
                const uniqueIds = new Set();
                const uniqueStudents = mappedStudents.filter((s: any) => {
                    if (uniqueIds.has(s.id)) return false;
                    uniqueIds.add(s.id);
                    return true;
                });
                setLinkedChildren(uniqueStudents);
            }
        } catch (error) {
            console.error('Error loading linked children:', error);
        } finally {
            setFetchingChildren(false);
        }
    };

    useEffect(() => {
        loadLinkedChildren();
    }, [userProfile?.id]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!studentCode.trim()) {
            toast.error("Please enter the student's ID code.");
            return;
        }

        setLoading(true);
        try {
            const result = await linkStudentToParent(studentCode.trim(), relationship);
            if (result.success) {
                toast.success(result.message);
                setStudentCode('');
                loadLinkedChildren();
                forceUpdate();
            } else {
                toast.error(result.message);
            }
        } catch (error) {
            console.error(error);
            toast.error("An unexpected error occurred.");
        } finally {
            setLoading(false);
        }
    };

    const handleUnlinkClick = (child: any) => {
        setChildToUnlink(child);
        setShowUnlinkModal(true);
    };

    const confirmUnlink = async () => {
        if (!childToUnlink) return;
        
        setLoading(true);
        try {
            const result = await unlinkStudentFromParent(childToUnlink.id);
            if (result.success) {
                toast.success(result.message);
                loadLinkedChildren();
                forceUpdate();
            } else {
                toast.error(result.message);
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to unlink student.");
        } finally {
            setLoading(false);
            setShowUnlinkModal(false);
            setChildToUnlink(null);
        }
    };

    return (
        <div className="flex flex-col h-full bg-gray-50">
            <div className="hidden md:flex p-4 bg-white shadow-sm items-center">
                <button onClick={handleBack} className="p-2 rounded-full hover:bg-gray-100 mr-2">
                    <ChevronLeftIcon className="w-6 h-6 text-gray-600" />
                </button>
                <h2 className="text-xl font-bold text-gray-800">Manage Child Accounts</h2>
            </div>

            <main className="flex-1 p-4 md:p-6 overflow-y-auto space-y-6">
                <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Add Child Form */}
                    <div className="bg-white rounded-2xl shadow-lg overflow-hidden h-fit">
                        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-6 text-white text-center">
                            <UserPlus className="w-12 h-12 mx-auto mb-3 text-white/90" />
                            <h3 className="text-xl font-bold">Link a New Child</h3>
                            <p className="text-blue-100 text-sm mt-1">Enter the unique School ID to link their account.</p>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Student ID Code
                                </label>
                                <input
                                    type="text"
                                    value={studentCode}
                                    onChange={(e) => setStudentCode(e.target.value.toUpperCase())}
                                    placeholder="e.g. SCH-001-STU-1001"
                                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 uppercase tracking-wide font-mono"
                                />
                                <p className="text-xs text-gray-500 mt-2 font-medium">
                                    Format: School_Branch_Role_Number
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Relationship
                                </label>
                                <select
                                    value={relationship}
                                    onChange={(e) => setRelationship(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="Father">Father</option>
                                    <option value="Mother">Mother</option>
                                    <option value="Guardian">Guardian</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>

                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className={`w-full py-3.5 rounded-xl text-white font-bold shadow-md transition-all ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg transform hover:-translate-y-0.5'}`}
                                >
                                    {loading ? 'Verifying...' : 'Link Account'}
                                </button>
                            </div>

                            <div className="bg-blue-50 p-4 rounded-xl flex items-start space-x-3">
                                <ShieldCheckIcon className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                                <p className="text-[10px] text-blue-800 leading-relaxed font-medium">
                                    For security, linking requires the exact unique ID. Once linked, you can view grades, attendance, and pay fees instantly.
                                </p>
                            </div>
                        </form>
                    </div>

                    {/* Linked Children List */}
                    <div className="bg-white rounded-2xl shadow-lg overflow-hidden flex flex-col">
                        <div className="p-6 border-b flex items-center justify-between bg-gray-50/50">
                            <div className="flex items-center space-x-2 text-gray-800">
                                <Users className="w-5 h-5 text-blue-600" />
                                <h3 className="text-lg font-bold">My Linked Children</h3>
                            </div>
                            <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2.5 py-1 rounded-full">
                                {linkedChildren.length} Linked
                            </span>
                        </div>

                        <div className="flex-1 p-6">
                            {fetchingChildren ? (
                                <div className="flex flex-col items-center justify-center py-12 space-y-3">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                    <p className="text-sm text-gray-500 font-medium">Loading child records...</p>
                                </div>
                            ) : linkedChildren.length > 0 ? (
                                <div className="space-y-4">
                                    {linkedChildren.map((child) => (
                                        <div key={child.id} className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 border border-gray-100 hover:border-blue-200 transition-all group">
                                            <div className="flex items-center space-x-4">
                                                <div className="relative">
                                                    <img 
                                                        src={child.avatarUrl || 'https://i.pravatar.cc/150'} 
                                                        alt={child.name} 
                                                        className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm" 
                                                    />
                                                    <div className="absolute -bottom-1 -right-1 bg-green-500 w-3.5 h-3.5 rounded-full border-2 border-white"></div>
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-gray-800">{child.name}</h4>
                                                    <div className="flex items-center space-x-2 text-xs text-gray-500 font-medium">
                                                        <span>Grade {child.grade}{child.section}</span>
                                                        <span>•</span>
                                                        <span>ID: {child.schoolGeneratedId || 'N/A'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => handleUnlinkClick(child)}
                                                className="p-2.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                                                title="Remove link"
                                            >
                                                <TrashIcon className="w-5 h-5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <div className="bg-gray-100 p-4 rounded-full mb-4">
                                        <Users className="w-10 h-10 text-gray-400" />
                                    </div>
                                    <h4 className="font-bold text-gray-800">No Children Linked</h4>
                                    <p className="text-sm text-gray-500 mt-1 max-w-[200px] mx-auto">
                                        Use the form on the left to link your child's account.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            {/* Unlink Confirmation */}
            <ConfirmationModal
                isOpen={showUnlinkModal}
                onClose={() => setShowUnlinkModal(false)}
                onConfirm={confirmUnlink}
                title="Remove Child Link"
                message={`Are you sure you want to remove the link to ${childToUnlink?.name}? You will lose access to their dashboard data.`}
                confirmText="Remove Link"
                isDanger={true}
            />
        </div>
    );
};

export default LinkChildScreen;
