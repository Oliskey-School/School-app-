import React, { useState, useEffect } from 'react';
import { 
  BusVehicleIcon as Bus, 
  MapPinIcon as MapPin, 
  PhoneIcon as Phone, 
  ClockIcon as Clock, 
  ChevronRightIcon as ChevronRight,
  CheckCircleIcon as CheckCircle2,
  ExclamationCircleIcon as AlertCircle
} from '../../constants';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';

const DEMO_BUS = {
  name: 'Bus A-05',
  routeName: 'Main Estate Route',
  driverName: 'Mr. Adeyemi Bakare',
  driverPhone: '+234 801 234 5678',
  plateNumber: 'LND-452-KJ',
  capacity: 50,
  status: 'active',
};

interface BusRouteScreenProps {
  schoolId?: string;
  studentId?: string;
  navigateTo?: (view: string, title: string, props?: any) => void;
}

const BusRouteScreen: React.FC<BusRouteScreenProps> = ({ schoolId: propSchoolId, studentId }) => {
  const { currentSchool, user } = useAuth();
  const schoolId = propSchoolId || currentSchool?.id || (user as any)?.school_id;

  const [busData, setBusData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBusData = async () => {
      try {
        setLoading(true);
        // In a real app, we'd fetch actual bus data
        // const data = await api.getStudentBusRoute(studentId);
        // setBusData(data);
        
        // Use demo data for now
        setTimeout(() => {
          setBusData(DEMO_BUS);
          setLoading(false);
        }, 1000);
      } catch (err) {
        console.error("Error fetching bus data:", err);
        setLoading(false);
      }
    };

    fetchBusData();
  }, [studentId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 bg-gradient-to-br from-green-600 to-green-700 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">{busData?.name}</h2>
              <p className="opacity-90">{busData?.routeName}</p>
            </div>
            <div className="bg-white/20 p-3 rounded-2xl">
              <Bus className="h-8 w-8 text-white" />
            </div>
          </div>
        </div>
        
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl">
            <div className="bg-green-100 p-2 rounded-xl text-green-700">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-tighter">Status</p>
              <p className="font-bold text-gray-800 capitalize">{busData?.status}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-4 p-4 border border-gray-100 rounded-2xl">
              <div className="bg-blue-50 p-2 rounded-xl text-blue-600">
                <MapPin className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-tighter">Plate Number</p>
                <p className="font-bold text-gray-800">{busData?.plateNumber}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 border border-gray-100 rounded-2xl">
              <div className="bg-orange-50 p-2 rounded-xl text-orange-600">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-tighter">Est. Arrival</p>
                <p className="font-bold text-gray-800">07:45 AM</p>
              </div>
            </div>
          </div>

          <div className="p-4 border border-gray-100 rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden">
                  <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(busData?.driverName)}&background=random`} alt="Driver" />
                </div>
                <div>
                  <p className="font-bold text-gray-800">{busData?.driverName}</p>
                  <p className="text-xs text-gray-500">Professional Driver</p>
                </div>
              </div>
              <a 
                href={`tel:${busData?.driverPhone}`}
                className="bg-green-600 text-white p-3 rounded-full hover:bg-green-700 transition-colors shadow-lg shadow-green-100"
              >
                <Phone className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-start gap-4">
        <AlertCircle className="h-6 w-6 text-amber-600 flex-shrink-0" />
        <div>
          <h4 className="font-bold text-amber-800">Safety Policy</h4>
          <p className="text-sm text-amber-700 mt-0.5">
            Always wait for the bus at the designated stop 5 minutes early. Students must remain seated while the bus is in motion.
          </p>
        </div>
      </div>
    </div>
  );
};

export default BusRouteScreen;
