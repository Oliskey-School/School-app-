import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/api';
import { toast } from 'react-hot-toast';
import { Building2, Users, Wallet, CalendarClock, PlusCircle, X, ChevronRight } from 'lucide-react';

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
                <button onClick={() => setShowAdd(v => !v)} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl font-semibold text-sm">
                    <PlusCircle className="w-4 h-4" /> New Department
                </button>
            </div>

            {showAdd && (
                <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4 space-y-3">
                    <div className="flex flex-wrap gap-2">
                        {DEFAULT_NAMES.filter(n => !departments.some(d => d.name === n)).map(n => (
                            <button key={n} onClick={() => handleCreate(n)} className="text-xs font-semibold bg-white border border-gray-200 rounded-full px-3 py-1.5 hover:border-indigo-400">
                                + {n}
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center gap-2">
                        <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Custom department name"
                            className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400 flex-1" />
                        <button onClick={() => handleCreate(newName)} className="bg-indigo-600 text-white text-sm font-semibold px-4 py-2 rounded-lg">Add</button>
                    </div>
                </div>
            )}

            {loading ? (
                <div className="text-center py-12 text-gray-500">Loading...</div>
            ) : departments.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
                    <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No departments yet.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {departments.map(d => (
                        <button key={d.id} onClick={() => openReport(d)} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 text-left hover:border-indigo-300 transition-colors">
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
                        </button>
                    ))}
                </div>
            )}

            {selected && report && (
                <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto">
                        <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center sticky top-0">
                            <h3 className="font-bold text-gray-900 font-outfit text-xl">{report.name}</h3>
                            <button onClick={() => { setSelected(null); setReport(null); }} className="p-2 hover:bg-gray-200 rounded-full"><X className="w-5 h-5" /></button>
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
                                    <button onClick={handleAssignTeacher} className="text-sm font-semibold text-indigo-600">Add</button>
                                </div>
                            </div>

                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase mb-2">Budget — ₦{report.total_spent.toLocaleString()} / ₦{report.total_allocated.toLocaleString()}</p>
                                <div className="flex items-center gap-2">
                                    <input value={budgetForm.fiscal_year} onChange={e => setBudgetForm(f => ({ ...f, fiscal_year: e.target.value }))} placeholder="2026/2027"
                                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-28 outline-none focus:ring-2 focus:ring-indigo-400" />
                                    <input value={budgetForm.allocated_amount} onChange={e => setBudgetForm(f => ({ ...f, allocated_amount: e.target.value }))} placeholder="Amount (₦)" type="number"
                                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm flex-1 outline-none focus:ring-2 focus:ring-indigo-400" />
                                    <button onClick={handleAddBudget} className="text-sm font-semibold text-indigo-600">Add</button>
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
                                    <button onClick={handleAddMeeting} className="text-sm font-semibold text-indigo-600">Log Meeting</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DepartmentManagementScreen;
