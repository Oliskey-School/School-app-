import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useProfile } from '../../context/ProfileContext';
import { toast } from 'react-hot-toast';
import {
    UserPlus,
    Mail,
    Loader2,
    ChevronLeft
} from 'lucide-react';

type UserRole =
    | 'admin'
    | 'teacher'
    | 'parent'
    | 'student'
    | 'proprietor'
    | 'inspector'
    | 'examofficer'
    | 'complianceofficer';

const roleOptions: { value: UserRole; label: string; description: string }[] = [
    { value: 'proprietor', label: 'Proprietor', description: 'School owner with full administrative access' },
    { value: 'teacher', label: 'Teacher', description: 'Instructors managing classes and students' },
    { value: 'inspector', label: 'Inspector', description: 'Regulatory or quality assurance officer' },
    { value: 'examofficer', label: 'Exam Officer', description: 'Manages examinations and results' },
    { value: 'complianceofficer', label: 'Compliance Officer', description: 'Ensures regulatory compliance' },
    { value: 'parent', label: 'Parent', description: 'Guardian with access to child information' },
    { value: 'student', label: 'Student', description: 'Student account for learning portal' },
];

interface InviteStaffScreenProps {
    handleBack?: () => void;
    navigateTo?: (view: string, title: string, props?: any) => void;
}

const InviteStaffScreen: React.FC<InviteStaffScreenProps> = ({ handleBack, navigateTo }) => {
    const { profile } = useProfile();
    const [isInviting, setIsInviting] = useState(false);
    const [invitationForm, setInvitationForm] = useState({
        email: '',
        role: 'teacher' as UserRole,
        fullName: ''
    });

    const handleInviteStaff = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!profile?.schoolId) {
            toast.error('School information not available');
            return;
        }

        setIsInviting(true);

        try {
            // First, validate with the RPC function
            const { error: validationError } = await supabase.rpc('invite_staff_member', {
                p_school_id: profile.schoolId,
                p_email: invitationForm.email,
                p_role: invitationForm.role,
                p_full_name: invitationForm.fullName
            });

            if (validationError) throw validationError;

            // Use the admin API to send the invitation
            const response = await fetch('/api/invite-user', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: invitationForm.email,
                    school_id: profile.schoolId,
                    role: invitationForm.role,
                    full_name: invitationForm.fullName
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to send invitation');
            }

            toast.success(`Invitation sent to ${invitationForm.email}!`);
            setInvitationForm({ email: '', role: 'teacher', fullName: '' });

            // Navigate back after success
            if (handleBack) handleBack();
            else if (navigateTo) navigateTo('teacherList', 'Manage Teachers');

        } catch (error: any) {
            console.error('Error inviting staff:', error);
            toast.error(error.message || 'Failed to send invitation');
        } finally {
            setIsInviting(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-4 lg:p-6 space-y-6">
            <div className="flex items-center gap-4">
                {handleBack && (
                    <button onClick={handleBack} className="p-2 hover:bg-gray-100 rounded-full">
                        <ChevronLeft className="w-6 h-6 text-gray-600" />
                    </button>
                )}
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <UserPlus className="w-6 h-6 text-indigo-600" />
                        Invite New Staff Member
                    </h1>
                    <p className="text-sm text-gray-500">Send an invitation to join your school portal</p>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <form onSubmit={handleInviteStaff} className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Email Input */}
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700">
                                Email Address *
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="email"
                                    required
                                    value={invitationForm.email}
                                    onChange={(e) => setInvitationForm({ ...invitationForm, email: e.target.value })}
                                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                                    placeholder="staff@example.com"
                                />
                            </div>
                        </div>

                        {/* Full Name Input */}
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700">
                                Full Name *
                            </label>
                            <input
                                type="text"
                                required
                                value={invitationForm.fullName}
                                onChange={(e) => setInvitationForm({ ...invitationForm, fullName: e.target.value })}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                                placeholder="John Doe"
                            />
                        </div>
                    </div>

                    {/* Role Selection */}
                    <div className="space-y-3">
                        <label className="text-sm font-semibold text-gray-700">
                            Select Role *
                        </label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {roleOptions.map((role) => (
                                <label
                                    key={role.value}
                                    className={`
                                        flex items-start p-4 border-2 rounded-xl cursor-pointer transition-all
                                        ${invitationForm.role === role.value
                                            ? 'border-indigo-600 bg-indigo-50'
                                            : 'border-gray-100 hover:border-gray-200 bg-gray-50/50'
                                        }
                                    `}
                                >
                                    <input
                                        type="radio"
                                        name="role"
                                        value={role.value}
                                        checked={invitationForm.role === role.value}
                                        onChange={(e) => setInvitationForm({ ...invitationForm, role: e.target.value as UserRole })}
                                        className="mt-1 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                                    />
                                    <div className="ml-3">
                                        <div className="font-bold text-gray-900 text-sm">{role.label}</div>
                                        <div className="text-xs text-gray-500 mt-1">{role.description}</div>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Submit Button */}
                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={isInviting}
                            className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                        >
                            {isInviting ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Sending Invitation...
                                </>
                            ) : (
                                <>
                                    <Mail className="w-5 h-5" />
                                    Send Staff Invitation
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>

            {/* Info Box */}
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5">
                <div className="flex gap-4">
                    <div className="p-2 bg-amber-100 rounded-lg h-fit">
                        <Mail className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                        <h4 className="font-bold text-amber-900">What happens next?</h4>
                        <p className="text-sm text-amber-800 mt-1">
                            An invitation email will be sent to the address provided. Once they accept and create their account, they will be automatically linked to your school with the selected role.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InviteStaffScreen;
