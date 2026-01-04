import React, { useState, useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { scanQRCodeForAttendance } from '../../lib/qr-attendance';

export function QRScanner() {
    const [scanning, setScanning] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState('');

    useEffect(() => {
        if (scanning) {
            const scanner = new Html5QrcodeScanner(
                'qr-reader',
                {
                    fps: 10,
                    qrbox: { width: 250, height: 250 },
                    aspectRatio: 1.0
                },
                false
            );

            scanner.render(onScanSuccess, onScanError);

            return () => {
                scanner.clear();
            };
        }
    }, [scanning]);

    const onScanSuccess = async (decodedText: string) => {
        setScanning(false);

        const scanResult = await scanQRCodeForAttendance(decodedText, 'Main Gate');

        if (scanResult.success) {
            setResult({
                success: true,
                student: scanResult.student,
                message: scanResult.message
            });

            // Auto-clear success message after 3 seconds
            setTimeout(() => {
                setResult(null);
            }, 3000);
        } else {
            setError(scanResult.message);
        }
    };

    const onScanError = (error: string) => {
        // Ignore scan errors (common when no QR in view)
    };

    return (
        <div className="max-w-2xl mx-auto p-6">
            <div className="text-center mb-6">
                <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                    </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900">QR Code Scanner</h2>
                <p className="text-gray-600 mt-2">Scan student QR codes for attendance check-in</p>
            </div>

            {!scanning && !result ? (
                <button
                    onClick={() => setScanning(true)}
                    className="w-full bg-indigo-600 text-white px-6 py-4 rounded-lg font-medium hover:bg-indigo-700 transition text-lg"
                >
                    Start Scanning
                </button>
            ) : null}

            {scanning && (
                <div className="bg-white border-2 border-indigo-600 rounded-lg p-4">
                    <div id="qr-reader" className="w-full"></div>
                    <button
                        onClick={() => setScanning(false)}
                        className="w-full mt-4 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition"
                    >
                        Stop Scanning
                    </button>
                </div>
            )}

            {result?.success && (
                <div className="bg-green-50 border-2 border-green-600 rounded-lg p-6 animate-fade-in">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                            <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="flex-1">
                            <h3 className="text-xl font-bold text-green-900">{result.message}</h3>
                            <p className="text-green-700 mt-1">
                                <span className="font-medium">{result.student?.name}</span>
                                <br />
                                Grade {result.student?.grade}{result.student?.section}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            setResult(null);
                            setScanning(true);
                        }}
                        className="w-full bg-green-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-green-700 transition"
                    >
                        Scan Next Student
                    </button>
                </div>
            )}

            {error && (
                <div className="bg-red-50 border-2 border-red-600 rounded-lg p-6">
                    <div className="flex items-start gap-3">
                        <svg className="w-6 h-6 text-red-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                        <div className="flex-1">
                            <h3 className="font-semibold text-red-900">Scan Error</h3>
                            <p className="text-red-700 mt-1">{error}</p>
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            setError('');
                            setScanning(true);
                        }}
                        className="w-full mt-4 bg-red-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-red-700 transition"
                    >
                        Try Again
                    </button>
                </div>
            )}

            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">Instructions:</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Point camera at student's QR code</li>
                    <li>• Code will scan automatically</li>
                    <li>• Attendance marked instantly</li>
                    <li>• Parent notified if absent</li>
                </ul>
            </div>
        </div>
    );
}
