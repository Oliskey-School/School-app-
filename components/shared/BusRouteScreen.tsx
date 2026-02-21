import React, { useState, useEffect, useRef } from 'react';
import { PhoneIcon, BusVehicleIcon, ClockIcon, UsersIcon } from '../../constants';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useProfile } from '../../context/ProfileContext';
import { MapPin, Navigation, Shield, Users } from 'lucide-react';

// The SVG path the bus will follow
const ROUTE_PATH = 'M 50,420 C 100,350 140,280 200,250 S 300,180 320,130 S 280,60 220,50 C 160,40 120,80 100,130 S 130,220 180,250';

// Demo stops along the route
const DEMO_STOPS = [
  { id: 1, name: 'School Gate', x: 50, y: 420, isSchool: true },
  { id: 2, name: 'Harmony Estate', x: 200, y: 250, isUserStop: false },
  { id: 3, name: 'Create Avenue, Block 4', x: 320, y: 130, isUserStop: true },
  { id: 4, name: 'Sunrise Junction', x: 220, y: 50, isUserStop: false },
  { id: 5, name: 'Lagos Road Terminus', x: 100, y: 130, isUserStop: false },
];

// Demo bus data when no real buses exist
const DEMO_BUS = {
  name: 'School Bus Alpha',
  routeName: 'Ikeja - Surulere Express',
  driverName: 'Mr. Adeyemi Bakare',
  driverPhone: '+234 801 234 5678',
  plateNumber: 'LND-472-KJ',
  capacity: 45,
  status: 'active' as const,
};

interface BusRouteScreenProps {
  schoolId?: string;
  navigateTo?: (view: string, title: string, props?: any) => void;
}

