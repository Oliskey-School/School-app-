import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Building2, Plus, MapPin, Phone, Trash2, Edit2, CheckCircle2, Building, Globe } from 'lucide-react';
import { toast } from 'react-hot-toast';
import PremiumLoader from '../ui/PremiumLoader';

interface Branch {
    id: string;
    name: string;
    address: string;
    phone: string;
    is_main: boolean;
    curriculum_type: string;
    location: string;
    code: string;
}

const SchoolManagementScreen: React.FC = () => {
    const { currentSchool, user } = useAuth();
    const [branches, setBranches] = useState<Branch[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddingBranch, setIsAddingBranch] = useState(false);
    const [editingBranch, setEditingBranch] = useState<Branch | null>(null);

    const [formData, setFormData] = useState({
        name: '',
        address: '',
        phone: '',
        location: '',
        curriculum_type: 'nigerian',
        is_main: false
    });

    useEffect(() => {
        if (currentSchool?.id) {
            fetchBranches();
        }
    }, [currentSchool?.id]);

    const fetchBranches = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('branches')
                .select('*')
                .eq('school_id', currentSchool?.id)
                .order('is_main', { ascending: false })
                .order('name');

            if (error) throw error;
            setBranches(data || []);
        } catch (error: any) {
            toast.error('Failed to load branches: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
        }));
    };

    const resetForm = () => {
        setFormData({
            name: '',
            address: '',
            phone: '',
            location: '',
            curriculum_type: 'nigerian',
            is_main: false
        });
        setIsAddingBranch(false);
        setEditingBranch(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (!currentSchool?.id) return;

            const payload = {
                ...formData,
                school_id: currentSchool.id
            };

            if (editingBranch) {
                const { error } = await supabase
                    .from('branches')
                    .update(payload)
                    .eq('id', editingBranch.id);
                if (error) throw error;
                toast.success('Branch updated successfully');
            } else {
                // If setting as main, ensure others are not main (simple logic)
                if (formData.is_main) {
                    await supabase.from('branches').update({ is_main: false }).eq('school_id', currentSchool.id);
                }
                
                const { error } = await supabase.from('branches').insert([payload]);
                if (error) throw error;
                toast.success('New branch added');
            }

            resetForm();
            fetchBranches();
        } catch (error: any) {
            toast.error('Operation failed: ' + error.message);
        }
    };

    const handleEdit = (branch: Branch) => {
        setEditingBranch(branch);
        setFormData({
            name: branch.name,
            address: branch.address || '',
            phone: branch.phone || '',
            location: branch.location || '',
            curriculum_type: branch.curriculum_type || 'nigerian',
            is_main: branch.is_main
        });
        setIsAddingBranch(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this branch?')) return;
        try {
            const { error } = await supabase.from('branches').delete().eq('id', id);
            if (error) throw error;
            toast.success('Branch deleted');
            fetchBranches();
        } catch (error: any) {
            toast.error('Delete failed: ' + error.message);
        }
    };

    if (loading && !isAddingBranch) return <PremiumLoader message="Managing school infrastructure..." />;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">School Branches</h2>
                    <p className="text-slate-500 font-medium">Manage multiple campuses and locations.</p>
                </div>
                {!isAddingBranch && (
                    <button
                        onClick={() => setIsAddingBranch(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all active:scale-95"
                    >
                        <Plus className="w-5 h-5" /> Add Branch
                    </button>
                )}
            </div>

            {isAddingBranch ? (
                <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 p-8 animate-slide-in-up">
                    <div className="flex justify-between items-center mb-8">
                        <h3 className="text-xl font-bold text-slate-800">{editingBranch ? 'Edit Branch' : 'Create New Branch'}</h3>
                        <button onClick={resetForm} className="text-slate-400 hover:text-slate-600 font-bold uppercase text-xs tracking-widest">Cancel</button>
                    </div>

                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Branch Name</label>
                            <div className="relative group">
                                <Building className="absolute left-4 top-4 w-5 h-5 text-slate-400 group-focus-within:text-indigo-600" />
                                <input
                                    name="name"
                                    required
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    className="w-full pl-12 pr-4 py-4 bg-slate-50/50 border-2 border-slate-100 rounded-2xl focus:border-indigo-600 focus:bg-white outline-none transition-all"
                                    placeholder="e.g. Lagos Mainland Campus"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Location/City</label>
                            <div className="relative group">
                                <MapPin className="absolute left-4 top-4 w-5 h-5 text-slate-400 group-focus-within:text-indigo-600" />
                                <input
                                    name="location"
                                    value={formData.location}
                                    onChange={handleInputChange}
                                    className="w-full pl-12 pr-4 py-4 bg-slate-50/50 border-2 border-slate-100 rounded-2xl focus:border-indigo-600 focus:bg-white outline-none transition-all"
                                    placeholder="e.g. Ikeja, Lagos"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Contact Phone</label>
                            <div className="relative group">
                                <Phone className="absolute left-4 top-4 w-5 h-5 text-slate-400 group-focus-within:text-indigo-600" />
                                <input
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleInputChange}
                                    className="w-full pl-12 pr-4 py-4 bg-slate-50/50 border-2 border-slate-100 rounded-2xl focus:border-indigo-600 focus:bg-white outline-none transition-all"
                                    placeholder="Official Phone Number"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Curriculum Focus</label>
                            <div className="relative group">
                                <Globe className="absolute left-4 top-4 w-5 h-5 text-slate-400 group-focus-within:text-indigo-600" />
                                <select
                                    name="curriculum_type"
                                    value={formData.curriculum_type}
                                    onChange={handleInputChange}
                                    className="w-full pl-12 pr-4 py-4 bg-slate-50/50 border-2 border-slate-100 rounded-2xl focus:border-indigo-600 focus:bg-white outline-none transition-all appearance-none cursor-pointer"
                                >
                                    <option value="nigerian">Nigerian (NERDC)</option>
                                    <option value="british">British (UK NC)</option>
                                    <option value="american">American (Common Core)</option>
                                    <option value="dual">Dual Curriculum</option>
                                </select>
                            </div>
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Full Address</label>
                            <input
                                name="address"
                                value={formData.address}
                                onChange={handleInputChange}
                                className="w-full px-4 py-4 bg-slate-50/50 border-2 border-slate-100 rounded-2xl focus:border-indigo-600 focus:bg-white outline-none transition-all"
                                placeholder="Complete physical address"
                            />
                        </div>

                        <div className="md:col-span-2 py-2">
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${formData.is_main ? 'bg-indigo-600 border-indigo-600' : 'border-slate-200 group-hover:border-indigo-300'}`}>
                                    {formData.is_main && <CheckCircle2 className="w-4 h-4 text-white" />}
                                </div>
                                <input
                                    type="checkbox"
                                    name="is_main"
                                    className="sr-only"
                                    checked={formData.is_main}
                                    onChange={(e) => setFormData(prev => ({ ...prev, is_main: e.target.checked }))}
                                />
                                <span className="text-sm font-bold text-slate-600">Set as primary/main campus</span>
                            </label>
                        </div>

                        <div className="md:col-span-2 flex justify-end gap-4 pt-4 border-t border-slate-100 mt-4">
                            <button
                                type="button"
                                onClick={resetForm}
                                className="px-8 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-10 py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-xl shadow-indigo-600/20 hover:bg-indigo-700 transition-all active:scale-95"
                            >
                                {editingBranch ? 'Update Branch' : 'Create Branch'}
                            </button>
                        </div>
                    </form>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {branches.map(branch => (
                        <div key={branch.id} className="group bg-white rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:border-indigo-100 transition-all duration-300 overflow-hidden relative">
                            {branch.is_main && (
                                <div className="absolute top-0 right-0 px-4 py-1.5 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-bl-2xl">
                                    Main Campus
                                </div>
                            )}
                            
                            <div className="p-8">
                                <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-indigo-600 transition-colors duration-300">
                                    <Building2 className="w-6 h-6 text-indigo-600 group-hover:text-white transition-colors duration-300" />
                                </div>
                                
                                <h3 className="text-xl font-bold text-slate-900 mb-2 truncate" title={branch.name}>{branch.name}</h3>
                                
                                <div className="space-y-3 mt-6">
                                    <div className="flex items-start gap-3 text-slate-500 text-sm">
                                        <MapPin className="w-4 h-4 mt-0.5 text-slate-400" />
                                        <span className="line-clamp-2">{branch.address || branch.location || 'No address set'}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-slate-500 text-sm">
                                        <Phone className="w-4 h-4 text-slate-400" />
                                        <span>{branch.phone || 'No phone set'}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-slate-500 text-sm capitalize">
                                        <Globe className="w-4 h-4 text-slate-400" />
                                        <span>{branch.curriculum_type} curriculum</span>
                                    </div>
                                </div>

                                <div className="flex gap-2 mt-8 pt-6 border-t border-slate-50">
                                    <button
                                        onClick={() => handleEdit(branch)}
                                        className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-50 text-slate-600 rounded-xl font-bold hover:bg-indigo-50 hover:text-indigo-600 transition-all"
                                    >
                                        <Edit2 className="w-4 h-4" /> Edit
                                    </button>
                                    {!branch.is_main && (
                                        <button
                                            onClick={() => handleDelete(branch.id)}
                                            className="w-12 flex items-center justify-center bg-slate-50 text-slate-400 rounded-xl font-bold hover:bg-red-50 hover:text-red-600 transition-all"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}

                    {branches.length === 0 && (
                        <div className="col-span-full py-20 bg-white rounded-[3rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center">
                            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                                <Building2 className="w-10 h-10 text-slate-300" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800">No branches found</h3>
                            <p className="text-slate-500 mt-2 max-w-xs mx-auto">Start by adding your institution's first or main campus.</p>
                            <button
                                onClick={() => setIsAddingBranch(true)}
                                className="mt-8 px-8 py-3 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg hover:bg-indigo-700 transition-all"
                            >
                                Add Your First Branch
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default SchoolManagementScreen;
