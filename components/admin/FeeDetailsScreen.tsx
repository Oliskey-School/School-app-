
import React, { useState, useEffect } from 'react';
import { MailIcon, PlusIcon } from '../../constants';
import { StudentFeeInfo } from '../../types';
import { api } from '../../lib/api';
import { toast } from 'react-hot-toast';

interface FeeDetailsScreenProps {
  student: StudentFeeInfo;
  navigateTo?: (view: string, title: string, props?: any) => void;
}

interface PaymentRecord {
  id: string;
  amount: number;
  payment_date?: string;
  created_at?: string;
  payment_method?: string;
  method?: string;
  reference?: string;
  transaction_reference?: string;
}

const formatter = new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 2 });

const FeeDetailsScreen: React.FC<FeeDetailsScreenProps> = ({ student, navigateTo }) => {
  const [paymentHistory, setPaymentHistory] = useState<PaymentRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [sendingReminder, setSendingReminder] = useState(false);

  useEffect(() => {
    if (student?.id) fetchPaymentHistory();
  }, [student?.id]);

  const fetchPaymentHistory = async () => {
    if (!student?.id) return;
    setHistoryLoading(true);
    try {
      const data = await api.getPaymentHistory({ studentId: student.id });
      setPaymentHistory(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Failed to load payment history');
    } finally {
      setHistoryLoading(false);
    }
  };

  if (!student) {
    return <div className="p-6 text-center text-sm text-gray-500">No student selected. Open this view from a student row.</div>;
  }

  const { totalFee = 0, paidAmount = 0, name = 'Unknown', grade = 0, section = '', avatarUrl = '' } = student;
  const balance = totalFee - paidAmount;

  const feeBreakdown = [
    { item: 'Total Term Charges', amount: totalFee },
  ];

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <main className="flex-grow p-4 space-y-4 overflow-y-auto">
        <div className="bg-white p-4 rounded-xl shadow-sm flex items-center space-x-4">
          <img src={avatarUrl} alt={name} className="w-16 h-16 rounded-full object-cover" />
          <div>
            <p className="font-bold text-xl text-gray-800">{name}</p>
            <p className="font-medium text-gray-500">Grade {grade}{section}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-center">
          <div className="bg-white p-3 rounded-xl shadow-sm">
            <p className="text-sm text-gray-500">Amount Paid</p>
            <p className="font-bold text-lg text-green-600">{formatter.format(paidAmount)}</p>
          </div>
          <div className="bg-white p-3 rounded-xl shadow-sm">
            <p className="text-sm text-gray-500">Balance</p>
            <p className={`font-bold text-lg ${balance > 0 ? 'text-red-600' : 'text-gray-800'}`}>{formatter.format(balance)}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm">
          <h3 className="font-bold text-gray-800 mb-2">Fee Breakdown</h3>
          <ul className="space-y-2">
            {feeBreakdown.map(item => (
              <li key={item.item} className="flex justify-between items-center text-sm">
                <span className="text-gray-600">{item.item}</span>
                <span className="font-medium text-gray-800">{formatter.format(item.amount)}</span>
              </li>
            ))}
            <li className="flex justify-between items-center text-sm font-bold border-t pt-2 mt-2">
              <span className="text-gray-800">Total</span>
              <span className="text-gray-800">{formatter.format(totalFee)}</span>
            </li>
          </ul>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm">
          <h3 className="font-bold text-gray-800 mb-2">Payment History</h3>
          {historyLoading ? (
            <p className="text-sm text-gray-400 text-center py-4">Loading...</p>
          ) : paymentHistory.length > 0 ? (
            <ul className="space-y-3">
              {paymentHistory.map(p => {
                const date = p.payment_date || p.created_at || '';
                const method = p.payment_method || p.method || 'Payment';
                const ref = p.reference || p.transaction_reference || p.id;
                return (
                  <li key={p.id} className="flex items-center">
                    <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center mr-3">
                      <PlusIcon className="w-5 h-5 text-green-600" />
                    </div>
                    <div className="flex-grow">
                      <p className="font-semibold text-gray-700">{method}</p>
                      <p className="text-xs text-gray-500">{date ? new Date(date).toLocaleDateString() : ''} · {ref}</p>
                    </div>
                    <p className="font-bold text-green-600">{formatter.format(p.amount)}</p>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">No payment history found.</p>
          )}
        </div>
      </main>

      <div className="p-4 mt-auto bg-white border-t space-y-3">
        <button
          onClick={() => {
            if (navigateTo) navigateTo('recordPayment', `Record Payment — ${name}`, { student });
            else toast('Use the "Record Payment" button on the fee row in Fee Management to log a payment.', { icon: 'ℹ️' });
          }}
          className="w-full flex justify-center items-center space-x-2 py-3 px-4 border border-transparent rounded-lg shadow-sm font-medium text-white bg-sky-500 hover:bg-sky-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500">
          <PlusIcon className="h-5 w-5" />
          <span>Record Payment</span>
        </button>
        <button
          disabled={sendingReminder}
          onClick={async () => {
            if (balance <= 0) { toast('This student has no outstanding balance.', { icon: '✅' }); return; }
            setSendingReminder(true);
            try {
              const parents = await api.getParentsByStudentId(student.id);
              const targets = (parents || []).filter((p: any) => p.user_id || p.id);
              if (targets.length === 0) {
                toast.error('No parent is linked to this student yet.');
                return;
              }
              await Promise.all(targets.map((p: any) => api.sendNotification({
                userId: p.user_id || p.id,
                title: 'School Fees Reminder',
                body: `Dear Parent/Guardian, this is a friendly reminder that ${name} has an outstanding fee balance of ${formatter.format(balance)}. Kindly complete the payment at your earliest convenience. Thank you.`,
                urgency: 'high',
              })));
              toast.success(`Reminder sent to ${targets.length} parent${targets.length > 1 ? 's' : ''}.`);
            } catch {
              toast.error('Could not send the reminder. Please try again.');
            } finally {
              setSendingReminder(false);
            }
          }}
          className="w-full flex justify-center items-center space-x-2 py-3 px-4 border border-gray-300 rounded-lg shadow-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:opacity-50">
          <MailIcon className="h-5 w-5" />
          <span>{sendingReminder ? 'Sending…' : 'Send Reminder'}</span>
        </button>
      </div>
    </div>
  );
};

export default FeeDetailsScreen;
