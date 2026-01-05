
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Fee } from '../../types';
import { fetchStudentFees } from '../../lib/payments';
import { FeeCard } from '../payments/FeeCard';
import { PaystackButton } from '../payments/PaystackWrapper';
import { FlutterwaveWrapper } from '../payments/FlutterwaveWrapper';
import { MobileMoneyWrapper } from '../payments/MobileMoneyWrapper';
import { InstallmentSchedule } from './InstallmentSchedule';
import { hasPaymentPlan } from '../../lib/payment-plans';
import { useProfile } from '../../context/ProfileContext';
import { generateReceipt } from '../../lib/receipt-generator';
import { toast } from 'react-hot-toast';

interface FeeStatusScreenProps {
    parentId?: number | null;
    navigateTo: (view: string, title: string, props?: any) => void;
}

const FeeStatusScreen: React.FC<FeeStatusScreenProps> = ({ parentId, navigateTo }) => {
    const [students, setStudents] = useState<any[]>([]);
    const [selectedStudent, setSelectedStudent] = useState<any>(null);
    const [fees, setFees] = useState<Fee[]>([]);
    const [loading, setLoading] = useState(true);

    // Payment State
    const [paymentFee, setPaymentFee] = useState<Fee | null>(null);
    const [userEmail, setUserEmail] = useState<string>('');
    const [paymentGateway, setPaymentGateway] = useState<'paystack' | 'flutterwave' | 'mobilemoney'>('paystack');
    const [parentName, setParentName] = useState<string>('');
    const [parentPhone, setParentPhone] = useState<string>('');
    const [feesWithPlans, setFeesWithPlans] = useState<Set<number>>(new Set());

    useEffect(() => {
        const init = async () => {
            // 1. Get Parent Email for receipts
            const { data: { user } } = await supabase.auth.getUser();
            setUserEmail(user?.email || '');

            // 2. Fetch parent profile details
            if (parentId) {
                const { data: parentProfile } = await supabase
                    .from('profiles')
                    .select('name, phone')
                    .eq('id', user?.id)
                    .single();

                if (parentProfile) {
                    setParentName(parentProfile.name || 'Parent');
                    setParentPhone(parentProfile.phone || '');
                }

                // 3. Fetch Children
                const { data: relations } = await supabase
                    .from('parent_children')
                    .select('student_id, students:student_id(id, name, grade, section, avatar_url)')
                    .eq('parent_id', parentId);

                if (relations && relations.length > 0) {
                    // Flatten structure safely
                    const kids = relations.map((r: any) => r.students);
                    setStudents(kids);
                    setSelectedStudent(kids[0]);
                }
            }
            setLoading(false);
        };
        init();
    }, [parentId]);

    useEffect(() => {
        if (selectedStudent) {
            loadFees(selectedStudent.id);

            // Realtime subscription for fees
            const channel = supabase.channel(`fees_${selectedStudent.id}`)
                .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: 'student_fees',
                    filter: `student_id=eq.${selectedStudent.id}`
                }, () => {
                    loadFees(selectedStudent.id);
                    // Optional: toast.success('Fees updated'); 
                })
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        }
    }, [selectedStudent]);

    const loadFees = async (studentId: number) => {
        setLoading(true);
        const data = await fetchStudentFees(studentId);
        setFees(data);

        // Check which fees have payment plans
        const plansSet = new Set<number>();
        await Promise.all(
            data.map(async (fee) => {
                const hasPlan = await hasPaymentPlan(fee.id);
                if (hasPlan) plansSet.add(fee.id);
            })
        );
        setFeesWithPlans(plansSet);

        setLoading(false);
    };

    const handleDownloadReceipt = async (fee: Fee) => {
        try {
            // Fetch the transaction for this fee
            const { data: transactions, error } = await supabase
                .from('transactions')
                .select('*')
                .eq('fee_id', fee.id)
                .eq('status', 'Success')
                .order('created_at', { ascending: false })
                .limit(1);

            if (error || !transactions || transactions.length === 0) {
                toast.error('No completed transaction found for this fee.');
                return;
            }

            const transaction = transactions[0];

            // Convert from DB format to app format
            const formattedTransaction = {
                id: transaction.id,
                feeId: transaction.fee_id,
                studentId: transaction.student_id,
                payerId: transaction.payer_id,
                amount: transaction.amount,
                reference: transaction.reference,
                provider: transaction.provider,
                status: transaction.status,
                date: transaction.created_at
            };

            // Generate and download the receipt
            await generateReceipt(
                formattedTransaction,
                fee,
                selectedStudent?.name || 'Student',
                'School Management System' // You can make this dynamic from settings
            );
        } catch (err) {
            console.error('Error downloading receipt:', err);
            toast.error('Error generating receipt. Please try again.');
        }
    };

    const handlePayClick = (fee: Fee) => {
        setPaymentFee(fee);
        // Trigger the selected payment gateway
        const btnId = paymentGateway === 'paystack'
            ? `paystack-btn-${fee.id}`
            : paymentGateway === 'flutterwave'
                ? `flutterwave-btn-${fee.id}`
                : `mobilemoney-btn-${fee.id}`;
        const btn = document.getElementById(btnId);
        if (btn) btn.click();
    };

    if (loading && !selectedStudent) return <div className="p-8 text-center">Loading...</div>;

    return (
        <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
            {/* Child Selector */}
            {students.length > 1 && (
                <div className="flex space-x-4 overflow-x-auto pb-2">
                    {students.map(s => (
                        <button
                            key={s.id}
                            onClick={() => setSelectedStudent(s)}
                            className={`flex items-center space-x-2 px-4 py-2 rounded-full border transition-all
                        ${selectedStudent?.id === s.id ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                        >
                            <img src={s.avatar_url || 'https://via.placeholder.com/30'} className="w-6 h-6 rounded-full" />
                            <span className="font-semibold text-sm">{s.name}</span>
                        </button>
                    ))}
                </div>
            )}

            {/* Stats Summary (Optional enhancement) */}

            {/* Payment Gateway Selector */}
            <div className="bg-white rounded-2xl shadow-sm p-4 border border-gray-100">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Payment Method</h3>
                <div className="grid grid-cols-3 gap-2">
                    <button
                        onClick={() => setPaymentGateway('paystack')}
                        className={`flex items-center justify-center gap-2 px-3 py-3 rounded-lg border-2 transition ${paymentGateway === 'paystack'
                            ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                            : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                            }`}
                    >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M3 10h11v2H3v-2zm0-4h11v2H3V6zm0 8h7v2H3v-2zm13.01-2.5l2.5 1.5v2l-2.5-1.5v-2zm2.5-1.5v2l-2.5-1.5v-2l2.5 1.5zm-5 3v-2l2.5-1.5v2l-2.5 1.5z" />
                        </svg>
                        <span className="font-medium text-xs">Paystack</span>
                    </button>
                    <button
                        onClick={() => setPaymentGateway('flutterwave')}
                        className={`flex items-center justify-center gap-2 px-3 py-3 rounded-lg border-2 transition ${paymentGateway === 'flutterwave'
                            ? 'border-orange-500 bg-orange-50 text-orange-700'
                            : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                            }`}
                    >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                        </svg>
                        <span className="font-medium text-xs">Flutterwave</span>
                    </button>
                    <button
                        onClick={() => setPaymentGateway('mobilemoney')}
                        className={`flex items-center justify-center gap-2 px-3 py-3 rounded-lg border-2 transition ${paymentGateway === 'mobilemoney'
                            ? 'border-green-600 bg-green-50 text-green-700'
                            : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                            }`}
                    >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z" />
                        </svg>
                        <span className="font-medium text-xs">Mobile</span>
                    </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                    {paymentGateway === 'paystack' ? 'Cards, Bank Transfer, USSD' : paymentGateway === 'flutterwave' ? 'Cards, Mobile Money, Bank' : 'M-Pesa, MTN, Airtel'}
                </p>
            </div>

            {/* Fee List */}
            <div>
                <h2 className="text-xl font-bold text-gray-800 mb-4">
                    Fees for {selectedStudent?.name}
                </h2>

                {fees.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-2xl shadow-sm">
                        <p className="text-gray-500">No fees assigned currently. You're all good! 🎉</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {fees.map(fee => (
                            <div key={fee.id} className="relative">
                                {/* Show installment schedule if fee has payment plan */}
                                {feesWithPlans.has(fee.id) ? (
                                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
                                        <h3 className="font-semibold text-gray-900 mb-3">{fee.title}</h3>
                                        <InstallmentSchedule
                                            feeId={fee.id}
                                            onPayInstallment={(installment) => {
                                                // For installment payments, use the same payment flow
                                                handlePayClick(fee);
                                            }}
                                        />
                                    </div>
                                ) : (
                                    <>
                                        <FeeCard
                                            fee={fee}
                                            onPay={handlePayClick}
                                            onDownloadReceipt={handleDownloadReceipt}
                                        />
                                        {/* Hidden Payment Triggers */}
                                        <PaystackButton
                                            fee={fee}
                                            email={userEmail}
                                            onSuccess={() => {
                                                toast.success('Payment Successful!');
                                                loadFees(selectedStudent.id); // Refresh
                                            }}
                                        />
                                        <FlutterwaveWrapper
                                            fee={fee}
                                            email={userEmail}
                                            phone={parentPhone}
                                            name={parentName}
                                            onSuccess={() => {
                                                toast.success('Payment Successful!');
                                                loadFees(selectedStudent.id); // Refresh
                                            }}
                                        />
                                        <MobileMoneyWrapper
                                            fee={fee}
                                            email={userEmail}
                                            name={parentName}
                                            onSuccess={() => {
                                                toast.success('Payment Successful!');
                                                loadFees(selectedStudent.id); // Refresh
                                            }}
                                        />
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default FeeStatusScreen;