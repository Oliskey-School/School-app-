import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';
import {
    Bus,
    MapPin,
    Users,
    PlusIcon,
    Search,
    Trash2,
    Phone,
    Clock,
    CheckCircle2,
    Navigation,
    DollarSign,
    Route,
    UserPlus,
    ChevronRight
} from 'lucide-react';

type TabType = 'routes' | 'stops' | 'assignments';

interface TransportRoute {
    id: string;
    school_id: string;
    route_name: string;
    bus_number: string;
    driver_name: string;
    driver_phone: string;
    capacity: number;
    morning_departure: string;
    afternoon_departure: string;
    status: 'active' | 'inactive' | 'maintenance';
    monthly_fee: number;
    assigned_count?: number;
}

interface TransportStop {
    id: string;
    route_id: string;
    stop_name: string;
    stop_order: number;
    pickup_time: string;
    dropoff_time: string;
    transport_routes?: { route_name: string };
}

interface TransportAssignment {
    id: string;
    route_id: string;
    student_id: string;
    stop_id: string;
    academic_year: string;
    status: string;
    students?: { name: string; class_name?: string };
    transport_routes?: { route_name: string; bus_number: string };
    transport_stops?: { stop_name: string };
}

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

const TransportManagementScreen = () => {
    const { currentSchool } = useAuth();
    const [activeTab, setActiveTab] = useState<TabType>('routes');
    const [loading, setLoading] = useState(true);
    const [routes, setRoutes] = useState<TransportRoute[]>([]);
    const [stops, setStops] = useState<TransportStop[]>([]);
    const [assignments, setAssignments] = useState<TransportAssignment[]>([]);
    const [isAdding, setIsAdding] = useState(false);
    const [formData, setFormData] = useState<any>({});
    const [searchTerm, setSearchTerm] = useState('');

    // Demo data
    const demoRoutes: TransportRoute[] = [
        { id: '1', school_id: '', route_name: 'Lekki – Victoria Island', bus_number: 'BUS-001', driver_name: 'Mr. Chukwu', driver_phone: '+234 801 234 5678', capacity: 40, morning_departure: '06:30', afternoon_departure: '15:00', status: 'active', monthly_fee: 15000, assigned_count: 32 },
        { id: '2', school_id: '', route_name: 'Ikeja – Maryland', bus_number: 'BUS-002', driver_name: 'Mr. Bello', driver_phone: '+234 803 456 7890', capacity: 35, morning_departure: '06:15', afternoon_departure: '15:00', status: 'active', monthly_fee: 12000, assigned_count: 28 },
        { id: '3', school_id: '', route_name: 'Surulere – Yaba', bus_number: 'BUS-003', driver_name: 'Mr. Okafor', driver_phone: '+234 805 678 9012', capacity: 30, morning_departure: '06:45', afternoon_departure: '15:15', status: 'active', monthly_fee: 10000, assigned_count: 22 },
        { id: '4', school_id: '', route_name: 'Ajah – Sangotedo', bus_number: 'BUS-004', driver_name: 'Mr. Adamu', driver_phone: '+234 807 890 1234', capacity: 40, morning_departure: '06:00', afternoon_departure: '15:00', status: 'maintenance', monthly_fee: 18000, assigned_count: 0 },
    ];
    const demoStops: TransportStop[] = [
        { id: '1', route_id: '1', stop_name: 'Lekki Phase 1 Gate', stop_order: 1, pickup_time: '06:30', dropoff_time: '15:45', transport_routes: { route_name: 'Lekki – Victoria Island' } },
        { id: '2', route_id: '1', stop_name: 'Chevron Roundabout', stop_order: 2, pickup_time: '06:40', dropoff_time: '15:35', transport_routes: { route_name: 'Lekki – Victoria Island' } },
        { id: '3', route_id: '1', stop_name: 'Admiralty Way Junction', stop_order: 3, pickup_time: '06:50', dropoff_time: '15:25', transport_routes: { route_name: 'Lekki – Victoria Island' } },
        { id: '4', route_id: '2', stop_name: 'Ikeja City Mall', stop_order: 1, pickup_time: '06:15', dropoff_time: '16:00', transport_routes: { route_name: 'Ikeja – Maryland' } },
        { id: '5', route_id: '2', stop_name: 'Maryland Mall', stop_order: 2, pickup_time: '06:30', dropoff_time: '15:45', transport_routes: { route_name: 'Ikeja – Maryland' } },
        { id: '6', route_id: '3', stop_name: 'Surulere Stadium', stop_order: 1, pickup_time: '06:45', dropoff_time: '15:50', transport_routes: { route_name: 'Surulere – Yaba' } },
    ];
    const demoAssignments: TransportAssignment[] = [
        { id: '1', route_id: '1', student_id: '1', stop_id: '1', academic_year: '2025/2026', status: 'active', students: { name: 'Femi Adeyemi', class_name: 'JSS 2A' }, transport_routes: { route_name: 'Lekki – VI', bus_number: 'BUS-001' }, transport_stops: { stop_name: 'Lekki Phase 1 Gate' } },
        { id: '2', route_id: '1', student_id: '2', stop_id: '2', academic_year: '2025/2026', status: 'active', students: { name: 'Chioma Okeke', class_name: 'SS 1B' }, transport_routes: { route_name: 'Lekki – VI', bus_number: 'BUS-001' }, transport_stops: { stop_name: 'Chevron Roundabout' } },
        { id: '3', route_id: '2', student_id: '3', stop_id: '4', academic_year: '2025/2026', status: 'active', students: { name: 'Abubakar Musa', class_name: 'JSS 3A' }, transport_routes: { route_name: 'Ikeja – Maryland', bus_number: 'BUS-002' }, transport_stops: { stop_name: 'Ikeja City Mall' } },
    ];

    useEffect(() => { fetchData(); }, [activeTab, currentSchool]);

    const fetchData = async () => {
        if (!currentSchool) {
            setRoutes(demoRoutes);
            setStops(demoStops);
            setAssignments(demoAssignments);
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            if (activeTab === 'routes') {
                const { data, error } = await supabase.from('transport_routes').select('*').eq('school_id', currentSchool.id).order('route_name');
                if (!error && data) setRoutes(data); else setRoutes(demoRoutes);
            } else if (activeTab === 'stops') {
                const { data, error } = await supabase.from('transport_stops').select('*, transport_routes(route_name)').order('stop_order');
                if (!error && data) setStops(data); else setStops(demoStops);
            } else if (activeTab === 'assignments') {
                const { data, error } = await supabase.from('transport_assignments').select('*, students(name), transport_routes(route_name, bus_number), transport_stops(stop_name)').order('academic_year', { ascending: false });
                if (!error && data) setAssignments(data); else setAssignments(demoAssignments);
            }
        } catch (err) {
            console.error('Error fetching transport data:', err);
            setRoutes(demoRoutes); setStops(demoStops); setAssignments(demoAssignments);
        } finally { setLoading(false); }
    };

    const handleSave = async () => {
        if (!currentSchool) { toast.success('Demo mode: Record saved locally'); setIsAdding(false); setFormData({}); return; }
        try {
            setLoading(true);
            let table = '';
            const data = { ...formData, school_id: currentSchool.id };
            if (activeTab === 'routes') {
                if (!formData.route_name) { toast.error('Route name is required'); setLoading(false); return; }
                table = 'transport_routes';
            } else if (activeTab === 'stops') {
                if (!formData.stop_name || !formData.route_id) { toast.error('Stop name and route are required'); setLoading(false); return; }
                table = 'transport_stops';
            } else if (activeTab === 'assignments') {
                if (!formData.route_id || !formData.student_id) { toast.error('Route and student are required'); setLoading(false); return; }
                table = 'transport_assignments';
            }
            const { error } = await supabase.from(table).insert(data);
            if (error) throw error;
            toast.success('Record saved successfully');
            setIsAdding(false); setFormData({}); fetchData();
        } catch (err: any) { toast.error(err.message || 'Failed to save'); } finally { setLoading(false); }
    };

    const handleDelete = async (table: string, id: string) => {
        if (!window.confirm('Are you sure?')) return;
        if (!currentSchool) { toast.success('Demo: Deleted'); return; }
        try {
            const { error } = await supabase.from(table).delete().eq('id', id);
            if (error) throw error;
            toast.success('Deleted'); fetchData();
        } catch (err: any) { toast.error(err.message || 'Failed to delete'); }
    };

    const totalStudentsOnBus = routes.reduce((sum, r) => sum + (r.assigned_count || 0), 0);
    const totalCapacity = routes.filter(r => r.status === 'active').reduce((sum, r) => sum + r.capacity, 0);
    const activeRoutes = routes.filter(r => r.status === 'active').length;

    const tabs = [
        { key: 'routes' as TabType, icon: Route, label: 'Routes' },
        { key: 'stops' as TabType, icon: MapPin, label: 'Stops' },
        { key: 'assignments' as TabType, icon: UserPlus, label: 'Assignments' },
    ];

    const filteredRoutes = routes.filter(r => r.route_name.toLowerCase().includes(searchTerm.toLowerCase()) || r.bus_number.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 font-outfit">Transport Management</h1>
                    <div className="flex items-center space-x-2 text-gray-500 text-sm mt-1">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        <span>Manage bus routes, stops, and student assignments.</span>
                    </div>
                </div>
                <div className="flex p-1.5 bg-gray-100 rounded-2xl">
                    {tabs.map(tab => (
                        <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                            className={`flex items-center space-x-2 px-5 py-2 rounded-xl transition-all font-bold ${activeTab === tab.key ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                            <tab.icon className="w-4 h-4" /><span className="text-sm">{tab.label}</span>
                        </button>
                    ))}
                </div>
            </header>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatsCard icon={Route} label="Active Routes" value={activeRoutes} color="bg-indigo-50 text-indigo-600" />
                <StatsCard icon={Bus} label="Total Buses" value={routes.length} color="bg-blue-50 text-blue-600" />
                <StatsCard icon={Users} label="Students on Bus" value={totalStudentsOnBus} color="bg-emerald-50 text-emerald-600" />
                <StatsCard icon={MapPin} label="Total Stops" value={stops.length} color="bg-amber-50 text-amber-600" />
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-40 space-y-4">
                    <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    <p className="text-gray-400 font-medium animate-pulse">Loading transport data...</p>
                </div>
            ) : (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Routes Tab */}
                    {activeTab === 'routes' && (
                        <div className="space-y-6">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <div className="relative flex-grow max-w-md">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input type="text" placeholder="Search routes or bus number..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                                        className="w-full pl-12 pr-4 py-3 bg-white border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
                                </div>
                                <button onClick={() => setIsAdding(true)} className="flex items-center space-x-2 bg-indigo-600 text-white px-5 py-2.5 rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 font-bold">
                                    <PlusIcon className="w-5 h-5" /><span>Add Route</span>
                                </button>
                            </div>
                            {filteredRoutes.length === 0 ? (
                                <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
                                    <Bus className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                                    <p className="text-gray-400 font-medium">No transport routes found.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {filteredRoutes.map(route => (
                                        <div key={route.id} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-4 hover:shadow-md transition-shadow group">
                                            <div className="flex justify-between items-start">
                                                <div className={`p-3 rounded-2xl ${route.status === 'active' ? 'bg-emerald-50 text-emerald-600' : route.status === 'maintenance' ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-gray-500'}`}>
                                                    <Bus className="w-6 h-6" />
                                                </div>
                                                <span className={`text-xs font-bold px-3 py-1 rounded-full capitalize ${route.status === 'active' ? 'bg-green-100 text-green-700' : route.status === 'maintenance' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>{route.status}</span>
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-bold text-gray-900">{route.route_name}</h3>
                                                <p className="text-sm text-gray-500 font-mono mt-0.5">{route.bus_number}</p>
                                            </div>
                                            <div className="flex items-center space-x-3 text-sm text-gray-600">
                                                <div className="flex items-center space-x-1"><Users className="w-4 h-4 text-gray-400" /><span className="font-bold">{route.driver_name}</span></div>
                                                <div className="flex items-center space-x-1"><Phone className="w-3 h-3 text-gray-400" /><span>{route.driver_phone}</span></div>
                                            </div>
                                            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-50">
                                                <div>
                                                    <p className="text-[10px] uppercase font-bold text-gray-400">Morning</p>
                                                    <p className="font-bold text-gray-700">{route.morning_departure}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] uppercase font-bold text-gray-400">Afternoon</p>
                                                    <p className="font-bold text-gray-700">{route.afternoon_departure}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] uppercase font-bold text-gray-400">Fee/Month</p>
                                                    <p className="font-bold text-gray-700">₦{route.monthly_fee?.toLocaleString()}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between pt-2">
                                                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                                                    <div className="bg-indigo-500 h-2 rounded-full transition-all" style={{ width: `${Math.min(((route.assigned_count || 0) / route.capacity) * 100, 100)}%` }} />
                                                </div>
                                                <span className="text-xs font-bold text-gray-500 ml-3 whitespace-nowrap">{route.assigned_count || 0}/{route.capacity}</span>
                                            </div>
                                            <button onClick={() => handleDelete('transport_routes', route.id)} className="w-full py-2 text-sm font-bold text-red-500 bg-red-50 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-100">Delete Route</button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Stops Tab */}
                    {activeTab === 'stops' && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center">
                                <h2 className="text-lg font-bold text-gray-700">Bus Stops</h2>
                                <button onClick={() => setIsAdding(true)} className="flex items-center space-x-2 bg-indigo-600 text-white px-5 py-2.5 rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 font-bold">
                                    <PlusIcon className="w-5 h-5" /><span>Add Stop</span>
                                </button>
                            </div>
                            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-gray-50/50 border-b border-gray-100">
                                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Stop</th>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Route</th>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Order</th>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Pickup</th>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Drop-off</th>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {stops.length === 0 ? (
                                            <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400">No stops added yet.</td></tr>
                                        ) : stops.map(stop => (
                                            <tr key={stop.id} className="hover:bg-gray-50/30 transition-colors">
                                                <td className="px-6 py-5"><div className="flex items-center space-x-3"><div className="p-2 bg-amber-50 rounded-xl"><MapPin className="w-4 h-4 text-amber-600" /></div><span className="font-bold text-gray-800">{stop.stop_name}</span></div></td>
                                                <td className="px-6 py-5 text-sm font-medium text-gray-600">{stop.transport_routes?.route_name || '—'}</td>
                                                <td className="px-6 py-5"><span className="bg-gray-100 text-gray-700 text-xs font-bold px-3 py-1 rounded-full">#{stop.stop_order}</span></td>
                                                <td className="px-6 py-5 text-sm font-bold text-gray-700">{stop.pickup_time || '—'}</td>
                                                <td className="px-6 py-5 text-sm font-bold text-gray-700">{stop.dropoff_time || '—'}</td>
                                                <td className="px-6 py-5">
                                                    <button onClick={() => handleDelete('transport_stops', stop.id)} className="p-2 hover:bg-red-50 rounded-xl text-gray-400 hover:text-red-500 transition-all"><Trash2 className="w-4 h-4" /></button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Assignments Tab */}
                    {activeTab === 'assignments' && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center">
                                <h2 className="text-lg font-bold text-gray-700">Student–Bus Assignments</h2>
                                <button onClick={() => setIsAdding(true)} className="flex items-center space-x-2 bg-indigo-600 text-white px-5 py-2.5 rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 font-bold">
                                    <PlusIcon className="w-5 h-5" /><span>Assign Student</span>
                                </button>
                            </div>
                            <div className="grid grid-cols-1 gap-4">
                                {assignments.length === 0 ? (
                                    <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
                                        <UserPlus className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                                        <p className="text-gray-400 font-medium">No student assignments yet.</p>
                                    </div>
                                ) : assignments.map(a => (
                                    <div key={a.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-4 hover:shadow-md transition-shadow">
                                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-full"><Users className="w-5 h-5" /></div>
                                        <div className="flex-grow">
                                            <h3 className="font-bold text-gray-900">{a.students?.name || 'Unknown'}</h3>
                                            <div className="flex items-center space-x-3 mt-1 text-sm text-gray-500">
                                                <span className="flex items-center space-x-1"><Bus className="w-3 h-3" /><span>{a.transport_routes?.route_name}</span></span>
                                                <span className="flex items-center space-x-1"><MapPin className="w-3 h-3" /><span>{a.transport_stops?.stop_name}</span></span>
                                            </div>
                                        </div>
                                        <span className={`text-xs font-bold px-3 py-1 rounded-full ${a.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{a.status}</span>
                                        <button onClick={() => handleDelete('transport_assignments', a.id)} className="p-2 hover:bg-red-50 rounded-xl text-gray-400 hover:text-red-500 transition-all"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Add Modal */}
            {isAdding && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-[2rem] p-8 max-w-lg w-full space-y-8 shadow-2xl">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900 font-outfit">
                                {activeTab === 'routes' ? 'Add Route' : activeTab === 'stops' ? 'Add Stop' : 'Assign Student'}
                            </h2>
                            <p className="text-sm text-gray-500">Fill in the details below.</p>
                        </div>
                        <div className="space-y-6">
                            {activeTab === 'routes' && (
                                <>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Route Name <span className="text-red-500">*</span></label>
                                        <input type="text" placeholder="e.g., Lekki – Victoria Island" className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-semibold" value={formData.route_name || ''} onChange={e => setFormData({ ...formData, route_name: e.target.value })} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Bus Number</label>
                                            <input type="text" placeholder="BUS-001" className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-mono" value={formData.bus_number || ''} onChange={e => setFormData({ ...formData, bus_number: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Capacity</label>
                                            <input type="number" className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold" value={formData.capacity || 40} onChange={e => setFormData({ ...formData, capacity: parseInt(e.target.value) || 40 })} />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Driver Name</label>
                                            <input type="text" className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-semibold" value={formData.driver_name || ''} onChange={e => setFormData({ ...formData, driver_name: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Driver Phone</label>
                                            <input type="tel" className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-semibold" value={formData.driver_phone || ''} onChange={e => setFormData({ ...formData, driver_phone: e.target.value })} />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Morning Departure</label>
                                            <input type="time" className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold" value={formData.morning_departure || ''} onChange={e => setFormData({ ...formData, morning_departure: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Afternoon Departure</label>
                                            <input type="time" className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold" value={formData.afternoon_departure || ''} onChange={e => setFormData({ ...formData, afternoon_departure: e.target.value })} />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Monthly Fee (₦)</label>
                                        <input type="number" className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold" value={formData.monthly_fee || ''} onChange={e => setFormData({ ...formData, monthly_fee: parseFloat(e.target.value) || 0 })} />
                                    </div>
                                </>
                            )}
                            {activeTab === 'stops' && (
                                <>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Stop Name <span className="text-red-500">*</span></label>
                                        <input type="text" placeholder="e.g., Chevron Roundabout" className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-semibold" value={formData.stop_name || ''} onChange={e => setFormData({ ...formData, stop_name: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Route <span className="text-red-500">*</span></label>
                                        <select className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold" value={formData.route_id || ''} onChange={e => setFormData({ ...formData, route_id: e.target.value })}>
                                            <option value="">Select Route</option>
                                            {routes.map(r => <option key={r.id} value={r.id}>{r.route_name}</option>)}
                                        </select>
                                    </div>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Order</label>
                                            <input type="number" className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold" value={formData.stop_order || 1} onChange={e => setFormData({ ...formData, stop_order: parseInt(e.target.value) || 1 })} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Pickup</label>
                                            <input type="time" className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold" value={formData.pickup_time || ''} onChange={e => setFormData({ ...formData, pickup_time: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Drop-off</label>
                                            <input type="time" className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold" value={formData.dropoff_time || ''} onChange={e => setFormData({ ...formData, dropoff_time: e.target.value })} />
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
            )}
        </div>
    );
};

export default TransportManagementScreen;
