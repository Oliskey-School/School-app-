
import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ChartBarIcon, ReceiptIcon, BriefcaseIcon, TrendingUpIcon, UsersIcon, RefreshIcon, ChevronDownIcon, AlertTriangleIcon } from '../../constants';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { visibleItems, hiddenCount, enrollmentPoints, dayLabels, type EnrollmentPoint } from './analyticsChartData';
import DonutChart from '../ui/DonutChart';
import { api } from '../../lib/api';
import { fetchAnalyticsMetrics } from '../../lib/database';
import { useAutoSync } from '../../hooks/useAutoSync';

const PERFORMANCE_LIMIT = 10;
const WORKLOAD_LIMIT = 5;
const AXIS_TICK = { fontSize: 12, fill: '#6b7280' };

/** Empty / error body for a card, in the app's existing empty-state style. */
const CardState = ({ icon, title, message, onRetry }: { icon: React.ReactNode; title: string; message: string; onRetry?: () => void }) => (
    <div className="flex flex-col items-center justify-center text-center py-8 px-4">
        <div className="text-gray-300 mb-3">{icon}</div>
        <p className="font-bold text-gray-900">{title}</p>
        <p className="text-sm text-gray-500 mt-1 max-w-xs">{message}</p>
        {onRetry && (
            <button onClick={onRetry} className="mt-3 min-h-[44px] px-4 rounded-xl text-sm font-semibold text-indigo-600 hover:bg-indigo-50 transition-colors">
                Try again
            </button>
        )}
    </div>
);

