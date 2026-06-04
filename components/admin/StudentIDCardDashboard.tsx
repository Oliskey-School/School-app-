
import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Student } from '../../types';
import IDCardGenerator from '../shared/IDCardGenerator';
import { CreditCard, Search, Filter, Download, CheckCircle, Clock, AlertTriangle, Users, ChevronRight, X } from 'lucide-react';
import { toast } from 'react-hot-toast';

const StudentIDCardDashboard: React.FC = () => {
    const [stats, setStats] = useState({
        totalStudents: 0,
        cardsIssued: 0,
        cardsPrinted: 0,
        expiringSoon: 0
    });
    const [students, setStudents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [showGenerator, setShowGenerator] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [statsData, studentsData] = await Promise.all([
                api.getIDCardStats(),
                api.getStudents()
            ]);
            setStats(statsData);
            setStudents(studentsData);
        } catch (error) {
            console.error('Error fetching ID card data:', error);
            toast.error('Failed to load dashboard data');
        } finally {
            setLoading(false);
        }
    };

    const filteredStudents = students.filter(student => {
        const matchesSearch = student.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (student.school_generated_id || '').toLowerCase().includes(searchQuery.toLowerCase());
        
        // Simple status logic for now since we don't have full backend status yet
        // In a real app, this would come from the IDCard table
        return matchesSearch;
    });

    const handleIssueCard = (student: Student) => {
        setSelectedStudent(student);
        setShowGenerator(true);
    };

    return (
        <div className="space-y-6 p-6 bg-gray-50 min-h-screen">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Student ID Card Dashboard</h1>
                    <p className="text-gray-500">Manage, issue and track official school identity cards</p>
                </div>
                <div className="flex items-center space-x-3">
                    <button 
                        onClick={fetchData}
                        className="p-2 bg-white rounded-xl shadow-sm border border-gray-200 hover:bg-gray-50 transition-colors"
                    >
                        <Clock className="w-5 h-5 text-gray-600" />
                    </button>
                    <button className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-xl shadow-md hover:bg-indigo-700 transition-all font-bold uppercase tracking-wider text-xs">
                        <Download className="w-4 h-4" />
                        <span>Bulk Export</span>
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard 
                    title="Total Students" 
                    value={stats.totalStudents} 
                    icon={<Users className="w-6 h-6 text-blue-600" />} 
                    color="bg-blue-50"
                    trend="+2% from last month"
                />
                <StatCard 
                    title="Cards Issued" 
                    value={stats.cardsIssued} 
                    icon={<CheckCircle className="w-6 h-6 text-green-600" />} 
                    color="bg-green-50"
                    trend="85% coverage"
                />
                <StatCard 
                    title="Printed Cards" 
                    value={stats.cardsPrinted} 
                    icon={<CreditCard className="w-6 h-6 text-purple-600" />} 
                    color="bg-purple-50"
                    trend="Ready for collection"
                />
                <StatCard 
                    title="Expiring Soon" 
                    value={stats.expiringSoon} 
                    icon={<AlertTriangle className="w-6 h-6 text-orange-600" />} 
                    color="bg-orange-50"
                    trend="Next 30 days"
                />
            </div>

            {/* Filters & Search */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input 
                        type="text" 
                        placeholder="Search by name or student ID..."
                        className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="flex items-center space-x-3 w-full md:w-auto">
                    <div className="flex items-center space-x-2 bg-gray-100 p-1 rounded-xl">
                        <button 
                            onClick={() => setFilterStatus('all')}
                            className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${filterStatus === 'all' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500'}`}
                        >
                            All
                        </button>
                        <button 
                            onClick={() => setFilterStatus('active')}
                            className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${filterStatus === 'active' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500'}`}
                        >
                            Active
                        </button>
                        <button 
                            onClick={() => setFilterStatus('pending')}
                            className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${filterStatus === 'pending' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500'}`}
                        >
                            Pending
                        </button>
                    </div>
                    <button className="p-2 bg-gray-100 rounded-xl text-gray-600 hover:bg-gray-200 transition-colors">
                        <Filter className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Student List */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-widest">Student</th>
                                <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-widest">ID Number</th>
                                <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-widest">Class</th>
                                <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-widest">Status</th>
                                <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                Array(5).fill(0).map((_, i) => <SkeletonRow key={i} />)
                            ) : filteredStudents.length > 0 ? (
                                filteredStudents.map((student) => (
                                    <tr key={student.id} className="hover:bg-gray-50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center space-x-3">
                                                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center overflow-hidden border-2 border-white shadow-sm">
                                                    {student.avatar_url ? (
                                                        <img src={student.avatar_url} alt={`${student.full_name || 'Student'} photo`} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span className="text-indigo-600 font-bold">{student.full_name.charAt(0)}</span>
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-900">{student.full_name}</p>
                                                    <p className="text-xs text-gray-500">{student.email || 'No email provided'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="font-mono text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded-lg">
                                                {student.school_generated_id || 'NOT_ASSIGNED'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm font-medium text-gray-700">
                                                Grade {student.grade}{student.section}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                                student.status === 'Active' 
                                                ? 'bg-green-100 text-green-700' 
                                                : 'bg-yellow-100 text-yellow-700'
                                            }`}>
                                                {student.status || 'Pending'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button 
                                                onClick={() => handleIssueCard(student)}
                                                className="inline-flex items-center space-x-2 text-indigo-600 hover:text-indigo-800 font-bold text-sm group-hover:translate-x-1 transition-all"
                                            >
                                                <span>Issue ID Card</span>
                                                <ChevronRight className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                        <div className="flex flex-col items-center">
                                            <CreditCard className="w-12 h-12 text-gray-300 mb-3" />
                                            <p className="text-lg font-bold">No students found</p>
                                            <p className="text-sm">Try adjusting your search or filters</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ID Generator Modal */}
            {showGenerator && selectedStudent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in duration-300">
                        <div className="flex items-center justify-between p-8 border-b border-gray-100">
                            <div>
                                <h2 className="text-2xl font-black text-gray-900 uppercase">Generate Student ID</h2>
                                <p className="text-gray-500">Preview and download identity card for {selectedStudent.full_name}</p>
                            </div>
                            <button 
                                onClick={() => setShowGenerator(false)}
                                className="p-3 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
                            >
                                <X className="w-6 h-6 text-gray-600" />
                            </button>
                        </div>
                        <div className="p-8 max-h-[70vh] overflow-y-auto">
                            <IDCardGenerator 
                                user={{
                                    ...selectedStudent,
                                    name: selectedStudent.full_name,
                                    avatarUrl: selectedStudent.avatar_url
                                }} 
                                userType="student" 
                            />
                        </div>
                        <div className="p-8 bg-gray-50 border-t border-gray-100 flex justify-end">
                            <button 
                                onClick={() => setShowGenerator(false)}
                                className="px-8 py-3 bg-white border border-gray-200 text-gray-700 rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-gray-100 transition-all"
                            >
                                Close Preview
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const StatCard: React.FC<{ title: string; value: number | string; icon: React.ReactNode; color: string; trend: string }> = ({ title, value, icon, color, trend }) => (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between mb-4">
            <div className={`p-3 rounded-2xl ${color}`}>
                {icon}
            </div>
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{trend}</span>
        </div>
        <div>
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-1">{title}</h3>
            <p className="text-3xl font-black text-gray-900">{value}</p>
        </div>
    </div>
);

const SkeletonRow = () => (
    <tr className="animate-pulse">
        <td className="px-6 py-4">
            <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full" />
                <div className="space-y-2">
                    <div className="h-4 w-32 bg-gray-200 rounded" />
                    <div className="h-3 w-24 bg-gray-100 rounded" />
                </div>
            </div>
        </td>
        <td className="px-6 py-4"><div className="h-4 w-20 bg-gray-100 rounded" /></td>
        <td className="px-6 py-4"><div className="h-4 w-16 bg-gray-100 rounded" /></td>
        <td className="px-6 py-4"><div className="h-6 w-20 bg-gray-100 rounded-full" /></td>
        <td className="px-6 py-4 text-right"><div className="h-4 w-24 bg-gray-100 rounded ml-auto" /></td>
    </tr>
);

export default StudentIDCardDashboard;
