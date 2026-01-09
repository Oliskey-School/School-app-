import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { BusVehicleIcon, PlusIcon, TrashIcon, EditIcon } from '../../constants';

interface Bus {
    id: string;
    name: string;
    routeName: string;
    capacity: number;
    plateNumber: string;
    driver?: string;
    status: 'active' | 'inactive' | 'maintenance';
}

interface BusFormData {
    name: string;
    routeName: string;
    capacity: number;
    plateNumber: string;
    driver: string;
    status: 'active' | 'inactive' | 'maintenance';
}

const BusDutyRosterScreen: React.FC = () => {
    const [buses, setBuses] = useState<Bus[]>([]);
    const [isAddingBus, setIsAddingBus] = useState(false);
    const [editingBusId, setEditingBusId] = useState<string | null>(null);
    const [formData, setFormData] = useState<BusFormData>({
        name: '',
        routeName: '',
        capacity: 30,
        plateNumber: '',
        driver: '',
        status: 'active'
    });

    // Load buses from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem('schoolApp_buses');
        if (saved) {
            try {
                const parsedBuses = JSON.parse(saved);
                setBuses(parsedBuses);

                // If no buses exist, show the form to add the first bus
                if (parsedBuses.length === 0) {
                    setIsAddingBus(true);
                }
            } catch (e) {
                console.error('Failed to parse buses from storage');
                // Show form if parsing fails
                setIsAddingBus(true);
            }
        } else {
            // No saved buses, show the form to add first bus
            setIsAddingBus(true);
        }
    }, []);

    // Save buses to localStorage whenever they change
    useEffect(() => {
        if (buses.length > 0) {
            localStorage.setItem('schoolApp_buses', JSON.stringify(buses));
        }
    }, [buses]);

    const resetForm = () => {
        setFormData({
            name: '',
            routeName: '',
            capacity: 30,
            plateNumber: '',
            driver: '',
            status: 'active'
        });
        setIsAddingBus(false);
        setEditingBusId(null);
    };

    const handleAddBus = () => {
        if (!formData.name || !formData.routeName || !formData.plateNumber) {
            toast.error('Please fill in all required fields');
            return;
        }

        const newBus: Bus = {
            id: Date.now().toString(),
            ...formData
        };

        setBuses([...buses, newBus]);
        toast.success(`Bus "${formData.name}" added successfully!`);
        resetForm();
    };

    const handleUpdateBus = () => {
        if (!editingBusId) return;

        if (!formData.name || !formData.routeName || !formData.plateNumber) {
            toast.error('Please fill in all required fields');
            return;
        }

        setBuses(buses.map(bus =>
            bus.id === editingBusId
                ? { ...bus, ...formData }
                : bus
        ));

        toast.success('Bus updated successfully!');
        resetForm();
    };

    const handleEditBus = (bus: Bus) => {
        setFormData({
            name: bus.name,
            routeName: bus.routeName,
            capacity: bus.capacity,
            plateNumber: bus.plateNumber,
            driver: bus.driver || '',
            status: bus.status
        });
        setEditingBusId(bus.id);
        setIsAddingBus(false);
    };

    const handleDeleteBus = (busId: string) => {
        if (buses.length <= 3 && buses.length > 0) {
            toast.error('You must maintain at least 3 buses. Cannot delete.');
            return;
        }

        if (confirm('Are you sure you want to delete this bus?')) {
            setBuses(buses.filter(bus => bus.id !== busId));
            toast.success('Bus deleted successfully');
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

    return (
        <div className="p-4 space-y-4 bg-gray-50 h-full overflow-y-auto">
            {/* Header */}
            <div className="bg-indigo-50 p-4 rounded-xl text-center border border-indigo-200">
                <BusVehicleIcon className="h-10 w-10 mx-auto text-indigo-400 mb-2" />
                <h3 className="font-bold text-lg text-indigo-800">Bus Duty Roster</h3>
                <p className="text-sm text-indigo-700">
                    Manage school buses and assign drivers to routes
                </p>
                <p className="text-xs text-indigo-600 mt-1">
                    {buses.length} bus{buses.length !== 1 ? 'es' : ''} registered • Minimum 3 required
                </p>
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
                                value={formData.driver}
                                onChange={(e) => setFormData({ ...formData, driver: e.target.value })}
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
            {buses.length === 0 && !isAddingBus && (
                <div className="bg-white p-8 rounded-xl text-center border-2 border-dashed border-gray-300">
                    <BusVehicleIcon className="h-16 w-16 mx-auto text-gray-300 mb-3" />
                    <h3 className="font-bold text-lg text-gray-600 mb-2">No Buses Added Yet</h3>
                    <p className="text-sm text-gray-500 mb-4">
                        Add at least 3 buses to start managing your bus roster
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
                                    {bus.driver && (
                                        <p className="text-sm text-gray-600">
                                            <span className="font-semibold">Driver:</span> {bus.driver}
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
                                    disabled={buses.length <= 3}
                                >
                                    <TrashIcon className="h-5 w-5" />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Warning if less than 3 buses */}
            {buses.length < 3 && buses.length > 0 && (
                <div className="bg-orange-50 border-2 border-orange-200 p-4 rounded-xl">
                    <p className="text-sm text-orange-800 font-semibold text-center">
                        ⚠️ You need at least {3 - buses.length} more bus{3 - buses.length !== 1 ? 'es' : ''} to meet the minimum requirement
                    </p>
                </div>
            )}
        </div>
    );
};

export default BusDutyRosterScreen;
