import React, { useState, useEffect, useCallback } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { api } from '../../lib/api';
import { toast } from 'react-hot-toast';
import {
    QrCode,
    CheckCircle2,
    LogIn,
    LogOut,
    Clock,
    AlertTriangle
} from 'lucide-react';

interface ScanResult {
    action: 'in' | 'out';
    classroom: string;
    lesson: { subject: string; class_name: string | null; start_time: string; end_time: string };
    record: {
        scan_in_at: string | null;
        scan_out_at: string | null;
        duration_minutes: number | null;
        is_late: boolean;
        is_early_departure: boolean;
    };
}

interface TodayRecord {
    id: string;
    subject: string;
    class_name: string | null;
    scheduled_start: string;
    scheduled_end: string;
    scan_in_at: string | null;
    scan_out_at: string | null;
    duration_minutes: number | null;
    status: string;
    is_late: boolean;
    is_early_departure: boolean;
    classroom?: { name: string };
}

function formatTime(iso: string | null): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const ScanClassroomScreen = () => {
    const [scanning, setScanning] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState<ScanResult | null>(null);
    const [error, setError] = useState('');
    const [today, setToday] = useState<TodayRecord[]>([]);

    const fetchToday = useCallback(async () => {
        try {
            const data = await api.get<TodayRecord[]>('/classrooms/lesson-attendance/mine/today');
            setToday(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Error fetching today lesson records:', err);
        }
    }, []);

    useEffect(() => { fetchToday(); }, [fetchToday]);

    useEffect(() => {
        if (!scanning) return;
        const scanner = new Html5QrcodeScanner(
            'classroom-qr-reader',
            { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
            false
        );

        let handled = false;
        scanner.render(async (decodedText: string) => {
            if (handled) return;
            handled = true;
            setScanning(false);
            setSubmitting(true);
            setError('');
            setResult(null);
            try {
                const res = await api.post<ScanResult>('/classrooms/scan', { qr_token: decodedText });
                setResult(res);
                toast.success(res.action === 'in' ? 'Lesson started' : 'Lesson ended');
                fetchToday();
            } catch (err: any) {
                setError(err?.message || 'Scan failed. Please try again.');
            } finally {
                setSubmitting(false);
            }
        }, () => { /* no QR in view yet — ignore */ });

        return () => { scanner.clear().catch(() => { /* already stopped */ }); };
    }, [scanning, fetchToday]);

    return (
        <div className="p-4 max-w-2xl mx-auto space-y-6 pb-24">
            <div className="text-center">
                <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <QrCode className="w-8 h-8 text-indigo-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 font-outfit">Scan Classroom</h2>
                <p className="text-gray-600 mt-2">
                    Scan the classroom QR code before your lesson starts, and again before you leave.
                </p>
            </div>

            {!scanning && !submitting && (
                <button
                    onClick={() => { setResult(null); setError(''); setScanning(true); }}
                    className="w-full bg-indigo-600 text-white px-6 py-4 rounded-2xl font-bold hover:bg-indigo-700 transition text-lg shadow-lg shadow-indigo-200"
                >
                    {result || error ? 'Scan Again' : 'Start Scanning'}
                </button>
            )}

            {scanning && (
                <div className="bg-white border-2 border-indigo-600 rounded-2xl p-4">
                    <div id="classroom-qr-reader" className="w-full"></div>
                    <button
                        onClick={() => setScanning(false)}
                        className="w-full mt-4 border border-gray-300 text-gray-700 px-4 py-2 rounded-xl hover:bg-gray-50 transition font-semibold"
                    >
                        Cancel
                    </button>
                </div>
            )}

            {submitting && (
                <div className="text-center py-8 text-gray-500 font-semibold">Recording your scan...</div>
            )}

            {result && (
                <div className="bg-green-50 border-2 border-green-600 rounded-2xl p-6">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                            {result.action === 'in'
                                ? <LogIn className="w-7 h-7 text-white" />
                                : <LogOut className="w-7 h-7 text-white" />}
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-bold text-green-900">
                                {result.action === 'in' ? 'Lesson started' : 'Lesson ended'}
                            </h3>
                            <p className="text-green-700 mt-0.5 text-sm">
                                {result.lesson.subject}
                                {result.lesson.class_name ? ` — ${result.lesson.class_name}` : ''} · {result.classroom}
                            </p>
                            {result.action === 'out' && result.record.duration_minutes != null && (
                                <p className="text-green-700 text-sm font-semibold mt-1">
                                    Time in class: {result.record.duration_minutes} minutes
                                </p>
                            )}
                        </div>
                    </div>
                    {(result.record.is_late || result.record.is_early_departure) && (
                        <div className="mt-4 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
                            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-amber-700">
                                {result.record.is_late && result.action === 'in' && 'This scan was recorded as a late arrival. '}
                                {result.record.is_early_departure && result.action === 'out' && 'This scan was recorded as an early departure. '}
                            </p>
                        </div>
                    )}
                </div>
            )}

            {error && (
                <div className="bg-red-50 border-2 border-red-600 rounded-2xl p-5">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0" />
                        <div>
                            <h3 className="font-semibold text-red-900">Scan not accepted</h3>
                            <p className="text-red-700 mt-1 text-sm">{error}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Today's scan records */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <h3 className="font-bold text-gray-900">Today's Scans</h3>
                </div>
                {today.length === 0 ? (
                    <p className="px-5 py-6 text-sm text-gray-400 text-center">No lessons scanned yet today.</p>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {today.map(rec => (
                            <div key={rec.id} className="px-5 py-3 flex items-center justify-between gap-3">
                                <div>
                                    <p className="font-semibold text-gray-900 text-sm">
                                        {rec.subject}{rec.class_name ? ` — ${rec.class_name}` : ''}
                                    </p>
                                    <p className="text-xs text-gray-400">
                                        {rec.classroom?.name || ''} · {rec.scheduled_start}–{rec.scheduled_end} ·
                                        In {formatTime(rec.scan_in_at)} / Out {formatTime(rec.scan_out_at)}
                                    </p>
                                </div>
                                {rec.status === 'completed' ? (
                                    <span className="flex items-center gap-1 text-xs font-bold text-green-700 bg-green-50 px-2.5 py-1 rounded-full flex-shrink-0">
                                        <CheckCircle2 className="w-3.5 h-3.5" /> Done
                                    </span>
                                ) : rec.status === 'no_scan_out' ? (
                                    <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full flex-shrink-0">No Scan-Out</span>
                                ) : (
                                    <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full flex-shrink-0">In Progress</span>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
                <h4 className="font-medium text-blue-900 mb-2">How it works:</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Scanning opens 15 minutes before your lesson starts</li>
                    <li>• First scan marks the start of your lesson</li>
                    <li>• Scan the same code again before leaving to mark the end</li>
                    <li>• Your admin sees the record instantly</li>
                </ul>
            </div>
        </div>
    );
};

export default ScanClassroomScreen;
