import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useBranch } from '../../context/BranchContext';
import { toast } from 'react-hot-toast';
import { AlertTriangle, Users, User } from 'lucide-react';
import CenteredLoader from '../ui/CenteredLoader';

interface IncidentType {
    id: string;
    name: string;
    description: string | null;
    severity: 'standard' | 'critical';
    is_critical_alert: boolean;
}

interface ReportIncidentScreenProps {
    navigateTo: (view: string, title: string, props?: any) => void;
    handleBack?: () => void;
}

const ReportIncidentScreen: React.FC<ReportIncidentScreenProps> = ({ navigateTo, handleBack }) => {
    const { currentSchool } = useAuth();
    const { currentBranch } = useBranch();
    const [types, setTypes] = useState<IncidentType[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [students, setStudents] = useState<any[]>([]);
    const [teachers, setTeachers] = useState<any[]>([]);

    const [incidentTypeId, setIncidentTypeId] = useState('');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [involvedStudents, setInvolvedStudents] = useState<string[]>([]);
    const [involvedTeachers, setInvolvedTeachers] = useState<string[]>([]);

    const fetchRefs = useCallback(async () => {
        setLoading(true);
        try {
            const [typesRes, studentsRes, teachersRes] = await Promise.all([
                api.get<IncidentType[]>('/sop/incident-types'),
                api.getStudents(currentSchool?.id, currentBranch?.id),
                api.getTeachers(currentSchool?.id, currentBranch?.id),
            ]);
            setTypes((Array.isArray(typesRes) ? typesRes : []).filter((t: any) => t.is_active));
            setStudents(Array.isArray(studentsRes) ? studentsRes : []);
            setTeachers(Array.isArray(teachersRes) ? teachersRes : []);
        } catch (err) {
            console.error('Error loading report form data:', err);
            toast.error('Failed to load incident types');
        } finally {
            setLoading(false);
        }
    }, [currentSchool?.id, currentBranch?.id]);

    useEffect(() => { fetchRefs(); }, [fetchRefs]);

    const selectedType = types.find(t => t.id === incidentTypeId);

    const toggle = (list: string[], setList: (v: string[]) => void, id: string) => {
        setList(list.includes(id) ? list.filter(x => x !== id) : [...list, id]);
    };

    const handleSubmit = async () => {
        if (!incidentTypeId) { toast.error('Please select an incident type'); return; }
        if (!title.trim()) { toast.error('Please enter a title'); return; }
        if (!description.trim()) { toast.error('Please describe what happened'); return; }
        setSaving(true);
        try {
            const result: any = await api.post('/sop/cases', {
                incident_type_id: incidentTypeId,
                title, description,
                involved_student_ids: involvedStudents,
                involved_teacher_ids: involvedTeachers,
            });
            toast.success('Incident reported — the workflow has started');
            navigateTo('sopCaseDetail', title, { caseId: result.id });
        } catch (err: any) {
            toast.error(err?.message || 'Failed to report incident');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <CenteredLoader className="py-12" />;

    return (
        <div className="p-4 lg:p-6 max-w-2xl mx-auto space-y-6 pb-24">
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 space-y-5">
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Incident Type</label>
                    <select className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={incidentTypeId} onChange={e => setIncidentTypeId(e.target.value)}>
                        <option value="">Select type...</option>
                        {types.map(t => <option key={t.id} value={t.id}>{t.name}{t.is_critical_alert ? ' (Critical)' : ''}</option>)}
                    </select>
                    {types.length === 0 && <p className="text-xs text-amber-600 mt-1">No incident types have been set up yet — ask an admin to configure them in SOP Settings.</p>}
                </div>

                {selectedType?.is_critical_alert && (
                    <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
                        <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-red-700">This is a critical incident type — submitting this report immediately alerts the relevant people.</p>
                    </div>
                )}

                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Title</label>
                    <input type="text" placeholder="Brief summary" className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={title} onChange={e => setTitle(e.target.value)} />
                </div>

                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">What happened?</label>
                    <textarea rows={5} placeholder="Describe the incident in full detail..."
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={description} onChange={e => setDescription(e.target.value)} />
                </div>

                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1 flex items-center gap-1"><Users className="w-4 h-4" /> Students Involved (optional)</label>
                    <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-xl p-2 space-y-1">
                        {students.map((s: any) => (
                            <label key={s.id} className="flex items-center gap-2 px-2 py-1 hover:bg-gray-50 rounded-lg cursor-pointer text-sm">
                                <input type="checkbox" checked={involvedStudents.includes(s.id)} onChange={() => toggle(involvedStudents, setInvolvedStudents, s.id)} />
                                {s.name || s.full_name}
                            </label>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1 flex items-center gap-1"><User className="w-4 h-4" /> Staff Involved (optional)</label>
                    <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-xl p-2 space-y-1">
                        {teachers.map((t: any) => (
                            <label key={t.id} className="flex items-center gap-2 px-2 py-1 hover:bg-gray-50 rounded-lg cursor-pointer text-sm">
                                <input type="checkbox" checked={involvedTeachers.includes(t.id)} onChange={() => toggle(involvedTeachers, setInvolvedTeachers, t.id)} />
                                {t.name || t.full_name}
                            </label>
                        ))}
                    </div>
                </div>
            </motion.div>

            <div className="flex gap-3">
                {handleBack && (
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleBack} className="flex-1 py-3 border border-gray-200 rounded-2xl text-gray-600 font-bold hover:bg-gray-50 transition-colors">Cancel</motion.button>
                )}
                <motion.button whileHover={!saving ? { scale: 1.02 } : {}} whileTap={!saving ? { scale: 0.98 } : {}} onClick={handleSubmit} disabled={saving}
                    className="flex-1 py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 disabled:opacity-60">
                    {saving ? 'Submitting...' : 'Submit Report'}
                </motion.button>
            </div>
        </div>
    );
};

export default ReportIncidentScreen;
