import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { PackageIcon, QrCodeIcon, MapPinIcon, AlertCircleIcon } from 'lucide-react';

const AssetInventory = () => {
    const [assets, setAssets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAssets();
    }, []);

    const fetchAssets = async () => {
        try {
            const { data, error } = await supabase
                .from('assets')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setAssets(data || []);
        } catch (error) {
            console.error('Error fetching assets:', error);
            toast.error('Failed to load assets');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">Asset Inventory</h2>
                        <p className="text-sm text-gray-500">Track school equipment and generate QR codes</p>
                    </div>
                    <button className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                        <PackageIcon size={20} />
                        <span>Add New Asset</span>
                    </button>
                </div>

                {loading ? (
                    <div className="py-8 text-center text-gray-500">Loading inventory...</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {assets.map((asset) => (
                            <div key={asset.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <h3 className="font-semibold text-gray-900">{asset.asset_name}</h3>
                                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">{asset.asset_code}</span>
                                    </div>
                                    <button className="text-gray-400 hover:text-indigo-600">
                                        <QrCodeIcon size={20} />
                                    </button>
                                </div>
                                <div className="space-y-2 text-sm text-gray-600">
                                    <div className="flex items-center">
                                        <MapPinIcon size={16} className="mr-2 text-gray-400" />
                                        {asset.location}
                                    </div>
                                    <div className="flex items-center">
                                        <AlertCircleIcon size={16} className="mr-2 text-gray-400" />
                                        Status: <span className={`ml-1 font-medium ${asset.status === 'Active' ? 'text-green-600' : 'text-amber-600'
                                            }`}>{asset.status}</span>
                                    </div>
                                </div>
                                <div className="mt-4 pt-3 border-t flex justify-between items-center text-xs text-gray-500">
                                    <span>Val: ₦{asset.current_value?.toLocaleString()}</span>
                                    <span>Cond: {asset.condition}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AssetInventory;
