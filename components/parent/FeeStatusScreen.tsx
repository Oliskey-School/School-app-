
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
            const authEmail = user?.email || '';
            setUserEmail(authEmail);

            // 2. Fetch parent profile details from parents table
            if (parentId) {
                const { data: parentProfile, error } = await supabase
                    .from('parents')
                    .select('name, email, phone')
                    .eq('id', parentId)
                    .single();

                if (parentProfile) {
                    // Use parent profile data with fallbacks
                    setParentName(parentProfile.name || 'Parent');
                    setParentPhone(parentProfile.phone || '0000000000');
                    // Use parent email if available, otherwise use auth email
                    if (parentProfile.email && !authEmail) {
                        setUserEmail(parentProfile.email);
                    }
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
                } else {
                    toast('No children found for this parent.');
                }
            } else {
                toast.error('Parent ID not found. Please log in again.');
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

    if (loading && !selectedStudent) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading fee information...</p>
                </div>
            </div>
        );
    }

    if (!selectedStudent && students.length === 0) {
        return (
            <div className="p-8 text-center bg-white rounded-2xl shadow-sm">
                <p className="text-gray-500">No student data available.</p>
            </div>
        );
    }

    const totalDue = fees.reduce((sum, fee) => sum + (fee.amount - (fee.paidAmount || 0)), 0);
    const totalPaid = fees.reduce((sum, fee) => sum + (fee.paidAmount || 0), 0);

    return (
        <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
            {/* Child Selector */}
            {students.length > 1 && (
                <div className="flex space-x-3 overflow-x-auto pb-2 scrollbar-hide">
                    {students.map(s => (
                        <button
                            key={s.id}
                            onClick={() => setSelectedStudent(s)}
                            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl border-2 transition-all flex-shrink-0
                        ${selectedStudent?.id === s.id ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-gray-700 border-gray-200 hover:border-indigo-300 hover:bg-indigo-50'}`}
                        >
                            <img src={s.avatar_url || 'https://via.placeholder.com/32'} className="w-7 h-7 rounded-full ring-2 ring-white" alt={s.name} />
                            <div className="text-left">
                                <span className="font-semibold text-sm block">{s.name}</span>
                                <span className="text-xs opacity-80">{s.grade} {s.section}</span>
                            </div>
                        </button>
                    ))}
                </div>
            )}

            {/* Stats Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg p-5 text-white">
                    <p className="text-sm opacity-90 mb-1">Total Fees</p>
                    <p className="text-2xl font-bold">
                        {new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(fees.reduce((sum, fee) => sum + fee.amount, 0))}
                    </p>
                    <p className="text-xs opacity-75 mt-1">{fees.length} fee(s)</p>
                </div>
                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-lg p-5 text-white">
                    <p className="text-sm opacity-90 mb-1">Total Paid</p>
                    <p className="text-2xl font-bold">
                        {new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(totalPaid)}
                    </p>
                    <p className="text-xs opacity-75 mt-1">Completed payments</p>
                </div>
                <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-2xl shadow-lg p-5 text-white">
                    <p className="text-sm opacity-90 mb-1">Outstanding</p>
                    <p className="text-2xl font-bold">
                        {new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(totalDue)}
                    </p>
                    <p className="text-xs opacity-75 mt-1">Pending payment</p>
                </div>
            </div>

            {/* Payment Gateway Selector */}
            <div className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-semibold text-gray-800">Payment Method</h3>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">Select one</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                        onClick={() => setPaymentGateway('paystack')}
                        className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${paymentGateway === 'paystack'
                            ? 'border-indigo-600 bg-indigo-50 shadow-md scale-105'
                            : 'border-gray-200 bg-white hover:border-indigo-300 hover:shadow-sm'
                            }`}
                    >
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${paymentGateway === 'paystack' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M3 10h11v2H3v-2zm0-4h11v2H3V6zm0 8h7v2H3v-2zm13.01-2.5l2.5 1.5v2l-2.5-1.5v-2zm2.5-1.5v2l-2.5-1.5v-2l2.5 1.5zm-5 3v-2l2.5-1.5v2l-2.5 1.5z" />
                            </svg>
                        </div>
                        <div className="text-center">
                            <span className={`font-semibold text-sm block ${paymentGateway === 'paystack' ? 'text-indigo-700' : 'text-gray-700'}`}>Paystack</span>
                            <span className="text-xs text-gray-500">Cards, Bank, USSD</span>
                        </div>
                    </button>
                    <button
                        onClick={() => setPaymentGateway('flutterwave')}
                        className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${paymentGateway === 'flutterwave'
                            ? 'border-orange-500 bg-orange-50 shadow-md scale-105'
                            : 'border-gray-200 bg-white hover:border-orange-300 hover:shadow-sm'
                            }`}
                    >
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${paymentGateway === 'flutterwave' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                            </svg>
                        </div>
                        <div className="text-center">
                            <span className={`font-semibold text-sm block ${paymentGateway === 'flutterwave' ? 'text-orange-700' : 'text-gray-700'}`}>Flutterwave</span>
                            <span className="text-xs text-gray-500">Cards, Mobile Money</span>
                        </div>
                    </button>
                    <button
                        onClick={() => setPaymentGateway('mobilemoney')}
                        className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${paymentGateway === 'mobilemoney'
                            ? 'border-green-600 bg-green-50 shadow-md scale-105'
                            : 'border-gray-200 bg-white hover:border-green-300 hover:shadow-sm'
                            }`}
                    >
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${paymentGateway === 'mobilemoney' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z" />
                            </svg>
                        </div>
                        <div className="text-center">
                            <span className={`font-semibold text-sm block ${paymentGateway === 'mobilemoney' ? 'text-green-700' : 'text-gray-700'}`}>Mobile Money</span>
                            <span className="text-xs text-gray-500">M-Pesa, MTN, Airtel</span>
                        </div>
                    </button>
                </div>
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