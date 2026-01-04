import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { ShieldIcon, AlertTriangleIcon, CheckCircleIcon } from '../../constants';

const AnonymousReporting: React.FC = () => {
    const [formData, setFormData] = useState({
        category: 'Bullying',
        severity: 'Medium',
        description: '',
        location: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [trackingCode, setTrackingCode] = useState('');
    const [showSuccess, setShowSuccess] = useState(false);

    const generateTrackingCode = () => {
        return `ANON-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    };

    const generateReportHash = (data: any) => {
        return `HASH-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const code = generateTrackingCode();
            const hash = generateReportHash(formData);

            const { error } = await supabase.from('anonymous_reports').insert({
                report_hash: hash,
                track_code: code,
                category: formData.category,
                severity: formData.severity,
                description_encrypted: formData.description, // Would encrypt in production
                location: formData.location,
                status: 'New'
            });

            if (error) throw error;

            setTrackingCode(code);
            setShowSuccess(true);
            setFormData({
                category: 'Bullying',
                severity: 'Medium',
                description: '',
                location: ''
            });

            toast.success('Report submitted anonymously');
        } catch (error: any) {
            console.error('Error:', error);
            toast.error('Failed to submit report');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (showSuccess) {
        return (
            <div className="p-6 max-w-2xl mx-auto">
                <div className="bg-white rounded-xl shadow-lg p-8 text-center">
                    <CheckCircleIcon className="w-16 h-16 text-green-600 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Report Submitted Successfully</h2>
                    <p className="text-gray-600 mb-6">
                        Your anonymous report has been received. Save this tracking code to check the status of your report.
                    </p>

                    <div className="bg-indigo-50 border-2 border-indigo-500 rounded-lg p-6 mb-6">
                        <p className="text-sm text-gray-600 mb-2">Your Tracking Code:</p>
                        <p className="text-3xl font-bold text-indigo-600 font-mono">{trackingCode}</p>
                        <p className="text-xs text-gray-500 mt-2">Please save this code. You will need it to check updates.</p>
                    </div>

                    <div className="space-y-3">
                        <button
                            onClick={() => {
                                navigator.clipboard.writeText(trackingCode);
                                toast.success('Tracking code copied to clipboard');
                            }}
                            className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                        >
                            Copy Tracking Code
                        </button>
                        <button
                            onClick={() => {
                                setShowSuccess(false);
                                setTrackingCode('');
                            }}
                            className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                        >
                            Submit Another Report
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-2xl mx-auto">
            <div className="bg-white rounded-xl shadow-lg p-8">
                <div className="flex items-center space-x-3 mb-6">
                    <ShieldIcon className="w-8 h-8 text-indigo-600" />
                    <h2 className="text-2xl font-bold text-gray-900">Anonymous Reporting</h2>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <p className="text-sm text-blue-800">
                        <strong>Your privacy is protected:</strong> This form does not collect any identifying information.
                        You will receive a tracking code to check the status of your report.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            What would you like to report? *
                        </label>
                        <select
                            value={formData.category}
                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        >
                            <option>Bullying</option>
                            <option>Safety Concern</option>
                            <option>Mental Health</option>
                            <option>Abuse</option>
                            <option>Substance Use</option>
                            <option>Other</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            How serious is this issue? *
                        </label>
                        <div className="grid grid-cols-4 gap-2">
                            {['Low', 'Medium', 'High', 'Critical'].map((level) => (
                                <button
                                    key={level}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, severity: level })}
                                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${formData.severity === level
                                            ? level === 'Critical' ? 'bg-red-600 text-white' :
                                                level === 'High' ? 'bg-orange-600 text-white' :
                                                    level === 'Medium' ? 'bg-yellow-600 text-white' :
                                                        'bg-green-600 text-white'
                                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                        }`}
                                >
                                    {level}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Please describe what happened *
                        </label>
                        <textarea
                            required
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            rows={6}
                            placeholder="Provide as much detail as you can. Your report is completely anonymous."
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        ></textarea>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Where did this happen? (Optional)
                        </label>
                        <input
                            type="text"
                            value={formData.location}
                            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                            placeholder="e.g., Classroom, Playground, Hallway"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                    </div>

                    {formData.severity === 'Critical' && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <div className="flex items-start space-x-2">
                                <AlertTriangleIcon className="w-5 h-5 text-red-600 mt-0.5" />
                                <div className="text-sm text-red-800">
                                    <p className="font-semibold mb-1">Immediate Help Available</p>
                                    <p>If you or someone else is in immediate danger, please contact:</p>
                                    <p className="font-mono mt-2">Emergency: 112 or 199</p>
                                    <p className="font-mono">Child Helpline: 08008008001</p>
                                </div>
                            </div>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? 'Submitting Anonymously...' : 'Submit Anonymous Report'}
                    </button>

                    <p className="text-xs text-gray-500 text-center">
                        By submitting this report, you help create a safer school environment for everyone.
                    </p>
                </form>
            </div>
        </div>
    );
};

export default AnonymousReporting;
