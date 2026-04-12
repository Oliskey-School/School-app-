import React, { useState, useEffect } from 'react';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import { toast } from 'react-hot-toast';
import { Fee } from '../../types';
import { api } from '../../lib/api';
import { Plus, Search, Filter, Trash2, CheckCircle, Clock, AlertCircle, Wallet } from 'lucide-react';
import PaymentPlanModal from './PaymentPlanModal';
import { useAuth } from '../../context/AuthContext';
import { useProfile } from '../../context/ProfileContext';
import { getFormattedClassName } from '../../constants';
import { useAutoSync } from '../../hooks/useAutoSync';

const AssignFeeSchema = Yup.object().shape({
  title: Yup.string().required('Title is required'),
  amount: Yup.number().min(100, 'Minimum 100').required('Required'),
  dueDate: Yup.date().required('Due date is required'),
  studentId: Yup.string().required('Select a student'),
  curriculumType: Yup.string().oneOf(['Nigerian', 'British', 'Dual', 'General']).required('Required')
});

const FeeManagement: React.FC<any> = (props) => {
  const { currentSchool, currentBranchId } = useAuth();
  const schoolId = currentSchool?.id;
  const branchId = currentBranchId;

  const [fees, setFees] = useState<Fee[]>([]);
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<any[]>([]);
  const [showPaymentPlanModal, setShowPaymentPlanModal] = useState(false);
  const [selectedFee, setSelectedFee] = useState<Fee | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!schoolId) return;

    loadData();

    loadData();
  }, [schoolId, branchId]);

  // Unified Backend-driven Auto Sync
  useAutoSync(['student_fees'], () => {
    console.log('🔄 [FeeManagement] Auto-sync triggered');
    loadData();
  });

  const loadData = async () => {
    setLoading(true);
    if (schoolId) {
      try {
        const [feesData, studentsData] = await Promise.all([
          api.getFees(schoolId, branchId || undefined) as Promise<Fee[]>,
          api.getStudents(schoolId, branchId || undefined, { includeUntagged: true })
        ]);

        setFees(feesData || []);
        if (studentsData) setStudents(studentsData);

        // Load recent transactions
        setLoadingTransactions(true);
        const txData = await api.getPaymentHistory(schoolId, branchId || undefined) as any[];
        setRecentTransactions(txData || []);
        setLoadingTransactions(false);
      } catch (err) {
        console.error('Error loading data:', err);
      }
    }
    setLoading(false);
  };

  const handleAssign = async (values: any, { resetForm }: any) => {
    try {
      if (!schoolId) {
        toast.error("School ID not found. Please ensure you are logged in correctly.");
        return;
      }
      // Use API instead of direct lib/payments
      const newFee = await api.createFee(schoolId, branchId || undefined, {
        studentId: values.studentId,
        title: values.title,
        description: values.description,
        amount: parseFloat(values.amount),
        dueDate: values.dueDate,
        type: 'Tuition',
        curriculumType: values.curriculumType
      }) as Fee;

      // Send fee assignment notification
      try {
        const { sendFeeAssignmentNotification } = await import('../../lib/payment-notifications');
        await sendFeeAssignmentNotification(newFee.id);
      } catch (notifError) {
        console.error('Error sending fee assignment notification:', notifError);
      }

      setFees([newFee, ...fees]);
      resetForm();

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
                setSelectedFee(newFee as Fee);
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

  const handleDeleteFee = async (feeId: string) => {
    if (!window.confirm('Are you sure you want to delete this fee? This action cannot be undone.')) return;

    try {
      await api.deleteFee(feeId);
      toast.success('Fee deleted successfully');
      loadData();
    } catch (err: any) {
      console.error('Error deleting fee:', err);
      toast.error('Failed to delete fee');
    }
  };


  const handleDeleteTransaction = async (txId: string) => {
    if (!window.confirm('Are you sure you want to delete this payment record? This will revert the fee status.')) return;
    try {
      await api.deletePayment(txId);
      toast.success('Payment record deleted');
      loadData();
    } catch (err) {
      toast.error('Failed to delete payment');
    }
  };

  // Filter fees based on search term
  const filteredFees = fees.filter(fee => {
    const student = students.find(s => s.id === fee.studentId);
    if (!searchTerm) return true;

    const term = searchTerm.toLowerCase();
    const studentName = (student?.name || '').toLowerCase();
    const studentClass = getFormattedClassName(student?.grade, student?.section).toLowerCase();
    const studentId = (student?.school_generated_id || '').toLowerCase();

    return studentName.includes(term) ||
      studentClass.includes(term) ||
      studentId.includes(term) ||
      fee.title.toLowerCase().includes(term);
  });

  return (
    <div className="p-6 max-w-7xl mx-auto pb-32 lg:pb-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fee Management</h1>
          <p className="text-gray-500">Track and assign student fees</p>
        </div>
        <button
          onClick={() => (props as any).navigateTo('assignFee', 'Assign New Fee')}
          className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 transition"
        >
          <Plus className="w-5 h-5" />
          <span>Assign Fee</span>
        </button>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
          <input
            type="text"
            placeholder="Search student by name or class (e.g. 'Primary 3')..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-100 rounded-2xl shadow-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-gray-400"
          />
        </div>
        <button
          onClick={loadData}
          className="px-6 py-3 bg-white border border-gray-100 text-gray-600 rounded-2xl shadow-sm hover:bg-gray-50 flex items-center justify-center gap-2 font-medium transition-all"
        >
          <Filter className="w-5 h-5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Total Expected</p>
          <p className="text-xl lg:text-2xl font-bold text-gray-900">
            {new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(filteredFees.reduce((a, b) => a + b.amount, 0))}
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-green-100">
          <p className="text-sm text-green-600">Total Collected</p>
          <p className="text-xl lg:text-2xl font-bold text-green-700">
            {new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(filteredFees.reduce((a, b) => a + (b.paidAmount || 0), 0))}
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-red-100 sm:col-span-2 lg:col-span-1">
          <p className="text-sm text-red-600">Outstanding</p>
          <p className="text-xl lg:text-2xl font-bold text-red-700">
            {new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(filteredFees.reduce((a, b) => a + (b.amount - (b.paidAmount || 0)), 0))}
          </p>
        </div>
      </div>

      {/* Fees Table */}
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
                <tr><td colSpan={7} className="p-8 text-center text-gray-500">Loading fees...</td></tr>
              ) : filteredFees.length === 0 ? (
                <tr><td colSpan={7} className="p-8 text-center text-gray-500">No fees found matching your search.</td></tr>
              ) : filteredFees.map(fee => {
                const student = students.find(s => s.id === fee.studentId);
                return (
                  <tr key={fee.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{student?.name || `ID: ${student?.school_generated_id || 'Pending'}`}</div>
                      <div className="text-xs text-gray-500">{getFormattedClassName(student?.grade, student?.section)}</div>
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
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={async () => {
                            try {
                              const { generateInvoice, generateInvoiceNumber } = await import('../../lib/invoice-generator');
                              await generateInvoice({
                                invoiceNumber: generateInvoiceNumber(fee.id, fee.studentId),
                                studentName: student?.name || 'Student',
                                grade: student?.grade || 'N/A',
                                section: student?.section,
                                parentName: 'Parent',
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
                          className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Generate Invoice"
                        >
                          📄
                        </button>
                        <button
                          onClick={() => {
                            (props as any).navigateTo('recordPayment', 'Record Payment', { fee: fee, student: student });
                          }}
                          className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="Record Payment"
                        >
                          <Wallet className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteFee(fee.id.toString())}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Fee"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

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


      {/* Recent Transactions Section */}
      <div className="mt-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">Recent Transactions</h2>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Student</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Amount</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Reference</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loadingTransactions ? (
                  <tr><td colSpan={5} className="p-8 text-center text-gray-500">Loading transactions...</td></tr>
                ) : recentTransactions.length === 0 ? (
                  <tr><td colSpan={5} className="p-8 text-center text-gray-500">No transactions found</td></tr>
                ) : (
                  recentTransactions.map(tx => {
                    const student = students.find(s => s.id === tx.studentId);
                    return (
                      <tr key={tx.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900">{student?.name || 'N/A'}</div>
                        </td>
                        <td className="px-6 py-4 font-semibold text-green-600">
                          {new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(tx.amount)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">{tx.reference}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {new Date(tx.date).toLocaleString()}
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleDeleteTransaction(tx.id.toString())}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete Transaction"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeeManagement;
