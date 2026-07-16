import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Package, MapPin, Calendar, ShieldCheck, User, Wrench } from 'lucide-react';

const AssetDetailScreen = ({ assetId }: { assetId: string }) => {
    const [asset, setAsset] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        (async () => {
            try {
                const data = await api.getAssetDetail(assetId);
                setAsset(data);
            } catch (err: any) {
                setError(err?.message || 'Asset not found');
            } finally {
                setLoading(false);
            }
        })();
    }, [assetId]);

    if (loading) return <div className="p-6 text-center text-gray-500">Loading...</div>;
    if (error || !asset) return <div className="p-6 text-center text-gray-500">{error || 'Asset not found'}</div>;

    return (
        <div className="p-6 max-w-2xl mx-auto space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
                        <Package className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900 font-outfit">{asset.name}</h1>
                        <p className="text-xs text-gray-400 font-mono">{asset.code || 'NO-CODE'}</p>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                        <div><p className="text-xs text-gray-400 uppercase font-bold">Location</p><p className="text-sm font-semibold text-gray-900">{asset.location || asset.facility?.name || 'Not assigned'}</p></div>
                    </div>
                    <div className="flex items-start gap-2">
                        <User className="w-4 h-4 text-gray-400 mt-0.5" />
                        <div><p className="text-xs text-gray-400 uppercase font-bold">Assigned To</p><p className="text-sm font-semibold text-gray-900">{asset.assigned_user?.full_name || 'Unassigned'}</p></div>
                    </div>
                    <div className="flex items-start gap-2">
                        <Calendar className="w-4 h-4 text-gray-400 mt-0.5" />
                        <div><p className="text-xs text-gray-400 uppercase font-bold">Purchase Date</p><p className="text-sm font-semibold text-gray-900">{asset.purchase_date ? new Date(asset.purchase_date).toLocaleDateString() : 'Unknown'}</p></div>
                    </div>
                    <div className="flex items-start gap-2">
                        <ShieldCheck className="w-4 h-4 text-gray-400 mt-0.5" />
                        <div><p className="text-xs text-gray-400 uppercase font-bold">Warranty</p><p className="text-sm font-semibold text-gray-900">{asset.warranty_expiry ? `Until ${new Date(asset.warranty_expiry).toLocaleDateString()}` : 'No warranty on file'}</p></div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h2 className="font-bold text-gray-900 flex items-center gap-2 mb-3"><Wrench className="w-4 h-4 text-indigo-500" /> Maintenance History</h2>
                {(!asset.maintenance_tickets || asset.maintenance_tickets.length === 0) ? (
                    <p className="text-sm text-gray-400">No maintenance tickets on record for this asset.</p>
                ) : (
                    <div className="space-y-2">
                        {asset.maintenance_tickets.map((t: any) => (
                            <div key={t.id} className="flex items-center justify-between border-b border-gray-50 pb-2">
                                <div>
                                    <p className="text-sm font-semibold text-gray-900">{t.issue_title}</p>
                                    <p className="text-xs text-gray-400">{new Date(t.created_at).toLocaleDateString()}</p>
                                </div>
                                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">{t.status}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AssetDetailScreen;
