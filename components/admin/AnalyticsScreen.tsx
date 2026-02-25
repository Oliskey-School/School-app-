
import React, { useState, useEffect } from 'react';
import { ChartBarIcon, ReceiptIcon, BriefcaseIcon, TrendingUpIcon, UsersIcon, RefreshIcon } from '../../constants';
import DonutChart from '../ui/DonutChart';
import { supabase } from '../../lib/supabase';
import { fetchAnalyticsMetrics } from '../../lib/database';

const SimpleBarChart = ({ data, colors }: { data: { label: string, value: number, a11yLabel: string }[], colors: string[] }) => {
    const maxValue = Math.max(...data.map(d => d.value)) || 100;
    return (
        <div className="space-y-3">
            {data.map((item, index) => (
                <div key={item.label} className="flex items-center space-x-2">
                    <div className="w-16 text-xs font-medium text-gray-500 text-right">{item.label}</div>
                    <div className="flex-1 bg-gray-200 rounded-full h-4">
                        <div
                            className={`${colors[index % colors.length]} h-4 rounded-full transition-all duration-500`}
                            style={{ width: `${(item.value / maxValue) * 100}%` }}
                            aria-label={item.a11yLabel}
                        ></div>
                    </div>
                    <div className="w-8 text-xs font-bold text-gray-700">{item.value}%</div>
                </div>
            ))}
        </div>
    );
};

const SimpleVerticalBarChart = ({ data, colors }: { data: { label: string, value: number }[], colors: string[] }) => {
    const maxValue = Math.max(...data.map(d => d.value)) || 10;
    return (
        <div className="flex justify-around items-end h-40 pt-4 border-b border-l border-gray-200">
            {data.map((item, index) => (
                <div key={item.label} className="flex flex-col items-center w-1/5">
                    <div className="flex-grow flex items-end w-1/2">
                        <div
                            className={`${colors[index % colors.length]} w-full rounded-t-sm transition-all duration-500`}
                            style={{ height: `${(item.value / maxValue) * 100}%` }}
                            aria-label={`${item.label}: ${item.value} hours`}
                        ></div>
                    </div>
                    <span className="text-xs text-gray-500 mt-1 truncate max-w-full">{item.label}</span>
                </div>
            ))}
        </div>
    )
}

const SimpleLineChart = ({ data, color }: { data: number[], color: string }) => {
    const width = 280;
    const height = 120;
    const padding = 20;
    const maxValue = 100; // Assuming percentage
    const stepX = (width - padding * 2) / (data.length - 1 || 1);
    const stepY = (height - padding * 2) / maxValue;

    const points = data.map((d, i) => `${padding + i * stepX},${height - padding - d * stepY}`).join(' ');

    return (
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
            {/* Y axis lines */}
            <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#e5e7eb" strokeWidth="1" />
            <line x1={padding} y1={height - padding - (50 * stepY)} x2={width - padding} y2={height - padding - (50 * stepY)} stroke="#e5e7eb" strokeWidth="1" strokeDasharray="2" />
            <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#e5e7eb" strokeWidth="1" strokeDasharray="2" />

            {data.length > 0 && (
                <>
                    <polyline
                        fill="none"
                        stroke={color}
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={points}
                    />
                    {data.map((d, i) => (
                        <circle key={i} cx={padding + i * stepX} cy={height - padding - d * stepY} r="3" fill="white" stroke={color} strokeWidth="2" />
                    ))}
                </>
            )}
        </svg>
    );
};

const EnrollmentLineChart = ({ data, color }: { data: { year: number, count: number }[], color: string }) => {
    const width = 300;
    const height = 150;
    const padding = 30;
    const maxCount = data.length > 0 ? Math.ceil(Math.max(...data.map(d => d.count)) / 100) * 100 : 100;
    const minCount = 0;
    const stepX = data.length > 1 ? (width - padding * 2) / (data.length - 1) : 0;
    const countRange = maxCount - minCount || 1;
    const stepY = (height - padding * 2) / countRange;

    const points = data.map((d, i) => `${padding + i * stepX},${height - padding - (d.count - minCount) * stepY}`).join(' ');

    return (
        <div className="relative">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
                <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#e5e7eb" strokeWidth="1" />
                {data.length > 0 && (
                    <>
                        <polyline fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points={points} />
                        {data.map((d, i) => (
                            <circle key={i} cx={padding + i * stepX} cy={height - padding - (d.count - minCount) * stepY} r="3" fill="white" stroke={color} strokeWidth="2" />
                        ))}
                    </>
                )}
            </svg>
            <div className="flex justify-between px-5 -mt-4">
                {data.map(item => <span key={item.year} className="text-xs text-gray-500 font-medium">{item.year}</span>)}
            </div>
        </div>
    );
};

interface AnalyticsScreenProps {
    schoolId: string;
    currentBranchId: string | null;
}

