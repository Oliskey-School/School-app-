import React, { useState, useEffect } from 'react';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import { toast } from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { Fee } from '../../types';
import { assignFee } from '../../lib/payments';
import { CheckCircle, ArrowLeft, Trash2 } from 'lucide-react';
import { PaymentPlanModal } from './PaymentPlanModal';
import { useAuth } from '../../context/AuthContext';
import { useProfile } from '../../context/ProfileContext';

const AssignFeeSchema = Yup.object().shape({
    title: Yup.string().required('Title is required'),
    amount: Yup.number().min(100, 'Minimum 100').required('Required'),
    dueDate: Yup.date().required('Due date is required'),
    studentId: Yup.string().required('Select a student'),
    curriculumType: Yup.string().oneOf(['Nigerian', 'British', 'Dual', 'General']).required('Required')
});

interface AssignFeePageProps {
    handleBack: () => void;
    forceUpdate: () => void;
}

const AssignFeePage: React.FC<AssignFeePageProps> = ({ handleBack, forceUpdate }) => {
    const [students, setStudents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showPaymentPlanModal, setShowPaymentPlanModal] = useState(false);
    const [selectedFee, setSelectedFee] = useState<Fee | null>(null);
    const { profile } = useProfile();
    const { currentSchool } = useAuth();
    const schoolId = profile.schoolId || currentSchool?.id;

    useEffect(() => {
        loadStudents();
    }, [schoolId]);

    const loadStudents = async () => {
        if (!schoolId) return;
        setLoading(true);
        const { data, error } = await supabase
            .from('students')
            .select('id, name, grade, section')
            .eq('school_id', schoolId);

        if (data) setStudents(data);
        setLoading(false);
    };

    const handleAssign = async (values: any, { resetForm }: any) => {
        try {
            if (!schoolId) {
                toast.error("School ID not found. Please ensure you are logged in correctly.");
                return;
            }
            const newFee = await assignFee({
                studentId: values.studentId,
                title: values.title,
                description: values.description,
                amount: parseFloat(values.amount),
                dueDate: values.dueDate,
                type: 'Tuition',
                curriculumType: values.curriculumType
            }, schoolId);

            // Send fee assignment notification
            try {
                const { sendFeeAssignmentNotification } = await import('../../lib/payment-notifications');
                await sendFeeAssignmentNotification(newFee.id);
            } catch (notifError) {
                console.error('Error sending fee assignment notification:', notifError);
            }

            forceUpdate();

            // Success Notification with Action
            toast.custom((t) => (
                <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}>
                    <div className="flex-1 w-0 p-4">
                        <div className="flex items-start">
                            <div className="flex-shrink-0 pt-0.5">
                                <CheckCircle className="h-10 w-10 text-green-500" />
                            </div>
                            <div className="ml-3 flex-1">
                                <p className="text-sm font-medium text-gray-900">Fee Assigned Successfully!</p>
                                <p className="mt-1 text-sm text-gray-500">Would you like to setup a payment plan?</p>
                            </div>
                        </div>
                    </div>
                    <div className="flex border-l border-gray-200">
                        <button
                            onClick={() => {
                                toast.dismiss(t.id);
                                setSelectedFee(newFee);
                                setShowPaymentPlanModal(true);
                            }}
                            className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-indigo-600 hover:text-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            Set Plan
                        </button>
                    </div>
                </div>
            ), { duration: 5000 });

            // We don't go back immediately if they might want to set a plan, 
            // but usually after success we might want to reset or show success screen.
            // For now, let's just toast and stay or go back.
            // Requirement was "make this a page", so it should feel like a form page.
            // Let's reset the form for another assignment if they want.
            resetForm();

        } catch (err: any) {
            console.error('Failed to assign fee:', err);
            toast.error(`Failed to assign fee: ${err.message || 'Unknown error'}`);
        }
    };

    return (
        <div className="flex flex-col h-full bg-gray-50">
            <main className="flex-grow p-4 md:p-6 space-y-6 overflow-y-auto pb-32">
                <div className="max-w-2xl mx-auto">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-6 border-b border-gray-50 flex justify-between items-center">
                            <div>
                                <h1 className="text-xl font-bold text-gray-900">Assign New Fee</h1>
                                <p className="text-sm text-gray-500">Record a new payment obligation for a student</p>
                            </div>
                            <button
                                onClick={handleBack}
                                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        <div className="p-6">
                            {loading ? (
                                <div className="flex flex-col items-center justify-center py-12">
                                    <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                                    <p className="mt-4 text-gray-500">Loading students...</p>
                                </div>
                            ) : (
                                <Formik
                                    initialValues={{ title: '', amount: '', description: '', dueDate: '', studentId: '', curriculumType: 'General' }}
                                    validationSchema={AssignFeeSchema}
                                    onSubmit={handleAssign}
                                >
                                    {({ isSubmitting, errors, touched }) => (
                                        <Form className="space-y-6">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="md:col-span-2">
                                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Student</label>
                                                    <Field
                                                        as="select"
                                                        name="studentId"
                                                        className={`w-full border rounded-xl p-3 bg-gray-50 focus:ring-2 focus:ring-indigo-500 outline-none transition-all ${errors.studentId && touched.studentId ? 'border-red-500' : 'border-gray-200'}`}
                                                    >
                                                        <option value="">Select Student</option>
                                                        {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.grade})</option>)}
                                                    </Field>
                                                    {errors.studentId && touched.studentId && <div className="text-red-500 text-xs mt-1">{String(errors.studentId)}</div>}
                                                </div>

                                                <div className="md:col-span-2">
                                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Fee Title</label>
                                                    <Field
                                                        name="title"
                                                        className={`w-full border rounded-xl p-3 bg-gray-50 focus:ring-2 focus:ring-indigo-500 outline-none transition-all ${errors.title && touched.title ? 'border-red-500' : 'border-gray-200'}`}
                                                        placeholder="e.g. 2nd Term Tuition"
                                                    />
                                                                                                         {errors.title && touched.title && <div className="text-red-500 text-xs mt-1">{String(errors.title)}</div>}                                                </div>

                                                <div>
                                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Amount (NGN)</label>
                                                    <Field
                                                        name="amount"
                                                        type="number"
                                                        className={`w-full border rounded-xl p-3 bg-gray-50 focus:ring-2 focus:ring-indigo-500 outline-none transition-all ${errors.amount && touched.amount ? 'border-red-500' : 'border-gray-200'}`}
                                                        placeholder="0.00"
                                                    />
                                                                                                         {errors.amount && touched.amount && <div className="text-red-500 text-xs mt-1">{String(errors.amount)}</div>}                                                </div>

                                                <div>
                                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Due Date</label>
                                                    <Field
                                                        name="dueDate"
                                                        type="date"
                                                        className={`w-full border rounded-xl p-3 bg-gray-50 focus:ring-2 focus:ring-indigo-500 outline-none transition-all ${errors.dueDate && touched.dueDate ? 'border-red-500' : 'border-gray-200'}`}
                                                    />
                                                                                                         {errors.dueDate && touched.dueDate && <div className="text-red-500 text-xs mt-1">{String(errors.dueDate)}</div>}                                                </div>

                                                <div className="md:col-span-2">
                                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Curriculum Track</label>
                                                    <Field
                                                        as="select"
                                                        name="curriculumType"
                                                        className={`w-full border rounded-xl p-3 bg-gray-50 focus:ring-2 focus:ring-indigo-500 outline-none transition-all ${errors.curriculumType && touched.curriculumType ? 'border-red-500' : 'border-gray-200'}`}
                                                    >
                                                        <option value="General">General / All-Track</option>
                                                        <option value="Nigerian">Nigerian Curriculum</option>
                                                        <option value="British">British Curriculum</option>
                                                        <option value="Dual">Dual Track (NGN/BRI)</option>
                                                    </Field>
                                                                                                         {errors.curriculumType && touched.curriculumType && <div className="text-red-500 text-xs mt-1">{String(errors.curriculumType)}</div>}                                                </div>

                                                <div className="md:col-span-2">
                                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Description (Optional)</label>
                                                    <Field
                                                        as="textarea"
                                                        name="description"
                                                        rows={3}
                                                        className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                                        placeholder="Add any extra details about this fee..."
                                                    />
                                                </div>
                                            </div>

                                            <div className="pt-4 flex gap-4">
                                                <button
                                                    type="button"
                                                    onClick={handleBack}
                                                    className="flex-1 px-6 py-3 border border-gray-200 text-gray-600 rounded-xl font-bold hover:bg-gray-50 transition-all active:scale-95"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    type="submit"
                                                    disabled={isSubmitting}
                                                    className="flex-[2] bg-indigo-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50"
                                                >
                                                    {isSubmitting ? 'Assigning...' : 'Assign Fee'}
                                                </button>
                                            </div>
                                        </Form>
                                    )}
                                </Formik>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            {/* Payment Plan Modal */}
            {showPaymentPlanModal && selectedFee && (
                <PaymentPlanModal
                    feeId={selectedFee.id}
                    studentId={selectedFee.studentId}
                    totalAmount={selectedFee.amount}
                    onClose={() => {
                        setShowPaymentPlanModal(false);
                        setSelectedFee(null);
                        handleBack(); // Go back to list after plan setup
                    }}
                    onSuccess={() => {
                        forceUpdate();
                        handleBack();
                    }}
                />
            )}
        </div>
    );
};

export default AssignFeePage;
