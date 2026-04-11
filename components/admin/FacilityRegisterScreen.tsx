import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';
import {
    PlusIcon,
    SearchIcon,
    FilterIcon,
    EditIcon,
    TrashIcon,
    CheckCircleIcon,
    AlertTriangle,
    XCircleIcon,
    RefreshCw
} from 'lucide-react';
import { useAutoSync } from '../../hooks/useAutoSync';

interface Facility {
    id: string;
    school_id: string;
    name: string;
    type: 'Classroom' | 'Laboratory' | 'Toilet' | 'Library' | 'Sick bay' | 'Staff Room' | 'Other';
    capacity: number;
    location: string;
    status: 'operational' | 'maintenance' | 'out_of_service';
    last_inspected_at: string;
    facility_type?: string; // Kept for backward compatibility if any
}

const FacilityRegisterScreen = () => {
    const { currentSchool } = useAuth();
    const [facilities, setFacilities] = useState<Facility[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('All');
    const [isAdding, setIsAdding] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingFacility, setEditingFacility] = useState<Facility | null>(null);
    const [newFacility, setNewFacility] = useState<Partial<Facility>>({
        name: '',
        type: 'Classroom',
        capacity: 0,
        location: '',
        status: 'operational'
    });

    useEffect(() => {
        if (currentSchool) {
            fetchFacilities();
        }
    }, [currentSchool]);

    useAutoSync(['facilities'], () => {
        console.log('🔄 [FacilityRegister] Real-time auto-sync triggered');
        fetchFacilities();
    });

    const fetchFacilities = async () => {
        if (!currentSchool) return;
        setLoading(true);
        try {
            const data = await api.getFacilities();
            setFacilities(data as any[] || []);
        } catch (err) {
            console.error('Error fetching facilities:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async () => {
        if (!newFacility.name || !currentSchool) return;

        try {
            const payload = {
                ...newFacility,
                school_id: currentSchool.id
            };
            await api.createFacility(payload);
            setIsAdding(false);
            setNewFacility({ name: '', type: 'Classroom', capacity: 0, location: '', status: 'operational' });
            fetchFacilities();
        } catch (error) {
            console.error('Error adding facility:', error);
            alert('Failed to add facility. Please check your permissions.');
        }
    };

    const handleUpdate = async () => {
        if (!editingFacility || !currentSchool) return;

        try {
            await api.updateFacility(editingFacility.id, {
                name: editingFacility.name,
                type: editingFacility.type,
                capacity: editingFacility.capacity,
                location: editingFacility.location,
                status: editingFacility.status
            });
            setIsEditing(false);
            setEditingFacility(null);
            fetchFacilities();
            toast.success('Facility updated successfully');
        } catch (error) {
            console.error('Error updating facility:', error);
            toast.error('Failed to update facility.');
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this facility?')) return;

        try {
            await api.deleteFacility(id);
            fetchFacilities();
            toast.success('Facility deleted successfully');
        } catch (error) {
            console.error('Error deleting facility:', error);
            toast.error('Failed to delete facility.');
        }
    };


    const filteredFacilities = facilities.filter(f =>
        (filterType === 'All' || f.type === filterType) &&
        f.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'operational': return <CheckCircleIcon className="w-4 h-4 text-green-500" />;
            case 'maintenance': return <AlertTriangle className="w-4 h-4 text-amber-500" />;
            case 'out_of_service': return <XCircleIcon className="w-4 h-4 text-red-500" />;
            default: return null;
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 font-outfit">Infrastructure Register</h1>
                    <p className="text-gray-500">Manage school physical spaces and compliance records.</p>
                </div>
                <button
                    onClick={() => setIsAdding(true)}
                    className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 transition-colors shadow-sm font-semibold"
                >
                    <PlusIcon className="w-5 h-5" />
                    <span>Add Facility</span>
                </button>
            </div>

            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4">
                <div className="relative flex-grow">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search facilities..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                </div>
                <div className="flex items-center space-x-2">
                    <FilterIcon className="w-5 h-5 text-gray-400 font-semibold" />
                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="border border-gray-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none font-semibold text-gray-600"
                    >
                        <option value="All">All Types</option>
                        <option value="Classroom">Classrooms</option>
                        <option value="Laboratory">Laboratories</option>
                        <option value="Toilet">Toilets</option>
                        <option value="Library">Library</option>
                        <option value="Sick bay">Sick bay</option>
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-12 text-gray-500">Loading facilities...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredFacilities.map(facility => (
                        <div key={facility.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-4 hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start">
                                <div className={`p-3 rounded-2xl ${facility.type === 'Laboratory' ? 'bg-purple-50 text-purple-600' :
                                    facility.type === 'Sick bay' ? 'bg-red-50 text-red-600' :
                                        'bg-blue-50 text-blue-600'
                                    }`}>
                                    <span className="font-bold text-xs uppercase tracking-wider">{facility.type}</span>
                                </div>
                                <div className="flex space-x-1">
                                    <button
                                        onClick={() => {
                                            setEditingFacility(facility);
                                            setIsEditing(true);
                                        }}
                                        className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors"
                                    >
                                        <EditIcon className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(facility.id)}
                                        className="p-2 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 transition-colors"
                                    >
                                        <TrashIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <div>
                                <h3 className="font-bold text-lg text-gray-900">{facility.name}</h3>
                                <p className="text-sm text-gray-500">{facility.location || 'No location set'}</p>
                                <p className="text-xs text-gray-400">Capacity: {facility.capacity} pax</p>
                            </div>

                            <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                                <div className="flex items-center space-x-2">
                                    {getStatusIcon(facility.status)}
                                    <span className="text-sm font-semibold text-gray-700">
                                        {facility.status === 'operational' ? 'Functional' :
                                            facility.status === 'maintenance' ? 'Maintenance' : 'Out of Order'}
                                    </span>
                                </div>
                                <span className="text-[10px] text-gray-400 italic">
                                    Last Inspected: {new Date(facility.last_inspected_at).toLocaleDateString()}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {(isAdding || isEditing) && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-6 shadow-2xl animate-in zoom-in-95 duration-200">
                        <h2 className="text-xl font-bold text-gray-900 font-outfit">
                            {isEditing ? 'Edit Facility' : 'Add New Facility'}
                        </h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Facility Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Science Lab 1"
                                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                    value={isEditing ? editingFacility?.name : newFacility.name}
                                    onChange={e => isEditing ?
                                        setEditingFacility({ ...editingFacility!, name: e.target.value }) :
                                        setNewFacility({ ...newFacility, name: e.target.value })
                                    }
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Location</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Ground Floor, Block A"
                                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                    value={isEditing ? editingFacility?.location : newFacility.location}
                                    onChange={e => isEditing ?
                                        setEditingFacility({ ...editingFacility!, location: e.target.value }) :
                                        setNewFacility({ ...newFacility, location: e.target.value })
                                    }
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Type</label>
                                    <select
                                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                        value={isEditing ? editingFacility?.type : newFacility.type}
                                        onChange={e => isEditing ?
                                            setEditingFacility({ ...editingFacility!, type: e.target.value as any }) :
                                            setNewFacility({ ...newFacility, type: e.target.value as any })
                                        }
                                    >
                                        <option value="Classroom">Classroom</option>
                                        <option value="Laboratory">Laboratory</option>
                                        <option value="Toilet">Toilet</option>
                                        <option value="Library">Library</option>
                                        <option value="Sick bay">Sick bay</option>
                                        <option value="Staff Room">Staff Room</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Status</label>
                                    <select
                                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                        value={isEditing ? editingFacility?.status : newFacility.status}
                                        onChange={e => isEditing ?
                                            setEditingFacility({ ...editingFacility!, status: e.target.value as any }) :
                                            setNewFacility({ ...newFacility, status: e.target.value as any })
                                        }
                                    >
                                        <option value="operational">Functional</option>
                                        <option value="maintenance">Maintenance</option>
                                        <option value="out_of_service">Out of Order</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Capacity</label>
                                <input
                                    type="number"
                                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-semibold"
                                    value={isEditing ? (editingFacility?.capacity ?? 0) : (newFacility.capacity ?? 0)}
                                    onChange={e => {
                                        const val = parseInt(e.target.value) || 0;
                                        if (isEditing) {
                                            setEditingFacility({ ...editingFacility!, capacity: val });
                                        } else {
                                            setNewFacility({ ...newFacility, capacity: val });
                                        }
                                    }}
                                />
                            </div>
                        </div>
                        <div className="flex space-x-3">
                            <button
                                onClick={() => {
                                    setIsAdding(false);
                                    setIsEditing(false);
                                    setEditingFacility(null);
                                }}
                                className="flex-grow py-3 px-4 border border-gray-200 rounded-2xl text-gray-600 font-bold hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={isEditing ? handleUpdate : handleAdd}
                                className="flex-grow py-3 px-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
                            >
                                {isEditing ? 'Save Changes' : 'Create'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FacilityRegisterScreen;

