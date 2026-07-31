import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import {
    TrendingUp,
    TrendingDown,
    Users,
    UserPlus,
    UserMinus,
    Calendar,
    RefreshCw
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import CenteredLoader from '../ui/CenteredLoader';

interface MonthData {
    month: string;
    enrolled: number;
    withdrawn: number;
    net: number;
}

const EnrollmentTrendsWidget = () => {
    const { currentSchool } = useAuth();
    const [period, setPeriod] = useState<'6m' | '12m'>('6m');
    const [data, setData] = useState<MonthData[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTrends();
    }, []);

    const fetchTrends = async () => {
        setLoading(true);
        try {
            const result = await api.getEnrollmentTrends(currentSchool?.id);
            setData(result);
        } catch (error) {
            console.error('Fetch trends error:', error);
            toast.error('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const displayData = period === '12m' ? data : data.slice(-6);
    const totalEnrolled = displayData.reduce((s, d) => s + d.enrolled, 0);
    const totalWithdrawn = displayData.reduce((s, d) => s + d.withdrawn, 0);
    const netGrowth = totalEnrolled - totalWithdrawn;
    const maxVal = Math.max(...(displayData.length > 0 ? displayData.map(d => d.enrolled) : [10]), 10);

    return (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="font-bold text-gray-800 font-outfit text-lg">Enrollment Trends</h3>
                    <p className="text-xs text-gray-400">Real-time enrollment tracking</p>
                </div>
                <div className="relative flex p-0.5 bg-gray-100 rounded-lg">
                    <button onClick={() => setPeriod('6m')} className={`relative px-3 py-1 rounded-md text-xs font-bold transition-colors ${period === '6m' ? 'text-indigo-600' : 'text-gray-500'}`}>
                        {period === '6m' && <motion.div layoutId="enrollTrendTab" className="absolute inset-0 bg-white shadow-sm rounded-md" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
                        <span className="relative">6M</span>
                    </button>
                    <button onClick={() => setPeriod('12m')} className={`relative px-3 py-1 rounded-md text-xs font-bold transition-colors ${period === '12m' ? 'text-indigo-600' : 'text-gray-500'}`}>
                        {period === '12m' && <motion.div layoutId="enrollTrendTab" className="absolute inset-0 bg-white shadow-sm rounded-md" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
                        <span className="relative">12M</span>
                    </button>
                </div>
            </div>

            {loading ? (
                <CenteredLoader className="h-48" />
            ) : (
                <>
                    {/* Mini stats */}
                    <div className="grid grid-cols-3 gap-3 mb-5">
                        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="bg-emerald-50 p-3 rounded-xl text-center">
                            <p className="text-xl font-bold text-emerald-700">{totalEnrolled}</p>
                            <p className="text-xs font-bold text-emerald-500">Enrolled</p>
                        </motion.div>
                        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: 0.03 }} className="bg-red-50 p-3 rounded-xl text-center">
                            <p className="text-xl font-bold text-red-700">{totalWithdrawn}</p>
                            <p className="text-xs font-bold text-red-500">Withdrawn</p>
                        </motion.div>
                        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: 0.06 }} className="bg-indigo-50 p-3 rounded-xl text-center">
                            <div className="flex items-center justify-center space-x-1">
                                {netGrowth >= 0 ? <TrendingUp className="w-4 h-4 text-emerald-600" /> : <TrendingDown className="w-4 h-4 text-red-600" />}
                                <p className="text-xl font-bold text-indigo-700">{netGrowth > 0 ? `+${netGrowth}` : netGrowth}</p>
                            </div>
                            <p className="text-xs font-bold text-indigo-500">Net Growth</p>
                        </motion.div>
                    </div>

                    {/* Bar Chart */}
                    <div className="flex items-end space-x-2 h-32">
                        {displayData.map((d, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center">
                                <div className="flex flex-col items-center w-full space-y-0.5">
                                    <motion.div initial={{ height: 0 }} animate={{ height: `${Math.max((d.enrolled / maxVal) * 100, 2)}px` }} transition={{ duration: 0.5, delay: Math.min(i, 12) * 0.05, ease: 'easeOut' }} className="w-full bg-emerald-400 rounded-t" title={`+${d.enrolled} enrolled`} />
                                    {d.withdrawn > 0 && <motion.div initial={{ height: 0 }} animate={{ height: `${Math.max((d.withdrawn / maxVal) * 100, 2)}px` }} transition={{ duration: 0.5, delay: Math.min(i, 12) * 0.05 + 0.05, ease: 'easeOut' }} className="w-full bg-red-300 rounded-b" title={`-${d.withdrawn} withdrawn`} />}
                                </div>
                                <span className="text-xs text-gray-400 mt-1 font-bold">{d.month.split(' ')[0].slice(0, 3)}</span>
                            </div>
                        ))}
                        {displayData.length === 0 && (
                            <div className="w-full text-center text-xs text-gray-400 py-10">No trend data available.</div>
                        )}
                    </div>

                    <div className="flex items-center justify-center space-x-4 mt-3 text-xs text-gray-400">
                        <span className="flex items-center space-x-1"><span className="w-3 h-3 bg-emerald-400 rounded" /> <span>Enrolled</span></span>
                        <span className="flex items-center space-x-1"><span className="w-3 h-3 bg-red-300 rounded" /> <span>Withdrawn</span></span>
                    </div>
                </>
            )}
        </div>
    );
};

export default EnrollmentTrendsWidget;
