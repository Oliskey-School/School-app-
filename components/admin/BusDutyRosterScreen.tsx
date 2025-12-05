import React, { useState, useMemo } from 'react';
import { BusRoute, Driver, BusRosterEntry } from '../../types';
import { mockBusRoutes, mockDrivers, mockBusRoster } from '../../data';
import { BusVehicleIcon } from '../../constants';

const RosterRow: React.FC<{
    route: BusRoute;
    roster: BusRosterEntry[];
    drivers: Driver[];
    onAssign: (routeId: string, driverId: number | null) => void;
}> = ({ route, roster, drivers, onAssign }) => {
    const today = new Date().toISOString().split('T')[0];
    const todaysAssignment = roster.find(r => r.routeId === route.id && r.date === today);
    const currentDriver = drivers.find(d => d.id === todaysAssignment?.driverId);

    const [selectedDriverId, setSelectedDriverId] = useState<string>(currentDriver?.id.toString() || '');

    const handleSave = () => {
        const driverId = selectedDriverId ? parseInt(selectedDriverId, 10) : null;
        onAssign(route.id, driverId);
    };

    return (
        <div className="bg-white p-4 rounded-xl shadow-sm space-y-3">
            <div>
                <h4 className="font-bold text-lg text-gray-800">{route.name}</h4>
                <p className="text-sm text-gray-500">{route.description}</p>
            </div>
            <div className="flex items-center space-x-3">
                <select 
                    value={selectedDriverId} 
                    onChange={e => setSelectedDriverId(e.target.value)}
                    className="flex-grow p-2 bg-gray-50 border border-gray-300 rounded-lg"
                >
                    <option value="">-- Unassigned --</option>
                    {drivers.map(driver => (
                        <option key={driver.id} value={driver.id}>{driver.name}</option>
                    ))}
                </select>
                <button 
                    onClick={handleSave}
                    className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:bg-indigo-300"
                    disabled={selectedDriverId === (currentDriver?.id.toString() || '')}
                >
                    Save
                </button>
            </div>
        </div>
    );
};

const BusDutyRosterScreen: React.FC = () => {
    const [roster, setRoster] = useState(mockBusRoster);
    
    const handleAssignDriver = (routeId: string, driverId: number | null) => {
        const today = new Date().toISOString().split('T')[0];
        
        const existingEntryIndex = mockBusRoster.findIndex(r => r.routeId === routeId && r.date === today);
        
        if (existingEntryIndex > -1) {
            mockBusRoster[existingEntryIndex].driverId = driverId;
        } else {
            mockBusRoster.push({ routeId, driverId, date: today });
        }
        
        setRoster([...mockBusRoster]);
        alert(`Driver assigned successfully for ${routeId}.`);
    };

    return (
        <div className="p-4 space-y-4 bg-gray-100 h-full overflow-y-auto">
            <div className="bg-indigo-50 p-4 rounded-xl text-center border border-indigo-200">
                <BusVehicleIcon className="h-10 w-10 mx-auto text-indigo-400 mb-2"/>
                <h3 className="font-bold text-lg text-indigo-800">Bus Duty Roster for Today</h3>
                <p className="text-sm text-indigo-700">Assign drivers to routes for the current day.</p>
            </div>
            {mockBusRoutes.map(route => (
                <RosterRow 
                    key={route.id}
                    route={route}
                    roster={roster}
                    drivers={mockDrivers}
                    onAssign={handleAssignDriver}
                />
            ))}
        </div>
    );
};

export default BusDutyRosterScreen;
