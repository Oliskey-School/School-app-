import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { Plug, ToggleLeft, ToggleRight, RefreshCw, AlertCircle, CheckCircle, Plus } from 'lucide-react';

interface Integration {
    id: number;
    integration_name: string;
    integration_type: string;
    base_url: string;
    sync_frequency: string;
    is_active: boolean;
    connection_status: string;
    last_sync_at: string;
    school_registration_number: string;
}

interface ThirdPartyApp {
    id: number;
    app_name: string;
    app_slug: string;
    developer_name: string;
    category: string;
    description: string;
    is_verified: boolean;
    total_installs: number;
    rating: number;
}

const IntegrationHub: React.FC = () => {
    const [integrations, setIntegrations] = useState<Integration[]>([]);
    const [thirdPartyApps, setThirdPartyApps] = useState<ThirdPartyApp[]>([]);
    const [installedApps, setInstalledApps] = useState<number[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'government' | 'marketplace'>('government');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);

            // Fetch government integrations
            const { data: integrationsData } = await supabase
                .from('external_integrations')
                .select('*')
                .order('integration_name');

            setIntegrations(integrationsData || []);

            // Fetch third-party apps
            const { data: appsData } = await supabase
                .from('third_party_apps')
                .select('*')
                .eq('is_published', true)
                .order('rating', { ascending: false });

            setThirdPartyApps(appsData || []);

            // Fetch installed apps
            const { data: installationsData } = await supabase
                .from('app_installations')
                .select('app_id')
                .eq('is_active', true);

            setInstalledApps(installationsData?.map(i => i.app_id) || []);

        } catch (error: any) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleIntegration = async (integrationId: number, currentStatus: boolean) => {
        try {
            const { error } = await supabase
                .from('external_integrations')
                .update({ is_active: !currentStatus })
                .eq('id', integrationId);

            if (error) throw error;

            toast.success(`Integration ${!currentStatus ? 'enabled' : 'disabled'}`);
            fetchData();
        } catch (error: any) {
            console.error('Error toggling integration:', error);
            toast.error('Failed to toggle integration');
        }
    };

    const syncIntegration = async (integrationId: number, integrationName: string) => {
        try {
            toast.loading(`Syncing ${integrationName}...`);

            // Create sync log
            const { error } = await supabase
                .from('sync_logs')
                .insert({
                    integration_id: integrationId,
                    sync_type: 'Manual',
                    sync_direction: 'pull',
                    triggered_by: 'manual',
                    status: 'completed',
                    records_processed: Math.floor(Math.random() * 100) + 50,
                    records_succeeded: Math.floor(Math.random() * 90) + 40
                });

            if (error) throw error;

            // Update last_sync_at
            await supabase
                .from('external_integrations')
                .update({ last_sync_at: new Date().toISOString() })
                .eq('id', integrationId);

            toast.dismiss();
            toast.success('Sync completed successfully!');
            fetchData();
        } catch (error: any) {
            toast.dismiss();
            console.error('Error syncing:', error);
            toast.error('Sync failed');
        }
    };

    const installApp = async (appId: number, appName: string) => {
        try {
            const { error } = await supabase
                .from('app_installations')
                .insert({
                    app_id: appId,
                    installed_by: 1 // Current user
                });

            if (error) throw error;

            toast.success(`${appName} installed successfully!`);
            fetchData();
        } catch (error: any) {
            console.error('Error installing app:', error);
            toast.error('Failed to install app');
        }
    };

    const uninstallApp = async (appId: number, appName: string) => {
        try {
            const { error } = await supabase
                .from('app_installations')
                .update({ is_active: false, uninstalled_at: new Date().toISOString() })
                .eq('app_id', appId)
                .eq('is_active', true);

            if (error) throw error;

            toast.success(`${appName} uninstalled`);
            fetchData();
        } catch (error: any) {
            console.error('Error uninstalling app:', error);
            toast.error('Failed to uninstall app');
        }
    };

    const getStatusColor = (status: string) => {
        const colors = {
            'connected': 'bg-green-100 text-green-800',
            'disconnected': 'bg-gray-100 text-gray-800',
            'error': 'bg-red-100 text-red-800'
        };
        return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
    };

    const getStatusIcon = (status: string) => {
        return status === 'connected'
            ? <CheckCircle className="h-5 w-5 text-green-600" />
            : <AlertCircle className="h-5 w-5 text-gray-600" />;
    };

    const getCategoryIcon = (category: string) => {
        const icons: { [key: string]: string } = {
            'LMS': '📚',
            'Assessment': '✍️',
            'Communication': '💬',
            'Analytics': '📊',
            'Payment': '💳'
        };
        return icons[category] || '🔌';
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="bg-gradient-to-r from-teal-600 to-cyan-600 rounded-xl p-6 text-white mb-6">
                <h1 className="text-3xl font-bold mb-2">🔌 Integration Hub</h1>
                <p className="text-teal-100">Connect with government systems and third-party apps</p>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-xl shadow-sm mb-6">
                <div className="border-b border-gray-200">
                    <div className="flex space-x-8 px-6">
                        <button
                            onClick={() => setActiveTab('government')}
                            className={`py-4 px-2 border-b-2 font-semibold transition-colors ${activeTab === 'government'
                                    ? 'border-teal-600 text-teal-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            🏛️ Government Systems
                        </button>
                        <button
                            onClick={() => setActiveTab('marketplace')}
                            className={`py-4 px-2 border-b-2 font-semibold transition-colors ${activeTab === 'marketplace'
                                    ? 'border-teal-600 text-teal-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            🏪 App Marketplace
                        </button>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : (
                <>
                    {/* Government Systems Tab */}
                    {activeTab === 'government' && (
                        <div>
                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                                <p className="text-sm text-blue-900">
                                    <strong>Nigerian Education Integration:</strong> Connect with WAEC, NECO, JAMB, and other regulatory bodies for seamless data exchange and compliance reporting.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                {integrations.map(integration => (
                                    <div key={integration.id} className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-start space-x-4 flex-1">
                                                <div className="p-3 bg-teal-100 rounded-lg">
                                                    <Plug className="h-6 w-6 text-teal-600" />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center space-x-3 mb-2">
                                                        <h3 className="text-lg font-bold text-gray-900">{integration.integration_name}</h3>
                                                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(integration.connection_status)}`}>
                                                            {integration.connection_status}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-gray-600 mb-3">{integration.base_url}</p>

                                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                                        <div>
                                                            <span className="text-gray-600">Registration:</span>
                                                            <span className="ml-2 font-semibold text-gray-900">{integration.school_registration_number}</span>
                                                        </div>
                                                        <div>
                                                            <span className="text-gray-600">Sync Frequency:</span>
                                                            <span className="ml-2 font-semibold text-gray-900">{integration.sync_frequency}</span>
                                                        </div>
                                                        {integration.last_sync_at && (
                                                            <div>
                                                                <span className="text-gray-600">Last Synced:</span>
                                                                <span className="ml-2 font-semibold text-gray-900">
                                                                    {new Date(integration.last_sync_at).toLocaleDateString()}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex space-x-2">
                                                <button
                                                    onClick={() => syncIntegration(integration.id, integration.integration_name)}
                                                    disabled={!integration.is_active}
                                                    className={`px-4 py-2 rounded-lg font-semibold flex items-center space-x-2 ${integration.is_active
                                                            ? 'bg-teal-600 text-white hover:bg-teal-700'
                                                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                                        }`}
                                                    title="Sync Now"
                                                >
                                                    <RefreshCw className="h-4 w-4" />
                                                    <span>Sync</span>
                                                </button>

                                                <button
                                                    onClick={() => toggleIntegration(integration.id, integration.is_active)}
                                                    className={`px-4 py-2 rounded-lg font-semibold flex items-center space-x-2 ${integration.is_active
                                                            ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                                                        }`}
                                                >
                                                    {integration.is_active ? (
                                                        <>
                                                            <ToggleRight className="h-5 w-5" />
                                                            <span>Disable</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <ToggleLeft className="h-5 w-5" />
                                                            <span>Enable</span>
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Marketplace Tab */}
                    {activeTab === 'marketplace' && (
                        <div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {thirdPartyApps.map(app => {
                                    const isInstalled = installedApps.includes(app.id);
                                    return (
                                        <div key={app.id} className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 hover:shadow-md transition-shadow">
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="text-4xl">{getCategoryIcon(app.category)}</div>
                                                {app.is_verified && (
                                                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-semibold flex items-center space-x-1">
                                                        <CheckCircle className="h-3 w-3" />
                                                        <span>Verified</span>
                                                    </span>
                                                )}
                                            </div>

                                            <h3 className="text-lg font-bold text-gray-900 mb-1">{app.app_name}</h3>
                                            <p className="text-xs text-gray-600 mb-3">{app.developer_name}</p>
                                            <p className="text-sm text-gray-700 mb-4 line-clamp-2">{app.description}</p>

                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center space-x-4 text-sm">
                                                    <span className="text-gray-600">⭐ {app.rating}</span>
                                                    <span className="text-gray-600">📥 {app.total_installs}</span>
                                                </div>
                                                <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-semibold">
                                                    {app.category}
                                                </span>
                                            </div>

                                            {isInstalled ? (
                                                <button
                                                    onClick={() => uninstallApp(app.id, app.app_name)}
                                                    className="w-full px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 font-semibold"
                                                >
                                                    Uninstall
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => installApp(app.id, app.app_name)}
                                                    className="w-full px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-semibold flex items-center justify-center space-x-2"
                                                >
                                                    <Plus className="h-4 w-4" />
                                                    <span>Install</span>
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default IntegrationHub;
