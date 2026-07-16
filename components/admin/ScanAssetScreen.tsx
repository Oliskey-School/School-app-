import React, { useState, useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { api } from '../../lib/api';
import { toast } from 'react-hot-toast';
import { QrCode } from 'lucide-react';
import AssetDetailScreen from './AssetDetailScreen';

const ScanAssetScreen = () => {
    const [scanning, setScanning] = useState(true);
    const [foundAssetId, setFoundAssetId] = useState<string | null>(null);

    useEffect(() => {
        if (!scanning) return;
        const scanner = new Html5QrcodeScanner('asset-qr-reader', { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 }, false);
        const onSuccess = async (decodedText: string) => {
            setScanning(false);
            scanner.clear().catch(() => {});
            try {
                const asset = await api.getAssetByQrCode(decodedText);
                setFoundAssetId(asset.id);
            } catch (err: any) {
                toast.error(err?.message || 'Asset not found for this code');
                setScanning(true);
            }
        };
        scanner.render(onSuccess, () => {});
        return () => { scanner.clear().catch(() => {}); };
    }, [scanning]);

    if (foundAssetId) return <AssetDetailScreen assetId={foundAssetId} />;

    return (
        <div className="max-w-md mx-auto p-6 text-center space-y-4">
            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto">
                <QrCode className="w-8 h-8 text-indigo-600" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 font-outfit">Scan Asset QR Code</h1>
            <p className="text-sm text-gray-500">Point the camera at the QR code on the asset.</p>
            <div id="asset-qr-reader" className="rounded-2xl overflow-hidden" />
        </div>
    );
};

export default ScanAssetScreen;