/** In-place "See more / See less" toggle under a list (44px target). */
// Centred and content-width (not full-width) so the floating corner buttons
// on phones (install / assistant) never sit on top of it.
const SeeMoreButton = ({ expanded, hidden, onToggle, controls }: { expanded: boolean; hidden: number; onToggle: () => void; controls: string }) => (
    <div className="mt-3 flex justify-center">
        <button
            onClick={onToggle}
            aria-expanded={expanded}
            aria-controls={controls}
            className="min-h-[44px] px-6 rounded-xl text-sm font-semibold text-indigo-600 hover:bg-indigo-50 transition-colors inline-flex items-center justify-center gap-1"
        >
            {expanded ? 'See less' : `See more (${hidden})`}
            <ChevronDownIcon className={`w-4 h-4 shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </button>
    </div>
);

const ChartTooltipBox = ({ children }: { children: React.ReactNode }) => (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 px-3 py-2 text-sm">{children}</div>
);

/** Recharts tooltip content adapter: renders `render(row)` for the hovered row. */
const tooltipContent = (render: (row: any) => React.ReactNode) => ({ active, payload }: any) => {
    const r = active && payload?.[0]?.payload;
    return r ? <ChartTooltipBox>{render(r)}</ChartTooltipBox> : null;
};

const isCoarsePointer = () => {
    try { return typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: coarse)').matches; } catch { return false; }
};

/**
 * Tap-friendly chart details.
 *
 * With a mouse, the normal recharts hover tooltip is used. On a touch screen
 * that tooltip is unreliable (the browser sends a "mouse left" straight after a
 * tap, which hides it, and recharts' own click mode always picks the first
 * point), so in touch mode we take over: tap a point to show its details, tap
 * another point to switch, tap outside the chart to dismiss. The tapped point
 * is worked out from the plot area: these line charts place their points
 * evenly from the left edge to the right edge.
 */
function useTapDetails(count: number) {
    const [coarse, setCoarse] = useState<boolean>(isCoarsePointer);
    const [sel, setSel] = useState<{ index: number; x: number; top: number; bottom: number } | null>(null);
    const ref = useRef<HTMLDivElement>(null);
    const boxRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (coarse) return;
        const onTouch = () => setCoarse(true);
        window.addEventListener('touchstart', onTouch, { passive: true });
        return () => window.removeEventListener('touchstart', onTouch);
    }, [coarse]);

    useEffect(() => {
        if (!sel) return;
        const onDown = (e: PointerEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setSel(null);
        };
        document.addEventListener('pointerdown', onDown);
        return () => document.removeEventListener('pointerdown', onDown);
    }, [sel]);

    useEffect(() => { if (sel && sel.index >= count) setSel(null); }, [count, sel]);

    // Keep the details box inside the chart horizontally.
    React.useLayoutEffect(() => {
        const box = boxRef.current, host = ref.current;
        if (!box || !host || !sel) return;
        const w = box.offsetWidth, hostW = host.clientWidth;
        box.style.left = `${Math.max(0, Math.min(hostW - w, sel.x - w / 2))}px`;
        box.style.top = `${sel.top}px`;
    });

    const onClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!coarse || count === 0 || !ref.current) return;
        const plot = ref.current.querySelector('.recharts-cartesian-grid')?.getBoundingClientRect()
            || ref.current.querySelector('svg')?.getBoundingClientRect();
        const host = ref.current.getBoundingClientRect();
        if (!plot || plot.width === 0) return;
        const step = count > 1 ? plot.width / (count - 1) : 0;
        const index = Math.max(0, Math.min(count - 1, step ? Math.round((e.clientX - plot.left) / step) : 0));
        const x = plot.left - host.left + (count > 1 ? index * step : plot.width / 2);
        const top = plot.top - host.top, bottom = plot.bottom - host.top;
        setSel({ index, x, top, bottom });
    };

    return { ref, boxRef, coarse, sel, onClick };
}

/** The touch-mode details box (and a guide line on line charts). */
const TapDetails = ({ tap, children }: { tap: ReturnType<typeof useTapDetails>; children: React.ReactNode }) => {
    if (!tap.coarse || !tap.sel) return null;
    return (
        <>
            <div aria-hidden="true" className="absolute w-px bg-indigo-200 pointer-events-none" style={{ left: tap.sel.x, top: tap.sel.top, height: tap.sel.bottom - tap.sel.top }} />
            <div ref={tap.boxRef} role="status" data-tap-details className="absolute z-10 pointer-events-none max-w-[16rem]" style={{ left: tap.sel.x, top: tap.sel.top }}>
                <ChartTooltipBox>{children}</ChartTooltipBox>
            </div>
        </>
    );
};

const SimpleBarChart = ({ data, colors, listId }: { data: { label: string, value: number, a11yLabel: string }[], colors: string[], listId: string }) => {
    const maxValue = Math.max(...data.map(d => d.value)) || 100;
    return (
        <div id={listId} className="space-y-3">
            {data.map((item, index) => (
                <div key={`${item.label}-${index}`} data-perf-row>
                    {/* Label and value share one line above the bar, so long subject names stay readable at phone width. */}
                    <div className="flex items-baseline justify-between gap-3 mb-1">
                        <span data-perf-label className="text-sm font-medium text-gray-700 min-w-0">{item.label}</span>
                        <span className="text-sm font-bold text-gray-700 tabular-nums shrink-0">{item.value}%</span>
                    </div>
                    <div className="bg-gray-200 rounded-full h-4">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(item.value / maxValue) * 100}%` }}
                            transition={{ duration: 0.5, delay: Math.min(index, 10) * 0.05, ease: 'easeOut' }}
                            className={`${colors[index % colors.length]} h-4 rounded-full`}
                            aria-label={item.a11yLabel}
                        ></motion.div>
                    </div>
                </div>
            ))}
        </div>
    );
};

const WORKLOAD_COLORS = ['bg-blue-400', 'bg-blue-500', 'bg-blue-600', 'bg-blue-400', 'bg-blue-500']; // same palette as before

/**
 * Weekly hours per teacher as labelled horizontal bars (same pattern as the
 * Student Performance card). Every value is printed next to its bar, so the
 * details are readable on a phone without hovering or tapping.
 */
