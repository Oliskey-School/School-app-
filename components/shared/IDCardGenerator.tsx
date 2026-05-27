import React, { useRef } from 'react';
import html2canvas from 'html2canvas';
import { QRCodeCanvas } from 'qrcode.react';
import { Student, Teacher } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { toast } from 'react-hot-toast';
import { getFormattedClassName } from '../../constants';

interface IDCardGeneratorProps {
    user: Student | Teacher;
    userType: 'student' | 'teacher';
}

const IDCardGenerator: React.FC<IDCardGeneratorProps> = ({ user, userType }) => {
    const cardRef = useRef<HTMLDivElement>(null);
    const { currentSchool } = useAuth();

    const generatePDF = async () => {
        if (!cardRef.current) return;

        try {
            // Persistence: track that ID card was generated/issued
            if (userType === 'student') {
                try {
                    await api.issueIDCard(user.id, {
                        is_printed: true,
                        status: 'Active'
                    });
                } catch (e) {
                    console.warn('Backend persistence failed, continuing with download:', e);
                }
            }

            const canvas = await html2canvas(cardRef.current, {
                scale: 3, // Higher scale for better print quality
                backgroundColor: '#ffffff',
                useCORS: true
            });

            const imgData = canvas.toDataURL('image/png');
            const { jsPDF } = await import('jspdf');
            const pdf = new jsPDF({
                orientation: 'landscape',
                unit: 'mm',
                format: [85.6, 53.98] // Standard ID-1 card size
            });

            pdf.addImage(imgData, 'PNG', 0, 0, 85.6, 53.98);
            pdf.save(`${user.name.replace(/\s+/g, '_')}_ID_Card.pdf`);
            toast.success('ID Card generated and downloaded!');
        } catch (error) {
            console.error('Error generating PDF:', error);
            toast.error('Failed to generate PDF ID card');
        }
    };

    const [scale, setScale] = React.useState(1);
    const containerRef = useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        const updateScale = () => {
            if (containerRef.current) {
                const containerWidth = containerRef.current.offsetWidth;
                const padding = 32;
                const availableWidth = containerWidth - padding;
                const newScale = Math.min(availableWidth / 856, 1.2);
                setScale(newScale);
            }
        };

        updateScale();
        const timeoutId = setTimeout(updateScale, 100);
        window.addEventListener('resize', updateScale);
        return () => {
            window.removeEventListener('resize', updateScale);
            clearTimeout(timeoutId);
        };
    }, []);

    const qrData = JSON.stringify({
        type: userType,
        id: user.id,
        name: user.name,
        school: currentSchool?.name,
        cardNumber: (user as any).school_generated_id || (user as any).schoolGeneratedId || user.id
    });

    const displayName = user.name;
    const displayId = (user as any).school_generated_id || (user as any).schoolGeneratedId || 'Pending';

    return (
        <div className="flex flex-col items-center space-y-6 p-4 sm:p-6 w-full max-w-full overflow-hidden">
            {/* ID Card Preview */}
            <div ref={containerRef} className="w-full flex justify-center items-start overflow-hidden min-h-[300px]">
                <div
                    style={{
                        transform: `scale(${scale})`,
                        transformOrigin: 'top center',
                        height: `${540 * scale}px`,
                        width: `${856 * scale}px`
                    }}
                    className="flex-shrink-0 transition-all duration-300 ease-out"
                >
                    <div ref={cardRef} data-id-card="true" className="relative w-[856px] h-[540px] bg-gradient-to-br from-indigo-700 via-purple-700 to-indigo-900 rounded-[40px] shadow-2xl overflow-hidden border-8 border-white/20">
                        {/* Refined Background Pattern */}
                        <div className="absolute inset-0 opacity-10 pointer-events-none">
                            <div className="absolute inset-0" style={{
                                backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
                                backgroundSize: '40px 40px'
                            }} />
                        </div>

                        {/* Top Accent Bar */}
                        <div className="absolute top-0 left-0 right-0 h-4 bg-white/20" />

                        {/* School Logo/Header - REAL DATA */}
                        <div className="absolute top-8 left-10 flex items-center space-x-5">
                            <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center shadow-xl overflow-hidden border-2 border-white/50">
                                {currentSchool?.logoUrl ? (
                                    <img src={currentSchool.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-4xl font-bold text-indigo-700">
                                        {currentSchool?.name?.charAt(0) || 'S'}
                                    </span>
                                )}
                            </div>
                            <div className="text-white max-w-[500px]">
                                <h3 className="text-3xl font-black tracking-tight leading-tight uppercase truncate">
                                    {currentSchool?.name || 'School Academy'}
                                </h3>
                                <p className="text-base font-medium opacity-90 italic truncate">
                                    {currentSchool?.motto || 'Education for Excellence'}
                                </p>
                            </div>
                        </div>

                        {/* Type Badge */}
                        <div className="absolute top-8 right-10 px-4 py-1.5 bg-white/20 backdrop-blur-md rounded-full border border-white/30">
                            <span className="text-white text-sm font-bold tracking-widest uppercase">
                                {userType === 'student' ? 'Student Card' : 'Staff Card'}
                            </span>
                        </div>

                        {/* Main Content */}
                        <div className="absolute top-36 left-10 right-10 flex items-start space-x-12">
                            {/* Photo Section */}
                            <div className="flex-shrink-0">
                                <div className="relative">
                                    <div className="w-44 h-44 rounded-[32px] overflow-hidden bg-white shadow-2xl border-4 border-white">
                                        {user.avatarUrl ? (
                                            <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-100 to-purple-100">
                                                <span className="text-6xl font-bold text-indigo-700">{user.name.charAt(0)}</span>
                                            </div>
                                        )}
                                    </div>
                                    {/* Verification Checkmark */}
                                    <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-green-500 rounded-full border-4 border-white flex items-center justify-center shadow-lg">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            {/* Details Grid */}
                            <div className="flex-1 grid grid-cols-2 gap-y-6 gap-x-8 text-white pt-2">
                                <div className="col-span-2">
                                    <p className="text-[10px] opacity-70 uppercase font-black tracking-[0.2em]">Full Name</p>
                                    <p className="text-3xl font-black truncate">{displayName}</p>
                                </div>

                                {userType === 'student' ? (
                                    <>
                                        <div>
                                            <p className="text-[10px] opacity-70 uppercase font-black tracking-[0.2em]">Class / Grade</p>
                                            <p className="text-xl font-bold">{getFormattedClassName((user as Student).grade, (user as Student).section)}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] opacity-70 uppercase font-black tracking-[0.2em]">Student ID</p>
                                            <p className="text-xl font-bold tracking-wider">{displayId}</p>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div>
                                            <p className="text-[10px] opacity-70 uppercase font-black tracking-[0.2em]">Department</p>
                                            <p className="text-xl font-bold">{(user as Teacher).subjects?.[0] || 'Academic'}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] opacity-70 uppercase font-black tracking-[0.2em]">Staff ID</p>
                                            <p className="text-xl font-bold tracking-wider">{displayId}</p>
                                        </div>
                                    </>
                                )}

                                <div>
                                    <p className="text-[10px] opacity-70 uppercase font-black tracking-[0.2em]">Expiry Date</p>
                                    <p className="text-xl font-bold">{new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toLocaleDateString()}</p>
                                </div>
                                
                                <div>
                                    <p className="text-[10px] opacity-70 uppercase font-black tracking-[0.2em]">Blood Group</p>
                                    <p className="text-xl font-bold">{(user as any).bloodGroup || 'N/A'}</p>
                                </div>
                            </div>

                            {/* QR Section */}
                            <div className="flex-shrink-0 flex flex-col items-center pt-4">
                                <div className="bg-white p-3.5 rounded-3xl shadow-2xl border-4 border-indigo-50">
                                    <QRCodeCanvas value={qrData} size={110} level="H" />
                                </div>
                                <span className="mt-2 text-[10px] font-bold text-white/50 uppercase tracking-widest">Scan to Verify</span>
                            </div>
                        </div>

                        {/* Decorative Footer */}
                        <div className="absolute bottom-0 left-0 right-0 h-16 bg-white/5 backdrop-blur-sm px-10 flex justify-between items-center border-t border-white/10">
                            <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                                <span className="text-[10px] text-white/80 font-bold uppercase tracking-widest">Valid Identity Document</span>
                            </div>
                            <p className="text-[10px] text-white/60 font-medium">
                                {currentSchool?.address || 'School Campus Official Identity Card'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Download Button */}
            <button
                onClick={generatePDF}
                className="group relative px-10 py-4 bg-white text-indigo-700 font-black rounded-2xl shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex items-center space-x-3 overflow-hidden border-2 border-indigo-100"
            >
                <div className="absolute inset-0 bg-indigo-50 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span className="relative z-10 uppercase tracking-widest text-sm">Download Official ID (PDF)</span>
            </button>

            <p className="text-xs text-gray-400 font-medium uppercase tracking-[0.2em]">
                Secure Digital Identity System • Verifiable QR Secured
            </p>
        </div>
    );
};

export default IDCardGenerator;
