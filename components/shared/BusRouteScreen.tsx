import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import {
  Bus,
  MapPin,
  Phone,
  Clock,
  Navigation,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  User as UserIcon,
} from 'lucide-react-native';
import { Card } from '../ui/Card';
import { useAuth } from '../../hooks/useAuth';
import { useProfile } from '../../hooks/useProfile';
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
      try {
        let data = null;
        if (studentId) {
          // Fetch specific bus for student
          data = await api.getStudentBus(studentId);
        } else if (schoolId) {
          // Fallback to first school bus
          const buses = await api.getBusDetails(schoolId);
          data = Array.isArray(buses) ? buses[0] : buses;
        }

        if (data) {
          setBusData({
            name: data.name || data.bus_number,
            routeName: data.routeName || data.route_name,
            driverName: data.driverName || data.driver_name || 'Unassigned',
            driverPhone: data.driverPhone || data.driver_phone || '+234 000 000 0000',
            plateNumber: data.plateNumber || data.plate_number || 'N/A',
            capacity: data.capacity,
            status: data.status,
          });
        } else {
          setBusData(DEMO_BUS);
        }
      } catch (err) {
        console.error('[BusRoute] Failed to load bus:', err);
        setBusData(DEMO_BUS);
      }
      setLoading(false);
    };
    loadBus();
  }, [schoolId, studentId]);

  const handleCallDriver = () => {
    if (busData?.driverPhone) {
      Linking.openURL(`tel:${busData.driverPhone}`);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066cc" />
        <Text style={styles.loadingText}>Connecting to Bus Tracking...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header Status Card */}
      <Card style={styles.statusCard}>
        <View style={styles.statusHeader}>
          <View style={styles.busInfo}>
            <View style={styles.busIconContainer}>
              <Bus size={24} color="#0066cc" />
            </View>
            <View>
              <Text style={styles.busName}>{busData?.name}</Text>
              <Text style={styles.routeName}>{busData?.routeName}</Text>
            </View>
          </View>
          <View style={styles.statusBadge}>
            <View style={[styles.statusDot, { backgroundColor: '#34c759' }]} />
            <Text style={styles.statusText}>On Route</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.etaSection}>
          <View style={styles.etaItem}>
            <Clock size={20} color="#666" />
            <View style={styles.etaContent}>
              <Text style={styles.etaLabel}>ETA to Next Stop</Text>
              <Text style={styles.etaValue}>{eta} mins</Text>
            </View>
          </View>
          <View style={[styles.etaItem, styles.etaItemBorder]}>
            <Navigation size={20} color="#666" />
            <View style={styles.etaContent}>
              <Text style={styles.etaLabel}>Current Speed</Text>
              <Text style={styles.etaValue}>35 km/h</Text>
            </View>
          </View>
        </View>
      </Card>

      {/* Driver Card */}
      {showDriverCard && (
        <Card style={styles.driverCard}>
          <View style={styles.driverInfo}>
            <View style={styles.driverAvatar}>
              <UserIcon size={30} color="#666" />
            </View>
            <View style={styles.driverDetails}>
              <Text style={styles.driverLabel}>assigned driver</Text>
              <Text style={styles.driverName}>{busData?.driverName}</Text>
              <Text style={styles.plateNumber}>Plate: {busData?.plateNumber}</Text>
            </View>
            <TouchableOpacity 
              style={styles.callButton}
              onPress={handleCallDriver}
            >
              <Phone size={20} color="#fff" />
              <Text style={styles.callButtonText}>Call</Text>
            </TouchableOpacity>
          </View>
        </Card>
      )}

      {/* Route Timeline */}
      <View style={styles.timelineSection}>
        <Text style={styles.sectionTitle}>Route Progress</Text>
        <Card style={styles.timelineCard}>
          {[
            { name: 'Estate Main Gate', time: '07:15 AM', status: 'completed' },
            { name: 'Block B Junction', time: '07:22 AM', status: 'completed' },
            { name: 'Playground Stop', time: '07:30 AM', status: 'current' },
            { name: 'School Main Entrance', time: '07:45 AM', status: 'pending' },
          ].map((stop, index) => (
            <View key={index} style={styles.stopItem}>
              <View style={styles.timelineColumn}>
                <View style={[
                  styles.timelineDot,
                  stop.status === 'completed' && styles.dotCompleted,
                  stop.status === 'current' && styles.dotCurrent,
                ]}>
                  {stop.status === 'completed' && <CheckCircle2 size={12} color="#fff" />}
                </View>
                {index !== 3 && (
                  <View style={[
                    styles.timelineLine,
                    stop.status === 'completed' && styles.lineCompleted
                  ]} />
                )}
              </View>
              <View style={styles.stopContent}>
                <View style={styles.stopHeader}>
                  <Text style={[
                    styles.stopName,
                    stop.status === 'current' && styles.textCurrent
                  ]}>{stop.name}</Text>
                  <Text style={styles.stopTime}>{stop.time}</Text>
                </View>
                {stop.status === 'current' && (
                  <View style={styles.currentIndicator}>
                    <MapPin size={14} color="#0066cc" />
                    <Text style={styles.currentLabel}>Bus is here</Text>
                  </View>
                )}
              </View>
            </View>
          ))}
        </Card>
      </View>

      {/* Map Placeholder */}
      <View style={styles.mapSection}>
        <Text style={styles.sectionTitle}>Live Tracking</Text>
        <Card style={styles.mapCard}>
          <View style={styles.mapPlaceholder}>
            <MapPin size={40} color="#0066cc" />
            <Text style={styles.mapPlaceholderText}>Live Map Tracking Active</Text>
            <TouchableOpacity style={styles.openMapButton}>
              <Text style={styles.openMapText}>Expand Full Map</Text>
            </TouchableOpacity>
          </View>
        </Card>
      </View>

      <View style={styles.footer}>
        <AlertCircle size={16} color="#666" />
        <Text style={styles.footerText}>Data refreshes every 30 seconds</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  statusCard: {
    padding: 16,
    marginBottom: 16,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  busInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  busIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e6f0ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  busName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  routeName: {
    fontSize: 14,
    color: '#666',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    color: '#2e7d32',
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 16,
  },
  etaSection: {
    flexDirection: 'row',
  },
  etaItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  etaItemBorder: {
    borderLeftWidth: 1,
    borderLeftColor: '#eee',
    paddingLeft: 16,
  },
  etaContent: {
    marginLeft: 12,
  },
  etaLabel: {
    fontSize: 12,
    color: '#666',
  },
  etaValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  driverCard: {
    padding: 12,
    marginBottom: 20,
    backgroundColor: '#fff',
    borderLeftWidth: 4,
    borderLeftColor: '#0066cc',
  },
  driverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  driverAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  driverDetails: {
    flex: 1,
  },
  driverLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    color: '#666',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  driverName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  plateNumber: {
    fontSize: 12,
    color: '#666',
  },
  callButton: {
    backgroundColor: '#0066cc',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  callButtonText: {
    color: '#fff',
    marginLeft: 6,
    fontWeight: '600',
  },
  timelineSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#1a1a1a',
  },
  timelineCard: {
    padding: 16,
  },
  stopItem: {
    flexDirection: 'row',
    minHeight: 60,
  },
  timelineColumn: {
    alignItems: 'center',
    marginRight: 16,
  },
  timelineDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  dotCompleted: {
    backgroundColor: '#34c759',
  },
  dotCurrent: {
    backgroundColor: '#0066cc',
    borderWidth: 4,
    borderColor: '#e6f0ff',
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 4,
  },
  lineCompleted: {
    backgroundColor: '#34c759',
  },
  stopContent: {
    flex: 1,
    paddingBottom: 20,
  },
  stopHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stopName: {
    fontSize: 15,
    color: '#666',
  },
  textCurrent: {
    color: '#0066cc',
    fontWeight: 'bold',
  },
  stopTime: {
    fontSize: 12,
    color: '#999',
  },
  currentIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  currentLabel: {
    fontSize: 12,
    color: '#0066cc',
    marginLeft: 4,
    fontWeight: '500',
  },
  mapSection: {
    marginBottom: 20,
  },
  mapCard: {
    height: 180,
    backgroundColor: '#f0f4f8',
    overflow: 'hidden',
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  mapPlaceholderText: {
    marginTop: 12,
    fontSize: 15,
    color: '#666',
    fontWeight: '500',
  },
  openMapButton: {
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  openMapText: {
    fontSize: 13,
    color: '#0066cc',
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    opacity: 0.6,
  },
  footerText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 6,
  },
});

export default BusRouteScreen;
