import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { TrashIcon, PlusIcon, CheckCircleIcon, XCircleIcon, ClockIcon, SearchIcon, ClipboardListIcon, UserIcon } from '../../constants';

const ManagePermissionSlipsScreen: React.FC = () => {
    const [classes, setClasses] = useState<any[]>([]);
    const [recentSlips, setRecentSlips] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [newItem, setNewItem] = useState({
        title: '',
        description: '',
        location: '',
        date: '',
        selectedClassId: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchClasses();
        fetchRecentSlips();
    }, []);

    useEffect(() => {
        if (statusMessage) {
            const timer = setTimeout(() => setStatusMessage(null), 4000);
            return () => clearTimeout(timer);
        }
    }, [statusMessage]);

    const fetchClasses = async () => {
        const { data } = await supabase.from('classes').select('*').order('id');
        setClasses(data || []);
    };

    const fetchRecentSlips = async () => {
        try {
            const { data, error } = await supabase
                .from('permission_slips')
                .select('*, students(name, grade, section)')
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) throw error;
            setRecentSlips(data || []);
        } catch (err) {
            console.error('Error fetching slips:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatusMessage(null);

        if (!newItem.selectedClassId) {
            setStatusMessage({ type: 'error', text: 'Please select a class.' });
            return;
        }
        setIsSubmitting(true);
        try {
            // 1. Get class details
            const selectedClass = classes.find(c => c.id === newItem.selectedClassId);
            if (!selectedClass) throw new Error("Class not found");

            // 2. Fetch students
            const { data: students, error: studentError } = await supabase
                .from('students')
                .select('id')
                .eq('grade', selectedClass.grade)
                .eq('section', selectedClass.section);

            if (studentError) throw studentError;
            if (!students || students.length === 0) {
                setStatusMessage({ type: 'error', text: 'No students found in this class.' });
                setIsSubmitting(false);
                return;
            }

            // 3. Prepare inserts
            const inserts = students.map(s => ({
                student_id: s.id,
                title: newItem.title,
                description: newItem.description,
                location: newItem.location,
                date: newItem.date,
                status: 'Pending'
            }));

            // 4. Bulk insert
            const { error: insertError } = await supabase
                .from('permission_slips')
                .insert(inserts);

            if (insertError) throw insertError;

            setNewItem({ title: '', description: '', location: '', date: '', selectedClassId: '' });
            fetchRecentSlips();
            setStatusMessage({ type: 'success', text: `Permission slip sent to ${students.length} students.` });
        } catch (err) {
            console.error('Error issuing slips:', err);
            setStatusMessage({ type: 'error', text: 'Failed to issue slips. Please try again.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('Delete this slip?')) return;
        const { error } = await supabase.from('permission_slips').delete().eq('id', id);
        if (!error) {
            fetchRecentSlips();
            setStatusMessage({ type: 'success', text: 'Slip deleted.' });
        } else {
            setStatusMessage({ type: 'error', text: 'Failed to delete slip.' });
        }
    };

    const filteredSlips = recentSlips.filter(slip =>
        slip.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        slip.students?.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex flex-col h-full bg-gray-50 p-6 space-y-6 overflow-y-auto">

            {/* Header */}
            <div className="flex flex-col space-y-2">
                <h1 className="text-2xl font-bold text-gray-800">Permission Slips</h1>
                <p className="text-gray-500 text-sm">Issue and track permission slips for school events.</p>
                {statusMessage && (
                    <div className={`p-4 rounded-lg flex items-center space-x-2 animate-fade-in-down ${statusMessage.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {statusMessage.type === 'success' ? <CheckCircleIcon className="w-5 h-5" /> : <XCircleIcon className="w-5 h-5" />}
                        <span>{statusMessage.text}</span>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Form Section */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 sticky top-6">
                        <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                            <PlusIcon className="w-5 h-5 mr-2 text-indigo-600" />
                            Issue New Slip
                        </h2>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Select Class</label>
                                <select
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                    value={newItem.selectedClassId}
                                    onChange={e => setNewItem({ ...newItem, selectedClassId: e.target.value })}
                                    required
                                >
                                    <option value="">-- Choose Class --</option>
                                    {classes.map(c => (
                                        <option key={c.id} value={c.id}>Grade {c.grade}{c.section} - {c.subject}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Event Title</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Zoo Excursion"
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                    value={newItem.title}
                                    onChange={e => setNewItem({ ...newItem, title: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                                    <input
                                        type="date"
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                        value={newItem.date}
                                        onChange={e => setNewItem({ ...newItem, date: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. City Zoo"
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                        value={newItem.location}
                                        onChange={e => setNewItem({ ...newItem, location: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Details</label>
                                <textarea
                                    placeholder="Information for parents..."
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all h-28 resize-none"
                                    value={newItem.description}
                                    onChange={e => setNewItem({ ...newItem, description: e.target.value })}
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-200"
                            >
                                {isSubmitting ? 'Sending...' : 'Issue to Entire Class'}
                            </button>
                        </form>
                    </div>
                </div>

                {/* List Section */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 min-h-[500px] flex flex-col">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                            <h2 className="text-lg font-bold text-gray-800">Recent Status</h2>
                            <div className="relative w-full sm:w-64">
                                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search student or event..."
                                    className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-full focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        {loading ? (
                            <div className="flex-grow flex justify-center items-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                            </div>
                        ) : filteredSlips.length === 0 ? (
                            <div className="flex-grow flex flex-col justify-center items-center text-gray-400 py-12">
                                <ClipboardListIcon className="w-12 h-12 mb-3 opacity-20" />
                                <p>No recent slips found.</p>
                            </div>
                        ) : (
                            <div className="overflow-hidden">
                                <table className="min-w-full text-left">
                                    <thead>
                                        <tr className="border-b border-gray-100 text-gray-400 text-xs uppercase tracking-wider">
                                            <th className="pb-3 px-2 font-semibold">Student</th>
                                            <th className="pb-3 px-2 font-semibold">Event</th>
                                            <th className="pb-3 px-2 font-semibold">Date</th>
                                            <th className="pb-3 px-2 font-semibold">Status</th>
                                            <th className="pb-3 px-2 text-right font-semibold">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-sm divide-y divide-gray-50">
                                        {filteredSlips.map(slip => (
                                            <tr key={slip.id} className="hover:bg-gray-50 transition-colors group">
                                                <td className="py-3 px-2">
                                                    <div className="flex items-center">
                                                        <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mr-3 font-bold text-xs">
                                                            {slip.students?.name?.charAt(0) || <UserIcon className="w-4 h-4" />}
                                                        </div>
                                                        <div>
                                                            <div className="font-medium text-gray-800">{slip.students?.name}</div>
                                                            <div className="text-xs text-gray-400">Class {slip.students?.grade}{slip.students?.section}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-2 text-gray-600 font-medium">{slip.title}</td>
                                                <td className="py-3 px-2 text-gray-500">{new Date(slip.date).toLocaleDateString()}</td>
                                                <td className="py-3 px-2">
                                                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${slip.status === 'Approved' ? 'bg-green-100 text-green-700' :
                                                            slip.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                                                                'bg-yellow-100 text-yellow-700'
                                                        }`}>
                                                        {slip.status}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-2 text-right">
                                                    <button
                                                        onClick={() => handleDelete(slip.id)}
                                                        className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Delete Slip"
                                                    >
                                                        <TrashIcon className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ManagePermissionSlipsScreen;
