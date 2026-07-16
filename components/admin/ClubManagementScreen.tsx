import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/api';
import { toast } from 'react-hot-toast';
import { Trophy, Users, PlusCircle, X, CheckCircle2 } from 'lucide-react';

const CATEGORIES = ['Academic', 'Sports', 'Arts', 'Technology', 'Community Service'];

function todayStr(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const ClubManagementScreen = () => {
    const [clubs, setClubs] = useState<any[]>([]);
    const [teachers, setTeachers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);
    const [newClub, setNewClub] = useState({ name: '', category: 'Academic', advisor_teacher_id: '' });
    const [selected, setSelected] = useState<any | null>(null);
    const [members, setMembers] = useState<any[]>([]);
    const [attendance, setAttendance] = useState<Record<string, string>>({});
    const [achievements, setAchievements] = useState<any[]>([]);
    const [achievementForm, setAchievementForm] = useState({ student_id: '', title: '' });

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [clubsRes, teachersRes] = await Promise.all([api.getExtracurriculars(), api.getTeachers()]);
            setClubs(Array.isArray(clubsRes) ? clubsRes : []);
            setTeachers(Array.isArray(teachersRes) ? teachersRes : []);
        } catch (err) {
            console.error('Error loading clubs:', err);
            toast.error('Failed to load clubs');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const openClub = async (club: any) => {
        setSelected(club);
        setAttendance({});
        try {
            const [achv] = await Promise.all([api.getClubAchievements(club.id)]);
            setAchievements(Array.isArray(achv) ? achv : []);
        } catch (err) {
            console.error('Error loading club details:', err);
        }
    };

    const handleCreate = async () => {
        if (!newClub.name.trim()) { toast.error('Enter a club name'); return; }
        try {
            await api.createClub(newClub);
            toast.success('Club created');
            setNewClub({ name: '', category: 'Academic', advisor_teacher_id: '' });
            setShowAdd(false);
            fetchData();
        } catch (err: any) {
            toast.error(err?.message || 'Failed to create club');
        }
    };

    const handleSubmitAttendance = async () => {
        if (!selected) return;
        const records = Object.entries(attendance).map(([student_id, status]) => ({ student_id, status }));
        if (records.length === 0) { toast.error('Mark at least one student'); return; }
        try {
            await api.markClubAttendance(selected.id, todayStr(), records);
            toast.success('Attendance saved');
            setAttendance({});
        } catch (err: any) {
            toast.error(err?.message || 'Failed to save attendance');
        }
    };

    const handleAddAchievement = async () => {
        if (!selected || !achievementForm.student_id || !achievementForm.title.trim()) { toast.error('Select a student and enter a title'); return; }
        try {
            await api.addClubAchievement(selected.id, achievementForm);
            toast.success('Achievement logged');
            setAchievementForm({ student_id: '', title: '' });
            openClub(selected);
        } catch (err: any) {
            toast.error(err?.message || 'Failed to log achievement');
        }
    };

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 font-outfit">School Clubs</h1>
                    <p className="text-gray-500">Attendance, achievements, and advisors for every club.</p>
                </div>
                <button onClick={() => setShowAdd(v => !v)} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl font-semibold text-sm">
                    <PlusCircle className="w-4 h-4" /> New Club
                </button>
            </div>

            {showAdd && (
                <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4 space-y-2">
                    <input value={newClub.name} onChange={e => setNewClub(c => ({ ...c, name: e.target.value }))} placeholder="Club name (e.g. Debate Club)"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400" />
                    <div className="grid grid-cols-2 gap-2">
                        <select value={newClub.category} onChange={e => setNewClub(c => ({ ...c, category: e.target.value }))} className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400">
                            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <select value={newClub.advisor_teacher_id} onChange={e => setNewClub(c => ({ ...c, advisor_teacher_id: e.target.value }))} className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400">
                            <option value="">No advisor yet</option>
                            {teachers.map((t: any) => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                        </select>
                    </div>
                    <button onClick={handleCreate} className="bg-indigo-600 text-white text-sm font-semibold px-4 py-2 rounded-lg">Create</button>
                </div>
            )}

            {loading ? (
                <div className="text-center py-12 text-gray-500">Loading...</div>
            ) : clubs.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
                    <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No clubs yet.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {clubs.map((c: any) => (
                        <button key={c.id} onClick={() => openClub(c)} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 text-left hover:border-indigo-300">
                            <h3 className="font-bold text-gray-900">{c.name}</h3>
                            <p className="text-xs text-gray-400">{c.category} · Advisor: {c.advisor?.full_name || 'None'}</p>
                            <p className="text-xs text-gray-500 mt-2 flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {c._count?.participants || 0} members</p>
                        </button>
                    ))}
                </div>
            )}

            {selected && (
                <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto">
                        <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center sticky top-0">
                            <h3 className="font-bold text-gray-900 font-outfit text-xl">{selected.name}</h3>
                            <button onClick={() => setSelected(null)} className="p-2 hover:bg-gray-200 rounded-full"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-6 space-y-6">
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase mb-2">Achievements & Awards</p>
                                <div className="space-y-1 mb-2">
                                    {achievements.length === 0 ? <p className="text-sm text-gray-400">None logged yet.</p> : achievements.map((a: any) => (
                                        <div key={a.id} className="text-sm bg-gray-50 rounded-lg px-3 py-1.5 flex justify-between">
                                            <span>{a.title} — {a.student?.full_name}</span>
                                            <span className="text-gray-400">{new Date(a.date).toLocaleDateString()}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex items-center gap-2">
                                    <input value={achievementForm.student_id} onChange={e => setAchievementForm(f => ({ ...f, student_id: e.target.value }))} placeholder="Student ID"
                                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-32 outline-none focus:ring-2 focus:ring-indigo-400" />
                                    <input value={achievementForm.title} onChange={e => setAchievementForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Won regional debate final"
                                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm flex-1 outline-none focus:ring-2 focus:ring-indigo-400" />
                                    <button onClick={handleAddAchievement} className="text-sm font-semibold text-indigo-600">Log</button>
                                </div>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase mb-2">Mark Attendance for Today</p>
                                <p className="text-xs text-gray-400 mb-2">Enter a student ID and mark present, then save.</p>
                                <div className="flex items-center gap-2 mb-2">
                                    <input placeholder="Student ID" onKeyDown={e => {
                                        if (e.key === 'Enter') {
                                            const id = (e.target as HTMLInputElement).value.trim();
                                            if (id) { setAttendance(a => ({ ...a, [id]: 'Present' })); (e.target as HTMLInputElement).value = ''; }
                                        }
                                    }} className="border border-gray-200 rounded-lg px-3 py-2 text-sm flex-1 outline-none focus:ring-2 focus:ring-indigo-400" />
                                </div>
                                {Object.keys(attendance).length > 0 && (
                                    <div className="flex flex-wrap gap-1 mb-2">
                                        {Object.keys(attendance).map(id => (
                                            <span key={id} className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full flex items-center gap-1">
                                                <CheckCircle2 className="w-3 h-3" /> {id}
                                            </span>
                                        ))}
                                    </div>
                                )}
                                <button onClick={handleSubmitAttendance} className="bg-indigo-600 text-white text-sm font-semibold px-4 py-2 rounded-lg">Save Attendance</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ClubManagementScreen;
