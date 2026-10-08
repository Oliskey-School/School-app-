import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../lib/api';
import { toast } from 'react-hot-toast';
import { useBranch } from '../../context/BranchContext';
import { AlertCircle, Clock, FileText } from 'lucide-react';

// Values must match the server's accepted lists (backend referral.service.ts).
const REFERRAL_TYPES = ['Counselling', 'Learning Support', 'Financial Hardship', 'Health', 'Other'];
const URGENCIES = ['Low', 'Medium', 'High'];
const STATUSES = ['Submitted', 'In Progress', 'Resolved', 'Closed'];

interface Referral {
    id: string;
    referral_type: string;
    need_description: string;
    urgency: string;
    status: string;
    is_confidential: boolean;
    created_at: string;
    updated_at?: string;
    staff_note?: string | null;
    parent_name?: string | null;
    student?: {
        id: string;
        name: string;
    } | null;
}

interface Child {
    id: string;
    name: string;
}

interface ReferralSystemProps {
    /**
     * 'parent' (default): submit referrals for your own children and follow their status.
     * 'staff': admins and counselors review the referrals in their scope and update them.
     */
    mode?: 'parent' | 'staff';
}

const urgencyColors: { [key: string]: string } = {
    Low: 'bg-gray-100 text-gray-800',
    Medium: 'bg-yellow-100 text-yellow-800',
    High: 'bg-orange-100 text-orange-800',
};

const statusColors: { [key: string]: string } = {
    Submitted: 'bg-blue-100 text-blue-800',
    'In Progress': 'bg-indigo-100 text-indigo-800',
    Resolved: 'bg-gray-100 text-gray-800',
    Closed: 'bg-gray-100 text-gray-600'
};

const getUrgencyIcon = (urgency: string) =>
    urgency === 'High'
        ? <AlertCircle className="h-5 w-5 shrink-0" />
        : <Clock className="h-5 w-5 shrink-0" />;

