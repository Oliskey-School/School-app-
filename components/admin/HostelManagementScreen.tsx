import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';
import { useAutoSync } from '../../hooks/useAutoSync';
import {
    Building2,
    BedDouble,
    Users,
    ClipboardList,
    UserCheck,
    PlusIcon,
    Search,
    Edit2,
    Trash2,
    ChevronLeft,
    DoorOpen,
    Eye,
    Calendar,
    Clock,
    Phone,
    CheckCircle2,
    AlertCircle,
    XCircle
} from 'lucide-react';

type TabType = 'hostels' | 'rooms' | 'allocations' | 'visitors' | 'attendance';

interface Hostel {
    id: string;
    school_id: string;
    name: string;
    type: 'boys' | 'girls' | 'mixed';
    capacity: number;
    warden_name?: string;
    created_at: string;
}

interface HostelRoom {
    id: string;
    hostel_id: string;
    room_number: string;
    floor: number;
    bed_count: number;
    occupied_beds: number;
    status: 'available' | 'full' | 'maintenance';
    hostel?: { name: string };
}

interface Allocation {
    id: string;
    room_id: string;
    student_id: string;
    bed_number: number;
    academic_year: string;
    check_in_date: string;
    status: string;
    student?: { full_name: string; class?: string };
    room?: { room_number: string; hostel?: { name: string } };
}

interface VisitorLog {
    id: string;
    hostel_id: string;
    student_id: string;
    visitor_name: string;
    relationship: string;
    visit_date: string;
    check_in: string;
    check_out: string;
    purpose: string;
    student?: { full_name: string };
    hostel?: { name: string };
}

// ─── Stats Cards ─────────────────────────────────────────────────────────
const StatsCard = ({ icon: Icon, label, value, color }: { icon: any; label: string; value: string | number; color: string }) => (
    <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex items-center space-x-4">
        <div className={`p-3 rounded-2xl ${color}`}>
            <Icon className="w-6 h-6" />
        </div>
        <div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{label}</p>
        </div>
    </div>
);

// ─── Hostel Tab ──────────────────────────────────────────────────────────
const HostelTab = ({ hostels, onAdd, onDelete }: { hostels: Hostel[]; onAdd: () => void; onDelete: (id: string) => void }) => (
    <div className="space-y-6">
        <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-gray-700">All Hostels</h2>
            <button onClick={onAdd} className="flex items-center space-x-2 bg-indigo-600 text-white px-5 py-2.5 rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 font-bold">
                <PlusIcon className="w-5 h-5" />
                <span>Add Hostel</span>
            </button>
        </div>
        {hostels.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
                <Building2 className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                <p className="text-gray-400 font-medium">No hostels registered yet.</p>
                <p className="text-gray-300 text-sm mt-1">Add your first hostel to get started.</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {hostels.map(h => (
                    <div key={h.id} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-4 hover:shadow-md transition-shadow group">
                        <div className="flex justify-between items-start">
                            <div className={`p-3 rounded-2xl ${h.type === 'boys' ? 'bg-blue-50 text-blue-600' : h.type === 'girls' ? 'bg-pink-50 text-pink-600' : 'bg-purple-50 text-purple-600'}`}>
                                <Building2 className="w-6 h-6" />
                            </div>
                            <span className={`text-xs font-bold px-3 py-1 rounded-full capitalize ${h.type === 'boys' ? 'bg-blue-100 text-blue-700' : h.type === 'girls' ? 'bg-pink-100 text-pink-700' : 'bg-purple-100 text-purple-700'}`}>
                                {h.type}
                            </span>
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-gray-900">{h.name}</h3>
                            {h.warden_name && <p className="text-sm text-gray-500 mt-1">Warden: {h.warden_name}</p>}
                        </div>
                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-50">
                            <div>
                                <p className="text-[10px] uppercase font-bold text-gray-400">Capacity</p>
                                <p className="font-bold text-gray-700">{h.capacity} beds</p>
                            </div>
                            <div>
                                <p className="text-[10px] uppercase font-bold text-gray-400">Added</p>
                                <p className="font-bold text-gray-700">{new Date(h.created_at).toLocaleDateString()}</p>
                            </div>
                        </div>
                        <button
                            onClick={() => onDelete(h.id)}
                            className="w-full py-2 text-sm font-bold text-red-500 bg-red-50 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-100"
                        >
                            Delete Hostel
                        </button>
                    </div>
                ))}
            </div>
        )}
    </div>
);

