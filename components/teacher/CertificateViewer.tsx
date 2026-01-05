import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { useProfile } from '../../context/ProfileContext';
import {
    CertificateIcon,
    DownloadIcon,
    CheckCircleIcon
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

    useEffect(() => {
        fetchCertificates();
    }, []);

    const fetchCertificates = async () => {
        try {
            setLoading(true);

            const { data: teacherData } = await supabase
                .from('teachers')
                .select('id')
                .eq('email', profile.email)
                .single();

            if (!teacherData) {
                setLoading(false);
                return;
            }

            const { data, error } = await supabase
                .from('pd_certificates')
                .select(`
          *,
          pd_courses (
            title
          )
        `)
                .eq('teacher_id', teacherData.id)
                .order('issued_at', { ascending: false });

            if (error) throw error;

            const formatted: Certificate[] = (data || []).map((c: any) => ({
                id: c.id,
                course_title: c.pd_courses?.title || 'Unknown Course',
                certificate_number: c.certificate_number,
                issued_at: c.issued_at,
                expiry_date: c.expiry_date
            }));

            setCertificates(formatted);
        } catch (error: any) {
            console.error('Error fetching certificates:', error);
        } finally {
            setLoading(false);
        }
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
                {certificates.length === 0 ? (
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
                                <p className="font-sem ibold text-gray-900">{profile.name}</p>
                                <div className="mt-4 pt-4 border-t border-gray-300">
                                    <p className="text-xs text-gray-500">Certificate #{cert.certificate_number}</p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Issued: {new Date(cert.issued_at).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={() => toast('PDF download feature coming soon!', { icon: 'ℹ️' })}
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
