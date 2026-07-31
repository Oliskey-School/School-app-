import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { api } from '../../lib/api';
import { toast } from 'react-hot-toast';
import { AlertTriangle } from 'lucide-react';
import { Student } from '../../types';

interface MarkStudentExitScreenProps {
    student: Student;
    handleBack: () => void;
}

function todayStr(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const MarkStudentExitScreen: React.FC<MarkStudentExitScreenProps> = ({ student, handleBack }) => {
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({ status: 'Transferred', reason: '', exit_date: todayStr() });

    if (!student) {
        return (
            <div className="p-4 lg:p-6 max-w-2xl mx-auto space-y-4">
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-700">No student was selected. Please go back and try again.</p>
                </div>
                <button onClick={handleBack}
                    className="w-full py-3 border border-gray-200 rounded-2xl text-gray-600 font-bold hover:bg-gray-50 transition-colors">
                    Go Back
                </button>
            </div>
        );
    }

    const handleSubmit = async () => {
        if (!window.confirm(`Mark ${student.name} as ${form.status}? Their record will move to the Past Students archive and remain permanently accessible.`)) return;
        setSaving(true);
        try {
            await api.post(`/alumni/${student.id}/mark-exit`, form);
            toast.success(`${student.name} has been moved to Past Students`);
            handleBack();
        } catch (err: any) {
            toast.error(err?.message || 'Failed to update student status');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="p-4 lg:p-6 max-w-2xl mx-auto space-y-6 pb-24">
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                    <p className="font-bold text-red-900">Mark {student.name} as Left the School</p>
                    <p className="text-sm text-red-700">Their full record is never deleted — it moves to the Past Students archive and stays permanently accessible.</p>
                </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.05 }} className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 space-y-4">
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Status</label>
                    <select className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={form.status}
                        onChange={e => setForm({ ...form, status: e.target.value })}>
                        <option value="Transferred">Transferred to another school</option>
                        <option value="Withdrawn">Withdrawn</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Reason (optional)</label>
                    <textarea rows={4} placeholder="e.g. Family relocated to another state"
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={form.reason}
                        onChange={e => setForm({ ...form, reason: e.target.value })} />
                </div>
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Exit Date</label>
                    <input type="date"
                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={form.exit_date}
                        onChange={e => setForm({ ...form, exit_date: e.target.value })} />
                </div>
            </motion.div>

            <div className="flex gap-3">
                <motion.button whileTap={{ scale: 0.97 }} onClick={handleBack}
                    className="flex-1 py-3 border border-gray-200 rounded-2xl text-gray-600 font-bold hover:bg-gray-50 transition-colors">
                    Cancel
                </motion.button>
                <motion.button
                    whileHover={!saving ? { scale: 1.01 } : {}}
                    whileTap={!saving ? { scale: 0.97 } : {}}
                    onClick={handleSubmit} disabled={saving}
                    className="flex-1 py-3 bg-red-600 text-white rounded-2xl font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-200 disabled:opacity-60">
                    {saving ? 'Saving...' : 'Confirm & Archive'}
                </motion.button>
            </div>
        </div>
    );
};

export default MarkStudentExitScreen;
