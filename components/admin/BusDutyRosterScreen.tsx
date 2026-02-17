
import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { BusVehicleIcon, PlusIcon, TrashIcon, EditIcon } from '../../constants';
import { Bus } from '../../types';
import { supabase } from '../../lib/supabase';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useProfile } from '../../context/ProfileContext';
import { AlertTriangle as ExclamationTriangleIcon } from 'lucide-react';

interface BusFormData {
    name: string;
    routeName: string;
    capacity: number;
    plateNumber: string;
    driverName: string;
    status: 'active' | 'inactive' | 'maintenance';
}

interface BusDutyRosterProps {
    schoolId?: string;
}

const BusDutyRosterScreen: React.FC<BusDutyRosterProps> = ({ schoolId: propSchoolId }) => {
    const { currentSchool } = useAuth();
    const { profile, refreshProfile } = useProfile();

    // Multi-source schoolId detection
    const schoolId = propSchoolId || profile.schoolId || currentSchool?.id;

    const [buses, setBuses] = useState<Bus[]>([]);
    const [isAddingBus, setIsAddingBus] = useState(false);
    const [editingBusId, setEditingBusId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState<BusFormData>({
        name: '',
        routeName: '',
        capacity: 30,
        plateNumber: '',
        driverName: '',
        status: 'active'
    });

    useEffect(() => {
        if (!schoolId) {
            console.log("School ID missing in BusDutyRoster, refreshing profile...");
            refreshProfile();
        }
    }, [schoolId, refreshProfile]);

    // Load buses from Supabase
    useEffect(() => {
        loadBuses();
    }, [schoolId]);

    const loadBuses = async () => {
        if (!schoolId) return;
        setLoading(true);
        try {
            // Try fetching via backend API if possible
            const data = await api.getBuses({ useBackend: true });
            setBuses(data.map((b: any) => ({
                id: b.id,
                name: b.name,
                routeName: b.route_name || b.routeName,
                capacity: b.capacity,
                plateNumber: b.plate_number || b.plateNumber,
                driverName: b.driver_name || b.driverName,
                status: b.status,
                createdAt: b.created_at || b.createdAt
            })));
        } catch (err) {
            console.error('API error fetching buses:', err);
            // Fallback to direct supabase
            try {
                const { data, error } = await supabase
                    .from('transport_buses')
                    .select('*')
                    .eq('school_id', schoolId)
                    .order('name');
                
                if (error) throw error;
                
                setBuses((data || []).map((b: any) => ({
                    id: b.id,
                    name: b.name,
                    routeName: b.route_name,
                    capacity: b.capacity,
                    plateNumber: b.plate_number,
                    driverName: b.driver_name,
                    status: b.status,
                    createdAt: b.created_at
                })));
            } catch (fallbackErr) {
                console.error('Fallback fetching buses failed:', fallbackErr);
                toast.error("Could not load buses.");
            }
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            routeName: '',
            capacity: 30,
            plateNumber: '',
            driverName: '',
            status: 'active'
        });
        setIsAddingBus(false);
        setEditingBusId(null);
    };

    const handleAddBus = async () => {
        if (!formData.name || !formData.routeName || !formData.plateNumber) {
            toast.error('Please fill in all required fields');
            return;
        }

        try {
            const newBus = await api.createBus({ ...formData, school_id: schoolId }, { useBackend: true });
            if (newBus) {
                const mappedBus: Bus = {
                    id: newBus.id,
                    name: newBus.name,
                    routeName: newBus.route_name || newBus.routeName,
                    capacity: newBus.capacity,
                    plateNumber: newBus.plate_number || newBus.plateNumber,
                    driverName: newBus.driver_name || newBus.driverName,
                    status: newBus.status,
                    createdAt: newBus.created_at || newBus.createdAt
                };
                setBuses([...buses, mappedBus]);
                toast.success(`Bus "${formData.name}" added successfully!`);
                resetForm();
            }
        } catch (error) {
            console.error(error);
            toast.error("An error occurred adding the bus.");
        }
    };

    const handleUpdateBus = async () => {
        if (!editingBusId) return;

        if (!formData.name || !formData.routeName || !formData.plateNumber) {
            toast.error('Please fill in all required fields');
            return;
        }

        try {
            const updatedBus = await api.updateBus(editingBusId, formData, { useBackend: true });
            if (updatedBus) {
                const mappedBus: Bus = {
                    id: updatedBus.id,
                    name: updatedBus.name,
                    routeName: updatedBus.route_name || updatedBus.routeName,
                    capacity: updatedBus.capacity,
                    plateNumber: updatedBus.plate_number || updatedBus.plateNumber,
                    driverName: updatedBus.driver_name || updatedBus.driverName,
                    status: updatedBus.status,
                    createdAt: updatedBus.created_at || updatedBus.createdAt
                };
                setBuses(buses.map(bus => bus.id === editingBusId ? mappedBus : bus));
                toast.success('Bus updated successfully!');
                resetForm();
            }
        } catch (error) {
            console.error(error);
            toast.error("An error occurred updating the bus.");
        }
    };

    const handleEditBus = (bus: Bus) => {
        setFormData({
            name: bus.name,
            routeName: bus.routeName,
            capacity: bus.capacity,
            plateNumber: bus.plateNumber,
            driverName: bus.driverName || '',
            status: bus.status
        });
        setEditingBusId(bus.id);
        setIsAddingBus(false);
    };

    const handleDeleteBus = async (busId: string) => {
        if (confirm('Are you sure you want to delete this bus?')) {
            try {
                await api.deleteBus(busId, { useBackend: true });
                setBuses(buses.filter(bus => bus.id !== busId));
                toast.success('Bus deleted successfully');
            } catch (error) {
                console.error(error);
                toast.error("An error occurred deleting the bus.");
            }
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'bg-green-100 text-green-800 border-green-200';
            case 'inactive': return 'bg-gray-100 text-gray-800 border-gray-200';
            case 'maintenance': return 'bg-orange-100 text-orange-800 border-orange-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                <div className="ml-3 text-lg text-gray-600">Loading buses...</div>
            </div>
        );
    }

    if (!schoolId) {
        return (
            <div className="flex flex-col items-center justify-center p-8 bg-amber-50 rounded-2xl border border-amber-100 m-4 shadow-sm">
                <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-4">
                    <ExclamationTriangleIcon className="w-8 h-8 text-amber-600" />
                </div>
                <div className="text-xl font-bold text-slate-800 mb-2">School Identity Missing</div>
                <p className="text-slate-600 mb-6 text-center max-w-xs text-sm">
                    We're having trouble identifying which school these buses belong to.
                </p>
                <button
                    onClick={() => refreshProfile()}
                    className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95"
                >
                    Sync School Profile
                </button>
            </div>
        );
    }

    return (
        <div className="p-4 space-y-4 bg-gray-50 h-full overflow-y-auto pb-32">
            {/* Header */}
            <div className="bg-indigo-50 p-4 rounded-xl text-center border border-indigo-200">
                <BusVehicleIcon className="h-10 w-10 mx-auto text-indigo-400 mb-2" />
                <h3 className="font-bold text-lg text-indigo-800">Bus Duty Roster</h3>
                <p className="text-sm text-indigo-700">
                    Manage school buses and assign drivers to routes
                </p>
                <div className="text-xs text-indigo-600 mt-1">
                    <span>{buses.length} bus{buses.length !== 1 ? 'es' : ''} registered</span>
                </div>
            </div>

            {/* Add Bus Button */}
            {!isAddingBus && !editingBusId && (
                <button
                    onClick={() => setIsAddingBus(true)}
                    className="w-full py-3 px-4 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors flex items-center justify-center space-x-2 shadow-sm"
                >
                    <PlusIcon className="h-5 w-5" />
                    <span>Add New Bus</span>
                </button>
            )}

            {/* Bus Form (Add/Edit) */}
            {(isAddingBus || editingBusId) && (
                <div className="bg-white p-4 rounded-xl shadow-md border-2 border-indigo-200">
                    <h4 className="font-bold text-lg text-gray-800 mb-3">
                        {editingBusId ? 'Edit Bus' : 'Add New Bus'}
                    </h4>

                    <div className="space-y-3">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">
                                Bus Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g., School Bus 1"
                                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">
                                Route Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.routeName}
                                onChange={(e) => setFormData({ ...formData, routeName: e.target.value })}
                                placeholder="e.g., Ikeja - Surulere Route"
                                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">
                                    Plate Number <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.plateNumber}
                                    onChange={(e) => setFormData({ ...formData, plateNumber: e.target.value.toUpperCase() })}
                                    placeholder="ABC-123-XY"
                                    className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 uppercase"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">
                                    Capacity
                                </label>
                                <input
                                    type="number"
                                    value={formData.capacity}
                                    onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 0 })}
                                    min="10"
                                    max="100"
                                    className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">
                                Driver Name (Optional)
                            </label>
                            <input
                                type="text"
                                value={formData.driverName}
                                onChange={(e) => setFormData({ ...formData, driverName: e.target.value })}
                                placeholder="e.g., Mr. Johnson"
                                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">
                                Status
                            </label>
                            <select
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            >
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                                <option value="maintenance">Under Maintenance</option>
                            </select>
                        </div>

                        <div className="flex space-x-3 pt-2">
                            <button
                                onClick={editingBusId ? handleUpdateBus : handleAddBus}
                                className="flex-1 py-2.5 px-4 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
                            >
                                {editingBusId ? 'Update Bus' : 'Add Bus'}
                            </button>
                            <button
                                onClick={resetForm}
                                className="flex-1 py-2.5 px-4 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bus List */}
            {loading ? (
                <div className="py-10 text-center text-gray-500">Loading buses...</div>
            ) : (
                <>
                    {buses.length === 0 && !isAddingBus && (
                        <div className="bg-white p-8 rounded-xl text-center border-2 border-dashed border-gray-300">
                            <BusVehicleIcon className="h-16 w-16 mx-auto text-gray-300 mb-3" />
                            <h3 className="font-bold text-lg text-gray-600 mb-2">No Buses Added Yet</h3>
                            <p className="text-sm text-gray-500 mb-4">
                                Add buses to start managing your bus roster
                            </p>
                        </div>
                    )}

                    <div className="space-y-3">
                        {buses.map((bus) => (
                            <div key={bus.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                                <div className="flex items-start justify-between">
                                    <div className="flex-grow">
                                        <div className="flex items-center space-x-2 mb-2">
                                            <h4 className="font-bold text-lg text-gray-800">{bus.name}</h4>
                                            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full border ${getStatusColor(bus.status)}`}>
                                                {bus.status.charAt(0).toUpperCase() + bus.status.slice(1)}
                                            </span>
                                        </div>

                                        <div className="space-y-1">
                                            <p className="text-sm text-gray-600">
                                                <span className="font-semibold">Route:</span> {bus.routeName}
                                            </p>
                                            <p className="text-sm text-gray-600">
                                                <span className="font-semibold">Plate:</span> {bus.plateNumber}
                                            </p>
                                            <p className="text-sm text-gray-600">
                                                <span className="font-semibold">Capacity:</span> {bus.capacity} passengers
                                            </p>
                                            {bus.driverName && (
                                                <p className="text-sm text-gray-600">
                                                    <span className="font-semibold">Driver:</span> {bus.driverName}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex space-x-2">
                                        <button
                                            onClick={() => handleEditBus(bus)}
                                            className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                                            title="Edit Bus"
                                        >
                                            <EditIcon className="h-5 w-5" />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteBus(bus.id)}
                                            className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                                            title="Delete Bus"
                                        >
                                            <TrashIcon className="h-5 w-5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

export default BusDutyRosterScreen;