const AnalyticsScreen: React.FC<AnalyticsScreenProps> = ({ schoolId, currentBranchId }) => {
    const [loading, setLoading] = useState(true);
    const [metrics, setMetrics] = useState<any>({
        performance: [],
        fees: { paid: 0, overdue: 0, unpaid: 0, total: 0 },
        workload: [],
        attendance: [],
        enrollment: []
    });

    const loadData = async () => {
        setLoading(true);
        const data = await fetchAnalyticsMetrics(schoolId, currentBranchId || undefined);
        if (data) {
            setMetrics(data);
        }
        setLoading(false);
    };

    useEffect(() => {
        if (schoolId) {
            loadData();
        }
    }, [schoolId, currentBranchId]);

    return (
        <div className="flex flex-col h-full bg-gray-50 relative">
            <div className="absolute top-4 right-4 z-10">
                <button onClick={loadData} className="p-2 bg-white rounded-full shadow-sm hover:bg-gray-100 text-gray-500" title="Refresh Data">
                    <RefreshIcon className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            <main className="flex-grow p-4 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Student Performance */}
                    <div className="bg-white rounded-2xl shadow-sm p-4">
                        <div className="flex items-center space-x-3 mb-4">
                            <div className="bg-sky-100 text-sky-500 p-2 rounded-lg"><ChartBarIcon /></div>
                            <h3 className="font-bold text-gray-800">Student Performance</h3>
                        </div>
                        {loading ? <div className="h-40 animate-pulse bg-gray-100 rounded-lg"></div> :
                            <SimpleBarChart data={metrics.performance} colors={['bg-green-500', 'bg-sky-500', 'bg-amber-500', 'bg-red-500']} />
                        }
                    </div>

                    {/* Fee Compliance */}
                    <div className="bg-white rounded-2xl shadow-sm p-4">
                        <div className="flex items-center space-x-3 mb-4">
                            <div className="bg-green-100 text-green-500 p-2 rounded-lg"><ReceiptIcon /></div>
                            <h3 className="font-bold text-gray-800">Fee Compliance</h3>
                        </div>
                        {loading ? <div className="h-40 animate-pulse bg-gray-100 rounded-lg"></div> :
                            <div className="flex items-center justify-around">
                                <div className="relative">
                                    <DonutChart percentage={metrics.fees.paid || 0} color="#22c55e" size={120} strokeWidth={12} />
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className="text-2xl font-bold text-gray-800">{metrics.fees.paid}%</span>
                                        <span className="text-xs text-gray-500">Paid</span>
                                    </div>
                                </div>
                                <div className="space-y-2 text-sm">
                                    <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div><span>Paid: {metrics.fees.paid}%</span></div>
                                    <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-amber-500 mr-2"></div><span>Overdue: {metrics.fees.overdue}%</span></div>
                                    <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div><span>Unpaid: {metrics.fees.unpaid}%</span></div>
                                </div>
                            </div>
                        }
                    </div>

                    {/* Teacher Workload */}
                    <div className="bg-white rounded-2xl shadow-sm p-4">
                        <div className="flex items-center space-x-3 mb-4">
                            <div className="bg-amber-100 text-amber-500 p-2 rounded-lg"><BriefcaseIcon /></div>
                            <h3 className="font-bold text-gray-800">Teacher Workload (Weekly Hours)</h3>
                        </div>
                        {loading ? <div className="h-40 animate-pulse bg-gray-100 rounded-lg"></div> :
                            <SimpleVerticalBarChart data={metrics.workload} colors={['bg-sky-400', 'bg-sky-500', 'bg-sky-600', 'bg-sky-400', 'bg-sky-500']} />
                        }
                    </div>

                    {/* Attendance Trend */}
                    <div className="bg-white rounded-2xl shadow-sm p-4">
                        <div className="flex items-center space-x-3 mb-2">
                            <div className="bg-indigo-100 text-indigo-500 p-2 rounded-lg"><TrendingUpIcon /></div>
                            <h3 className="font-bold text-gray-800">Attendance Trend (Last 7 Days)</h3>
                        </div>
                        {loading ? <div className="h-40 animate-pulse bg-gray-100 rounded-lg"></div> :
                            <SimpleLineChart data={metrics.attendance} color="#6366f1" />
                        }
                    </div>

                    {/* Enrollment Trends */}
                    <div className="bg-white rounded-2xl shadow-sm p-4 md:col-span-2">
                        <div className="flex items-center space-x-3 mb-2">
                            <div className="bg-purple-100 text-purple-500 p-2 rounded-lg"><UsersIcon /></div>
                            <h3 className="font-bold text-gray-800">Enrollment Trends</h3>
                        </div>
                        {loading ? <div className="h-40 animate-pulse bg-gray-100 rounded-lg"></div> :
                            <EnrollmentLineChart data={metrics.enrollment} color="#8b5cf6" />
                        }
                    </div>
                </div>
            </main>
        </div>
    );
};

export default AnalyticsScreen;
