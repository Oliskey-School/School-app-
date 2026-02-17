import React, { useRef } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { QRCodeCanvas } from 'qrcode.react';
import { Student, Teacher } from '../../types';
import { useProfile } from '../../context/ProfileContext';
import { toast } from 'react-hot-toast';
import { getFormattedClassName } from '../../constants';

interface IDCardGeneratorProps {
    user: Student | Teacher;
    userType: 'student' | 'teacher';
}

const IDCardGenerator: React.FC<IDCardGeneratorProps> = ({ user, userType }) => {
    const cardRef = useRef<HTMLDivElement>(null);
    const { profile } = useProfile();

    const generatePDF = async () => {
        if (!cardRef.current) return;

        try {
            const canvas = await html2canvas(cardRef.current, {
                scale: 2,
                backgroundColor: '#ffffff'
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: 'landscape',
                unit: 'mm',
                format: [85.6, 53.98] // Standard ID card size
            });

            pdf.addImage(imgData, 'PNG', 0, 0, 85.6, 53.98);
            pdf.save(`${user.name.replace(/\s+/g, '_')}_ID_Card.pdf`);
            toast.success('ID Card downloaded successfully!');
        } catch (error) {
            console.error('Error generating PDF:', error);
            toast.error('Failed to generate ID card');
        }
    };

    const [scale, setScale] = React.useState(1);
    const containerRef = useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        const updateScale = () => {
            if (containerRef.current) {
                const containerWidth = containerRef.current.offsetWidth;
                const padding = 32; // padding for sm:p-6
                const availableWidth = containerWidth - padding;
                const newScale = Math.min(availableWidth / 856, 1.2); // Allow slight upscale for better visibility
                setScale(newScale);
            }
        };

        updateScale();
        const timeoutId = setTimeout(updateScale, 100); // Initial check after mount
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
        cardNumber: `${userType.toUpperCase()}-${String(user.id).padStart(6, '0')}`
    });

    return (
        <div className="flex flex-col items-center space-y-6 p-4 sm:p-6 w-full max-w-full overflow-hidden">
            {/* ID Card Preview - Responsive Scaling Container */}
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
                    <div ref={cardRef} data-id-card="true" className="relative w-[856px] h-[540px] bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 rounded-3xl shadow-2xl overflow-hidden">
                        {/* Background Pattern */}
                        <div className="absolute inset-0 opacity-10">
                            <div className="absolute inset-0" style={{
                                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
                            }} />
                        </div>

                        {/* School Logo/Header */}
                        <div className="absolute top-6 left-8 flex items-center space-x-3">
                            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg">
                                <span className="text-3xl font-bold text-indigo-600">SA</span>
                            </div>
                            <div className="text-white">
                                <h3 className="text-2xl font-bold tracking-tight">School App</h3>
                                <p className="text-sm opacity-90">{userType === 'student' ? 'Student ID' : 'Staff ID'}</p>
                            </div>
                        </div>

                        {/* Main Content */}
                        <div className="absolute top-32 left-8 right-8 flex items-start space-x-8">
                            {/* Photo */}
                            <div className="flex-shrink-0">
                                <div className="w-36 h-36 rounded-2xl overflow-hidden bg-white shadow-xl border-4 border-white">
                                    {user.avatarUrl ? (
                                        <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-200 to-purple-200">
                                            <span className="text-5xl font-bold text-indigo-700">{user.name.charAt(0)}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Details */}
                            <div className="flex-1 space-y-3 text-white">
                                <div>
                                    <p className="text-xs opacity-70 uppercase tracking-wider">Full Name</p>
                                    <p className="text-2xl font-bold truncate pr-4">{displayName}</p>
                                </div>

                                {userType === 'student' ? (
                                    <>
                                        <div className="flex space-x-6">
                                            <div>
                                                <p className="text-xs opacity-70 uppercase tracking-wider">Class</p>
                                                <p className="text-lg font-semibold">{getFormattedClassName((user as Student).grade, (user as Student).section)}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs opacity-70 uppercase tracking-wider">ID Number</p>
                                                <p className="text-lg font-semibold tracking-wide">{displayId}</p>
                                            </div>
                                        </div>
                                        {(user as Student).bloodGroup && (
                                            <div>
                                                <p className="text-xs opacity-70 uppercase tracking-wider">Blood Type</p>
                                                <p className="text-lg font-semibold">{(user as Student).bloodGroup}</p>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        <div className="flex space-x-6">
                                            <div>
                                                <p className="text-xs opacity-70 uppercase tracking-wider">Department</p>
                                                <p className="text-lg font-semibold">{(user as Teacher).subjects?.[0] || 'General'}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs opacity-70 uppercase tracking-wider">Employee ID</p>
                                                <p className="text-lg font-semibold">{displayId}</p>
                                            </div>
                                        </div>
                                    </>
                                )}

                                <div>
                                    <p className="text-xs opacity-70 uppercase tracking-wider">Valid Until</p>
                                    <p className="text-lg font-semibold">{new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toLocaleDateString()}</p>
                                </div>
                            </div>

                            {/* QR Code */}
                            <div className="flex-shrink-0">
                                <div className="bg-white p-3 rounded-xl shadow-xl">
                                    <QRCodeCanvas value={qrData} size={100} level="H" />
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="absolute bottom-6 left-8 right-8 flex justify-between items-center text-white text-xs opacity-80">
                            <p>Issued: {new Date().toLocaleDateString()}</p>
                            <p className="text-right">In case of emergency, contact: {userType === 'student' ? (user as Student).parentPhone || 'N/A' : 'School Office'}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Download Button */}
            <button
                onClick={generatePDF}
                className="px-8 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-lg hover:bg-indigo-700 transition-colors flex items-center space-x-2"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                <span>Download ID Card (PDF)</span>
            </button>

            <p className="text-sm text-gray-500 text-center max-w-md">
                This digital ID card can be printed or saved to your device. The QR code can be scanned for quick verification.
            </p>
        </div>
    );
};

export default IDCardGenerator;