const BusRouteScreen: React.FC<BusRouteScreenProps> = ({ schoolId: propSchoolId }) => {
  const { currentSchool, user } = useAuth();
  const { profile } = useProfile();
  const schoolId = propSchoolId || currentSchool?.id || profile?.schoolId || user?.user_metadata?.school_id;

  const [busData, setBusData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [eta, setEta] = useState(12);
  const [currentStopIndex, setCurrentStopIndex] = useState(2);
  const [showDriverCard, setShowDriverCard] = useState(true);

  // Load bus data
  useEffect(() => {
    const loadBus = async () => {
      setLoading(true);
      if (isSupabaseConfigured && schoolId) {
        try {
          const { data, error } = await supabase
            .from('transport_buses')
            .select('*')
            .eq('school_id', schoolId)
            .eq('status', 'active')
            .order('name')
            .limit(1)
            .maybeSingle();

          if (!error && data) {
            setBusData({
              name: data.name,
              routeName: data.route_name,
              driverName: data.driver_name || 'Unassigned',
              driverPhone: data.driver_phone || '+234 800 000 0000',
              plateNumber: data.plate_number,
              capacity: data.capacity,
              status: data.status,
            });
          } else {
            setBusData(DEMO_BUS);
          }
        } catch {
          setBusData(DEMO_BUS);
        }
      } else {
        setBusData(DEMO_BUS);
      }
      setLoading(false);
    };
    loadBus();
  }, [schoolId]);

  // Simulate ETA countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setEta(prev => {
        const next = prev - 1;
        if (next <= 0) {
          setCurrentStopIndex(i => (i + 1) % DEMO_STOPS.length);
          return Math.floor(Math.random() * 8) + 5;
        }
        return next;
      });
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <div className="relative">
          <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center animate-bounce shadow-xl shadow-orange-200">
            <BusVehicleIcon className="h-8 w-8 text-white" />
          </div>
        </div>
        <p className="text-gray-500 font-medium animate-pulse">Locating your bus...</p>
      </div>
    );
  }

  const nextStop = DEMO_STOPS[currentStopIndex];
  const bus = busData || DEMO_BUS;

  return (
    <div className="flex flex-col w-full h-[calc(100vh-160px)] min-h-[500px] bg-gray-50 relative overflow-hidden font-sans rounded-xl shadow-inner border border-gray-100 mx-auto">

      {/* Top Status Bar */}
      <div className="absolute top-4 left-4 right-4 z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pointer-events-none">
        <div className="bg-white/90 backdrop-blur-md px-4 py-3 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-3 pointer-events-auto">
          <div className="bg-blue-100 p-2 rounded-lg">
            <ClockIcon className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium uppercase">Est. Arrival</p>
            <p className="font-bold text-gray-800 text-lg">{eta} min</p>
          </div>
        </div>

        <div className="bg-white/90 backdrop-blur-md px-4 py-3 rounded-2xl shadow-sm border border-gray-100 pointer-events-auto">
          <p className="text-xs text-gray-500 font-medium uppercase mb-1">Next Stop</p>
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse"></span>
            <span className="font-semibold text-gray-800 text-sm">{nextStop?.name || 'Unknown'}</span>
          </div>
        </div>
      </div>

      {/* Student Bus Assignment Bar */}
      <div className="absolute top-[90px] sm:top-[80px] left-4 right-4 z-10 pointer-events-none">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2.5 rounded-xl shadow-lg flex items-center space-x-3 pointer-events-auto">
          <div className="bg-white/20 p-1.5 rounded-lg">
            <BusVehicleIcon className="w-4 h-4 text-white" />
          </div>
          <div className="flex-grow min-w-0">
            <p className="text-[10px] text-white/70 uppercase font-semibold tracking-wider">Assigned Bus</p>
            <p className="text-white font-bold text-sm truncate">{bus.name} — {bus.routeName}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-[10px] text-white/70 uppercase font-semibold">Plate</p>
            <p className="text-white font-bold text-xs">{bus.plateNumber}</p>
          </div>
        </div>
      </div>

      {/* Map Area */}
      <div className="flex-grow relative w-full h-full bg-white" style={{
        backgroundImage: 'linear-gradient(#f1f5f9 1px, transparent 1px), linear-gradient(90deg, #f1f5f9 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      }}>
        {/* Decorative Map Elements */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Water body */}
          <svg className="absolute w-full h-full opacity-25" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d="M0,85 C25,80 50,92 75,87 S100,75 100,75 V100 H0 Z" fill="#bae6fd" />
          </svg>
          {/* Parks */}
          <div className="absolute top-16 right-16 w-28 h-28 bg-green-100 rounded-full opacity-40 blur-2xl"></div>
          <div className="absolute bottom-32 left-8 w-40 h-40 bg-green-50 rounded-full opacity-50 blur-3xl"></div>
          <div className="absolute top-1/3 left-1/4 w-20 h-20 bg-emerald-50 rounded-full opacity-40 blur-2xl"></div>
        </div>

        {/* Route & Animation */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative w-full max-w-md h-full max-h-[600px]">
            <svg className="w-full h-full drop-shadow-sm" viewBox="0 0 400 480">
              {/* Road shadow */}
              <path
                d={ROUTE_PATH}
                fill="none"
                stroke="#e2e8f0"
                strokeWidth="16"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Road surface */}
              <path
                d={ROUTE_PATH}
                fill="none"
                stroke="white"
                strokeWidth="14"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Road center line */}
              <path
                d={ROUTE_PATH}
                fill="none"
                stroke="#cbd5e1"
                strokeWidth="2"
                strokeLinecap="round"
                strokeDasharray="6 8"
              />
              {/* Route highlight (blue dashes) */}
              <path
                d={ROUTE_PATH}
                fill="none"
                stroke="#3b82f6"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray="10 8"
                opacity="0.7"
              />

              {/* Stop Markers */}
              {DEMO_STOPS.map(stop => (
                <g key={stop.id}>
                  {/* Outer glow for user stop */}
                  {stop.isUserStop && (
                    <circle cx={stop.x} cy={stop.y} r="16" fill="#fecaca" opacity="0.5">
                      <animate attributeName="r" values="14;18;14" dur="2s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0.5;0.2;0.5" dur="2s" repeatCount="indefinite" />
                    </circle>
                  )}
                  {/* Stop dot */}
                  <circle
                    cx={stop.x}
                    cy={stop.y}
                    r={stop.isSchool ? 10 : stop.isUserStop ? 8 : 5}
                    fill={stop.isSchool ? '#16a34a' : stop.isUserStop ? '#ef4444' : 'white'}
                    stroke={stop.isSchool ? '#15803d' : stop.isUserStop ? '#dc2626' : '#94a3b8'}
                    strokeWidth="2"
                  />
                  {/* Inner white dot for school */}
                  {stop.isSchool && (
                    <text x={stop.x} y={stop.y + 4} textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">🏫</text>
                  )}
                  {/* Stop label */}
                  <text
                    x={stop.x}
                    y={stop.y + (stop.isSchool ? 22 : 20)}
                    textAnchor="middle"
                    fill="#475569"
                    fontSize="9"
                    fontWeight="600"
                    fontFamily="system-ui"
                  >
                    {stop.name}
                  </text>
                </g>
              ))}

              {/* ===== ANIMATED BUS ===== */}
              <g>
                {/* Shadow underneath bus */}
                <ellipse rx="12" ry="4" fill="rgba(0,0,0,0.15)">
                  <animateMotion
                    dur="12s"
                    repeatCount="indefinite"
                    path={ROUTE_PATH}
                    keyPoints="0;1;0"
                    keyTimes="0;0.5;1"
                    calcMode="linear"
                  />
                </ellipse>

                {/* Bus body */}
                <g>
                  <animateMotion
                    dur="12s"
                    repeatCount="indefinite"
                    path={ROUTE_PATH}
                    keyPoints="0;1;0"
                    keyTimes="0;0.5;1"
                    calcMode="linear"
                    rotate="auto"
                  />
                  {/* Bus rectangle */}
                  <rect x="-16" y="-10" width="32" height="20" rx="6" fill="url(#busGradient)" stroke="#d97706" strokeWidth="1.5" />
                  {/* Windows */}
                  <rect x="-12" y="-7" width="6" height="5" rx="1.5" fill="white" opacity="0.9" />
                  <rect x="-3" y="-7" width="6" height="5" rx="1.5" fill="white" opacity="0.9" />
                  <rect x="6" y="-7" width="6" height="5" rx="1.5" fill="white" opacity="0.9" />
                  {/* Wheels */}
                  <circle cx="-9" cy="10" r="3.5" fill="#374151" stroke="#1f2937" strokeWidth="1" />
                  <circle cx="9" cy="10" r="3.5" fill="#374151" stroke="#1f2937" strokeWidth="1" />
                  {/* Wheel hubcaps */}
                  <circle cx="-9" cy="10" r="1.5" fill="#9ca3af" />
                  <circle cx="9" cy="10" r="1.5" fill="#9ca3af" />
                  {/* Front light */}
                  <rect x="14" y="-4" width="3" height="4" rx="1" fill="#fbbf24">
                    <animate attributeName="opacity" values="1;0.5;1" dur="1s" repeatCount="indefinite" />
                  </rect>
                </g>
              </g>

              {/* Gradient definition */}
              <defs>
                <linearGradient id="busGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#fbbf24" />
                  <stop offset="100%" stopColor="#f59e0b" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>

        {/* Driver Info Card */}
        {showDriverCard && bus && (
          <div className="absolute bottom-20 md:bottom-6 inset-x-4 md:inset-x-auto md:right-6 md:w-[380px] bg-white/95 backdrop-blur-xl p-5 rounded-3xl shadow-2xl border border-white/30 z-40 transition-all duration-300">
            {/* Close button */}
            <button
              onClick={() => setShowDriverCard(false)}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>

            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">On-Duty Driver</p>
                <h3 className="font-extrabold text-lg text-gray-800 leading-tight">{bus.driverName}</h3>
                <div className="flex items-center text-green-600 mt-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                  <span className="text-xs font-medium">Active — On Route</span>
                </div>
              </div>
              <div className="w-14 h-14 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-100">
                <Shield className="w-7 h-7 text-white" />
              </div>
            </div>

            {/* Bus details strip */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="bg-gray-50 rounded-xl px-3 py-2 text-center">
                <p className="text-[10px] text-gray-400 uppercase font-semibold">Bus</p>
                <p className="text-xs font-bold text-gray-700 truncate">{bus.name}</p>
              </div>
              <div className="bg-gray-50 rounded-xl px-3 py-2 text-center">
                <p className="text-[10px] text-gray-400 uppercase font-semibold">Plate</p>
                <p className="text-xs font-bold text-gray-700">{bus.plateNumber}</p>
              </div>
              <div className="bg-gray-50 rounded-xl px-3 py-2 text-center">
                <p className="text-[10px] text-gray-400 uppercase font-semibold">Capacity</p>
                <p className="text-xs font-bold text-gray-700">{bus.capacity} seats</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-3">
              <a
                href={`tel:${bus.driverPhone}`}
                className="flex-1 bg-green-50 hover:bg-green-100 text-green-700 py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center space-x-2 border border-green-200"
              >
                <PhoneIcon className="w-4 h-4" />
                <span>Call Driver</span>
              </a>
              <button className="flex-1 bg-gray-900 hover:bg-black text-white py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-gray-200 flex items-center justify-center space-x-2">
                <Navigation className="w-4 h-4" />
                <span>Track Live</span>
              </button>
            </div>
          </div>
        )}

        {/* Show driver card toggle when hidden */}
        {!showDriverCard && (
          <button
            onClick={() => setShowDriverCard(true)}
            className="absolute bottom-24 md:bottom-6 right-4 bg-white/95 backdrop-blur-md p-3 rounded-2xl shadow-lg border border-gray-100 z-40 flex items-center space-x-2 hover:shadow-xl transition-all"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center">
              <BusVehicleIcon className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-semibold text-gray-700">Show Driver</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default BusRouteScreen;
