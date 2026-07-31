import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../lib/api';
import { toast } from 'react-hot-toast';
import { Building2, Users, Wallet, CalendarClock, PlusCircle, X, ChevronRight } from 'lucide-react';
import CenteredLoader from '../ui/CenteredLoader';

const DEFAULT_NAMES = ['Science', 'Mathematics', 'Languages', 'ICT', 'Arts', 'Commercial', 'Agricultural Science'];

const DepartmentManagementScreen = () => {
    const [departments, setDepartments] = useState<any[]>([]);
    const [teachers, setTeachers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);
    const [newName, setNewName] = useState('');
    const [selected, setSelected] = useState<any | null>(null);
    const [report, setReport] = useState<any | null>(null);
    const [assignTeacherId, setAssignTeacherId] = useState('');
    const [meetingForm, setMeetingForm] = useState({ title: '', date: '', time: '' });
    const [budgetForm, setBudgetForm] = useState({ fiscal_year: '', allocated_amount: '' });

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [depts, tchrs] = await Promise.all([api.getDepartments(), api.getTeachers()]);
            setDepartments(Array.isArray(depts) ? depts : []);
            setTeachers(Array.isArray(tchrs) ? tchrs : []);
        } catch (err) {
            console.error('Error loading departments:', err);
            toast.error('Failed to load departments');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const openReport = async (dept: any) => {
        setSelected(dept);
        try {
            const result = await api.getDepartmentReport(dept.id);
            setReport(result);
        } catch (err: any) {
            toast.error(err?.message || 'Failed to load report');
        }
    };

    const handleCreate = async (name: string) => {
        if (!name.trim()) { toast.error('Enter a department name'); return; }
        try {
            await api.createDepartment({ name: name.trim() });
            toast.success('Department created');
            setNewName('');
            setShowAdd(false);
            fetchData();
        } catch (err: any) {
            toast.error(err?.message || 'Failed to create department');
        }
    };

    const handleSetHead = async (deptId: string, teacherId: string) => {
        try {
            await api.updateDepartment(deptId, { head_teacher_id: teacherId || null });
            toast.success('Head of Department updated');
            fetchData();
            if (selected?.id === deptId) openReport({ id: deptId });
        } catch (err: any) {
            toast.error(err?.message || 'Failed to update');
        }
    };

    const handleAssignTeacher = async () => {
        if (!selected || !assignTeacherId) return;
        try {
            await api.assignTeacherToDepartment(selected.id, assignTeacherId);
            toast.success('Teacher assigned');
            setAssignTeacherId('');
            openReport(selected);
            fetchData();
        } catch (err: any) {
            toast.error(err?.message || 'Failed to assign teacher');
        }
    };

    const handleAddBudget = async () => {
        if (!selected || !budgetForm.fiscal_year.trim() || !budgetForm.allocated_amount) { toast.error('Fill in fiscal year and amount'); return; }
        try {
            await api.addDepartmentBudget(selected.id, { fiscal_year: budgetForm.fiscal_year.trim(), allocated_amount: Number(budgetForm.allocated_amount) });
            toast.success('Budget line added');
            setBudgetForm({ fiscal_year: '', allocated_amount: '' });
            openReport(selected);
            fetchData();
        } catch (err: any) {
            toast.error(err?.message || 'Failed to add budget');
        }
    };

    const handleAddMeeting = async () => {
        if (!selected || !meetingForm.title.trim() || !meetingForm.date) { toast.error('Fill in meeting title and date'); return; }
        try {
            await api.createDepartmentMeeting(selected.id, meetingForm);
            toast.success('Meeting logged');
            setMeetingForm({ title: '', date: '', time: '' });
            openReport(selected);
            fetchData();
        } catch (err: any) {
            toast.error(err?.message || 'Failed to log meeting');
        }
    };

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 font-outfit">Departments</h1>
                    <p className="text-gray-500">Heads of department, budgets, teacher rosters, and meeting logs.</p>
                </div>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setShowAdd(v => !v)} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl font-semibold text-sm">
                    <PlusCircle className="w-4 h-4" /> New Department
                </motion.button>
            </div>

            <AnimatePresence>
            {showAdd && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4 space-y-3 overflow-hidden">
                    <div className="flex flex-wrap gap-2">
                        {DEFAULT_NAMES.filter(n => !departments.some(d => d.name === n)).map(n => (
                            <motion.button key={n} whileTap={{ scale: 0.95 }} onClick={() => handleCreate(n)} className="text-xs font-semibold bg-white border border-gray-200 rounded-full px-3 py-1.5 hover:border-indigo-400">
                                + {n}
                            </motion.button>
                        ))}
                    </div>
                    <div className="flex items-center gap-2">
                        <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Custom department name"
                            className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400 flex-1" />
                        <motion.button whileTap={{ scale: 0.97 }} onClick={() => handleCreate(newName)} className="bg-indigo-600 text-white text-sm font-semibold px-4 py-2 rounded-lg">Add</motion.button>
                    </div>
                </motion.div>
            )}
            </AnimatePresence>

            {loading ? (
                <CenteredLoader className="py-12" />
            ) : departments.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
                    <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No departments yet.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {departments.map((d, di) => (
                        <motion.button key={d.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: Math.min(di, 10) * 0.04 }} whileHover={{ y: -2 }} onClick={() => openReport(d)} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 text-left hover:border-indigo-300 transition-colors">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="font-bold text-gray-900">{d.name}</h3>
                                <ChevronRight className="w-4 h-4 text-gray-300" />
                            </div>
                            <p className="text-xs text-gray-400 mb-3">HOD: {d.head_teacher?.full_name || 'Not assigned'}</p>
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                                <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {d.teacher_count}</span>
                                <span className="flex items-center gap-1"><Wallet className="w-3.5 h-3.5" /> ₦{d.total_spent.toLocaleString()}/₦{d.total_allocated.toLocaleString()}</span>
                                <span className="flex items-center gap-1"><CalendarClock className="w-3.5 h-3.5" /> {d.meeting_count}</span>
                            </div>
                        </motion.button>
                    ))}
                </div>
            )}

            <AnimatePresence>
            {selected && report && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} transition={{ type: 'spring', stiffness: 400, damping: 32 }} className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto">
                        <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center sticky top-0">
                            <h3 className="font-bold text-gray-900 font-outfit text-xl">{report.name}</h3>
                            <motion.button whileTap={{ scale: 0.9 }} onClick={() => { setSelected(null); setReport(null); }} className="p-2 hover:bg-gray-200 rounded-full"><X className="w-5 h-5" /></motion.button>
                        </div>
                        <div className="p-6 space-y-6">
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase mb-1">Head of Department</p>
                                <select value={report.head_teacher_id || ''} onChange={e => handleSetHead(report.id, e.target.value)}
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400">
                                    <option value="">Not assigned</option>
                                    {teachers.map((t: any) => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                                </select>
                            </div>

                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase mb-2">Teachers ({report.teachers.length})</p>
                                <div className="space-y-1 mb-2">
                                    {report.teachers.map((t: any) => <div key={t.id} className="text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-1.5">{t.full_name}</div>)}
                                </div>
                                <div className="flex items-center gap-2">
                                    <select value={assignTeacherId} onChange={e => setAssignTeacherId(e.target.value)} className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400">
                                        <option value="">Select a teacher to add...</option>
                                        {teachers.filter((t: any) => !report.teachers.some((rt: any) => rt.id === t.id)).map((t: any) => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                                    </select>
                                    <motion.button whileTap={{ scale: 0.95 }} onClick={handleAssignTeacher} className="text-sm font-semibold text-indigo-600">Add</motion.button>
                                </div>
                            </div>

                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase mb-2">Budget — ₦{report.total_spent.toLocaleString()} / ₦{report.total_allocated.toLocaleString()}</p>
                                <div className="flex items-center gap-2">
                                    <input value={budgetForm.fiscal_year} onChange={e => setBudgetForm(f => ({ ...f, fiscal_year: e.target.value }))} placeholder="2026/2027"
                                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-28 outline-none focus:ring-2 focus:ring-indigo-400" />
                                    <input value={budgetForm.allocated_amount} onChange={e => setBudgetForm(f => ({ ...f, allocated_amount: e.target.value }))} placeholder="Amount (₦)" type="number"
                                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm flex-1 outline-none focus:ring-2 focus:ring-indigo-400" />
                                    <motion.button whileTap={{ scale: 0.95 }} onClick={handleAddBudget} className="text-sm font-semibold text-indigo-600">Add</motion.button>
                                </div>
                            </div>

                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase mb-2">Meetings</p>
                                <div className="space-y-1 mb-2">
                                    {report.meetings.map((m: any) => (
                                        <div key={m.id} className="text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-1.5 flex justify-between">
                                            <span>{m.title}</span><span className="text-gray-400">{new Date(m.date).toLocaleDateString()}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <input value={meetingForm.title} onChange={e => setMeetingForm(f => ({ ...f, title: e.target.value }))} placeholder="Meeting title"
                                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm col-span-2 outline-none focus:ring-2 focus:ring-indigo-400" />
                                    <input value={meetingForm.date} onChange={e => setMeetingForm(f => ({ ...f, date: e.target.value }))} type="date"
                                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400" />
                                    <motion.button whileTap={{ scale: 0.95 }} onClick={handleAddMeeting} className="text-sm font-semibold text-indigo-600">Log Meeting</motion.button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
            </AnimatePresence>
        </div>
    );
};

export default DepartmentManagementScreen;