// ─── Rooms Tab ───────────────────────────────────────────────────────────
const RoomTab = ({ rooms, onAdd, onDelete }: { rooms: HostelRoom[]; onAdd: () => void; onDelete: (id: string) => void }) => (
    <div className="space-y-6">
        <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-gray-700">Room Management</h2>
            <button onClick={onAdd} className="flex items-center space-x-2 bg-indigo-600 text-white px-5 py-2.5 rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 font-bold">
                <PlusIcon className="w-5 h-5" />
                <span>Add Room</span>
            </button>
        </div>
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-gray-50/50 border-b border-gray-100">
                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Room</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Hostel</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Floor</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Beds</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Status</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                    {rooms.length === 0 ? (
                        <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400">No rooms added yet.</td></tr>
                    ) : rooms.map(room => (
                        <tr key={room.id} className="hover:bg-gray-50/30 transition-colors">
                            <td className="px-6 py-5">
                                <div className="flex items-center space-x-3">
                                    <div className="p-2 bg-gray-100 rounded-xl"><DoorOpen className="w-4 h-4 text-gray-600" /></div>
                                    <span className="font-bold text-gray-800">{room.room_number}</span>
                                </div>
                            </td>
                            <td className="px-6 py-5 text-sm font-medium text-gray-600">{room.hostel?.name || '—'}</td>
                            <td className="px-6 py-5 text-sm font-medium text-gray-600">Floor {room.floor}</td>
                            <td className="px-6 py-5">
                                <span className="text-sm font-bold text-gray-700">{room.occupied_beds}/{room.bed_count}</span>
                            </td>
                            <td className="px-6 py-5">
                                <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                                    room.status === 'available' ? 'bg-green-100 text-green-700' :
                                    room.status === 'full' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                                }`}>{room.status}</span>
                            </td>
                            <td className="px-6 py-5">
                                <button onClick={() => onDelete(room.id)} className="p-2 hover:bg-red-50 rounded-xl text-gray-400 hover:text-red-500 transition-all">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
);

// ─── Visitors Tab ────────────────────────────────────────────────────────
const VisitorTab = ({ visitors, onAdd }: { visitors: VisitorLog[]; onAdd: () => void }) => (
    <div className="space-y-6">
        <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-gray-700">Visitor Log</h2>
            <button onClick={onAdd} className="flex items-center space-x-2 bg-indigo-600 text-white px-5 py-2.5 rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 font-bold">
                <PlusIcon className="w-5 h-5" />
                <span>Log Visit</span>
            </button>
        </div>
        {visitors.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
                <Users className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                <p className="text-gray-400 font-medium">No visitor records found.</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 gap-4">
                {visitors.map(v => (
                    <div key={v.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-start space-x-4 hover:shadow-md transition-shadow">
                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-full">
                            <Users className="w-6 h-6" />
                        </div>
                        <div className="flex-grow">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="font-bold text-gray-900">{v.visitor_name}</h3>
                                    <p className="text-sm text-gray-500">{v.relationship} of {v.student?.full_name || 'Unknown'}</p>
                                </div>
                                <span className="text-xs font-bold text-gray-400">{new Date(v.visit_date).toLocaleDateString()}</span>
                            </div>
                            <p className="text-sm text-gray-600 mt-2">{v.purpose}</p>
                            <div className="flex items-center space-x-4 mt-3">
                                <div className="flex items-center space-x-1 text-xs font-bold text-gray-500">
                                    <Clock className="w-3 h-3" />
                                    <span>In: {v.check_in || '—'}</span>
                                </div>
                                <div className="flex items-center space-x-1 text-xs font-bold text-gray-500">
                                    <Clock className="w-3 h-3" />
                                    <span>Out: {v.check_out || 'Still here'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        )}
    </div>
);

// ─── Main Component ──────────────────────────────────────────────────────
const HostelManagementScreen = () => {
    const { currentSchool } = useAuth();
    const [activeTab, setActiveTab] = useState<TabType>('hostels');
    const [loading, setLoading] = useState(true);
    const [hostels, setHostels] = useState<Hostel[]>([]);
    const [rooms, setRooms] = useState<HostelRoom[]>([]);
    const [allocations, setAllocations] = useState<Allocation[]>([]);
    const [visitors, setVisitors] = useState<VisitorLog[]>([]);
    const [isAdding, setIsAdding] = useState(false);
    const [formData, setFormData] = useState<any>({});

    useEffect(() => {
        fetchData();
    }, [activeTab, currentSchool]);

    useAutoSync(['hostels', 'hostel_rooms', 'hostel_allocations', 'hostel_visitors'], () => {
        console.log('🔄 [HostelManagement] Real-time auto-sync triggered');
        fetchData();
    });

    const fetchData = async () => {
        if (!currentSchool) return;
        try {
            setLoading(true);
            if (activeTab === 'hostels') {
                const data = await api.getHostels(currentSchool.id);
                setHostels(data);
            } else if (activeTab === 'rooms') {
                const data = await api.getHostelRooms();
                setRooms(data);
            } else if (activeTab === 'allocations') {
                const data = await api.getHostelAllocations(currentSchool.id);
                setAllocations(data);
            } else if (activeTab === 'visitors') {
                const data = await api.getHostelVisitorLogs(currentSchool.id);
                setVisitors(data);
            }
        } catch (err) {
            console.error('Error fetching hostel data:', err);
            toast.error('Failed to load hostel data');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!currentSchool) return;
        try {
            setLoading(true);
            const data = { ...formData, school_id: currentSchool.id };

            if (activeTab === 'hostels') {
                if (!formData.name) { toast.error('Hostel name is required'); setLoading(false); return; }
                await api.createHostel(data);
            } else if (activeTab === 'rooms') {
                if (!formData.room_number || !formData.hostel_id) { toast.error('Room number and hostel are required'); setLoading(false); return; }
                await api.createHostelRoom(data);
            } else if (activeTab === 'visitors') {
                if (!formData.visitor_name || !formData.student_id) { toast.error('Visitor name and student are required'); setLoading(false); return; }
                await api.createHostelVisitorLog(data);
            } else if (activeTab === 'allocations') {
                if (!formData.room_id || !formData.student_id) { toast.error('Room and student are required'); setLoading(false); return; }
                await api.createHostelAllocation(data);
            }

            toast.success('Record saved successfully');
            setIsAdding(false);
            setFormData({});
            fetchData();
        } catch (err: any) {
            console.error('Error saving:', err);
            toast.error(err.message || 'Failed to save');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (type: 'hostels' | 'rooms' | 'allocations', id: string) => {
        if (!window.confirm('Are you sure you want to delete this record?')) return;
        try {
            if (type === 'hostels') await api.deleteHostel(id);
            else if (type === 'rooms') await api.deleteHostelRoom(id);
            // Add other delete methods if needed
            toast.success('Deleted successfully');
            fetchData();
        } catch (err: any) {
            toast.error(err.message || 'Failed to delete');
        }
    };

    const totalBeds = rooms.reduce((sum, r) => sum + r.bed_count, 0);
    const occupiedBeds = rooms.reduce((sum, r) => sum + r.occupied_beds, 0);
    const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

    const tabs = [
        { key: 'hostels' as TabType, icon: Building2, label: 'Hostels' },
        { key: 'rooms' as TabType, icon: DoorOpen, label: 'Rooms' },
        { key: 'allocations' as TabType, icon: BedDouble, label: 'Allocations' },
        { key: 'visitors' as TabType, icon: Users, label: 'Visitors' },
        { key: 'attendance' as TabType, icon: UserCheck, label: 'Attendance' },
    ];

    // ─── Add Form (Modal) ────────────────────────────────────────────────
    const renderAddForm = () => (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-[2rem] p-8 max-w-lg w-full space-y-8 shadow-2xl">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 font-outfit">
                        {activeTab === 'hostels' ? 'Add Hostel' : activeTab === 'rooms' ? 'Add Room' : activeTab === 'visitors' ? 'Log Visitor' : 'Allocate Bed'}
                    </h2>
                    <p className="text-sm text-gray-500">Fill in the details below.</p>
                </div>
                <div className="space-y-6">
                    {activeTab === 'hostels' && (
                        <>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Hostel Name <span className="text-red-500">*</span></label>
                                <input type="text" placeholder="e.g., Unity Hall" className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-semibold" value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Type</label>
                                <select className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold" value={formData.type || 'mixed'} onChange={e => setFormData({ ...formData, type: e.target.value })}>
                                    <option value="boys">Boys</option>
                                    <option value="girls">Girls</option>
                                    <option value="mixed">Mixed</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Capacity (beds)</label>
                                <input type="number" className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold" value={formData.capacity || ''} onChange={e => setFormData({ ...formData, capacity: parseInt(e.target.value) || 0 })} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Warden Name</label>
                                <input type="text" placeholder="Optional" className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-semibold" value={formData.warden_name || ''} onChange={e => setFormData({ ...formData, warden_name: e.target.value })} />
                            </div>
                        </>
                    )}
                    {activeTab === 'rooms' && (
                        <>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Room Number <span className="text-red-500">*</span></label>
                                <input type="text" placeholder="e.g., UH-101" className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-semibold" value={formData.room_number || ''} onChange={e => setFormData({ ...formData, room_number: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Hostel <span className="text-red-500">*</span></label>
                                <select className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold" value={formData.hostel_id || ''} onChange={e => setFormData({ ...formData, hostel_id: e.target.value })}>
                                    <option value="">Select Hostel</option>
                                    {hostels.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Floor</label>
                                    <input type="number" className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold" value={formData.floor || 1} onChange={e => setFormData({ ...formData, floor: parseInt(e.target.value) || 1 })} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Bed Count</label>
                                    <input type="number" className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold" value={formData.bed_count || 4} onChange={e => setFormData({ ...formData, bed_count: parseInt(e.target.value) || 4 })} />
                                </div>
                            </div>
                        </>
                    )}
                    {activeTab === 'visitors' && (
                        <>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Visitor Name <span className="text-red-500">*</span></label>
                                <input type="text" className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-semibold" value={formData.visitor_name || ''} onChange={e => setFormData({ ...formData, visitor_name: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Relationship</label>
                                <select className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold" value={formData.relationship || ''} onChange={e => setFormData({ ...formData, relationship: e.target.value })}>
                                    <option value="">Select</option>
                                    <option value="Mother">Mother</option>
                                    <option value="Father">Father</option>
                                    <option value="Guardian">Guardian</option>
                                    <option value="Sibling">Sibling</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Purpose</label>
                                <textarea placeholder="Reason for visit..." rows={2} className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium" value={formData.purpose || ''} onChange={e => setFormData({ ...formData, purpose: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Check-In</label>
                                    <input type="time" className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold" value={formData.check_in || ''} onChange={e => setFormData({ ...formData, check_in: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Check-Out</label>
                                    <input type="time" className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold" value={formData.check_out || ''} onChange={e => setFormData({ ...formData, check_out: e.target.value })} />
                                </div>
                            </div>
                        </>
                    )}
                </div>
                <div className="flex space-x-4">
                    <button onClick={() => { setIsAdding(false); setFormData({}); }} className="flex-grow py-4 px-6 border border-gray-100 rounded-2xl text-gray-600 font-bold hover:bg-gray-50 transition-all active:scale-95">Cancel</button>
                    <button onClick={handleSave} className="flex-grow py-4 px-6 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 active:scale-95" disabled={loading}>{loading ? 'Saving...' : 'Confirm'}</button>
                </div>
            </div>
        </div>
    );

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 font-outfit">Hostel & Boarding</h1>
                    <div className="flex items-center space-x-2 text-gray-500 text-sm mt-1">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        <span>Manage hostels, rooms, allocations, and visitor logs.</span>
                    </div>
                </div>

                {/* Tab Switcher */}
                <div className="flex p-1.5 bg-gray-100 rounded-2xl overflow-x-auto">
                    {tabs.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all font-bold whitespace-nowrap ${
                                activeTab === tab.key ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            <tab.icon className="w-4 h-4" />
                            <span className="text-sm">{tab.label}</span>
                        </button>
                    ))}
                </div>
            </header>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatsCard icon={Building2} label="Total Hostels" value={hostels.length} color="bg-indigo-50 text-indigo-600" />
                <StatsCard icon={DoorOpen} label="Total Rooms" value={rooms.length} color="bg-blue-50 text-blue-600" />
                <StatsCard icon={BedDouble} label="Beds Occupied" value={`${occupiedBeds}/${totalBeds}`} color="bg-emerald-50 text-emerald-600" />
                <StatsCard icon={UserCheck} label="Occupancy" value={`${occupancyRate}%`} color="bg-amber-50 text-amber-600" />
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-40 space-y-4">
                    <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-gray-400 font-medium animate-pulse">Loading hostel data...</p>
                </div>
            ) : (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {activeTab === 'hostels' && <HostelTab hostels={hostels} onAdd={() => setIsAdding(true)} onDelete={(id) => handleDelete('hostels', id)} />}
                    {activeTab === 'rooms' && <RoomTab rooms={rooms} onAdd={() => setIsAdding(true)} onDelete={(id) => handleDelete('rooms', id)} />}
                    {activeTab === 'allocations' && (
                        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
                            <BedDouble className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                            <p className="text-gray-400 font-medium">Bed allocations will show assigned students here.</p>
                            <button onClick={() => { setActiveTab('rooms'); }} className="mt-4 text-indigo-600 font-bold text-sm hover:underline">Go to Rooms to allocate beds →</button>
                        </div>
                    )}
                    {activeTab === 'visitors' && <VisitorTab visitors={visitors} onAdd={() => setIsAdding(true)} />}
                    {activeTab === 'attendance' && (
                        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
                            <UserCheck className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                            <p className="text-gray-400 font-medium">Hostel attendance tracking — mark boarders present/absent at lights-out.</p>
                            <p className="text-gray-300 text-sm mt-2">Coming soon: Integrates with school attendance system.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Add Modal */}
            {isAdding && renderAddForm()}
        </div>
    );
};

export default HostelManagementScreen;

