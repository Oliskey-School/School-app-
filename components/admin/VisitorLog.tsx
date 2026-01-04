import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { UserIcon, CheckCircleIcon, ClockIcon, CameraIcon } from '../../constants';

interface Visitor {
    id: number;
    visitor_name: string;
    visitor_phone: string;
    purpose: string;
    host_name: string;
    check_in_time: string;
    check_out_time: string | null;
    qr_code: string;
    verification_status: string;
    photo_url: string | null;
}

const VisitorLog: React.FC = () => {
    const [visitors, setVisitors] = useState<Visitor[]>([]);
    const [showCheckIn, setShowCheckIn] = useState(false);
    const [formData, setFormData] = useState({
        visitor_name: '',
        visitor_phone: '',
        visitor_email: '',
        purpose: '',
        host_name: '',
        id_type: 'National ID',
        id_number: '',
        vehicle_info: ''
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchVisitors();
    }, []);

    const fetchVisitors = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('visitor_logs')
                .select('*')
                .order('check_in_time', { ascending: false })
                .limit(50);

            if (error) throw error;
            setVisitors(data || []);
        } catch (error: any) {
            console.error('Error:', error);
            toast.error('Failed to load visitors');
        } finally {
            setLoading(false);
        }
    };

    const generateQRCode = () => {
        return `VIS-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    };

    const handleCheckIn = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const qrCode = generateQRCode();

            const { error } = await supabase.from('visitor_logs').insert({
                ...formData,
                qr_code: qrCode,
                verification_status: 'Verified'
            });

            if (error) throw error;

            toast.success('Visitor checked in successfully!');
            setShowCheckIn(false);
            setFormData({
                visitor_name: '',
                visitor_phone: '',
                visitor_email: '',
                purpose: '',
                host_name: '',
                id_type: 'National ID',
                id_number: '',
                vehicle_info: ''
            });
            fetchVisitors();
        } catch (error: any) {
            toast.error('Failed to check in visitor');
        }
    };

    const handleCheckOut = async (visitorId: number) => {
        try {
            const { error } = await supabase
                .from('visitor_logs')
                .update({ check_out_time: new Date().toISOString() })
                .eq('id', visitorId);

            if (error) throw error;
            toast.success('Visitor checked out');
            fetchVisitors();
        } catch (error: any) {
            toast.error('Failed to check out visitor');
        }
    };

    const activeVisitors = visitors.filter(v => !v.check_out_time);
    const todayVisitors = visitors.filter(v =>
        new Date(v.check_in_time).toDateString() === new Date().toDateString()
    );

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Visitor Log</h2>
                    <p className="text-sm text-gray-600 mt-1">Track and manage school visitors</p>
                </div>
                <button
                    onClick={() => setShowCheckIn(true)}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                >
                    Check In Visitor
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <p className="text-sm text-blue-700">On Premises</p>
                    <p className="text-2xl font-bold text-blue-800">{activeVisitors.length}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                    <p className="text-sm text-green-700">Today's Visitors</p>
                    <p className="text-2xl font-bold text-green-800">{todayVisitors.length}</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                    <p className="text-sm text-purple-700">Total Records</p>
                    <p className="text-2xl font-bold text-purple-800">{visitors.length}</p>
                </div>
            </div>

            {/* Visitor List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-bold text-gray-900">Recent Visitors</h3>
                </div>
                <div className="divide-y divide-gray-200">
                    {loading ? (
                        <div className="p-12 text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                        </div>
                    ) : visitors.length === 0 ? (
                        <div className="p-12 text-center text-gray-500">
                            <UserIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                            <p>No visitors logged</p>
                        </div>
                    ) : (
                        visitors.map((visitor) => (
                            <div key={visitor.id} className="p-6 hover:bg-gray-50">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center space-x-2 mb-2">
                                            <h4 className="font-bold text-gray-900">{visitor.visitor_name}</h4>
                                            {!visitor.check_out_time && (
                                                <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                                                    On Premises
                                                </span>
                                            )}
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${visitor.verification_status === 'Verified'
                                                    ? 'bg-blue-100 text-blue-800'
                                                    : 'bg-yellow-100 text-yellow-800'
                                                }`}>
                                                {visitor.verification_status}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-600 mb-1">
                                            <strong>Purpose:</strong> {visitor.purpose}
                                        </p>
                                        <p className="text-sm text-gray-600 mb-1">
                                            <strong>Host:</strong> {visitor.host_name}
                                        </p>
                                        <p className="text-sm text-gray-600">
                                            <strong>Phone:</strong> {visitor.visitor_phone}
                                        </p>
                                        <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                                            <span>In: {new Date(visitor.check_in_time).toLocaleString()}</span>
                                            {visitor.check_out_time && (
                                                <span>Out: {new Date(visitor.check_out_time).toLocaleString()}</span>
                                            )}
                                        </div>
                                    </div>
                                    {!visitor.check_out_time && (
                                        <button
                                            onClick={() => handleCheckOut(visitor.id)}
                                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                                        >
                                            Check Out
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Check In Modal */}
            {showCheckIn && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <h3 className="text-xl font-bold text-gray-900 mb-4">Visitor Check-In</h3>
                        <form onSubmit={handleCheckIn} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Visitor Name *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.visitor_name}
                                        onChange={(e) => setFormData({ ...formData, visitor_name: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Phone Number *
                                    </label>
                                    <input
                                        type="tel"
                                        required
                                        value={formData.visitor_phone}
                                        onChange={(e) => setFormData({ ...formData, visitor_phone: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    value={formData.visitor_email}
                                    onChange={(e) => setFormData({ ...formData, visitor_email: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Purpose of Visit *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.purpose}
                                    onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                                    placeholder="e.g., Meeting with principal"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Host/Person to See *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.host_name}
                                    onChange={(e) => setFormData({ ...formData, host_name: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        ID Type
                                    </label>
                                    <select
                                        value={formData.id_type}
                                        onChange={(e) => setFormData({ ...formData, id_type: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    >
                                        <option>National ID</option>
                                        <option>Driver's License</option>
                                        <option>Passport</option>
                                        <option>Voter's Card</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        ID Number
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.id_number}
                                        onChange={(e) => setFormData({ ...formData, id_number: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Vehicle Information (if applicable)
                                </label>
                                <input
                                    type="text"
                                    value={formData.vehicle_info}
                                    onChange={(e) => setFormData({ ...formData, vehicle_info: e.target.value })}
                                    placeholder="e.g., Toyota Camry - ABC 123 XY"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                />
                            </div>

                            <div className="flex space-x-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowCheckIn(false)}
                                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                                >
                                    Check In
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VisitorLog;
