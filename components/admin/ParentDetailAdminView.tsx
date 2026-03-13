import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { Parent } from '../../types';
import { PhoneIcon, EditIcon, TrashIcon, StudentsIcon, MailIcon, ChevronLeftIcon } from '../../constants';
import { supabase } from '../../lib/supabase';
import ConfirmationModal from '../ui/ConfirmationModal';
import { useAuth } from '../../context/AuthContext';
import { linkStudentToParent, unlinkStudentFromParent, fetchChildrenForParent } from '../../services/studentService';
import { UserPlus, X } from 'lucide-react';

interface ParentDetailAdminViewProps {
    parent: Parent;
    navigateTo: (view: string, title: string, props?: any) => void;
    forceUpdate: () => void;
    handleBack: () => void;
}

const ParentDetailAdminView: React.FC<ParentDetailAdminViewProps> = ({ parent, navigateTo, forceUpdate, handleBack }) => {
    const { currentSchool } = useAuth();
    const [children, setChildren] = React.useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showUnlinkModal, setShowUnlinkModal] = useState(false);
    const [childToUnlink, setChildToUnlink] = useState<any>(null);
    const [studentIdToLink, setStudentIdToLink] = useState('');
    const [isLinking, setIsLinking] = useState(false);

    const loadChildren = async () => {
        if (!parent.id) return;
        try {
            const data = await fetchChildrenForParent(parent.id);
            setChildren(data);
        } catch (err) {
            console.error('Error fetching children:', err);
        }
    };

    React.useEffect(() => {
        loadChildren();
    }, [parent.id]);

    const handleLinkStudent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!studentIdToLink.trim() || !parent.user_id) return;

        setIsLinking(true);
        try {
            const result = await linkStudentToParent(studentIdToLink.trim(), 'Guardian', parent.user_id);
            if (result.success) {
                toast.success(result.message);
                setStudentIdToLink('');
                loadChildren();
            } else {
                toast.error(result.message);
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to link student");
        } finally {
            setIsLinking(false);
        }
    };

    const handleUnlinkClick = (child: any) => {
        setChildToUnlink(child);
        setShowUnlinkModal(true);
    };

    const confirmUnlink = async () => {
        if (!childToUnlink || !parent.user_id) return;

        setLoading(true);
        try {
            const result = await unlinkStudentFromParent(childToUnlink.id, parent.user_id);
            if (result.success) {
                toast.success(result.message);
                loadChildren();
            } else {
                toast.error(result.message);
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to unlink student");
        } finally {
            setLoading(false);
            setShowUnlinkModal(false);
            setChildToUnlink(null);
        }
    };

    const confirmDelete = async () => {
        try {
            // Delete from database first (Scoped)
            const { error: deleteParentError } = await supabase
                .from('parents')
                .delete()
                .eq('id', parent.id)
                .eq('school_id', parent.schoolId); // ADDED SCOPE

            if (deleteParentError) throw deleteParentError;

            // Delete associated user account if exists
            if (parent.user_id) {
                const { error: deleteUserError } = await supabase
                    .from('users')
                    .delete()
                    .eq('id', parent.user_id)

                if (deleteUserError) console.warn('Warning: Could not delete user account:', deleteUserError);
            }

            toast.success(`${parent.name} has been successfully deleted from the database.`);
            forceUpdate();
            handleBack();
        } catch (error: any) {
            console.error('Error deleting parent:', error);
            toast.error('Failed to delete parent: ' + (error.message || 'Unknown error'));
        }
    };

    return (
        <div className="flex flex-col h-full bg-gray-50">
            {/* Header */}
            <div className="flex items-center p-4 bg-white border-b sticky top-0 z-10">
                <button onClick={handleBack} className="p-2 hover:bg-gray-100 rounded-full mr-3">
                    <ChevronLeftIcon className="w-6 h-6 text-gray-600" />
                </button>
                <h2 className="text-xl font-bold text-gray-800">Parent Details</h2>
            </div>

            <main className="flex-grow p-4 space-y-4 overflow-y-auto pb-32">
                {/* Profile Card */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row items-center md:items-start space-y-4 md:space-y-0 md:space-x-6">
                    <img src={parent.avatarUrl || 'https://i.pravatar.cc/150'} alt={parent.name} className="w-24 h-24 rounded-full object-cover border-4 border-blue-50 shadow-md" />
                    <div className="flex-grow text-center md:text-left">
                        <h3 className="text-2xl font-bold text-gray-800">{parent.name}</h3>
                        <p className="text-blue-600 font-medium text-sm">Parent / Guardian</p>
                        <div className="flex flex-wrap justify-center md:justify-start gap-4 mt-4">
                            <a href={`mailto:${parent.email}`} className="flex items-center space-x-2 px-4 py-2 bg-gray-50 rounded-xl text-sm text-gray-600 hover:bg-blue-50 hover:text-blue-600 transition-colors border border-gray-100">
                                <MailIcon className="w-4 h-4" />
                                <span>{parent.email}</span>
                            </a>
                            <a href={`tel:${parent.phone}`} className="flex items-center space-x-2 px-4 py-2 bg-gray-50 rounded-xl text-sm text-gray-600 hover:bg-green-50 hover:text-green-600 transition-colors border border-gray-100">
                                <PhoneIcon className="w-4 h-4" />
                                <span>{parent.phone || 'No phone'}</span>
                            </a>
                        </div>
                    </div>
                </div>

                {/* Linked Children Section */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-4 bg-gray-50 border-b flex items-center justify-between">
                        <h4 className="font-bold text-gray-800 flex items-center">
                            <StudentsIcon className="w-5 h-5 mr-2 text-blue-600" /> 
                            Linked Children
                        </h4>
                        <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-1 rounded-lg">
                            {children.length} total
                        </span>
                    </div>

                    <div className="p-4 space-y-4">
                        {/* Quick Add Form */}
                        <form onSubmit={handleLinkStudent} className="flex gap-2">
                            <div className="relative flex-grow">
                                <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input 
                                    type="text" 
                                    placeholder="Enter Student ID (e.g. SCH-001...)"
                                    value={studentIdToLink}
                                    onChange={(e) => setStudentIdToLink(e.target.value.toUpperCase())}
                                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-mono"
                                />
                            </div>
                            <button 
                                type="submit"
                                disabled={isLinking || !studentIdToLink}
                                className="px-6 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 disabled:bg-gray-300 transition-colors shadow-sm"
                            >
                                {isLinking ? 'Linking...' : 'Link Child'}
                            </button>
                        </form>

                        {/* Children List */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                            {children.length > 0 ? children.map(child => (
                                <div key={child.id} className="bg-gray-50 p-4 rounded-xl flex items-center justify-between border border-transparent hover:border-gray-200 transition-all group">
                                    <div className="flex items-center space-x-3">
                                        <img src={child.avatarUrl || 'https://i.pravatar.cc/150'} alt={child.name} className="w-12 h-12 rounded-xl object-cover border border-white shadow-sm" />
                                        <div>
                                            <p className="font-bold text-gray-800">{child.name}</p>
                                            <p className="text-xs text-gray-500 font-medium">Grade {child.grade}{child.section}</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => handleUnlinkClick(child)}
                                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-white rounded-lg transition-all"
                                        title="Remove link"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            )) : (
                                <div className="col-span-full py-12 flex flex-col items-center justify-center text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                                    <StudentsIcon className="w-12 h-12 text-gray-300 mb-2" />
                                    <p className="text-sm text-gray-500 font-medium">No children linked to this parent yet.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            {/* Sticky Actions */}
            <div className="fixed bottom-0 left-0 right-0 md:relative p-4 bg-white border-t border-gray-100 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] md:shadow-none flex flex-col space-y-2">
                <h3 className="text-[10px] font-bold text-gray-400 text-center uppercase tracking-[0.2em] mb-1">Admin Management</h3>
                <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => navigateTo('addParent', `Edit ${parent.name}`, { parentToEdit: parent })} className="flex items-center justify-center space-x-2 py-3 bg-indigo-50 text-indigo-700 rounded-xl font-bold hover:bg-indigo-100 transition-colors border border-indigo-100">
                        <EditIcon className="w-5 h-5" />
                        <span>Edit Profile</span>
                    </button>
                    <button onClick={() => setShowDeleteModal(true)} className="flex items-center justify-center space-x-2 py-3 bg-red-50 text-red-700 rounded-xl font-bold hover:bg-red-100 transition-colors border border-red-100">
                        <TrashIcon className="w-5 h-5" />
                        <span>Delete Account</span>
                    </button>
                </div>
            </div>

            {/* Modals */}
            <ConfirmationModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={confirmDelete}
                title="Delete Parent Account"
                message={`Are you sure you want to delete the account for ${parent.name}? This action cannot be undone.`}
                confirmText="Delete Account"
                isDanger={true}
            />

            <ConfirmationModal
                isOpen={showUnlinkModal}
                onClose={() => setShowUnlinkModal(false)}
                onConfirm={confirmUnlink}
                title="Unlink Student"
                message={`Are you sure you want to remove ${childToUnlink?.name} from ${parent.name}'s account?`}
                confirmText="Unlink Student"
                isDanger={true}
            />
        </div>
    );
};

export default ParentDetailAdminView;
