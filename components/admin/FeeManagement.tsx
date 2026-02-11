import React, { useState, useEffect } from 'react';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import { toast } from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { Fee } from '../../types';
import { fetchAllFees, assignFee } from '../../lib/payments';
import { Plus, Search, Filter, Trash2, CheckCircle, Clock, AlertCircle } from 'lucide-react';
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

const FeeManagement: React.FC = () => {
  const [fees, setFees] = useState<Fee[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [showPaymentPlanModal, setShowPaymentPlanModal] = useState(false);
  const [selectedFee, setSelectedFee] = useState<Fee | null>(null);
  const { profile } = useProfile();
  const { currentSchool } = useAuth();
  const schoolId = profile.schoolId || currentSchool?.id;

  useEffect(() => {
    loadData();

    // Real-time subscription for fee updates
    const channel = supabase.channel('admin_fees_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'student_fees' }, (payload) => {
        console.log('Fee update received:', payload);
        loadData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadData = async () => {
    setLoading(true);
    if (schoolId) {
      const [feesData, studentsData] = await Promise.all([
        fetchAllFees(schoolId),
        supabase.from('students').select('id, name, grade, section').eq('school_id', schoolId)
      ]);

      setFees(feesData);
      if (studentsData.data) setStudents(studentsData.data);
    }
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
        // Don't fail fee creation if notification fails
      }

      setFees([newFee, ...fees]);
      setIsModalOpen(false);
      resetForm();

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

    } catch (err: any) {
      console.error('Failed to assign fee:', err);
      toast.error(`Failed to assign fee: ${err.message || 'Unknown error'}`);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto pb-32 lg:pb-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fee Management</h1>
          <p className="text-gray-500">Track and assign student fees</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 transition"
        >
          <Plus className="w-5 h-5" />
          <span>Assign Fee</span>
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Total Expected</p>
          <p className="text-xl lg:text-2xl font-bold text-gray-900">
            {new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(fees.reduce((a, b) => a + b.amount, 0))}
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-green-100">
          <p className="text-sm text-green-600">Total Collected</p>
          <p className="text-xl lg:text-2xl font-bold text-green-700">
            {new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(fees.reduce((a, b) => a + (b.paidAmount || 0), 0))}
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-red-100 sm:col-span-2 lg:col-span-1">
          <p className="text-sm text-red-600">Outstanding</p>
          <p className="text-xl lg:text-2xl font-bold text-red-700">
            {new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(fees.reduce((a, b) => a + (b.amount - (b.paidAmount || 0)), 0))}
          </p>
        </div>
      </div>

      {/* Fees Table - Responsive with horizontal scroll on mobile */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[640px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Student</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Fee Info</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Curriculum</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Amount</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Date</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={6} className="p-8 text-center text-gray-500">Loading fees...</td></tr>
              ) : fees.map(fee => {
                const student = students.find(s => s.id === fee.studentId);
                return (
                  <tr key={fee.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{student?.name || `ID: ${fee.studentId}`}</div>
                      <div className="text-xs text-gray-500">{student?.grade} {student?.section}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div>
                          <div className="font-medium text-gray-900">{fee.title}</div>
                          <div className="text-xs text-gray-400 line-clamp-1">{fee.description}</div>
                        </div>
                        {fee.hasPaymentPlan && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-100 whitespace-nowrap">
                            📅 PLAN
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-tight ${fee.curriculumType === 'British' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                        fee.curriculumType === 'Nigerian' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                          fee.curriculumType === 'Dual' ? 'bg-purple-50 text-purple-600 border border-purple-100' :
                            'bg-gray-50 text-gray-600 border border-gray-100'
                        }`}>
                        {fee.curriculumType || 'General'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900">
                        {new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(fee.amount)}
                      </div>
                      {fee.paidAmount > 0 && (
                        <div className="text-xs text-green-600">Paid: {fee.paidAmount}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                                            ${fee.status === 'Paid' ? 'bg-green-100 text-green-800' :
                          fee.status === 'Overdue' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {fee.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(fee.dueDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={async () => {
                          try {
                            const { generateInvoice, generateInvoiceNumber } = await import('../../lib/invoice-generator');
                            await generateInvoice({
                              invoiceNumber: generateInvoiceNumber(fee.id, fee.studentId),
                              studentName: student?.name || 'Student',
                              grade: student?.grade || 'N/A',
                              section: student?.section,
                              parentName: 'Parent', // Could fetch from DB
                              feeTitle: fee.title,
                              amount: fee.amount,
                              paidAmount: fee.paidAmount || 0,
                              balance: fee.amount - (fee.paidAmount || 0),
                              dueDate: new Date(fee.dueDate).toLocaleDateString(),
                              assignedDate: new Date().toLocaleDateString(),
                              description: fee.description
                            });
                          } catch (err) {
                            console.error('Error generating invoice:', err);
                            toast.error('Error generating invoice');
                          }
                        }}
                        className="text-indigo-600 hover:text-indigo-800 font-medium text-sm"
                      >
                        📄 Invoice
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Assign Fee Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Assign New Fee</h3>
              <button onClick={() => setIsModalOpen(false)}><Trash2 className="w-5 h-5 text-gray-400" /></button>
            </div>

            <Formik
              initialValues={{ title: '', amount: '', description: '', dueDate: '', studentId: '', curriculumType: 'General' }}
              validationSchema={AssignFeeSchema}
              onSubmit={handleAssign}
            >
              {({ isSubmitting }) => (
                <Form className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Student</label>
                    <Field as="select" name="studentId" className="w-full border rounded-lg p-2">
                      <option value="">Select Student</option>
                      {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.grade})</option>)}
                    </Field>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Fee Title</label>
                    <Field name="title" className="w-full border rounded-lg p-2" placeholder="e.g. 2nd Term Tuition" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Amount (NGN)</label>
                    <Field name="amount" type="number" className="w-full border rounded-lg p-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Due Date</label>
                    <Field name="dueDate" type="date" className="w-full border rounded-lg p-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Curriculum Track</label>
                    <Field as="select" name="curriculumType" className="w-full border rounded-lg p-2">
                      <option value="General">General / All-Track</option>
                      <option value="Nigerian">Nigerian Curriculum</option>
                      <option value="British">British Curriculum</option>
                      <option value="Dual">Dual Track (NGN/BRI)</option>
                    </Field>
                  </div>
                  <div className="pt-2">
                    <button type="submit" disabled={isSubmitting} className="w-full bg-indigo-600 text-white py-2 rounded-lg font-semibold hover:bg-indigo-700">
                      {isSubmitting ? 'Assigning...' : 'Assign Fee'}
                    </button>
                  </div>
                </Form>
              )}
            </Formik>
          </div>
        </div>
      )}

      {/* Payment Plan Modal */}
      {showPaymentPlanModal && selectedFee && (
        <PaymentPlanModal
          feeId={selectedFee.id}
          studentId={selectedFee.studentId}
          totalAmount={selectedFee.amount}
          onClose={() => {
            setShowPaymentPlanModal(false);
            setSelectedFee(null);
          }}
          onSuccess={() => {
            loadData();
          }}
        />
      )}
    </div>
  );
};

export default FeeManagement;
