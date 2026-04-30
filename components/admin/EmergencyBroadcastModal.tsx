
import React, { useState } from 'react';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import { AlertTriangle, Send, X, Radio } from 'lucide-react';
import { sendEmergencyBroadcast } from '../../lib/broadcasts';

interface EmergencyBroadcastModalProps {
    isOpen: boolean;
    onClose: () => void;
    schoolId?: string;
}

const BroadcastSchema = Yup.object().shape({
    title: Yup.string().required('Required'),
    message: Yup.string().min(10, 'Too short').required('Required'),
    audience: Yup.string().oneOf(['all', 'parents', 'teachers', 'staff']).required('Required'),
    channels: Yup.array().min(1, 'Select at least one channel')
});

export const EmergencyBroadcastModal: React.FC<EmergencyBroadcastModalProps> = ({ isOpen, onClose }) => {
    const [isSending, setIsSending] = useState(false);
    const [success, setSuccess] = useState(false);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex flex-col bg-white overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex-1 flex flex-col w-full max-w-4xl mx-auto overflow-y-auto">

                {/* Header */}
                <div className="bg-red-50 p-8 border-b border-red-100 flex justify-between items-center sticky top-0 z-10">
                    <div className="flex items-center space-x-4">
                        <div className="p-3 bg-red-100 rounded-2xl text-red-600 shadow-inner">
                            <AlertTriangle className="w-8 h-8" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-gray-900 tracking-tight uppercase">Emergency Broadcast Hub</h2>
                            <p className="text-sm text-red-600 font-bold flex items-center gap-1.5">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                                </span>
                                System-Wide Critical Alert
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="p-2 hover:bg-red-100 rounded-full transition-colors group"
                    >
                        <X className="w-8 h-8 text-gray-400 group-hover:text-red-600" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {success ? (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Send className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Broadcast Sent</h3>
                            <p className="text-gray-500 mb-6">Your emergency alert has been queued for delivery.</p>
                            <button onClick={onClose} className="px-6 py-2 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-black">
                                Close
                            </button>
                        </div>
                    ) : (
                        <Formik
                            initialValues={{
                                title: 'URGENT: ',
                                message: '',
                                audience: 'all',
                                channels: ['push', 'email']
                            }}
                            validationSchema={BroadcastSchema}
                            onSubmit={async (values) => {
                                setIsSending(true);
                                await sendEmergencyBroadcast(values.title, values.message, values.audience as any, values.channels);
                                setIsSending(false);
                                setSuccess(true);
                            }}
                        >
                            {({ values, setFieldValue }) => (
                                <Form className="space-y-5">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Alert Title</label>
                                        <Field name="title" className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none" placeholder="e.g. SCHOOL CLOSED TODAY" />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                                        <Field as="textarea" name="message" rows={4} className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none" placeholder="Detailed instructions..." />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Audience</label>
                                            <Field as="select" name="audience" className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-red-500 outline-none">
                                                <option value="all">Everyone</option>
                                                <option value="parents">Parents Only</option>
                                                <option value="teachers">Teachers Only</option>
                                                <option value="staff">Staff Only</option>
                                            </Field>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Channels</label>
                                            <div className="flex space-x-3">
                                                <label className="flex items-center space-x-2 text-sm cursor-pointer">
                                                    <input type="checkbox"
                                                        checked={values.channels.includes('push')}
                                                        onChange={(e) => {
                                                            if (e.target.checked) setFieldValue('channels', [...values.channels, 'push']);
                                                            else setFieldValue('channels', values.channels.filter(c => c !== 'push'));
                                                        }}
                                                        className="text-red-600 rounded focus:ring-red-500"
                                                    />
                                                    <span>Push</span>
                                                </label>
                                                <label className="flex items-center space-x-2 text-sm cursor-pointer">
                                                    <input type="checkbox"
                                                        checked={values.channels.includes('email')}
                                                        onChange={(e) => {
                                                            if (e.target.checked) setFieldValue('channels', [...values.channels, 'email']);
                                                            else setFieldValue('channels', values.channels.filter(c => c !== 'email'));
                                                        }}
                                                        className="text-red-600 rounded focus:ring-red-500"
                                                    />
                                                    <span>Email</span>
                                                </label>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-2">
                                        <button
                                            type="submit"
                                            disabled={isSending}
                                            className="w-full flex items-center justify-center px-4 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-200 disabled:opacity-50"
                                        >
                                            {isSending ? (
                                                <span className="animate-pulse">Broadcasting...</span>
                                            ) : (
                                                <>
                                                    <AlertTriangle className="w-5 h-5 mr-2" />
                                                    SEND EMERGENCY ALERT
                                                </>
                                            )}
                                        </button>
                                        <p className="text-center text-xs text-gray-400 mt-2">
                                            This action is verified and logged.
                                        </p>
                                    </div>
                                </Form>
                            )}
                        </Formik>
                    )}
                </div>
            </div>
        </div>
    );
};
