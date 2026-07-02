import React from 'react';
import { MessageSquare, Send, Info } from 'lucide-react';

const SMSLessonManager: React.FC = () => {
    return (
        <div className="p-6 max-w-3xl mx-auto">
            <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-rose-100 rounded-xl">
                    <MessageSquare className="w-7 h-7 text-rose-600" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">SMS Lesson Manager</h1>
                    <p className="text-sm text-gray-500 mt-0.5">Send lesson summaries and school updates via SMS</p>
                </div>
            </div>

            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-8 text-center">
                <div className="flex justify-center mb-4">
                    <span className="bg-rose-100 text-rose-700 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">Coming Soon</span>
                </div>
                <Send className="w-14 h-14 text-rose-400 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-gray-900 mb-2">SMS Provider Not Configured</h2>
                <p className="text-gray-600 max-w-md mx-auto mb-6">
                    This feature lets you send lesson summaries, fee reminders, and school updates directly to
                    parents and students via SMS — even on basic phones with no internet connection.
                </p>

                <div className="bg-white border border-rose-100 rounded-xl p-5 text-left max-w-md mx-auto">
                    <div className="flex items-start gap-3">
                        <Info className="w-5 h-5 text-rose-500 mt-0.5 flex-shrink-0" />
                        <div>
                            <p className="text-sm font-semibold text-gray-800 mb-1">Supported SMS providers (any one required):</p>
                            <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                                <li><span className="font-medium">Termii</span> — Nigerian SMS gateway, very cost-effective</li>
                                <li><span className="font-medium">Africa's Talking</span> — popular across West Africa</li>
                                <li><span className="font-medium">Twilio</span> — global, reliable, higher cost</li>
                                <li><span className="font-medium">Bulksmsnigeria</span> — affordable Nigerian provider</li>
                            </ul>
                        </div>
                    </div>
                </div>

                <p className="text-sm text-gray-500 mt-6">
                    Contact <span className="font-semibold text-rose-600">support@oliskey.com</span> to activate SMS messaging for your school.
                </p>
            </div>
        </div>
    );
};

export default SMSLessonManager;
