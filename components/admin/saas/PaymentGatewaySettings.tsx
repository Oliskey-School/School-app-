import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Globe, Shield, CheckCircle, XCircle, AlertCircle, Save, ExternalLink } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface GatewaySettingsProps {
    navigateTo: (screen: string) => void;
}

const PaymentGatewaySettings: React.FC<GatewaySettingsProps> = ({ navigateTo }) => {
    const [settings, setSettings] = useState({
        paystackEnabled: true,
        flutterwaveEnabled: true,
        defaultGateway: 'paystack' as 'paystack' | 'flutterwave',
        platformMargin: 2.5, // 2.5% platform fee
        testMode: true
    });

    const handleSave = () => {
        toast.success('Gateway settings updated');
        // Logic to update a 'gateway_configs' table in the database
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Payment Gateways</h1>
                <p className="text-gray-600 mt-1">Configure and manage platform-wide payment integrations.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Paystack Card */}
                <Card className={settings.paystackEnabled ? 'ring-2 ring-indigo-400' : 'ring-1 ring-gray-200'}>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-xl font-bold flex items-center gap-2">
                            <img src="https://paystack.com/favicon.png" alt="Paystack" className="w-6 h-6" />
                            Paystack
                        </CardTitle>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={settings.paystackEnabled}
                                onChange={(e) => setSettings({ ...settings, paystackEnabled: e.target.checked })}
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none ring-0 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
                            <CheckCircle className="w-4 h-4" /> Connected
                        </div>
                        <p className="text-sm text-gray-500 italic">"Powering payments for African businesses."</p>
                        <div className="pt-2">
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Capabilities</h4>
                            <div className="flex flex-wrap gap-2">
                                <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded font-bold uppercase">Cards</span>
                                <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded font-bold uppercase">Bank Transfer</span>
                                <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded font-bold uppercase">USSD</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Flutterwave Card */}
                <Card className={settings.flutterwaveEnabled ? 'ring-2 ring-orange-400' : 'ring-1 ring-gray-200'}>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-xl font-bold flex items-center gap-2">
                            <img src="https://flutterwave.com/favicon.png" alt="Flutterwave" className="w-6 h-6" />
                            Flutterwave
                        </CardTitle>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={settings.flutterwaveEnabled}
                                onChange={(e) => setSettings({ ...settings, flutterwaveEnabled: e.target.checked })}
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none ring-0 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                        </label>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
                            <CheckCircle className="w-4 h-4" /> Connected
                        </div>
                        <p className="text-sm text-gray-500 italic">"The easiest way to make and accept payments globally from Africa."</p>
                        <div className="pt-2">
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Capabilities</h4>
                            <div className="flex flex-wrap gap-2">
                                <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded font-bold uppercase">Cards</span>
                                <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded font-bold uppercase">MoMo</span>
                                <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded font-bold uppercase">QR</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-indigo-900">
                        <Shield className="w-5 h-5" /> Global Config
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Default Gateway</label>
                            <select
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                                value={settings.defaultGateway}
                                onChange={(e) => setSettings({ ...settings, defaultGateway: e.target.value as any })}
                            >
                                <option value="paystack">Paystack (Recommended)</option>
                                <option value="flutterwave">Flutterwave</option>
                            </select>
                            <p className="mt-2 text-xs text-gray-500 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" /> This gateway will be selected by default on all school payment pages.
                            </p>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Platform Transaction Margin (%)</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    step="0.1"
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                                    value={settings.platformMargin}
                                    onChange={(e) => setSettings({ ...settings, platformMargin: parseFloat(e.target.value) })}
                                />
                                <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 font-bold">%</span>
                            </div>
                            <p className="mt-2 text-xs text-gray-500">Additional percentage added to gateway fees for platform maintenance.</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-xl border border-amber-100">
                        <AlertCircle className="w-5 h-5 text-amber-600" />
                        <div className="flex-1">
                            <h5 className="text-sm font-bold text-amber-900">Sandbox / Test Mode</h5>
                            <p className="text-xs text-amber-700">Test mode is currently enabled. Payments will use test keys and no real money will be charged.</p>
                        </div>
                        <button
                            onClick={() => setSettings({ ...settings, testMode: !settings.testMode })}
                            className={`px-4 py-1.5 rounded-lg font-bold text-xs transition ${settings.testMode ? 'bg-amber-600 text-white' : 'bg-gray-200 text-gray-600'}`}
                        >
                            {settings.testMode ? 'DISABLE TEST MODE' : 'ENABLE TEST MODE'}
                        </button>
                    </div>

                    <div className="pt-4 border-t border-gray-100 flex justify-end">
                        <button
                            onClick={handleSave}
                            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition shadow-lg shadow-indigo-200"
                        >
                            <Save className="w-5 h-5" /> Save Configuration
                        </button>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="bg-slate-900 text-white border-none">
                    <CardHeader>
                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                            Developer API Reference
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-xs text-slate-400">Manage your secret keys and webhooks directly in your .env or provider dashboard.</p>
                        <div className="flex flex-col gap-2">
                            <a href="https://dashboard.paystack.com" target="_blank" rel="noreferrer" className="flex items-center justify-between p-3 bg-slate-800 rounded-lg hover:bg-slate-750 transition">
                                <span className="text-xs font-medium">Paystack Dashboard</span>
                                <ExternalLink className="w-3 h-3 text-slate-500" />
                            </a>
                            <a href="https://dashboard.flutterwave.com" target="_blank" rel="noreferrer" className="flex items-center justify-between p-3 bg-slate-800 rounded-lg hover:bg-slate-750 transition">
                                <span className="text-xs font-medium">Flutterwave Dashboard</span>
                                <ExternalLink className="w-3 h-3 text-slate-500" />
                            </a>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default PaymentGatewaySettings;
