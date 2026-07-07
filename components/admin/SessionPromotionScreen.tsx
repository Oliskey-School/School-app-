import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import { GraduationCap, ArrowUpCircle, AlertTriangle, CheckCircle2, Users } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import ConfirmationModal from '../ui/ConfirmationModal';

interface SessionPromotionScreenProps {
    schoolId?: string;
    currentBranchId?: string | null;
    handleBack?: () => void;
}

/**
 * End-of-session promotion: moves every Active student up one class for the
 * new session (SSS 3 graduates), completes old enrollments, enrolls students
 * into the next class, and sends celebration notices that the student and
 * parent dashboards animate on.
 */
const SessionPromotionScreen: React.FC<SessionPromotionScreenProps> = ({ schoolId, currentBranchId, handleBack }) => {
    const { currentSchool } = useAuth();
    const sid = schoolId || currentSchool?.id;
    const branchArg = currentBranchId && currentBranchId !== 'all' ? currentBranchId : undefined;

    const [students, setStudents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [promoting, setPromoting] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [result, setResult] = useState<{ promoted: number; graduated: number; unplaced: number; total: number } | null>(null);

    const now = new Date();
    const startYear = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
    const [toSession, setToSession] = useState(`${startYear + 1}/${startYear + 2}`);

    useEffect(() => {
        if (!sid) return;
        let active = true;
        setLoading(true);
        api.getStudents(sid, branchArg)
            .then(data => { if (active) setStudents((data || []).filter((s: any) => (s.status || 'Active') === 'Active')); })
            .catch(() => { if (active) toast.error('Could not load students.'); })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [sid, branchArg]);

    // Preview: how many students sit in each grade right now
    const gradeGroups = useMemo(() => {
        const groups = new Map<number, number>();
        students.forEach((s: any) => {
            const g = Number(s.grade) || 0;
            groups.set(g, (groups.get(g) || 0) + 1);
        });
        return Array.from(groups.entries()).sort((a, b) => a[0] - b[0]);
    }, [students]);

    const gradeName = (g: number) => {
        if (g <= 0) return 'Nursery';
        if (g <= 6) return `Primary ${g}`;
        if (g <= 9) return `JSS ${g - 6}`;
        return `SSS ${g - 9}`;
    };

    const graduatingCount = students.filter((s: any) => Number(s.grade) >= 12).length;
    const movingCount = students.length - graduatingCount;

    const runPromotion = async () => {
        setConfirmOpen(false);
        setPromoting(true);
        try {
            const res = await api.promoteStudents(toSession, branchArg);
            setResult(res);
            toast.success(`Promotion complete — ${res.promoted} promoted, ${res.graduated} graduated.`);
        } catch (e: any) {
            toast.error(e?.message || 'Promotion failed. No changes were made for unprocessed students.');
        } finally {
            setPromoting(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-gray-50 overflow-y-auto">
            <main className="flex-grow p-4 sm:p-6 space-y-6 max-w-4xl mx-auto w-full">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <div className="flex items-center gap-3 mb-1">
                        <div className="p-2.5 rounded-xl bg-indigo-100">
                            <ArrowUpCircle className="w-6 h-6 text-indigo-600" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">End-of-Session Promotion</h1>
                            <p className="text-sm text-gray-500">Move every student up one class for the new session. SSS 3 students graduate.</p>
                        </div>
                    </div>

                    <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="bg-gray-50 rounded-xl p-4 text-center">
                            <Users className="w-5 h-5 text-gray-400 mx-auto mb-1" />
                            <p className="text-2xl font-bold text-gray-900">{loading ? '…' : students.length}</p>
                            <p className="text-xs text-gray-500 font-medium">Active students</p>
                        </div>
                        <div className="bg-indigo-50 rounded-xl p-4 text-center">
                            <ArrowUpCircle className="w-5 h-5 text-indigo-500 mx-auto mb-1" />
                            <p className="text-2xl font-bold text-indigo-700">{loading ? '…' : movingCount}</p>
                            <p className="text-xs text-indigo-600 font-medium">Will move up a class</p>
                        </div>
                        <div className="bg-amber-50 rounded-xl p-4 text-center">
                            <GraduationCap className="w-5 h-5 text-amber-500 mx-auto mb-1" />
                            <p className="text-2xl font-bold text-amber-700">{loading ? '…' : graduatingCount}</p>
                            <p className="text-xs text-amber-600 font-medium">Will graduate (SSS 3)</p>
                        </div>
                    </div>

                    <div className="mt-5">
                        <label className="block text-sm font-medium text-gray-700 mb-1">New session</label>
                        <input
                            value={toSession}
                            onChange={e => setToSession(e.target.value)}
                            placeholder="e.g. 2026/2027"
                            className="w-full sm:w-64 p-3 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>
                </div>

                {/* Per-grade preview */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <h2 className="font-bold text-gray-800 mb-4">What will happen</h2>
                    {loading ? (
                        <p className="text-sm text-gray-400 py-6 text-center">Loading students…</p>
                    ) : gradeGroups.length === 0 ? (
                        <p className="text-sm text-gray-400 py-6 text-center">No active students found{branchArg ? ' in this branch' : ''}.</p>
                    ) : (
                        <ul className="divide-y divide-gray-100">
                            {gradeGroups.map(([g, count]) => (
                                <li key={g} className="flex items-center justify-between py-2.5 text-sm">
                                    <span className="font-semibold text-gray-700">{gradeName(g)}</span>
                                    <span className="text-gray-500">
                                        {count} student{count === 1 ? '' : 's'} →{' '}
                                        {g >= 12
                                            ? <span className="font-semibold text-amber-600">Graduated 🎓</span>
                                            : <span className="font-semibold text-indigo-600">{gradeName(g + 1)}</span>}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}

                    <div className="mt-4 flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
                        <AlertTriangle className="w-4 h-4 flex-none mt-0.5" />
                        Run this ONCE at the end of the session. Every student and their parents will be
                        congratulated automatically on their dashboards.
                    </div>

                    {result && (
                        <div className="mt-4 flex items-start gap-2 rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
                            <CheckCircle2 className="w-4 h-4 flex-none mt-0.5" />
                            Done: {result.promoted} promoted, {result.graduated} graduated
                            {result.unplaced > 0 && ` — ${result.unplaced} moved up but have no matching class yet (create the class, then enrol them)`}.
                        </div>
                    )}

                    <div className="mt-5 flex gap-3">
                        {handleBack && (
                            <button onClick={handleBack} className="px-5 py-3 bg-white border border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-100">
                                Back
                            </button>
                        )}
                        <button
                            onClick={() => setConfirmOpen(true)}
                            disabled={promoting || loading || students.length === 0 || !toSession.trim()}
                            className="flex-1 py-3 px-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            <ArrowUpCircle className="w-5 h-5" />
                            {promoting ? 'Promoting…' : `Promote ${students.length} Students to ${toSession}`}
                        </button>
                    </div>
                </div>
            </main>

            <ConfirmationModal
                isOpen={confirmOpen}
                title="Promote all students?"
                message={`This will move ${movingCount} student${movingCount === 1 ? '' : 's'} up one class and graduate ${graduatingCount} SSS 3 student${graduatingCount === 1 ? '' : 's'} for the ${toSession} session. This is an end-of-session action — continue?`}
                confirmText="Yes, promote"
                onConfirm={runPromotion}
                onClose={() => setConfirmOpen(false)}
            />
        </div>
    );
};

export default SessionPromotionScreen;
