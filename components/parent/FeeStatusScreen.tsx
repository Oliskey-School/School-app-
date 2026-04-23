
import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/api';
import { Fee } from '../../types';
import { FeeCard } from '../payments/FeeCard';
import { PaystackButton } from '../payments/PaystackWrapper';
import { FlutterwaveWrapper } from '../payments/FlutterwaveWrapper';
import { MobileMoneyWrapper } from '../payments/MobileMoneyWrapper';
import { InstallmentSchedule } from './InstallmentSchedule';
import { hasPaymentPlan } from '../../lib/payment-plans';
import { useProfile } from '../../context/ProfileContext';
import { generateReceipt } from '../../lib/receipt-generator';
import { toast } from 'react-hot-toast';
import { useAutoSync } from '../../hooks/useAutoSync';
import { CreditCard, Download, Clock, CheckCircle, AlertCircle, Users, Wallet, Receipt, ArrowRight, ShieldCheck, Smartphone, ExternalLink, Activity } from 'lucide-react';

interface FeeStatusScreenProps {
    parentId?: string | null;
    currentUserId?: string | null;
    schoolId?: string;
    currentBranchId?: string | null;
    navigateTo: (view: string, title: string, props?: any) => void;
}

const FeeStatusScreen: React.FC<FeeStatusScreenProps> = ({ parentId, currentUserId, navigateTo, schoolId, currentBranchId }) => {
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
    const [feesWithPlans, setFeesWithPlans] = useState<Set<string>>(new Set());
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const init = useCallback(async () => {
        // 1. Get Parent Profile
        if (parentId && schoolId) {
            try {
                const parentProfile = await api.getParentById(parentId);
                if (parentProfile) {
                    setParentName(parentProfile.name || 'Parent');
                    setParentPhone(parentProfile.phone || '0000000000');
                    setUserEmail(parentProfile.email || '');
                }

                // 2. Fetch Children using Hybrid API
                const kidsData = await api.getMyChildren();
                if (kidsData && kidsData.length > 0) {
                    setStudents(kidsData);
                    if (!selectedStudent) setSelectedStudent(kidsData[0]);
                } else {
                    toast('No children found linked to your account.');
                }
            } catch (error) {
                console.error("Error initializing FeeStatusScreen:", error);
                toast.error("Failed to load profile data.");
            }
        }
        setLoading(false);
    }, [parentId, schoolId, selectedStudent]);

    useEffect(() => {
        init();
    }, [init]);

    useEffect(() => {
        if (selectedStudent) {
            loadFees(selectedStudent.id);
        }
    }, [selectedStudent, refreshTrigger]);

    // Auto-sync
    useAutoSync(['student_fees', 'payments', 'student_fee_installments'], () => {
        if (selectedStudent) loadFees(selectedStudent.id);
    });

    const loadFees = useCallback(async (studentId: string) => {
        setLoading(true);
        try {
            const rawFees = await api.getStudentFees(studentId);
            
            // Map Prisma fields to frontend Fee interface
            const formattedFees: Fee[] = rawFees.map((f: any) => ({
                id: f.id,
                title: f.title,
                amount: f.amount,
                paidAmount: f.paid_amount || 0,
                status: f.status,
                dueDate: f.due_date,
                description: f.description || '',
                studentId: f.student_id,
                schoolId: f.school_id
            }));
            
            setFees(formattedFees);

            const plansSet = new Set<string>();
            await Promise.all(
                formattedFees.map(async (fee) => {
                    const hasPlan = await hasPaymentPlan(fee.id);
                    if (hasPlan) plansSet.add(fee.id);
                })
            );
            setFeesWithPlans(plansSet);
        } catch (error) {
            console.error("Error loading fees:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (selectedStudent) {
            loadFees(selectedStudent.id);
        }
    }, [selectedStudent, loadFees]);

    const handleDownloadReceipt = async (fee: Fee) => {
        try {
            // Fetch the transaction using Hybrid API
            const transactions = await api.getPaymentHistory({ 
                schoolId: schoolId as string, 
                studentId: selectedStudent.id 
            });

            // Filter for this specific fee if needed (getPaymentHistory returns student history)
            const feeTransactions = transactions.filter((t: any) => t.fee_id === fee.id);

            if (!feeTransactions || feeTransactions.length === 0) {
                toast.error('No completed transaction found for this fee.');
                return;
            }

            const transaction = feeTransactions[0];

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
                date: transaction.created_at || transaction.timestamp
            };

            // Generate and download the receipt
            await generateReceipt(
                formattedTransaction,
                fee,
                selectedStudent?.name || 'Student',
                'School Management System'
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

    // --- New Sub-components for Premium Look ---

    const PremiumStatCard = ({ title, amount, subtitle, icon: Icon, gradient, delay }: { title: string, amount: number, subtitle: string, icon: any, gradient: string, delay: string }) => (
        <div 
            className={`relative overflow-hidden p-5 rounded-xl shadow border border-gray-100 bg-gradient-to-br ${gradient} text-white`}
        >
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
            <div className="relative flex justify-between items-start">
                <div>
                    <p className="text-sm font-medium opacity-80 mb-1">{title}</p>
                    <h3 className="text-2xl font-black tracking-tight">
                        {new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(amount)}
                    </h3>
                    <p className="text-[10px] font-bold uppercase tracking-wider mt-2 bg-white/20 inline-block px-2 py-0.5 rounded-full">{subtitle}</p>
                </div>
                <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md shadow-inner">
                    <Icon className="w-6 h-6 text-white" />
                </div>
            </div>
        </div>
    );

    const GatewayCard = ({ id, label, description, icon: Icon, active, color, onClick }: any) => (
        <button
            onClick={onClick}
            className={`relative flex flex-col items-center justify-center gap-3 p-5 rounded-3xl border-2 transition-all duration-300 active:scale-95 group
                ${active 
                    ? `border-${color}-500 bg-${color}-50/50 shadow-xl shadow-${color}-100/50 scale-[1.02]` 
                    : 'border-gray-100 bg-white hover:border-gray-300 hover:shadow-lg'}`}
        >
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-inner
                ${active ? `bg-${color}-500 text-white rotate-[10deg]` : 'bg-gray-50 text-gray-400 group-hover:bg-gray-100'}`}>
                <Icon className="w-7 h-7" />
            </div>
            <div className="text-center">
                <span className={`font-bold text-sm block ${active ? `text-${color}-900` : 'text-gray-700'}`}>{label}</span>
                <span className="text-[10px] font-medium text-gray-500 uppercase tracking-tighter">{description}</span>
            </div>
            {active && (
                <div className={`absolute top-2 right-2 w-2 h-2 rounded-full bg-${color}-500`} />
            )}
        </button>
    );

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 bg-gray-50 md:rounded-[40px] shadow-sm min-h-screen border-x border-b border-gray-100">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">
                        Financial <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">Overview</span>
                    </h1>
                    <p className="text-gray-500 font-medium mt-1 uppercase text-xs tracking-[0.2em]">Live billing & status updates</p>
                </div>

                {/* Child Selector (Modern Pill) */}
                {students.length > 0 && (
                    <div className="flex p-1.5 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto scrollbar-hide shrink-0">
                        {students.map(s => (
                            <button
                                key={s.id}
                                onClick={() => setSelectedStudent(s)}
                                className={`flex items-center space-x-2.5 px-4 py-2 rounded-xl transition-all duration-300 font-bold text-sm whitespace-nowrap
                                    ${selectedStudent?.id === s.id 
                                        ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-200 scale-[1.05]' 
                                        : 'text-gray-500 hover:text-indigo-600 hover:bg-indigo-50/50'}`}
                            >
                                <img src={s.avatar_url || 'https://via.placeholder.com/32'} className="w-6 h-6 rounded-full border-2 border-white/50" alt={s.name || 'Student'} />
                                <span>{(s?.name || s?.full_name || 'Student').toString().split(' ')[0]}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Stats Summary - Grid Refactor */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <PremiumStatCard 
                    title="Expected Fees" 
                    amount={fees.reduce((sum, fee) => sum + fee.amount, 0)} 
                    subtitle={`${fees.length} line items`}
                    icon={Receipt}
                    gradient="from-blue-500 to-indigo-600"
                    delay="0ms"
                />
                <PremiumStatCard 
                    title="Settled Amount" 
                    amount={totalPaid} 
                    subtitle="Verified Payments"
                    icon={ShieldCheck}
                    gradient="from-emerald-500 to-teal-600"
                    delay="100ms"
                />
                <PremiumStatCard 
                    title="Balance Due" 
                    amount={totalDue} 
                    subtitle="Immediate Attention"
                    icon={Activity}
                    gradient="from-rose-500 to-pink-600"
                    delay="200ms"
                />
            </div>

            {/* Main Content Split */}
            <div className="flex flex-col lg:flex-row gap-6">
                {/* Left: Fee List */}
                <div className="flex-1 space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                            Assignments <span className="bg-indigo-100 text-indigo-600 text-xs px-2 py-0.5 rounded-full font-black">{fees.length}</span>
                        </h2>
                    </div>

                    {fees.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[40px] shadow-sm border border-gray-100 animate-pulse">
                            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mb-4">
                                <CheckCircle className="w-10 h-10 text-green-500" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-800">Clear & Current</h3>
                            <p className="text-gray-500 mt-2 font-medium">All financial obligations for {selectedStudent?.name} are fulfilled!</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {fees.map(fee => (
                                <div key={fee.id} className="relative group">
                                    {feesWithPlans.has(fee.id) ? (
                                        <div className="bg-white rounded-[32px] shadow-sm border border-gray-200 p-6 transition-all hover:shadow-xl">
                                            <div className="flex items-center justify-between mb-4">
                                                <h3 className="font-bold text-gray-900 text-lg uppercase tracking-tight">{fee.title}</h3>
                                                <div className="px-3 py-1 bg-amber-50 text-amber-600 rounded-full font-black text-[10px] uppercase">Plan Active</div>
                                            </div>
                                            <InstallmentSchedule
                                                feeId={fee.id}
                                                onPayInstallment={(installment) => handlePayClick(fee)}
                                            />
                                        </div>
                                    ) : (
                                        <>
                                            <FeeCard
                                                fee={fee}
                                                onPay={handlePayClick}
                                                onDownloadReceipt={handleDownloadReceipt}
                                            />
                                            {/* Hidden Payment Triggers - Maintained for Logic */}
                                            <div className="hidden">
                                                <PaystackButton fee={fee} email={userEmail} schoolId={schoolId} branchId={currentBranchId} onSuccess={() => { toast.success('Payment Successful!'); loadFees(selectedStudent.id); }} />
                                                <FlutterwaveWrapper fee={fee} email={userEmail} phone={parentPhone} name={parentName} schoolId={schoolId} branchId={currentBranchId} onSuccess={() => { toast.success('Payment Successful!'); loadFees(selectedStudent.id); }} />
                                                <MobileMoneyWrapper fee={fee} email={userEmail} name={parentName} schoolId={schoolId} branchId={currentBranchId} onSuccess={() => { toast.success('Payment Successful!'); loadFees(selectedStudent.id); }} />
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Right: Payment Method & Tools */}
                <div className="w-full lg:w-80 space-y-6">
                    <div className="bg-white rounded-[40px] shadow-sm p-4 md:p-8 border border-gray-100 sticky top-8">
                        <div className="flex items-center gap-4 mb-4 md:mb-8">
                            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100">
                                <Wallet className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-gray-900 tracking-tight">Payment Hub</h3>
                                <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Control center</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <p className="text-xs font-black text-gray-400 uppercase tracking-widest px-2">Choose Gateway</p>
                            <div className="grid grid-cols-1 gap-4">
                                <GatewayCard 
                                    id="paystack" 
                                    label="Paystack" 
                                    description="Cards & USSD" 
                                    icon={CreditCard} 
                                    active={paymentGateway === 'paystack'} 
                                    color="indigo"
                                    onClick={() => setPaymentGateway('paystack')}
                                />
                                <GatewayCard 
                                    id="flutterwave" 
                                    label="Flutterwave" 
                                    description="Intl & Local" 
                                    icon={ExternalLink} 
                                    active={paymentGateway === 'flutterwave'} 
                                    color="orange"
                                    onClick={() => setPaymentGateway('flutterwave')}
                                />
                                <GatewayCard 
                                    id="mobilemoney" 
                                    label="Mobile Money" 
                                    description="Instant MoMo" 
                                    icon={Smartphone} 
                                    active={paymentGateway === 'mobilemoney'} 
                                    color="green"
                                    onClick={() => setPaymentGateway('mobilemoney')}
                                />
                            </div>
                        </div>

                        <div className="mt-10 p-5 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                            <div className="flex items-center gap-3 text-gray-600 mb-2">
                                <ShieldCheck className="w-5 h-5 text-indigo-600" />
                                <span className="font-bold text-sm tracking-tight">Security Check</span>
                            </div>
                            <p className="text-[10px] text-gray-500 leading-relaxed font-medium">
                                All payments are secured with 256-bit encryption. We do not store your card details.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FeeStatusScreen;