import React from 'react';
import { motion } from 'framer-motion';
import { Phone, PhoneCall, Info } from 'lucide-react';

const IVRLessonRecorder: React.FC = () => {
    return (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="p-6 max-w-3xl mx-auto">
            <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-blue-100 rounded-xl">
                    <Phone className="w-7 h-7 text-blue-600" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">IVR Lesson Recorder</h1>
                    <p className="text-sm text-gray-500 mt-0.5">Deliver audio lessons via interactive phone calls</p>
                </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-8 text-center">
                <div className="flex justify-center mb-4">
                    <span className="bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">Coming Soon</span>
                </div>
                <PhoneCall className="w-14 h-14 text-blue-400 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-gray-900 mb-2">IVR Phone Provider Not Connected</h2>
                <p className="text-gray-600 max-w-md mx-auto mb-6">
                    This feature allows students and parents to call a phone number and listen to recorded school lessons.
                    It requires an IVR (Interactive Voice Response) phone gateway to be configured.
                </p>

                <div className="bg-white border border-blue-100 rounded-xl p-5 text-left max-w-md mx-auto">
                    <div className="flex items-start gap-3">
                        <Info className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                        <div>
                            <p className="text-sm font-semibold text-gray-800 mb-1">Supported providers (any one required):</p>
                            <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                                <li><span className="font-medium">Africa's Talking</span> — popular across Nigeria & West Africa</li>
                                <li><span className="font-medium">Twilio</span> — global IVR platform</li>
                                <li><span className="font-medium">Infobip</span> — enterprise voice messaging</li>
                            </ul>
                        </div>
                    </div>
                </div>

                <p className="text-sm text-gray-500 mt-6">
                    Contact <span className="font-semibold text-blue-600">support@oliskey.com</span> to activate IVR phone lessons for your school.
                </p>
            </div>
        </motion.div>
    );
};

export default IVRLessonRecorder;
