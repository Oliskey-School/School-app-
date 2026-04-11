import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { api } from '../../lib/api';
import { 
    PlusIcon, 
    TrashIcon, 
    SearchIcon, 
    ClockIcon, 
    UserIcon, 
    ClipboardListIcon 
} from '../../constants';
import ConfirmationModal from '../ui/ConfirmationModal';

interface ManagePermissionSlipsScreenProps {
    schoolId?: string;
}

const ManagePermissionSlipsScreen: React.FC<ManagePermissionSlipsScreenProps> = ({ schoolId }) => {
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
    const [searchTerm, setSearchTerm] = useState('');

    // Deletion State
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [slipToDelete, setSlipToDelete] = useState<string | null>(null);

    useEffect(() => {
        fetchClasses();
        fetchRecentSlips();
    }, []);

    const fetchClasses = async () => {
        if (!schoolId) return;
        try {
            const data = await api.getClasses(schoolId);
            setClasses(data || []);
        } catch (err) {
            console.error('Error fetching classes:', err);
        }
    };

    const fetchRecentSlips = async () => {
        try {
            const data = await api.getPermissionSlips();
            setRecentSlips(data || []);
        } catch (err) {
            console.error('Error fetching slips:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!newItem.selectedClassId) {
            toast.error('Please select a class.');
            return;
        }
        setIsSubmitting(true);
        try {
            // 1. Get class details
            const selectedClass = classes.find(c => c.id === newItem.selectedClassId);
            if (!selectedClass) throw new Error("Class not found");

            // 2. Fetch students via API (demo mode compatible)
            const allStudents = await api.getStudents(schoolId!, undefined, { includeUntagged: true });
            const students = (allStudents || []).filter((s: any) => {
                const sGrade = s.grade;
                const sSection = s.section;
                if (sGrade !== selectedClass.grade) return false;
                if (selectedClass.section && selectedClass.section !== 'null' && selectedClass.section !== '') {
                    return sSection === selectedClass.section;
                }
                return !sSection;
            });

            if (!students || students.length === 0) {
                toast.error('No students found in this class.');
                setIsSubmitting(false);
                return;
            }

            // 3. Prepare inserts
            const inserts = students.map(s => ({
                student_id: s.id,
                school_id: schoolId,
                title: newItem.title,
                description: newItem.description,
                location: newItem.location,
                date: newItem.date,
                status: 'Pending'
            }));

            // 4. Bulk insert via API
            await api.bulkCreatePermissionSlips(inserts);

            setNewItem({ title: '', description: '', location: '', date: '', selectedClassId: '' });
            fetchRecentSlips();
            toast.success(`Permission slip sent to ${students.length} students.`);
        } catch (err) {
            console.error('Error issuing slips:', err);
            toast.error('Failed to issue slips. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const confirmDelete = (id: string) => {
        setSlipToDelete(id);
        setShowDeleteModal(true);
    };

    const handleDelete = async () => {
        if (slipToDelete === null) return;
        const id = slipToDelete;
        setShowDeleteModal(false);
        setSlipToDelete(null);

        if (!schoolId) return;
        try {
            await api.deletePermissionSlip(id);
            fetchRecentSlips();
            toast.success('Slip deleted.');
        } catch (err) {
            console.error('Failed to delete slip:', err);
            toast.error('Failed to delete slip.');
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
                            <motion.button
                                whileHover={{ scale: 1.01 }}
                                whileTap={{ scale: 0.99 }}
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full py-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-100 flex items-center justify-center space-x-2"
                            >
                                {isSubmitting ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        <span>Sending...</span>
                                    </>
                                ) : (
                                    <>
                                        <PlusIcon className="w-5 h-5" />
                                        <span>Issue to Entire Class</span>
                                    </>
                                )}
                            </motion.button>
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
                            <div className="flex-grow flex flex-col justify-center items-center py-20">
                                <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
                                <p className="mt-4 text-gray-400 font-medium">Loading records...</p>
                            </div>
                        ) : filteredSlips.length === 0 ? (
                            <motion.div 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex-grow flex flex-col justify-center items-center text-center py-12 px-6"
                            >
                                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                    <ClipboardListIcon className="w-10 h-10 text-gray-300" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-700">No slips found</h3>
                                <p className="text-gray-500 max-w-xs mt-2 text-sm">
                                    {searchTerm ? `No results for "${searchTerm}".` : "Track class excursions and events by issuing your first permission slip."}
                                </p>
                            </motion.div>
                        ) : (
                            <div className="overflow-hidden">
                                <table className="min-w-full text-left">
                                    <thead>
                                        <tr className="border-b border-gray-100 text-gray-400 text-[10px] uppercase tracking-wider">
                                            <th className="pb-4 px-2 font-bold">Student</th>
                                            <th className="pb-4 px-2 font-bold">Event & Location</th>
                                            <th className="pb-4 px-2 font-bold">Date</th>
                                            <th className="pb-4 px-2 font-bold">Status</th>
                                            <th className="pb-4 px-2 text-right font-bold">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-sm">
                                        <AnimatePresence mode="popLayout">
                                            {filteredSlips.map((slip, index) => (
                                                <motion.tr 
                                                    key={slip.id}
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, x: 20 }}
                                                    transition={{ delay: Math.min(index * 0.03, 0.3) }}
                                                    className="hover:bg-indigo-50/30 transition-colors group"
                                                >
                                                    <td className="py-4 px-2">
                                                        <div className="flex items-center">
                                                            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mr-3 font-bold text-xs ring-2 ring-white shadow-sm group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                                                {slip.students?.full_name?.charAt(0) || slip.students?.name?.charAt(0) || <UserIcon className="w-4 h-4" />}
                                                            </div>
                                                            <div>
                                                                <div className="font-bold text-gray-800 group-hover:text-indigo-900">{slip.students?.full_name || slip.students?.name}</div>
                                                                <div className="text-[10px] text-gray-400 font-medium uppercase tracking-tight">Class {slip.students?.grade}{slip.students?.section}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="py-4 px-2">
                                                        <div className="font-semibold text-gray-700">{slip.title}</div>
                                                        <div className="text-[11px] text-gray-400 flex items-center mt-0.5">
                                                            <ClockIcon className="w-3 h-3 mr-1" />
                                                            {slip.location}
                                                        </div>
                                                    </td>
                                                    <td className="py-4 px-2 text-gray-500 font-medium tabular-nums">
                                                        {new Date(slip.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                    </td>
                                                    <td className="py-4 px-2">
                                                        <span className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                                                            slip.status === 'Approved' ? 'bg-green-100 text-green-700 border border-green-200' :
                                                            slip.status === 'Rejected' ? 'bg-red-100 text-red-700 border border-red-200' :
                                                            'bg-amber-100 text-amber-700 border border-amber-200 animate-pulse'
                                                        }`}>
                                                            {slip.status}
                                                        </span>
                                                    </td>
                                                    <td className="py-4 px-2 text-right">
                                                        <button
                                                            onClick={() => confirmDelete(slip.id)}
                                                            className="p-2.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100 border border-transparent hover:border-red-100"
                                                            title="Delete Slip"
                                                        >
                                                            <TrashIcon className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                </motion.tr>
                                            ))}
                                        </AnimatePresence>
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <ConfirmationModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={handleDelete}
                title="Delete Permission Slip"
                message="Are you sure you want to delete this slip?"
                confirmText="Delete"
                isDanger
            />
        </div>
    );
};
export default ManagePermissionSlipsScreen;
