import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { api } from '../../lib/api';
import { useProfile } from '../../context/ProfileContext';
import {
    CertificateIcon,
    DownloadIcon,
    CheckCircleIcon,
    AlertTriangleIcon
} from '../../constants';

interface Certificate {
    id: number;
    course_title: string;
    certificate_number: string;
    issued_at: string;
    expiry_date?: string;
}

const CertificateViewer: React.FC = () => {
    const { profile } = useProfile();
    const [certificates, setCertificates] = useState<Certificate[]>([]);
    const [loading, setLoading] = useState(true);
    const [errorOccurred, setErrorOccurred] = useState(false);

    useEffect(() => {
        fetchCertificates();
    }, []);

    const fetchCertificates = async () => {
        try {
            setLoading(true);
            setErrorOccurred(false);
            // Fetch via backend API using the Teacher profile ID, not the User ID.
            const myProfile = await api.getMyTeacherProfile();
            if (!myProfile?.id) {
                setLoading(false);
                return;
            }
            const data = await api.getTeacherCertificates(myProfile.id);
            setCertificates(data || []);
        } catch (error: any) {
            console.error('Error fetching certificates:', error);
            setErrorOccurred(true);
        } finally {
            setLoading(false);
        }
    };

    // Print a framed certificate to a print-ready window (browser → Save as PDF).
    const printCertificate = (cert: Certificate) => {
        const w = window.open('', '_blank', 'width=1000,height=720');
        if (!w) { toast.error('Please allow pop-ups to download your certificate.'); return; }
        w.document.write(`<!doctype html><html><head><title>Certificate — ${cert.course_title}</title>
            <style>
                @page{size:landscape}
                body{font-family:Georgia,'Times New Roman',serif;margin:0;padding:40px;color:#1f2937}
                .frame{border:8px double #4f46e5;padding:56px 48px;text-align:center;background:linear-gradient(135deg,#eef2ff,#faf5ff)}
                .sub{font-size:14px;color:#6b7280;letter-spacing:2px;text-transform:uppercase}
                h1{font-size:34px;margin:18px 0;color:#111827}
                .name{font-size:26px;font-weight:700;margin:8px 0 4px}
                .meta{margin-top:36px;padding-top:16px;border-top:1px solid #c7c7d1;font-size:12px;color:#6b7280}
            </style></head><body>
            <div class="frame">
                <div class="sub">Certificate of Completion</div>
                <p style="margin:24px 0 4px;color:#6b7280">This is proudly awarded to</p>
                <div class="name">${profile?.name || 'Teacher'}</div>
                <p style="color:#6b7280">for successfully completing</p>
                <h1>${cert.course_title}</h1>
                <div class="meta">
                    Certificate #${cert.certificate_number} &nbsp;·&nbsp; Issued ${new Date(cert.issued_at).toLocaleDateString()}
                </div>
            </div>
            <script>window.onload=function(){window.print();}</script>
            </body></html>`);
        w.document.close();
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-gray-900">My Certificates</h2>
                <p className="text-sm text-gray-600 mt-1">View and download your PD course certificates</p>
            </div>

            {/* Certificates Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {errorOccurred ? (
                    <div className="col-span-full text-center py-12 text-gray-500">
                        <AlertTriangleIcon className="w-16 h-16 text-amber-300 mx-auto mb-4" />
                        <p className="text-amber-700 font-semibold">Couldn't load your certificates</p>
                        <p className="text-sm mt-1 mb-4">There was a problem reaching the server. Please try again.</p>
                        <button
                            onClick={fetchCertificates}
                            className="px-5 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-medium text-sm"
                        >
                            Retry
                        </button>
                    </div>
                ) : certificates.length === 0 ? (
                    <div className="col-span-full text-center py-12 text-gray-500">
                        <CertificateIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <p>No certificates yet</p>
                        <p className="text-sm mt-2">Complete courses to earn certificates</p>
                    </div>
                ) : (
                    certificates.map((cert) => (
                        <div key={cert.id} className="bg-white rounded-xl shadow-lg border-2 border-gray-200 p-6 hover:shadow-xl transition-shadow">
                            {/* Certificate Design */}
                            <div className="border-4 border-double border-indigo-600 p-6 text-center bg-gradient-to-br from-indigo-50 to-purple-50">
                                <div className="mb-4">
                                    <CheckCircleIcon className="w-12 h-12 text-green-600 mx-auto" />
                                </div>
                                <h3 className="text-sm font-medium text-gray-600 mb-2">Certificate of Completion</h3>
                                <h4 className="font-bold text-gray-900 text-lg mb-4">{cert.course_title}</h4>
                                <p className="text-xs text-gray-600">Awarded to</p>
                                <p className="font-semibold text-gray-900">{profile.name}</p>
                                <div className="mt-4 pt-4 border-t border-gray-300">
                                    <p className="text-xs text-gray-500">Certificate #{cert.certificate_number}</p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Issued: {new Date(cert.issued_at).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={() => printCertificate(cert)}
                                className="w-full mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium flex items-center justify-center space-x-2"
                            >
                                <DownloadIcon className="w-4 h-4" />
                                <span>Download PDF</span>
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default CertificateViewer;

