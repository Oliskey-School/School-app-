import React, { useState, useEffect } from 'react';
import { useSaaS } from '../../../contexts/SaaSContext';
import { Plan } from '../../../types';
import api from '../../../lib/api';
import {
    Check,
    X,
    Plus,
    Edit,
    Trash,
    Save,
    Copy,
    ArrowUp,
    ArrowDown,
    Star,
    Info,
    Layout
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { logAuditAction } from '../../../lib/auditLogger';

interface PlanManagementScreenProps {
    navigateTo: (view: string, title: string, props?: any) => void;
}

const PlanManagementScreen: React.FC<PlanManagementScreenProps> = ({ navigateTo }) => {
    const { plans, refreshPlans } = useSaaS();
    const [isEditing, setIsEditing] = useState(false);
    const [editingPlan, setEditingPlan] = useState<Partial<Plan> | null>(null);
    const [showComparison, setShowComparison] = useState(false);

    const handleSave = async () => {
        if (!editingPlan) return;

        try {
            if (editingPlan.id) {
                await api.updatePlan(editingPlan.id, editingPlan);
            } else {
                await api.createPlan(editingPlan);
            }

            toast.success(editingPlan.id ? 'Plan updated' : 'Plan created');
            setIsEditing(false);
            setEditingPlan(null);
            refreshPlans();
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this plan? This may affect existing subscriptions.')) return;

        try {
            await api.deletePlan(id);
            toast.success('Plan deleted');
            refreshPlans();
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const duplicatePlan = (plan: Plan) => {
        const { id, ...rest } = plan;
        setEditingPlan({ ...rest, name: `${plan.name} (Copy)`, is_active: false });
        setIsEditing(true);
    };

    const allFeatures = Array.from(new Set(plans.flatMap(p => Object.keys(p.features || {}))));

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Subscription Plans</h1>
                    <p className="text-gray-600 mt-1">Manage tiers, pricing, and feature limits.</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => setShowComparison(!showComparison)}
                        className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                    >
                        <Layout className="w-4 h-4" /> {showComparison ? 'Grid View' : 'Compare Plans'}
                    </button>
                    <button
                        onClick={() => {
                            setEditingPlan({
                                name: '',
                                price_monthly: 0,
                                price_yearly: 0,
                                features: {},
                                limits: { max_students: 100, max_teachers: 10 },
                                is_active: false
                            });
                            setIsEditing(true);
                        }}
                        className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition shadow-lg shadow-indigo-200"
                    >
                        <Plus className="w-5 h-5" /> Create Plan
                    </button>
                </div>
            </div>

            {showComparison ? (
                /* Plan Comparison Table */
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50">
                                <th className="p-6 border-b border-gray-200 font-bold text-gray-900 w-1/4">Feature</th>
                                {plans.map(plan => (
                                    <th key={plan.id} className="p-6 border-b border-gray-200 text-center">
                                        <div className="font-bold text-gray-900">{plan.name}</div>
                                        <div className="text-indigo-600 font-black">${plan.price_monthly}/mo</div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {/* Comparison Rows */}
                            <tr className="bg-gray-50/50">
                                <td className="p-6 font-semibold text-gray-700 text-xs uppercase tracking-wider">Limits</td>
                                {plans.map(plan => <td key={plan.id} className="p-6 text-center" />)}
                            </tr>
                            {['max_students', 'max_teachers', 'storage_gb'].map(limit => (
                                <tr key={limit}>
                                    <td className="p-6 text-gray-600 capitalize">{limit.replace('_', ' ')}</td>
                                    {plans.map(plan => (
                                        <td key={plan.id} className="p-6 text-center font-medium text-gray-900">
                                            {plan.limits?.[limit] || '—'}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                            <tr className="bg-gray-50/50">
                                <td className="p-6 font-semibold text-gray-700 text-xs uppercase tracking-wider">Features</td>
                                {plans.map(plan => <td key={plan.id} className="p-6 text-center" />)}
                            </tr>
                            {allFeatures.map(feature => (
                                <tr key={feature}>
                                    <td className="p-6 text-gray-600 capitalize">{feature.replace('_', ' ')}</td>
                                    {plans.map(plan => (
                                        <td key={plan.id} className="p-6 text-center">
                                            {plan.features?.[feature] ? (
                                                <Check className="w-5 h-5 text-green-500 mx-auto" />
                                            ) : (
                                                <X className="w-5 h-5 text-gray-300 mx-auto" />
                                            )}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                /* Plans Grid */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {plans.map(plan => (
                        <div key={plan.id} className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 flex flex-col relative group hover:-translate-y-1 transition duration-300">
                            {plan.name.toLowerCase().includes('pro') && (
                                <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-indigo-500 to-purple-500" />
                            )}
                            <div className="p-8 flex-1">
                                <div className="flex justify-between items-start mb-4">
                                    <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                                    <div className="flex gap-2">
                                        <button onClick={() => duplicatePlan(plan)} className="p-1.5 text-gray-400 hover:text-indigo-600 transition" title="Duplicate">
                                            <Copy className="w-4 h-4" />
                                        </button>
                                        {plan.is_active ? (
                                            <span className="bg-green-100 text-green-800 text-[10px] px-2 py-0.5 rounded-full font-bold">ACTIVE</span>
                                        ) : (
                                            <span className="bg-gray-100 text-gray-800 text-[10px] px-2 py-0.5 rounded-full font-bold">DRAFT</span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-baseline gap-1 mb-6">
                                    <span className="text-4xl font-black text-gray-900">${plan.price_monthly}</span>
                                    <span className="text-gray-500">/month</span>
                                </div>

                                <div className="space-y-4 mb-8">
                                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b pb-2">At a glance</h4>
                                    {Object.entries(plan.limits || {}).map(([key, val]) => (
                                        <div key={key} className="flex justify-between text-sm">
                                            <span className="text-gray-500 capitalize">{key.replace('max_', '').replace('_', ' ')} limit</span>
                                            <span className="font-bold text-gray-800">{String(val)}</span>
                                        </div>
                                    ))}
                                    <div className="flex flex-wrap gap-2 pt-2">
                                        {Object.entries(plan.features || {}).map(([key, val]) => val && (
                                            <span key={key} className="px-2 py-1 bg-indigo-50 text-indigo-700 text-[10px] rounded font-medium capitalize">
                                                {key.replace('_', ' ')}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-2">
                                <button
                                    onClick={() => {
                                        setEditingPlan(plan);
                                        setIsEditing(true);
                                    }}
                                    className="flex-1 flex items-center justify-center gap-2 py-2 bg-white border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-100 transition"
                                >
                                    <Edit className="w-3.5 h-3.5" /> Edit
                                </button>
                                <button
                                    onClick={() => handleDelete(plan.id)}
                                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                >
                                    <Trash className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Edit Modal */}
            {isEditing && editingPlan && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
                            <h2 className="text-xl font-bold text-gray-900">{editingPlan.id ? 'Edit Plan' : 'Create New Plan'}</h2>
                            <button onClick={() => setIsEditing(false)} className="p-2 hover:bg-gray-100 rounded-lg transition">
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        <div className="p-8 space-y-8">
                            {/* Basic Info */}
                            <div className="grid grid-cols-2 gap-6">
                                <div className="col-span-2">
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Plan Name</label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500"
                                        value={editingPlan.name}
                                        onChange={e => setEditingPlan({ ...editingPlan, name: e.target.value })}
                                        placeholder="e.g. Professional High School"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Monthly Price ($)</label>
                                    <input
                                        type="number"
                                        className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500"
                                        value={editingPlan.price_monthly}
                                        onChange={e => setEditingPlan({ ...editingPlan, price_monthly: parseFloat(e.target.value) })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Yearly Price ($)</label>
                                    <input
                                        type="number"
                                        className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500"
                                        value={editingPlan.price_yearly}
                                        onChange={e => setEditingPlan({ ...editingPlan, price_yearly: parseFloat(e.target.value) })}
                                    />
                                </div>
                            </div>

                            {/* Features Toggle */}
                            <div className="space-y-4">
                                <h4 className="font-bold text-gray-900 flex items-center gap-2">
                                    <Star className="w-4 h-4 text-amber-500" /> Modules & Features
                                </h4>
                                <div className="grid grid-cols-2 gap-4">
                                    {['online_exams', 'lms_portal', 'parent_mobile_app', 'finance_module', 'stem_lab', 'attendance_tracking', 'biometric_integration'].map(feat => (
                                        <label key={feat} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition">
                                            <input
                                                type="checkbox"
                                                className="w-4 h-4 text-indigo-600 rounded"
                                                checked={!!editingPlan.features?.[feat]}
                                                onChange={e => {
                                                    const newFeats = { ...(editingPlan.features || {}) };
                                                    if (e.target.checked) newFeats[feat] = true;
                                                    else delete newFeats[feat];
                                                    setEditingPlan({ ...editingPlan, features: newFeats });
                                                }}
                                            />
                                            <span className="text-sm font-medium text-gray-700 capitalize">{feat.replace('_', ' ')}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Limits */}
                            <div className="space-y-4">
                                <h4 className="font-bold text-gray-900 flex items-center gap-2">
                                    <Info className="w-4 h-4 text-indigo-500" /> Capacity Limits
                                </h4>
                                <div className="grid grid-cols-3 gap-4">
                                    {['max_students', 'max_teachers', 'storage_gb'].map(limit => (
                                        <div key={limit}>
                                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">{limit.replace('_', ' ')}</label>
                                            <input
                                                type="number"
                                                className="w-full px-3 py-2 bg-gray-50 border-none rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                                                value={editingPlan.limits?.[limit] || 0}
                                                onChange={e => {
                                                    const newLimits = { ...(editingPlan.limits || {}) };
                                                    newLimits[limit] = parseInt(e.target.value);
                                                    setEditingPlan({ ...editingPlan, limits: newLimits });
                                                }}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex items-center gap-2 p-4 bg-indigo-50 rounded-xl">
                                <input
                                    type="checkbox"
                                    id="active"
                                    className="w-4 h-4 text-indigo-600 rounded"
                                    checked={editingPlan.is_active}
                                    onChange={e => setEditingPlan({ ...editingPlan, is_active: e.target.checked })}
                                />
                                <label htmlFor="active" className="text-sm font-bold text-indigo-900">Publish this plan immediately</label>
                            </div>
                        </div>

                        <div className="p-6 border-t border-gray-100 flex gap-3 sticky bottom-0 bg-white">
                            <button
                                onClick={() => setIsEditing(false)}
                                className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-gray-700 font-bold hover:bg-gray-50 transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition flex items-center justify-center gap-2"
                            >
                                <Save className="w-5 h-5" /> Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PlanManagementScreen;

