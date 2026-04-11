import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { toast } from 'react-hot-toast';
import { PackageIcon, QrCodeIcon, MapPinIcon, AlertCircleIcon, TrashIcon, XIcon, PlusIcon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAutoSync } from '../../hooks/useAutoSync';

const AssetInventory = () => {
    const { currentSchool } = useAuth();
    const [assets, setAssets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        code: '',
        category: 'Furniture',
        location: '',
        status: 'good',
        condition: 'New',
        current_value: 0,
        quantity: 1
    });

    useEffect(() => {
        if (currentSchool?.id) {
            fetchAssets();
        } else {
            setLoading(false);
        }
    }, [currentSchool?.id]);

    useAutoSync(['assets'], () => {
        console.log('🔄 [AssetInventory] Real-time auto-sync triggered');
        fetchAssets();
    });

    const fetchAssets = async () => {
        try {
            if (!currentSchool?.id) return;
            setLoading(true);
            const data = await api.getAssets();
            setAssets(data || []);
        } catch (error) {
            console.error('Error fetching assets:', error);
            toast.error('Failed to load assets');
        } finally {
            setLoading(false);
        }
    };

    const handleAddAsset = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.createAsset({
                ...formData,
                school_id: currentSchool?.id
            });
            toast.success('Asset added successfully');
            setIsAdding(false);
            setFormData({
                name: '',
                code: '',
                category: 'Furniture',
                location: '',
                status: 'good',
                condition: 'New',
                current_value: 0,
                quantity: 1
            });
            fetchAssets();
        } catch (error) {
            toast.error('Failed to add asset');
        }
    };

    const handleDeleteAsset = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this asset?')) return;
        try {
            await api.deleteAsset(id);
            toast.success('Asset deleted');
            fetchAssets();
        } catch (error) {
            toast.error('Failed to delete asset');
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 font-outfit">Asset Inventory</h2>
                        <p className="text-sm text-gray-500">Track school equipment and manage property</p>
                    </div>
                    <button 
                        onClick={() => setIsAdding(true)}
                        className="flex items-center space-x-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 active:scale-95"
                    >
                        <PlusIcon size={20} />
                        <span className="font-semibold">Add Asset</span>
                    </button>
                </div>

                {loading ? (
                    <div className="py-20 text-center">
                        <div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                        <p className="text-gray-500 font-medium">Loading inventory...</p>
                    </div>
                ) : assets.length === 0 ? (
                    <div className="py-20 text-center bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                        <PackageIcon size={48} className="mx-auto mb-4 text-gray-300" />
                        <p className="text-gray-500 font-medium">No assets found. Start by adding one!</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {assets.map((asset) => (
                            <div key={asset.id} className="bg-white border border-gray-100 rounded-3xl p-5 hover:shadow-xl hover:shadow-gray-100 transition-all group relative">
                                <div className="absolute top-4 right-4 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button className="p-2 hover:bg-indigo-50 text-gray-400 hover:text-indigo-600 rounded-xl transition-colors">
                                        <QrCodeIcon size={18} />
                                    </button>
                                    <button 
                                        onClick={() => handleDeleteAsset(asset.id)}
                                        className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-xl transition-colors"
                                    >
                                        <TrashIcon size={18} />
                                    </button>
                                </div>
                                <div className="mb-4">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${
                                        asset.category === 'Electronics' ? 'bg-blue-50 text-blue-600' :
                                        asset.category === 'Furniture' ? 'bg-amber-50 text-amber-600' :
                                        'bg-purple-50 text-purple-600'
                                    }`}>
                                        <PackageIcon size={24} />
                                    </div>
                                    <h3 className="font-bold text-gray-900 text-lg leading-tight">{asset.name}</h3>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-1 block">{asset.code || 'NO-CODE'}</span>
                                </div>
                                
                                <div className="space-y-2.5">
                                    <div className="flex items-center text-sm text-gray-600">
                                        <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center mr-3 text-gray-400">
                                            <MapPinIcon size={16} />
                                        </div>
                                        <span className="font-medium">{asset.location || 'Not Assigned'}</span>
                                    </div>
                                    <div className="flex items-center text-sm">
                                        <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center mr-3 text-gray-400">
                                            <AlertCircleIcon size={16} />
                                        </div>
                                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                                            asset.status === 'good' ? 'bg-green-50 text-green-700' : 
                                            asset.status === 'fair' ? 'bg-amber-50 text-amber-700' : 
                                            'bg-red-50 text-red-700'
                                        }`}>
                                            {asset.status}
                                        </span>
                                    </div>
                                </div>

                                <div className="mt-6 pt-4 border-t border-gray-50 flex justify-between items-center">
                                    <div>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase">Current Value</p>
                                        <p className="text-sm font-bold text-gray-900">₦{asset.current_value?.toLocaleString()}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] text-gray-400 font-bold uppercase">Condition</p>
                                        <span className="text-sm font-bold text-indigo-600">{asset.condition}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Add Asset Modal */}
            {isAdding && (
                <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="font-bold text-gray-900 font-outfit text-xl">Register New Asset</h3>
                            <button onClick={() => setIsAdding(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                                <XIcon size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleAddAsset} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5">Asset Name</label>
                                    <input 
                                        type="text" required
                                        value={formData.name}
                                        onChange={e => setFormData({...formData, name: e.target.value})}
                                        className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium"
                                        placeholder="e.g. Science Lab Microscope"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5">Asset Code</label>
                                    <input 
                                        type="text"
                                        value={formData.code}
                                        onChange={e => setFormData({...formData, code: e.target.value})}
                                        className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium"
                                        placeholder="SL-001"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5">Category</label>
                                    <select 
                                        value={formData.category}
                                        onChange={e => setFormData({...formData, category: e.target.value})}
                                        className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium"
                                    >
                                        <option value="Furniture">Furniture</option>
                                        <option value="Electronics">Electronics</option>
                                        <option value="Books">Library Books</option>
                                        <option value="Laboratory">Laboratory Equipment</option>
                                        <option value="Sports">Sports Gear</option>
                                    </select>
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5">Location</label>
                                    <input 
                                        type="text"
                                        value={formData.location}
                                        onChange={e => setFormData({...formData, location: e.target.value})}
                                        className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium"
                                        placeholder="e.g. Block A, Room 4"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5">Condition</label>
                                    <select 
                                        value={formData.condition}
                                        onChange={e => setFormData({...formData, condition: e.target.value})}
                                        className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium"
                                    >
                                        <option value="New">Brand New</option>
                                        <option value="Good">Good / Working</option>
                                        <option value="Fair">Fair / Used</option>
                                        <option value="Poor">Poor / Needs Repair</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5">Value (₦)</label>
                                    <input 
                                        type="number"
                                        value={formData.current_value}
                                        onChange={e => setFormData({...formData, current_value: Number(e.target.value)})}
                                        className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium"
                                    />
                                </div>
                            </div>
                            <div className="pt-4">
                                <button type="submit" className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-xl shadow-indigo-100 transition-all active:scale-95">
                                    Save Asset to Inventory
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AssetInventory;

