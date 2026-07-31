import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { api } from '../../lib/api';
import { toast } from 'react-hot-toast';
import { AlertTriangle, Paperclip } from 'lucide-react';
import { Student } from '../../types';

interface SuspendStudentScreenProps {
    student: Student;
    handleBack: () => void;
}

function todayStr(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const SuspendStudentScreen: React.FC<SuspendStudentScreenProps> = ({ student, handleBack }) => {
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [form, setForm] = useState({
        reason: '', start_date: todayStr(), return_date: '', return_conditions: '', attachment_urls: [] as string[],
    });

    const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;
        setUploading(true);
        try {
            const uploaded: string[] = [];
            for (const f of files) {
                const res = await api.uploadFile(f);
                const url = (res as any).publicUrl || (res as any).url;
                if (url) uploaded.push(url);
            }
            setForm(f => ({ ...f, attachment_urls: [...f.attachment_urls, ...uploaded] }));
            if (uploaded.length) toast.success(`${uploaded.length} document(s) attached`);
        } catch (err) {
            console.error('Attachment upload failed:', err);
            toast.error('Failed to upload document');
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };

    if (!student) {
        return (
            <div className="p-4 lg:p-6 max-w-2xl mx-auto space-y-4 pb-24">
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-700">No student was selected. Please go back and try again.</p>
                </div>
                <button onClick={handleBack}
                    className="w-full py-3 border border-gray-200 rounded-2xl text-gray-600 font-bold hover:bg-gray-50 transition-colors">
                    Back
                </button>
            </div>
        );
    }

    const handleSubmit = async () => {
        if (!form.reason.trim()) { toast.error('Please state the reason for suspension'); return; }
        if (!form.return_date) { toast.error('Please set a return date'); return; }
        setSaving(true);
        try {
            await api.post('/suspensions', { ...form, student_id: student.id });
            toast.success('Suspension letter issued — the student and parent have been notified');
            handleBack();
        } catch (err: any) {
            toast.error(err?.message || 'Failed to issue suspension');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="p-4 lg:p-6 max-w-2xl mx-auto space-y-6 pb-24">
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                    <p className="font-bold text-amber-900">Suspend {student.name}</p>
                    <p className="text-sm text-amber-700">This letter will be sent immediately to the student and their parent/guardian, and permanently stored in the student's record.</p>
                </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.05 }} className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 space-y-4">
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Reason for Suspension</label>
                    <textarea rows={5} placeholder="Describe the full reason for this suspension..."
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
                        value={form.reason}
                        onChange={e => setForm({ ...form, reason: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Start Date</label>
                        <input type="date"
                            className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
                            value={form.start_date}
                            onChange={e => setForm({ ...form, start_date: e.target.value })} />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Return Date</label>
                        <input type="date"
                            className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
                            value={form.return_date}
                            onChange={e => setForm({ ...form, return_date: e.target.value })} />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Conditions for Return (optional)</label>
                    <textarea rows={3} placeholder="e.g. Must attend a counseling session before resuming classes"
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
                        value={form.return_conditions}
                        onChange={e => setForm({ ...form, return_conditions: e.target.value })} />
                </div>
                <div>
                    <label className="flex items-center gap-2 text-sm font-semibold text-indigo-600 cursor-pointer hover:text-indigo-800">
                        <Paperclip className="w-4 h-4" />
                        {uploading ? 'Uploading...' : 'Attach supporting documents'}
                        <input type="file" multiple className="hidden" onChange={handleFiles} disabled={uploading} />
                    </label>
                    {form.attachment_urls.length > 0 && (
                        <p className="text-xs text-gray-400 mt-1">{form.attachment_urls.length} document(s) attached</p>
                    )}
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
                    className="flex-1 py-3 bg-amber-600 text-white rounded-2xl font-bold hover:bg-amber-700 transition-colors shadow-lg shadow-amber-200 disabled:opacity-60">
                    {saving ? 'Sending...' : 'Issue Suspension Letter'}
                </motion.button>
            </div>
        </div>
    );
};

export default SuspendStudentScreen;
