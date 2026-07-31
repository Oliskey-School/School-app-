import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { api } from '../../lib/api';
import { Sparkles, AlertCircle } from 'lucide-react';

const STAT_LABELS: Record<string, string> = {
    today_attendance_pct: "Today's Attendance",
    teachers_absent: 'Teachers Absent',
    students_needing_attention: 'Students Needing Attention',
    homework_pending: 'Homework Set',
    students_needing_support: 'Students Needing Support',
    class_absentees_today: 'Absent in Your Class',
};

/** Renders the role-appropriate AI Insights panel. All numbers come straight
 * from the Insight Engine (rules-based) — this component only presents them
 * and surfaces the plain-English recommendations it returns. */
const AIInsightsPanel = () => {
    const [insights, setInsights] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchInsights = useCallback(async () => {
        try {
            const data = await api.getMyInsights();
            setInsights(data);
        } catch (err) {
            console.error('Error loading AI insights:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchInsights(); }, [fetchInsights]);

    if (loading) {
        return <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 animate-pulse h-32" />;
    }
    if (!insights) return null;

    const statEntries = Object.entries(STAT_LABELS)
        .filter(([key]) => insights[key] !== undefined && insights[key] !== null)
        .map(([key, label]) => ({ key, label, value: insights[key] }));

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-gradient-to-br from-indigo-50 to-white rounded-2xl shadow-sm border border-indigo-100 p-5 hover:shadow-md transition-shadow duration-200"
        >
            <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
                    <Sparkles className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-gray-900">AI Insights</h3>
            </div>

            {statEntries.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                    {statEntries.map((s, i) => (
                        <motion.div
                            key={s.key}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.25, delay: i * 0.05 }}
                            whileHover={{ y: -2 }}
                            className="bg-white rounded-xl border border-gray-100 p-3 hover:shadow-sm transition-shadow duration-200"
                        >
                            <p className="text-xl font-bold text-gray-900">{s.value}{s.key.includes('pct') ? '%' : ''}</p>
                            <p className="text-xs text-gray-500">{s.label}</p>
                        </motion.div>
                    ))}
                </div>
            )}

            {Array.isArray(insights.children) && insights.children.length > 0 && (
                <div className="space-y-2 mb-4">
                    {insights.children.map((c: any, i: number) => (
                        <motion.div
                            key={c.student_id}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.25, delay: i * 0.04 }}
                            className="bg-white rounded-xl border border-gray-100 p-3 flex items-center justify-between"
                        >
                            <span className="font-semibold text-gray-800 text-sm">{c.name}</span>
                            <span className="text-xs text-gray-500">
                                {c.attendance_pct_30d !== null ? `${c.attendance_pct_30d}% attendance` : 'No attendance data'}
                                {c.unpaid_fees > 0 ? ` · ₦${c.unpaid_fees.toLocaleString()} owing` : ''}
                            </span>
                        </motion.div>
                    ))}
                </div>
            )}

            {Array.isArray(insights.weak_subjects) && insights.weak_subjects.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                    {insights.weak_subjects.map((s: any) => (
                        <span key={s.subject} className="text-xs font-semibold bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full">{s.subject} · {s.average_pct}%</span>
                    ))}
                </div>
            )}

            {Array.isArray(insights.recommendations) && insights.recommendations.length > 0 ? (
                <ul className="space-y-1.5">
                    {insights.recommendations.map((r: string, i: number) => (
                        <motion.li
                            key={i}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.25, delay: i * 0.05 }}
                            className="flex items-start gap-2 text-sm text-gray-700"
                        >
                            <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-indigo-400" />
                            <span>{r}</span>
                        </motion.li>
                    ))}
                </ul>
            ) : (
                <p className="text-sm text-gray-400">Nothing urgent right now — all clear.</p>
            )}
        </motion.div>
    );
};

export default AIInsightsPanel;
