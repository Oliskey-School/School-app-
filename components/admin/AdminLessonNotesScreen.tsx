import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useAutoSync } from '../../hooks/useAutoSync';
import { toast } from 'react-hot-toast';
import { BookOpenIcon } from '../../constants';

interface AdminLessonNotesScreenProps {
    schoolId?: string;
    currentBranchId?: string | null;
}

const STATUS_STYLES: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
};

const AdminLessonNotesScreen: React.FC<AdminLessonNotesScreenProps> = ({ schoolId, currentBranchId }) => {
    const { currentSchool } = useAuth();
    const effectiveSchoolId = schoolId || currentSchool?.id || '';
    const branchId = currentBranchId && currentBranchId !== 'all' ? currentBranchId : undefined;

    const [notes, setNotes] = useState<any[]>([]);
    const [classes, setClasses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterClass, setFilterClass] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [updating, setUpdating] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        if (!effectiveSchoolId) return;
        setLoading(true);
        try {
            const [notesRes, classesRes] = await Promise.all([
                api.getAllLessonNotes(branchId, filterClass || undefined, undefined, filterStatus || undefined),
                api.getClasses(effectiveSchoolId, branchId),
            ]);
            setNotes(Array.isArray(notesRes) ? notesRes : []);
            setClasses(Array.isArray(classesRes) ? classesRes : []);
        } catch {
            toast.error('Failed to load lesson notes');
        } finally {
            setLoading(false);
        }
    }, [effectiveSchoolId, branchId, filterClass, filterStatus]);

    useEffect(() => { fetchData(); }, [fetchData]);
    useAutoSync(['academic'], fetchData);

    const handleStatusUpdate = async (id: string, status: 'approved' | 'rejected') => {
        setUpdating(id);
        try {
            await api.updateLessonNoteStatus(id, status);
            toast.success(`Note ${status}`);
            setNotes(prev => prev.map(n => n.id === id ? { ...n, status } : n));
        } catch {
            toast.error('Failed to update status');
        } finally {
            setUpdating(null);
        }
    };

    const pendingCount = notes.filter(n => n.status === 'pending').length;

    return (
        <div className="flex flex-col h-full bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b px-6 py-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold text-gray-800">Lesson Notes Review</h1>
                        <p className="text-sm text-gray-500">Review and approve teacher-submitted lesson notes</p>
                    </div>
                    {pendingCount > 0 && (
                        <span className="bg-amber-100 text-amber-700 text-sm font-semibold px-3 py-1 rounded-full">
                            {pendingCount} pending
                        </span>
                    )}
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white border-b px-6 py-3 flex gap-3 flex-wrap">
                <select
                    value={filterClass}
                    onChange={e => setFilterClass(e.target.value)}
                    className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                >
                    <option value="">All Classes</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <select
                    value={filterStatus}
                    onChange={e => setFilterStatus(e.target.value)}
                    className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                >
                    <option value="">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                </select>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
                {loading ? (
                    <div className="space-y-3">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-24 bg-white rounded-xl border border-gray-100 animate-pulse" />
                        ))}
                    </div>
                ) : notes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                        <BookOpenIcon className="w-12 h-12 mb-3 opacity-30" />
                        <p className="font-semibold text-gray-500">No lesson notes found</p>
                        <p className="text-sm mt-1">Notes submitted by teachers will appear here</p>
                    </div>
                ) : (
                    notes.map((note, ni) => (
                        <motion.div key={note.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: Math.min(ni, 15) * 0.03 }} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                            {/* Card header — click to expand */}
                            <button
                                className="w-full text-left p-4 hover:bg-gray-50 transition-colors"
                                onClick={() => setExpandedId(expandedId === note.id ? null : note.id)}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap mb-1">
                                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${STATUS_STYLES[note.status] || 'bg-gray-100 text-gray-600'}`}>
                                                {note.status}
                                            </span>
                                            <span className="text-xs text-gray-400">{note.term} · Week {note.week}</span>
                                            {note.class?.name && (
                                                <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                                                    {note.class.name}
                                                </span>
                                            )}
                                        </div>
                                        <p className="font-semibold text-gray-800 truncate">{note.title}</p>
                                        <p className="text-sm text-gray-500 mt-0.5">
                                            {note.teacher?.full_name || 'Unknown Teacher'}
                                            {note.teacher?.school_generated_id && (
                                                <span className="ml-1 text-gray-400 font-mono text-xs">({note.teacher.school_generated_id})</span>
                                            )}
                                            {' · '}
                                            {new Date(note.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </p>
                                    </div>
                                    <svg
                                        className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform duration-200 ${expandedId === note.id ? 'rotate-180' : ''}`}
                                        fill="none" stroke="currentColor" viewBox="0 0 24 24"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </button>

                            {/* Expanded content */}
                            <AnimatePresence>
                            {expandedId === note.id && (
                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="border-t border-gray-100 px-4 pb-4 pt-3 bg-gray-50 overflow-hidden">
                                    <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed mb-4">
                                        {note.content || <span className="text-gray-400 italic">No content provided.</span>}
                                    </p>
                                    {note.file_url && (
                                        <a
                                            href={note.file_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:underline mb-4"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                            </svg>
                                            View Attachment
                                        </a>
                                    )}

                                    {note.status === 'pending' && (
                                        <div className="flex gap-2 mt-2">
                                            <button
                                                onClick={() => handleStatusUpdate(note.id, 'approved')}
                                                disabled={updating === note.id}
                                                className="flex-1 bg-green-600 text-white text-sm font-semibold py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                                            >
                                                {updating === note.id ? 'Updating…' : '✓ Approve'}
                                            </button>
                                            <button
                                                onClick={() => handleStatusUpdate(note.id, 'rejected')}
                                                disabled={updating === note.id}
                                                className="flex-1 bg-red-50 text-red-700 border border-red-200 text-sm font-semibold py-2 rounded-lg hover:bg-red-100 disabled:opacity-50 transition-colors"
                                            >
                                                ✗ Reject
                                            </button>
                                        </div>
                                    )}

                                    {note.status === 'approved' && (
                                        <button
                                            onClick={() => handleStatusUpdate(note.id, 'rejected')}
                                            disabled={updating === note.id}
                                            className="text-sm text-red-500 hover:text-red-700 disabled:opacity-50"
                                        >
                                            Revoke approval
                                        </button>
                                    )}

                                    {note.status === 'rejected' && (
                                        <button
                                            onClick={() => handleStatusUpdate(note.id, 'approved')}
                                            disabled={updating === note.id}
                                            className="text-sm text-green-600 hover:text-green-800 disabled:opacity-50"
                                        >
                                            Re-approve
                                        </button>
                                    )}
                                </motion.div>
                            )}
                            </AnimatePresence>
                        </motion.div>
                    ))
                )}
            </div>
        </div>
    );
};

export default AdminLessonNotesScreen;
