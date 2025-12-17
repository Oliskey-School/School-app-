import React, { useState, useEffect } from 'react';
import { HomeIcon, PhoneIcon, BusVehicleIcon, ClockIcon } from '../../constants';
import { mockDrivers, mockPickupPoints, mockBusRoster } from '../../data';
import { Driver } from '../../types';

const BusRouteScreen: React.FC = () => {
  // Determine today's driver
  const today = new Date().toISOString().split('T')[0];
  const todaysAssignment = mockBusRoster.find(r => r.routeId === 'route-a' && r.date === today);
  // Fallback to first driver if no assignment found (for demo purposes)
  const driver = mockDrivers.find(d => d.id === todaysAssignment?.driverId) || mockDrivers[0];

  const [eta, setEta] = useState('12 min');

  // Simulate ETA update
  useEffect(() => {
    const timer = setInterval(() => {
      // Randomly fluctuate ETA for "realism"
      setEta(`${Math.floor(Math.random() * 5) + 10} min`);
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  const DriverInfoCard = ({ driver }: { driver: Driver | undefined }) => {
    if (!driver) return null;

    return (
      <div className="absolute bottom-20 md:bottom-6 inset-x-4 md:inset-x-auto md:right-6 md:w-96 bg-white/95 backdrop-blur-xl p-5 rounded-3xl shadow-2xl border border-white/20 transform transition-all duration-300 hover:scale-[1.02] z-40">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Current Driver</p>
            <h3 className="font-extrabold text-xl text-gray-800 leading-tight">{driver.name}</h3>
            <div className="flex items-center text-green-600 mt-1">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
              <span className="text-xs font-medium">Active - On Route</span>
            </div>
          </div>
          <img
            src={driver.avatarUrl}
            alt={driver.name}
            className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-md ring-2 ring-gray-100"
          />
        </div>

        <div className="flex items-center space-x-3 mt-4 pt-4 border-t border-gray-100">
          <a
            href={`tel:${driver.phone}`}
            className="flex-1 bg-gray-50 hover:bg-green-50 text-gray-700 hover:text-green-700 py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center space-x-2 border border-gray-200 hover:border-green-200"
          >
            <PhoneIcon className="w-4 h-4" />
            <span>Call Driver</span>
          </a>
          <button className="flex-1 bg-gray-900 hover:bg-black text-white py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-gray-200 flex items-center justify-center space-x-2">
            {/* Replaced NavigationIcon with SVG */}
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>View Details</span>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col w-full h-[calc(100vh-160px)] min-h-[500px] bg-gray-50 relative overflow-hidden font-sans rounded-xl shadow-inner border border-gray-100 mx-auto">
      <style>{`
                @keyframes drive-bus {
                  0% { offset-distance: 0%; transform: scale(1); }
                  50% { transform: scale(1.1); }
                  100% { offset-distance: 100%; transform: scale(1); }
                }
                .bus-animation {
                  offset-path: path('M35,40 C100,150 150,-20 250,80 S300,250 250,300 S150,220 50,350');
                  animation: drive-bus 30s linear infinite;
                }
                .map-grid {
                    background-image: 
                        linear-gradient(#e5e7eb 1px, transparent 1px),
                        linear-gradient(90deg, #e5e7eb 1px, transparent 1px);
                    background-size: 40px 40px;
                }
            `}</style>

      {/* Top Status Bar (Floating) */}
      <div className="absolute top-4 left-4 right-4 z-10 flex flex-col md:flex-row md:items-center justify-between gap-3 pointer-events-none">
        <div className="bg-white/90 backdrop-blur-md px-4 py-3 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-3 pointer-events-auto">
          <div className="bg-blue-100 p-2 rounded-lg">
            <ClockIcon className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium uppercase">Est. Arrival</p>
            <p className="font-bold text-gray-800 text-lg">{eta}</p>
          </div>
        </div>

        <div className="bg-white/90 backdrop-blur-md px-4 py-3 rounded-2xl shadow-sm border border-gray-100 pointer-events-auto">
          <p className="text-xs text-gray-500 font-medium uppercase mb-1">Next Stop</p>
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-orange-400"></span>
            <span className="font-semibold text-gray-800 text-sm">Create Avenue, Block 4</span>
          </div>
        </div>
      </div>

      {/* Map Area */}
      <div className="flex-grow relative w-full h-full map-grid bg-white">
        {/* Decorative Map Elements (Simulating standard map view) */}
        <div className="absolute inset-0">
          {/* River/Water */}
          <svg className="absolute w-full h-full opacity-30" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d="M0,80 C30,75 50,90 80,85 S100,70 100,70 V100 H0 Z" fill="#bae6fd" />
          </svg>

          {/* Parks/Greenery */}
          <div className="absolute top-20 right-20 w-32 h-32 bg-green-50 rounded-full opacity-60 filter blur-2xl"></div>
          <div className="absolute bottom-40 left-10 w-48 h-48 bg-green-50 rounded-full opacity-60 filter blur-3xl"></div>
        </div>

        {/* The Route & Animation */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative w-full max-w-lg h-full max-h-[600px]">
            {/* Visible Route Path */}
            <svg className="w-full h-full drop-shadow-xl" viewBox="0 0 360 500">
              {/* Street Outline (Border) */}
              <path
                d="M35,40 C100,150 150,-20 250,80 S300,250 250,300 S150,220 50,350"
                fill="none"
                stroke="white"
                strokeWidth="12"
                strokeLinecap="round"
              />
              {/* Inner Road */}
              <path
                d="M35,40 C100,150 150,-20 250,80 S300,250 250,300 S150,220 50,350"
                fill="none"
                stroke="#cbd5e1"
                strokeWidth="8"
                strokeLinecap="round"
              />
              {/* Route Highlight */}
              <path
                d="M35,40 C100,150 150,-20 250,80 S300,250 250,300 S150,220 50,350"
                fill="none"
                stroke="#3b82f6"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray="8 8"
                className="opacity-80"
              />
            </svg>

            {/* Pickup Points */}
            {mockPickupPoints.map(point => (
              <div
                key={point.id}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 group cursor-pointer"
                style={{ top: point.position.top, left: point.position.left }}
              >
                {/* Tooltip */}
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 pointer-events-none">
                  {point.name}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                </div>

                <div className={`relative p-1.5 rounded-full shadow-lg transition-transform hover:scale-125 duration-300 z-10 ${point.isUserStop ? 'bg-red-500 ring-4 ring-red-100' : 'bg-white ring-4 ring-gray-100'}`}>
                  {point.isUserStop ? (
                    <HomeIcon className="h-4 w-4 text-white" />
                  ) : (
                    <div className="h-4 w-4 bg-gray-200 rounded-full flex items-center justify-center">
                      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Animated Bus */}
            <div className="absolute bus-animation z-30 drop-shadow-2xl">
              <div className="relative">
                {/* Pulse Effect */}
                <div className="absolute inset-0 bg-yellow-400 rounded-lg animate-ping opacity-75"></div>
                <div className="relative bg-gradient-to-r from-yellow-400 to-orange-500 p-2 rounded-lg shadow-sm border border-yellow-300 transform -rotate-45">
                  <BusVehicleIcon className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Driver Card */}
        <DriverInfoCard driver={driver} />
      </div>
    </div>
  );
};

export default BusRouteScreen;