/** Staff controls on one referral: status + a short internal note. */
const StaffUpdatePanel: React.FC<{ referral: Referral; onSaved: (r: Referral) => void }> = ({ referral, onSaved }) => {
    const [status, setStatus] = useState(referral.status);
    const [note, setNote] = useState(referral.staff_note || '');
    const [saving, setSaving] = useState(false);
    const dirty = status !== referral.status || note.trim() !== (referral.staff_note || '');

    const save = async () => {
        setSaving(true);
        try {
            const updated = await api.updateFamilyReferral(referral.id, { status, staff_note: note.trim() || null });
            toast.success('Referral updated');
            onSaved({ ...referral, ...updated });
        } catch (error: any) {
            toast.error(error?.message || 'Could not update the referral. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
            <div>
                <label htmlFor={`status-${referral.id}`} className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
                <select
                    id={`status-${referral.id}`}
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full min-h-[44px] px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                    {STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
            </div>
            <div>
                <label htmlFor={`note-${referral.id}`} className="block text-sm font-semibold text-gray-700 mb-2">Staff note</label>
                <textarea
                    id={`note-${referral.id}`}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    maxLength={1000}
                    rows={2}
                    placeholder="A short note for the school team"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                ></textarea>
                <p className="text-xs text-gray-500 mt-1">Only school staff can see this note. The parent sees the status.</p>
            </div>
            <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={save}
                disabled={!dirty || saving}
                className="w-full min-h-[44px] px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {saving ? 'Saving…' : 'Save update'}
            </motion.button>
        </div>
    );
};

const ReferralSystem: React.FC<ReferralSystemProps> = ({ mode = 'parent' }) => {
    const isStaff = mode === 'staff';
    const { currentBranch } = useBranch();
    const [referrals, setReferrals] = useState<Referral[]>([]);
    const [students, setStudents] = useState<Child[]>([]);
    const [showForm, setShowForm] = useState(false);

    // Form states
    const [selectedStudentId, setSelectedStudentId] = useState<string>('');
    const [referralType, setReferralType] = useState('Counselling');
    const [needDescription, setNeedDescription] = useState('');
    const [urgency, setUrgency] = useState('Medium');
    const [isConfidential, setIsConfidential] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setLoadError(null);
        try {
            if (isStaff) {
                setReferrals(await api.getFamilyReferrals());
            } else {
                const [children, mine] = await Promise.all([api.getMyChildren(), api.getMyFamilyReferrals()]);
                const list: Child[] = (Array.isArray(children) ? children : [])
                    .filter((c: any) => c && c.id)
                    .map((c: any) => ({ id: String(c.id), name: c.full_name || c.name || 'Child' }));
                setStudents(list);
                setSelectedStudentId(prev => (prev && list.some(c => c.id === prev)) ? prev : (list[0]?.id || ''));
                setReferrals(mine);
            }
        } catch (error: any) {
            console.error('Error loading referrals:', error);
            setLoadError('We could not load referrals right now.');
        } finally {
            setLoading(false);
        }
    }, [isStaff]);

    // Staff scope follows the branch switcher, so reload when it changes.
    useEffect(() => {
        load();
    }, [load, isStaff ? currentBranch?.id : null]);

    const handleSubmitReferral = async () => {
        if (!selectedStudentId || !needDescription.trim()) {
            toast.error('Please select a student and describe the need');
            return;
        }

        setSubmitting(true);
        try {
            const created = await api.createFamilyReferral({
                student_id: selectedStudentId,
                referral_type: referralType,
                need_description: needDescription.trim(),
                urgency,
                is_confidential: isConfidential
            });

            toast.success('Referral submitted. The school will review it soon.');
            resetForm();
            setShowForm(false);
            if (created?.id) setReferrals(prev => [created, ...prev.filter(r => r.id !== created.id)]);
        } catch (error: any) {
            toast.error(error?.message || 'Failed to submit referral');
            console.error(error);
        } finally {
            setSubmitting(false);
        }
    };

    const resetForm = () => {
        setReferralType('Counselling');
        setNeedDescription('');
        setUrgency('Medium');
        setIsConfidential(true);
    };

    if (loading) {
        return <div className="flex justify-center items-center h-64" role="status" aria-label="Loading referrals"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>;
    }

    return (
        <div className="p-6 max-w-4xl mx-auto">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-6 text-white mb-6">
                <h1 className="text-3xl font-bold mb-2">{isStaff ? '🤝 Family Referrals' : '🤝 Family Referral System'}</h1>
                <p className="text-indigo-100">{isStaff ? 'Requests from parents for support for their child' : 'Ask the school for support for your child'}</p>
            </div>

            {/* Info Banner */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                <div className="flex items-start space-x-3">
                    <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
                    <div>
                        <p className="text-sm text-blue-900">
                            {isStaff ? (
                                <><strong>Confidential referrals</strong> are only shown to the counselor and the school's main admin.</>
                            ) : (
                                <><strong>Confidential Support:</strong> Ask for help with counselling, learning support, financial hardship, health and more. Referrals are reviewed by the school's admin and counselor. Confidential referrals are seen only by the counselor and the main admin.</>
                            )}
                        </p>
                    </div>
                </div>
            </div>

            {loadError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex flex-col sm:flex-row sm:items-center gap-3" role="alert">
                    <p className="text-sm text-red-700 flex-1">{loadError}</p>
                    <button
                        onClick={load}
                        className="min-h-[44px] px-4 py-2 bg-white border border-red-200 text-red-700 rounded-lg font-semibold hover:bg-red-100"
                    >
                        Try again
                    </button>
                </div>
            )}

            {/* Submit Button */}
            {!isStaff && !showForm && !loadError && (
                <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowForm(true)}
                    className="w-full px-6 py-4 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-bold text-lg mb-6 transition-colors"
                >
                    + Submit New Referral
                </motion.button>
            )}

            {/* Referral Form */}
            <AnimatePresence>
            {!isStaff && showForm && (
                <motion.div
                    initial={{ opacity: 0, y: -10, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                    exit={{ opacity: 0, y: -10, height: 0 }}
                    transition={{ duration: 0.25 }}
                    className="bg-white rounded-xl shadow-lg p-6 mb-6 overflow-hidden"
                >
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">New Referral Request</h2>

                    {students.length === 0 ? (
                        <p className="text-sm text-gray-600 mb-6">There is no child linked to your account yet. Once the school links your child, you can submit a referral here.</p>
                    ) : (
                    <div className="space-y-4 mb-6">
                        <div>
                            <label htmlFor="referral-student" className="block text-sm font-semibold text-gray-700 mb-2">Select Student*</label>
                            <select
                                id="referral-student"
                                value={selectedStudentId}
                                onChange={(e) => setSelectedStudentId(e.target.value)}
                                className="w-full min-h-[44px] px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                            >
                                {students.map(student => (
                                    <option key={student.id} value={student.id}>{student.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label htmlFor="referral-type" className="block text-sm font-semibold text-gray-700 mb-2">Type of Need*</label>
                            <select
                                id="referral-type"
                                value={referralType}
                                onChange={(e) => setReferralType(e.target.value)}
                                className="w-full min-h-[44px] px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                            >
                                {REFERRAL_TYPES.map(t => <option key={t}>{t}</option>)}
                            </select>
                        </div>

                        <div>
                            <label htmlFor="referral-urgency" className="block text-sm font-semibold text-gray-700 mb-2">Urgency Level*</label>
                            <select
                                id="referral-urgency"
                                value={urgency}
                                onChange={(e) => setUrgency(e.target.value)}
                                className="w-full min-h-[44px] px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                            >
                                {URGENCIES.map(u => <option key={u}>{u}</option>)}
                            </select>
                        </div>

                        <div>
                            <label htmlFor="referral-description" className="block text-sm font-semibold text-gray-700 mb-2">Describe the Need*</label>
                            <textarea
                                id="referral-description"
                                value={needDescription}
                                onChange={(e) => setNeedDescription(e.target.value)}
                                placeholder="Please describe the situation and what support is needed..."
                                rows={5}
                                maxLength={2000}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                            ></textarea>
                            <p className="text-xs text-gray-500 mt-1">Be as detailed as possible to help the school support you</p>
                        </div>

                        <div className="flex items-center min-h-[44px]">
                            <input
                                type="checkbox"
                                id="confidential"
                                checked={isConfidential}
                                onChange={(e) => setIsConfidential(e.target.checked)}
                                className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                            />
                            <label htmlFor="confidential" className="ml-2 text-sm text-gray-700 py-3">
                                Keep this referral confidential  (recommended)
                            </label>
                        </div>
                    </div>
                    )}

                    <div className="flex space-x-3">
                        <motion.button
                            whileTap={{ scale: 0.96 }}
                            onClick={() => {
                                setShowForm(false);
                                resetForm();
                            }}
                            className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold"
                        >
                            Cancel
                        </motion.button>
                        {students.length > 0 && (
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.96 }}
                            onClick={handleSubmitReferral}
                            disabled={submitting}
                            className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {submitting ? 'Submitting…' : 'Submit Referral'}
                        </motion.button>
                        )}
                    </div>
                </motion.div>
            )}
            </AnimatePresence>

            {/* Referrals list */}
            {!loadError && (
            <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4">{isStaff ? 'Referrals' : 'My Referrals'} ({referrals.length})</h2>

                {referrals.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-500">
                        <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                        <p className="text-lg">{isStaff ? 'No referrals yet' : 'No referrals submitted yet'}</p>
                        <p className="text-sm">{isStaff ? 'Referrals parents submit for children in your care will appear here.' : 'Click "Submit New Referral" to get started'}</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {referrals.map((referral, i) => (
                            <motion.div
                                key={referral.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.25, delay: Math.min(i, 10) * 0.05 }}
                                className="bg-white rounded-xl shadow-sm p-6"
                            >
                                <div className="flex items-start justify-between gap-3 mb-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-2 mb-2">
                                            <h3 className="text-lg font-bold text-gray-900">{referral.referral_type}</h3>
                                            {referral.is_confidential && (
                                                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-semibold">
                                                    🔒 Confidential
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-600">Student: {referral.student?.name || 'Unknown student'}</p>
                                        {isStaff && referral.parent_name && (
                                            <p className="text-sm text-gray-600">Parent: {referral.parent_name}</p>
                                        )}
                                    </div>
                                    <div className="flex flex-col items-end space-y-2 shrink-0">
                                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColors[referral.status] || 'bg-gray-100 text-gray-800'}`}>
                                            {referral.status}
                                        </span>
                                        <span className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center space-x-1 ${urgencyColors[referral.urgency] || 'bg-gray-100 text-gray-800'}`}>
                                            {getUrgencyIcon(referral.urgency)}
                                            <span>{referral.urgency}</span>
                                        </span>
                                    </div>
                                </div>

                                <div className="p-3 bg-gray-50 rounded-lg mb-3">
                                    <p className="text-sm text-gray-700 whitespace-pre-line break-words">{referral.need_description}</p>
                                </div>

                                <div className="mt-3 text-xs text-gray-500">
                                    Submitted: {new Date(referral.created_at).toLocaleDateString()}
                                </div>

                                {isStaff && (
                                    <StaffUpdatePanel
                                        referral={referral}
                                        onSaved={(updated) => setReferrals(prev => prev.map(r => r.id === updated.id ? { ...r, ...updated } : r))}
                                    />
                                )}
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
            )}
        </div>
    );
};

export default ReferralSystem;
