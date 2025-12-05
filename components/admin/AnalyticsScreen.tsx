

import React, { useState, useEffect } from 'react';
import { ChartBarIcon, ReceiptIcon, BriefcaseIcon, TrendingUpIcon, UsersIcon } from '../../constants';
import DonutChart from '../ui/DonutChart';
import { supabase } from '../../lib/supabase';

const SimpleBarChart = ({ data, colors }: { data: { label: string, value: number, a11yLabel: string }[], colors: string[] }) => {
    const maxValue = Math.max(...data.map(d => d.value));
    return (
        <div className="space-y-3">
            {data.map((item, index) => (
                <div key={item.label} className="flex items-center space-x-2">
                    <div className="w-16 text-xs font-medium text-gray-500 text-right">{item.label}</div>
                    <div className="flex-1 bg-gray-200 rounded-full h-4">
                        <div
                            className={`${colors[index % colors.length]} h-4 rounded-full`}
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
    const maxValue = Math.max(...data.map(d => d.value));
    return (
        <div className="flex justify-around items-end h-40 pt-4 border-b border-l border-gray-200">
            {data.map((item, index) => (
                <div key={item.label} className="flex flex-col items-center w-1/5">
                    <div className="flex-grow flex items-end w-1/2">
                        <div
                            className={`${colors[index % colors.length]} w-full`}
                            style={{ height: `${(item.value / maxValue) * 100}%` }}
                            aria-label={`${item.label}: ${item.value} hours`}
                        ></div>
                    </div>
                    <span className="text-xs text-gray-500 mt-1">{item.label}</span>
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
    const stepX = (width - padding * 2) / (data.length - 1);
    const stepY = (height - padding * 2) / maxValue;

    const points = data.map((d, i) => `${padding + i * stepX},${height - padding - d * stepY}`).join(' ');

    return (
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
            {/* Y axis lines */}
            <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#e5e7eb" strokeWidth="1" />
            <line x1={padding} y1={height - padding - (50 * stepY)} x2={width - padding} y2={height - padding - (50 * stepY)} stroke="#e5e7eb" strokeWidth="1" strokeDasharray="2" />
            <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#e5e7eb" strokeWidth="1" strokeDasharray="2" />
            {/* Y axis labels */}
            <text x="0" y={padding + 5} fontSize="10" fill="#6b7280">100%</text>
            <text x="5" y={height - padding - (50 * stepY) + 3} fontSize="10" fill="#6b7280">50%</text>

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
        </svg>
    );
};

const EnrollmentLineChart = ({ data, color }: { data: { year: number, count: number }[], color: string }) => {
    const width = 300;
    const height = 150;
    const padding = 30;
    const maxCount = data.length > 0 ? Math.ceil(Math.max(...data.map(d => d.count)) / 100) * 100 : 100;
    const minCount = data.length > 0 ? Math.floor(Math.min(...data.map(d => d.count)) / 100) * 100 : 0;
    const stepX = data.length > 1 ? (width - padding * 2) / (data.length - 1) : 0;
    const countRange = maxCount - minCount;
    const stepY = countRange > 0 ? (height - padding * 2) / countRange : 0;

    const points = data.map((d, i) => `${padding + i * stepX},${height - padding - (d.count - minCount) * stepY}`).join(' ');

    return (
        <div className="relative">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
                {/* Y-axis lines and labels */}
                <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#e5e7eb" strokeWidth="1" />
                <text x={padding - 5} y={padding + 5} textAnchor="end" fontSize="10" fill="#6b7280">{maxCount}</text>
                <text x={padding - 5} y={height - padding} textAnchor="end" fontSize="10" fill="#6b7280">{minCount}</text>

                <polyline fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points={points} />
                {data.map((d, i) => (
                    <circle key={i} cx={padding + i * stepX} cy={height - padding - (d.count - minCount) * stepY} r="3" fill="white" stroke={color} strokeWidth="2" />
                ))}
            </svg>
            <div className="flex justify-between px-5 -mt-4">
                {data.map(item => <span key={item.year} className="text-xs text-gray-500 font-medium">{item.year}</span>)}
            </div>
        </div>
    );
};


const AnalyticsScreen: React.FC = () => {
    const [enrollmentData, setEnrollmentData] = useState<{ year: number; count: number }[]>([]);

    useEffect(() => {
        fetchEnrollmentData();
    }, []);

    const fetchEnrollmentData = async () => {
        try {
            const { data: studentsData } = await supabase
                .from('students')
                .select('created_at');

            if (studentsData) {
                // Group by year and count
                const yearCounts: { [year: number]: number } = {};
                studentsData.forEach((s: any) => {
                    const year = new Date(s.created_at).getFullYear();
                    yearCounts[year] = (yearCounts[year] || 0) + 1;
                });

                // Convert to array format for chart
                const trendData = Object.entries(yearCounts)
                    .map(([year, count]) => ({ year: parseInt(year), count }))
                    .sort((a, b) => a.year - b.year)
                    .slice(-5); // Last 5 years

                setEnrollmentData(trendData.length > 0 ? trendData : [{ year: new Date().getFullYear(), count: 0 }]);
            }
        } catch (err) {
            console.error('Error fetching enrollment data:', err);
        }
    };

    const performanceData = [
        { label: 'Excellent', value: 25, a11yLabel: '25% of students scored Excellent' },
        { label: 'Good', value: 45, a11yLabel: '45% of students scored Good' },
        { label: 'Average', value: 20, a11yLabel: '20% of students scored Average' },
        { label: 'Poor', value: 10, a11yLabel: '10% of students scored Poor' },
    ];

    const workloadData = [
        { label: 'Mr. A', value: 40 },
        { label: 'Ms. B', value: 35 },
        { label: 'Mr. C', value: 45 },
        { label: 'Ms. D', value: 38 },
        { label: 'Mr. E', value: 42 },
    ];

    const attendanceTrendData = [88, 92, 90, 95, 94, 96, 95];

    return (
        <div className="flex flex-col h-full bg-gray-50">
            <main className="flex-grow p-4 overflow-y-auto">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Student Performance */}
                    <div className="bg-white rounded-2xl shadow-sm p-4">
                        <div className="flex items-center space-x-3 mb-4">
                            <div className="bg-sky-100 text-sky-500 p-2 rounded-lg"><ChartBarIcon /></div>
                            <h3 className="font-bold text-gray-800">Student Performance</h3>
                        </div>
                        <SimpleBarChart data={performanceData} colors={['bg-green-500', 'bg-sky-500', 'bg-amber-500', 'bg-red-500']} />
                    </div>

                    {/* Fee Compliance */}
                    <div className="bg-white rounded-2xl shadow-sm p-4">
                        <div className="flex items-center space-x-3 mb-4">
                            <div className="bg-green-100 text-green-500 p-2 rounded-lg"><ReceiptIcon /></div>
                            <h3 className="font-bold text-gray-800">Fee Compliance</h3>
                        </div>
                        <div className="flex items-center justify-around">
                            <div className="relative">
                                <DonutChart percentage={75} color="#22c55e" size={120} strokeWidth={12} />
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-2xl font-bold text-gray-800">75%</span>
                                    <span className="text-xs text-gray-500">Paid</span>
                                </div>
                            </div>
                            <div className="space-y-2 text-sm">
                                <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div><span>Paid: 75%</span></div>
                                <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-amber-500 mr-2"></div><span>Overdue: 15%</span></div>
                                <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div><span>Unpaid: 10%</span></div>
                            </div>
                        </div>
                    </div>

                    {/* Teacher Workload */}
                    <div className="bg-white rounded-2xl shadow-sm p-4">
                        <div className="flex items-center space-x-3 mb-4">
                            <div className="bg-amber-100 text-amber-500 p-2 rounded-lg"><BriefcaseIcon /></div>
                            <h3 className="font-bold text-gray-800">Teacher Workload (Weekly Hours)</h3>
                        </div>
                        <SimpleVerticalBarChart data={workloadData} colors={['bg-sky-400', 'bg-sky-500', 'bg-sky-600', 'bg-sky-400', 'bg-sky-500']} />
                    </div>

                    {/* Attendance Trend */}
                    <div className="bg-white rounded-2xl shadow-sm p-4">
                        <div className="flex items-center space-x-3 mb-2">
                            <div className="bg-indigo-100 text-indigo-500 p-2 rounded-lg"><TrendingUpIcon /></div>
                            <h3 className="font-bold text-gray-800">Attendance Trend (Last 7 Days)</h3>
                        </div>
                        <SimpleLineChart data={attendanceTrendData} color="#6366f1" />
                    </div>

                    {/* Enrollment Trends */}
                    <div className="bg-white rounded-2xl shadow-sm p-4 lg:col-span-2">
                        <div className="flex items-center space-x-3 mb-2">
                            <div className="bg-purple-100 text-purple-500 p-2 rounded-lg"><UsersIcon /></div>
                            <h3 className="font-bold text-gray-800">Enrollment Trends</h3>
                        </div>
                        <EnrollmentLineChart data={enrollmentData} color="#8b5cf6" />
                    </div>
                </div>
            </main>
        </div>
    );
};

export default AnalyticsScreen;