const WorkloadChart = ({ data, listId }: { data: { label: string; name?: string; value: number; lessons?: number }[]; listId: string }) => {
    const maxValue = Math.max(...data.map(d => d.value)) || 1;
    return (
        <div id={listId} className="space-y-3">
            {data.map((item, index) => (
                <div key={`${item.name || item.label}-${index}`} data-workload-row>
                    <div className="flex items-baseline justify-between gap-3 mb-1">
                        <span className="text-sm font-medium text-gray-700 min-w-0">
                            {item.name || item.label}
                            {typeof item.lessons === 'number' && (
                                <span className="text-gray-500 font-normal"> · {item.lessons} lesson{item.lessons === 1 ? '' : 's'}</span>
                            )}
                        </span>
                        <span className="text-sm font-bold text-gray-700 tabular-nums shrink-0">{item.value}h</span>
                    </div>
                    <div className="bg-gray-200 rounded-full h-4">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(item.value / maxValue) * 100}%` }}
                            transition={{ duration: 0.5, delay: Math.min(index, 10) * 0.05, ease: 'easeOut' }}
                            className={`${WORKLOAD_COLORS[index % WORKLOAD_COLORS.length]} h-4 rounded-full`}
                            aria-label={`${item.name || item.label}: ${item.value} hours a week`}
                        ></motion.div>
                    </div>
                </div>
            ))}
        </div>
    );
};

/** Two-line day tick (weekday over date) so all 7 days fit at phone width. */
const DayTick = ({ x, y, payload }: any) => {
    const [day, num] = String(payload?.value ?? '').split(' ');
    return (
        <text x={x} y={y} textAnchor="middle" fontSize={12} fill="#6b7280">
            <tspan x={x} dy={12}>{day}</tspan>
            <tspan x={x} dy={14}>{num}</tspan>
        </text>
    );
};

type AttendanceDay = { date: string; rate: number | null; present: number; late: number; total: number };

const attendanceTip = (r: any) => (
    <>
        <p className="font-semibold text-gray-900">{r.long}</p>
        {r.rate === null
            ? <p className="text-gray-600">No attendance taken</p>
            : <p className="text-gray-600">{r.rate}% attended · {r.present + r.late} of {r.total} students{r.late ? ` (${r.late} late)` : ''}</p>}
    </>
);

const AttendanceTrendChart = ({ data, color }: { data: AttendanceDay[]; color: string }) => {
    const rows = data.map(d => ({ ...d, ...dayLabels(d.date) }));
    const gaps = rows.some(r => r.rate === null);
    const tap = useTapDetails(rows.length);
    return (
        <div>
            <div ref={tap.ref} onClick={tap.onClick} className="relative h-48">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
                        <CartesianGrid vertical={false} stroke="#e5e7eb" strokeDasharray="3 3" />
                        <XAxis dataKey="short" tick={<DayTick />} tickLine={false} axisLine={{ stroke: '#e5e7eb' }} interval={0} height={40} />
                        <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} width={48} />
                        {/* filterNull={false}: a day with no register still gets its tooltip ("No attendance taken"). */}
                        <Tooltip {...(tap.coarse ? { active: false } : {})} filterNull={false} cursor={{ stroke: '#c7d2fe' }} content={tooltipContent(attendanceTip)} />
                        <Line type="linear" dataKey="rate" stroke={color} strokeWidth={2} connectNulls={false} isAnimationActive={false}
                            dot={{ r: 4, fill: 'white', stroke: color, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                    </LineChart>
                </ResponsiveContainer>
                <TapDetails tap={tap}>{tap.sel && rows[tap.sel.index] ? attendanceTip(rows[tap.sel.index]) : null}</TapDetails>
            </div>
            {gaps && <p className="text-sm text-gray-500 mt-2">Blank days had no attendance taken (weekends, holidays or not marked yet).</p>}
        </div>
    );
};

const enrollmentTip = (r: any) => (
    <>
        <p className="font-semibold text-gray-900">{r.long}</p>
        <p className="text-gray-600">{r.count} new student{r.count === 1 ? '' : 's'} enrolled</p>
    </>
);

const EnrollmentChart = ({ data, color }: { data: EnrollmentPoint[]; color: string }) => {
    const tap = useTapDetails(data.length);
    return (
        <div ref={tap.ref} onClick={tap.onClick} className="relative h-56">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: -12 }}>
                    <CartesianGrid vertical={false} stroke="#e5e7eb" strokeDasharray="3 3" />
                    <XAxis dataKey="short" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: '#e5e7eb' }} interval="preserveStartEnd" minTickGap={8} />
                    <YAxis allowDecimals={false} tick={AXIS_TICK} tickLine={false} axisLine={false} width={48} />
                    <Tooltip {...(tap.coarse ? { active: false } : {})} cursor={{ stroke: '#ddd6fe' }} content={tooltipContent(enrollmentTip)} />
                    <Line type="linear" dataKey="count" stroke={color} strokeWidth={2.5} isAnimationActive={false}
                        dot={{ r: 4, fill: 'white', stroke: color, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                </LineChart>
            </ResponsiveContainer>
            <TapDetails tap={tap}>{tap.sel && data[tap.sel.index] ? enrollmentTip(data[tap.sel.index]) : null}</TapDetails>
        </div>
    );
};

interface AnalyticsScreenProps {
    schoolId: string;
    currentBranchId: string | null;
}

const AnalyticsScreen: React.FC<AnalyticsScreenProps> = ({ schoolId, currentBranchId }) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [metrics, setMetrics] = useState<any>({
        performance: [],
        fees: { paid: 0, overdue: 0, unpaid: 0, total: 0 },
        workload: [],
        attendance: [],
        attendanceTrend: [],
        enrollment: []
    });
    const [loaded, setLoaded] = useState(false);
    const [showAllSubjects, setShowAllSubjects] = useState(false);
    const [showAllTeachers, setShowAllTeachers] = useState(false);

    const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await fetchAnalyticsMetrics(schoolId, currentBranchId || undefined);
            if (data) {
                setMetrics(data);
                setLoaded(true);
            } else {
                setError("Failed to fetch analytics data from the server.");
            }
        } catch (err: any) {
            setError(err.message || "An unexpected error occurred while loading analytics.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (schoolId) {
            loadData();
        }
    }, [schoolId, currentBranchId]);

    // A failed load with nothing loaded before: cards show an error state
    // instead of empty charts / "0%" that would look like real data.
    const failed = !!error && !loaded;
    const errorState = <CardState icon={<AlertTriangleIcon className="w-10 h-10" />} title="Couldn't load this data" message="Check your connection and try again." onRetry={loadData} />;
    const fees = metrics.fees || { paid: 0, overdue: 0, unpaid: 0, total: 0 };
    const performance: any[] = Array.isArray(metrics.performance) ? metrics.performance : [];
    const workload: any[] = Array.isArray(metrics.workload) ? metrics.workload : [];
    const attendanceDays: any[] = Array.isArray(metrics.attendanceTrend) ? metrics.attendanceTrend : [];
    const enrollment = enrollmentPoints(metrics.enrollment || []);

    useAutoSync(['analytics', 'students', 'fees', 'teachers', 'attendance', 'exams'], () => {
        console.log('🔄 [Analytics] Real-time auto-sync triggered');
        loadData();
    });

    return (
        <div className="flex flex-col h-full bg-gray-50 relative">
            <main className="flex-grow p-4 overflow-y-auto">
                {/* Page header row: refresh sits in normal flow so it never covers a card or the error banner. */}
                <div className="flex justify-end mb-3">
                    <motion.button whileHover={{ rotate: 90 }} whileTap={{ scale: 0.9 }} onClick={loadData} disabled={loading} className="w-11 h-11 flex items-center justify-center bg-white rounded-full shadow-sm hover:bg-gray-100 text-gray-500 disabled:cursor-wait" title="Refresh Data" aria-label="Refresh analytics">
                        <RefreshIcon className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    </motion.button>
                </div>
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 p-4 mb-4 rounded-xl shadow-sm text-sm font-semibold">
                        {error}
                    </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Student Performance */}
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="bg-white rounded-2xl shadow-sm p-4">
                        <div className="flex items-center space-x-3 mb-4">
                            <div className="bg-blue-100 text-blue-600 p-2 rounded-lg"><ChartBarIcon /></div>
                            <h3 className="font-bold text-gray-800">Student Performance</h3>
                        </div>
                        {loading ? <div className="h-40 animate-pulse bg-gray-100 rounded-lg"></div> :
                            failed ? errorState :
                            performance.length === 0 ? <CardState icon={<ChartBarIcon className="w-10 h-10" />} title="No results recorded yet" message="Subject averages appear here once scores are entered." /> :
                            <>
                                <SimpleBarChart listId="analytics-subjects" data={visibleItems(performance, PERFORMANCE_LIMIT, showAllSubjects)} colors={['bg-green-500', 'bg-blue-600', 'bg-amber-500', 'bg-red-500']} />
                                {hiddenCount(performance, PERFORMANCE_LIMIT) > 0 && (
                                    <SeeMoreButton controls="analytics-subjects" expanded={showAllSubjects} hidden={hiddenCount(performance, PERFORMANCE_LIMIT)} onToggle={() => setShowAllSubjects(v => !v)} />
                                )}
                            </>
                        }
                    </motion.div>

                    {/* Fee Compliance */}
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: 0.05 }} className="bg-white rounded-2xl shadow-sm p-4">
                        <div className="flex items-center space-x-3 mb-4">
                            <div className="bg-green-100 text-green-500 p-2 rounded-lg"><ReceiptIcon /></div>
                            <h3 className="font-bold text-gray-800">Fee Compliance</h3>
                        </div>
                        {loading ? <div className="h-40 animate-pulse bg-gray-100 rounded-lg"></div> :
                            failed ? errorState :
                            !fees.total ? <CardState icon={<ReceiptIcon className="w-10 h-10" />} title="No fees set up yet" message="Fees you assign to students will show here." /> :
                            <div className="flex flex-wrap items-center justify-around gap-4">
                                <div className="relative">
                                    <DonutChart percentage={fees.paid || 0} color="#22c55e" size={120} strokeWidth={12} />
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className="text-2xl font-bold text-gray-800">{fees.paid}%</span>
                                        <span className="text-xs text-gray-500">Paid</span>
                                    </div>
                                </div>
                                <div className="space-y-2 text-sm">
                                    <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div><span>Paid: {fees.paid}%{typeof fees.paidCount === 'number' ? ` (${fees.paidCount})` : ''}</span></div>
                                    <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-amber-500 mr-2"></div><span>Overdue: {fees.overdue}%{typeof fees.overdueCount === 'number' ? ` (${fees.overdueCount})` : ''}</span></div>
                                    <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div><span>Unpaid: {fees.unpaid}%{typeof fees.unpaidCount === 'number' ? ` (${fees.unpaidCount})` : ''}</span></div>
                                </div>
                            </div>
                        }
                    </motion.div>

                    {/* Teacher Workload */}
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: 0.1 }} className="bg-white rounded-2xl shadow-sm p-4">
                        <div className="flex items-center space-x-3 mb-4">
                            <div className="bg-amber-100 text-amber-500 p-2 rounded-lg"><BriefcaseIcon /></div>
                            <h3 className="font-bold text-gray-800">Teacher Workload (Weekly Hours)</h3>
                        </div>
                        {loading ? <div className="h-40 animate-pulse bg-gray-100 rounded-lg"></div> :
                            failed ? errorState :
                            workload.length === 0 ? <CardState icon={<BriefcaseIcon className="w-10 h-10" />} title="No teachers yet" message="Teachers you add will show here with their weekly teaching hours." /> :
                            workload.every((w: any) => !w.value) ? <CardState icon={<BriefcaseIcon className="w-10 h-10" />} title="No lessons scheduled yet" message="Weekly hours appear once teachers have lessons on a timetable." /> :
                            <>
                                <WorkloadChart listId="analytics-teachers" data={visibleItems(workload, WORKLOAD_LIMIT, showAllTeachers)} />
                                {hiddenCount(workload, WORKLOAD_LIMIT) > 0 && (
                                    <SeeMoreButton controls="analytics-teachers" expanded={showAllTeachers} hidden={hiddenCount(workload, WORKLOAD_LIMIT)} onToggle={() => setShowAllTeachers(v => !v)} />
                                )}
                            </>
                        }
                    </motion.div>

                    {/* Attendance Trend */}
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: 0.15 }} className="bg-white rounded-2xl shadow-sm p-4">
                        <div className="flex items-center space-x-3 mb-2">
                            <div className="bg-indigo-100 text-indigo-500 p-2 rounded-lg"><TrendingUpIcon /></div>
                            <h3 className="font-bold text-gray-800">Attendance Trend (Last 7 Days)</h3>
                        </div>
                        {loading ? <div className="h-40 animate-pulse bg-gray-100 rounded-lg"></div> :
                            failed ? errorState :
                            !attendanceDays.some((d: any) => d.rate !== null) ? <CardState icon={<TrendingUpIcon className="w-10 h-10" />} title="No attendance taken this week" message="Daily attendance appears here once registers are marked." /> :
                            <AttendanceTrendChart data={attendanceDays} color="#6366f1" />
                        }
                    </motion.div>

                    {/* Enrollment Trends */}
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: 0.2 }} className="bg-white rounded-2xl shadow-sm p-4 md:col-span-2">
                        <div className="flex items-center space-x-3 mb-2">
                            <div className="bg-purple-100 text-purple-500 p-2 rounded-lg"><UsersIcon /></div>
                            <h3 className="font-bold text-gray-800">Enrollment Trends</h3>
                        </div>
                        {loading ? <div className="h-40 animate-pulse bg-gray-100 rounded-lg"></div> :
                            failed ? errorState :
                            enrollment.length === 0 ? <CardState icon={<UsersIcon className="w-10 h-10" />} title="No students enrolled yet" message="New enrolments per month appear here." /> :
                            <EnrollmentChart data={enrollment} color="#8b5cf6" />
                        }
                    </motion.div>
                </div>
            </main>
        </div>
    );
};

export default AnalyticsScreen;

