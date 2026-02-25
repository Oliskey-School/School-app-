import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
    PlusIcon,
    SearchIcon,
    FilterIcon,
    EditIcon,
    TrashIcon,
    AlertCircle,
    Calendar,
    Wrench,
    HardDrive,
    Shield
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface Equipment {
    id: number;
    name: string;
    category: 'Computer' | 'Science Kit' | 'Fire Safety' | 'Furniture' | 'First Aid' | 'Electrical' | 'Other';
    serial_number: string;
    condition: 'New' | 'Good' | 'Fair' | 'Poor' | 'Needs Replacement';
    purchase_date: string;
    next_service_date: string;
    facility_id: number | null;
    facility_registers?: { name: string };
}

const EquipmentInventoryScreen = () => {
    const [equipment, setEquipment] = useState<Equipment[]>([]);
    const [facilities, setFacilities] = useState<{ id: number, name: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('All');
    const [isAdding, setIsAdding] = useState(false);
    const { currentSchool } = useAuth();

    const [newEquipment, setNewEquipment] = useState<Partial<Equipment>>({
        name: '',
        category: 'Other',
        condition: 'Good',
        facility_id: null
    });

    useEffect(() => {
        if (!currentSchool) return;
        fetchData();
    }, [currentSchool]);

    const fetchData = async () => {
        if (!currentSchool) return;
        setLoading(true);
        const { data: equipData } = await supabase
            .from('equipment_tracking')
            .select('*, facility_registers(name)')
            .eq('school_id', currentSchool.id)
            .order('name');

        const { data: facData } = await supabase
            .from('facility_registers')
            .select('id, name')
            .eq('school_id', currentSchool.id);

        if (equipData) setEquipment(equipData);
        if (facData) setFacilities(facData);
        setLoading(false);
    };

    const handleAdd = async () => {
        if (!newEquipment.name || !currentSchool) return;
        const { error } = await supabase.from('equipment_tracking').insert([{ ...newEquipment, school_id: currentSchool.id }]);
        if (!error) {
            setIsAdding(false);
            setNewEquipment({ name: '', category: 'Other', condition: 'Good', facility_id: null });
            fetchData();
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('Delete this item?') || !currentSchool) return;
        const { error } = await supabase.from('equipment_tracking').delete()
            .eq('id', id)
            .eq('school_id', currentSchool.id);
        if (!error) fetchData();
    };

    const isNearService = (date: string) => {
        if (!date) return false;
        const serviceDate = new Date(date);
        const now = new Date();
        const diffDays = Math.ceil((serviceDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays < 30 && diffDays >= 0;
    };

    const isOverdue = (date: string) => {
        if (!date) return false;
        return new Date(date) < new Date();
    };

    const getCategoryIcon = (category: string) => {
        switch (category) {
            case 'Computer': return <HardDrive className="w-5 h-5" />;
            case 'Fire Safety': return <Shield className="w-5 h-5" />;
            case 'Science Kit': return <Wrench className="w-5 h-5" />;
            default: return <PlusIcon className="w-5 h-5" />;
        }
    };

    const filtered = equipment.filter(e =>
        (categoryFilter === 'All' || e.category === categoryFilter) &&
        (e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (e.serial_number && e.serial_number.toLowerCase().includes(searchTerm.toLowerCase())))
    );

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 font-outfit">Equipment Inventory</h1>
                    <p className="text-gray-500">Track school assets, maintenance schedules, and serial numbers.</p>
                </div>
                <button
                    onClick={() => setIsAdding(true)}
                    className="flex items-center space-x-2 bg-indigo-600 text-white px-5 py-2.5 rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 font-bold"
                >
                    <PlusIcon className="w-5 h-5" />
                    <span>Log Asset</span>
                </button>
            </div>

            <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4">
                <div className="relative flex-grow">
                    <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by name or serial number..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 border border-gray-100 bg-gray-50/50 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    />
                </div>
                <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="border border-gray-100 bg-gray-50/50 rounded-2xl px-6 py-3 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-gray-600"
                >
                    <option value="All">All Categories</option>
                    <option value="Computer">Computers</option>
                    <option value="Science Kit">Science Kits</option>
                    <option value="Fire Safety">Fire Safety</option>
                    <option value="First Aid">First Aid</option>
                </select>
            </div>

            {loading ? (
                <div className="text-center py-12 text-gray-500">Accessing inventory...</div>
            ) : (
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50 border-b border-gray-100">
                                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Asset</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Location</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Status</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Next Service</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filtered.map(item => (
                                <tr key={item.id} className="hover:bg-gray-50/30 transition-colors group">
                                    <td className="px-6 py-5">
                                        <div className="flex items-center space-x-4">
                                            <div className="p-3 bg-gray-100 rounded-xl group-hover:bg-white transition-colors">
                                                {getCategoryIcon(item.category)}
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-800">{item.name}</p>
                                                <p className="text-xs text-gray-400 font-medium font-mono">{item.serial_number || 'N/A'}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <span className="text-sm font-semibold text-gray-600 bg-gray-100 px-3 py-1 rounded-lg">
                                            {item.facility_registers?.name || 'Unassigned'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-5">
                                        <span className={`text-xs font-bold px-3 py-1 rounded-full ${item.condition === 'New' || item.condition === 'Good' ? 'bg-green-100 text-green-700' :
                                            item.condition === 'Fair' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                                            }`}>
                                            {item.condition}
                                        </span>
                                    </td>
                                    <td className="px-6 py-5">
                                        {item.next_service_date ? (
                                            <div className="flex items-center space-x-2">
                                                <Calendar className="w-4 h-4 text-gray-400" />
                                                <span className={`text-sm font-bold ${isOverdue(item.next_service_date) ? 'text-red-600' :
                                                    isNearService(item.next_service_date) ? 'text-amber-600' : 'text-gray-600'
                                                    }`}>
                                                    {new Date(item.next_service_date).toLocaleDateString()}
                                                </span>
                                                {isOverdue(item.next_service_date) && <AlertCircle className="w-4 h-4 text-red-500 animate-pulse" />}
                                            </div>
                                        ) : (
                                            <span className="text-sm text-gray-300">Not Scheduled</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex space-x-2">
                                            <button className="p-2 hover:bg-white rounded-xl shadow-sm border border-transparent hover:border-gray-100 transition-all text-gray-400 hover:text-indigo-600">
                                                <EditIcon className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(item.id)}
                                                className="p-2 hover:bg-white rounded-xl shadow-sm border border-transparent hover:border-red-50 transition-all text-gray-400 hover:text-red-500"
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {isAdding && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-[2rem] p-8 max-w-lg w-full space-y-8 shadow-2xl scale-in-center">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900 font-outfit">Add Asset Record</h2>
                            <p className="text-sm text-gray-500">Log equipment for compliance and insurance tracking.</p>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div className="col-span-2">
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Item Name</label>
                                <input
                                    type="text"
                                    className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-semibold transition-all"
                                    value={newEquipment.name}
                                    onChange={e => setNewEquipment({ ...newEquipment, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Category</label>
                                <select
                                    className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
                                    value={newEquipment.category}
                                    onChange={e => setNewEquipment({ ...newEquipment, category: e.target.value as any })}
                                >
                                    <option value="Computer">Computer</option>
                                    <option value="Science Kit">Science Kit</option>
                                    <option value="Fire Safety">Fire Safety</option>
                                    <option value="Furniture">Furniture</option>
                                    <option value="First Aid">First Aid</option>
                                    <option value="Electrical">Electrical</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Serial Number</label>
                                <input
                                    type="text"
                                    className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm"
                                    value={newEquipment.serial_number}
                                    onChange={e => setNewEquipment({ ...newEquipment, serial_number: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Assign to Facility</label>
                                <select
                                    className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
                                    value={newEquipment.facility_id || ''}
                                    onChange={e => setNewEquipment({ ...newEquipment, facility_id: e.target.value ? parseInt(e.target.value) : null })}
                                >
                                    <option value="">Unassigned</option>
                                    {facilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Service Date</label>
                                <input
                                    type="date"
                                    className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
                                    value={newEquipment.next_service_date}
                                    onChange={e => setNewEquipment({ ...newEquipment, next_service_date: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="flex space-x-4">
                            <button
                                onClick={() => setIsAdding(false)}
                                className="flex-grow py-4 px-6 border border-gray-100 rounded-2xl text-gray-600 font-bold hover:bg-gray-50 transition-all active:scale-95"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAdd}
                                className="flex-grow py-4 px-6 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 active:scale-95"
                            >
                                Confirm Record
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EquipmentInventoryScreen;
