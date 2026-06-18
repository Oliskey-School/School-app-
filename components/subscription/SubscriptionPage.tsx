import React, { useEffect, useMemo, useRef, useState } from 'react';
import { usePaystackPayment } from 'react-paystack';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { toast } from 'react-hot-toast';
import DashboardLayout from '../layout/DashboardLayout';
import { Check, Users, ArrowLeft } from 'lucide-react';

type PlanKey = 'free' | 'basic' | 'advanced';

interface Plan {
    key: PlanKey;
    title: string;
    rate: number; // Naira per child per term
    headlinePrice: string;
    description: string;
    features: string[];
    badge?: string;
}

const PLANS: Plan[] = [
    {
        key: 'free',
        title: 'Free',
        rate: 0,
        headlinePrice: 'Free',
        description: 'Try the platform with a small school. No expiry.',
        features: ['Max 10 students', 'Max 10 teachers', 'Max 10 parents', 'No AI tools'],
        badge: 'Starter'
    },
    {
        key: 'basic',
        title: 'Basic',
        rate: 1000,
        headlinePrice: '₦1,000 / child / term',
        description: 'Unlimited users + all core features (no AI).',
        features: ['Unlimited users', 'All core features', 'Email support', 'No AI tools'],
    },
    {
        key: 'advanced',
        title: 'Advanced',
        rate: 3000,
        headlinePrice: '₦3,000 / child / term',
        description: 'Everything in Basic + every AI feature.',
        features: ['Unlimited users', 'All core features', 'All AI tools (Study Buddy, Timetable AI, Quiz Generator, Parenting Tips)', 'Priority support'],
        badge: 'Recommended'
    }
];

interface TermInfo {
    session: string;
    term: number;
    resumption_date: string;
    closing_date: string;
    label: string;
    is_vacation: boolean;
}

const formatNaira = (n: number) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(n);
const formatDate = (iso: string | null | undefined) => iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

interface SubscriptionPageProps {
    navigateTo?: (view: string, title?: string, props?: any) => void;
    handleBack?: () => void;
    onBack?: () => void;
}

const SubscriptionPage: React.FC<SubscriptionPageProps> = ({ navigateTo, handleBack, onBack }) => {
    const { user, currentSchool, refreshCurrentSchool } = useAuth() as any;
    const currentPlanKey = (currentSchool?.plan_type as PlanKey) || 'free';

    const [selectedPlan, setSelectedPlan] = useState<PlanKey>(currentPlanKey === 'free' ? 'basic' : currentPlanKey);
    // Default to THIS school's actual student count so they pay for their own
    // students. Still editable — they can lower it to pay for fewer if they wish.
    const [studentCount, setStudentCount] = useState<number>(currentSchool?.student_count || 0);
    const [term, setTerm] = useState<TermInfo | null>(null);
    const [loading, setLoading] = useState(false);
    const studentCountTouched = useRef(false);
    // They can never bill for FEWER students than the school actually has — paying less
    // would leave existing students uncovered. The input floor is the live student count.
    const [minStudents, setMinStudents] = useState<number>(Math.max(1, currentSchool?.student_count || 1));

    const selected = PLANS.find(p => p.key === selectedPlan)!;
    // Upgrading Basic → Advanced credits what was already paid for Basic this term, so the
    // school pays only the difference (₦3,000 − ₦1,000 = ₦2,000 / child).
    const basicRate = PLANS.find(p => p.key === 'basic')!.rate;
    const isUpgradeFromBasic = currentPlanKey === 'basic' && selectedPlan === 'advanced';
    const effectiveRate = Math.max(0, selected.rate - (isUpgradeFromBasic ? basicRate : 0));
    // Users who already self-paid for AI this term are credited off the upgrade (no refunds).
    const selfPaidAiCount = useMemo(() => {
        if (!isUpgradeFromBasic) return 0;
        try {
            const s = typeof currentSchool?.settings === 'string' ? JSON.parse(currentSchool.settings) : currentSchool?.settings;
            const map = s?.ai_self_paid || {};
            return Object.values(map).filter((r: any) =>
                String(r?.term) === String(currentSchool?.current_term) &&
                String(r?.session) === String(currentSchool?.academic_session)).length;
        } catch { return 0; }
    }, [isUpgradeFromBasic, currentSchool]);
    const billableStudents = Math.max(0, studentCount - selfPaidAiCount);
    const total = effectiveRate * billableStudents;

    const goBack = () => {
        if (handleBack) return handleBack();
        if (onBack) return onBack();
        if (navigateTo) return navigateTo('overview', 'Admin Dashboard');
    };

    useEffect(() => {
        api.get<{ term: TermInfo | null }>('/subscription/current-term')
            .then(r => setTerm(r.term))
            .catch(() => setTerm(null));
    }, []);

    // Pre-fill the number of students with the school's real student count AND use it as
    // the minimum that can be billed.
    useEffect(() => {
        const applyCount = (n: any) => {
            if (!(typeof n === 'number' && n > 0)) return;
            setMinStudents(Math.max(1, n));
            // Never let the billed count sit below the real count.
            setStudentCount(prev => (studentCountTouched.current ? Math.max(prev, n) : n));
        };
        if (currentSchool?.student_count) { applyCount(currentSchool.student_count); return; }
        api.getDashboardStats?.()
            .then((s: any) => applyCount(s?.totalStudents ?? s?.students ?? s?.studentCount ?? s?.student_count))
            .catch(() => {});
    }, [currentSchool]);

    const config = useMemo(() => ({
        reference: `OLISKEY_TERM_${Date.now()}`,
        email: currentSchool?.contact_email || currentSchool?.email || user?.email || 'admin@school.com',
        amount: total * 100, // kobo
        publicKey: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || 'pk_test_your_public_key'
    }), [total, currentSchool, user]);

    const initializePayment = usePaystackPayment(config);

    const activateOnBackend = async (reference: string) => {
        setLoading(true);
        try {
            const result = await api.post('/subscription/activate', {
                plan_type: selectedPlan,
                student_count: studentCount,
                reference
            });
            toast.success(`${selected.title} activated for Term ${term?.term ?? '—'}.`);
            await refreshCurrentSchool?.();
            return result;
        } catch (err: any) {
            toast.error(err.message || 'Activation failed. Contact support with your payment reference.');
        } finally {
            setLoading(false);
        }
    };

    const handlePay = () => {
        if (selectedPlan === 'free') {
            // No payment needed for Free — just activate.
            activateOnBackend('FREE');
            return;
        }
        if (!term) {
            toast.error('No active academic term configured. Contact support.');
            return;
        }
        if (studentCount <= 0) {
            toast.error('Enter the number of students to bill.');
            return;
        }
        if (studentCount < minStudents) {
            toast.error(`You have ${minStudents} students — you can't pay for fewer. Bill for at least ${minStudents}.`);
            setStudentCount(minStudents);
            return;
        }
        // react-paystack v5/v6 signature drift — typings disagree with runtime.
        (initializePayment as any)({
            onSuccess: (ref: any) => activateOnBackend(ref.reference),
            onClose: () => toast('Payment cancelled.')
        });
    };

    const ctaLabel = (() => {
        if (loading) return 'Processing…';
        if (selectedPlan === 'free') return 'Switch to Free';
        if (!term) return 'No active term';
        return `Pay ${formatNaira(total)} for Term ${term.term}`;
    })();

    return (
        <div className="w-full h-full py-6 sm:py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                <button
                    type="button"
                    onClick={goBack}
                    className="mb-4 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:border-indigo-300 hover:text-indigo-700"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                </button>
                <div className="text-center mb-8 sm:mb-10">
                    <h1 className="text-2xl font-extrabold text-gray-900 sm:text-4xl">Choose Your Plan</h1>
                    <p className="mt-4 text-base text-gray-500 max-w-2xl mx-auto sm:text-lg">
                        Per child, per term. No proration — pay once at the start of every term.
                    </p>
                </div>

                {/* Term banner */}
                {term && (
                    <div className={`mb-6 rounded-2xl border p-4 sm:p-5 ${term.is_vacation ? 'border-amber-200 bg-amber-50' : 'border-indigo-200 bg-indigo-50'}`}>
                        <p className="text-xs sm:text-sm font-semibold uppercase tracking-wide text-indigo-700">
                            {term.is_vacation ? 'Next term' : 'You are paying for'}
                        </p>
                        <h2 className="mt-1 text-lg sm:text-2xl font-bold text-slate-900">{term.label}</h2>
                        <p className="mt-1 text-xs sm:text-sm text-slate-700">
                            Access runs <strong>{formatDate(term.resumption_date)}</strong> to <strong>{formatDate(term.closing_date)}</strong>.
                            {term.is_vacation && <> Pay now to be ready from day one.</>}
                        </p>
                    </div>
                )}

                {/* Plan cards */}
                <div className="grid gap-4 grid-cols-1 md:grid-cols-3 mb-6">
                    {PLANS.map(plan => {
                        const isSelected = plan.key === selectedPlan;
                        const isCurrent = plan.key === currentPlanKey;
                        return (
                            <button
                                key={plan.key}
                                type="button"
                                onClick={() => setSelectedPlan(plan.key)}
                                className={`block w-full rounded-2xl border p-4 sm:p-6 text-left transition ${isSelected ? 'border-indigo-500 bg-indigo-50 shadow-sm ring-2 ring-indigo-500' : 'border-slate-200 bg-white hover:border-indigo-300'}`}
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <div>
                                        <p className="text-[10px] sm:text-sm font-semibold uppercase tracking-wide text-slate-500">{plan.title}</p>
                                        <p className="mt-1 text-xl sm:text-2xl font-bold text-slate-900">{plan.headlinePrice}</p>
                                    </div>
                                    {plan.badge && (
                                        <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[9px] sm:text-xs font-semibold uppercase tracking-wide text-indigo-700">{plan.badge}</span>
                                    )}
                                </div>
                                <p className="mt-3 text-xs sm:text-sm text-slate-600">{plan.description}</p>
                                <ul className="mt-4 space-y-2 text-xs sm:text-sm text-slate-600">
                                    {plan.features.map(f => (
                                        <li key={f} className="flex items-start gap-2">
                                            <Check className="mt-0.5 h-3 w-3 sm:h-4 sm:w-4 flex-none text-green-500" />
                                            <span>{f}</span>
                                        </li>
                                    ))}
                                </ul>
                                {isCurrent && (
                                    <div className="mt-4">
                                        <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-[10px] sm:text-sm font-semibold text-green-700">Current plan</span>
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Calculator */}
                {selectedPlan !== 'free' && (
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 mb-6">
                        <div className="flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-6">
                            <div className="flex-1">
                                <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-2">Number of students</label>
                                <input
                                    type="number"
                                    min={minStudents}
                                    value={studentCount}
                                    onChange={e => { studentCountTouched.current = true; setStudentCount(Math.max(minStudents, parseInt(e.target.value || String(minStudents), 10))); }}
                                    className="w-full border border-slate-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                                <p className="mt-2 text-xs text-slate-500">
                                    {formatNaira(effectiveRate)} × {billableStudents} students = <strong>{formatNaira(total)}</strong> for one term
                                </p>
                                {isUpgradeFromBasic && (
                                    <p className="mt-1 text-xs text-emerald-600 font-semibold">
                                        Upgrade credit: your Basic payment ({formatNaira(basicRate)}/child) is deducted — you only pay the {formatNaira(selected.rate - basicRate)}/child difference.
                                    </p>
                                )}
                                {isUpgradeFromBasic && selfPaidAiCount > 0 && (
                                    <p className="mt-1 text-xs text-emerald-600 font-semibold">
                                        {selfPaidAiCount} user{selfPaidAiCount === 1 ? '' : 's'} already paid for their own AI this term — credited, so you pay for {billableStudents} instead of {studentCount}.
                                    </p>
                                )}
                                <p className="mt-1 text-xs text-slate-400">
                                    You currently have <strong>{minStudents}</strong> student{minStudents === 1 ? '' : 's'} — you must bill for at least this many. Add more now to avoid paying again later.
                                </p>
                            </div>
                            <div className="text-left sm:text-right">
                                <p className="text-xs text-slate-500">Term total</p>
                                <p className="text-3xl sm:text-4xl font-bold text-slate-900">{formatNaira(total)}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* CTA */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h3 className="text-base sm:text-lg font-semibold text-slate-900">
                            {selectedPlan === 'free' ? 'Switch to Free plan' : `Activate ${selected.title} for Term ${term?.term ?? '—'}`}
                        </h3>
                        <p className="mt-1 text-xs sm:text-sm text-slate-500">
                            {selectedPlan === 'free'
                                ? 'No payment required. Limits: 10 students, 10 teachers, 10 parents.'
                                : `Term closes ${formatDate(term?.closing_date)}. Renew before then to continue.`}
                        </p>
                    </div>
                    <button
                        onClick={handlePay}
                        disabled={loading || (selectedPlan !== 'free' && !term)}
                        className="inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm sm:text-base font-semibold transition w-full sm:w-auto bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-slate-300 disabled:text-slate-600 disabled:cursor-not-allowed"
                    >
                        {ctaLabel}
                    </button>
                </div>

                {/* Current usage footer */}
                {currentSchool && (
                    <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 flex items-center gap-3">
                        <Users className="h-5 w-5 text-indigo-500" />
                        <p className="text-xs sm:text-sm text-slate-600">
                            Current plan: <strong className="capitalize">{currentSchool.plan_type}</strong>
                            {' · '}Status: <strong className="capitalize">{currentSchool.subscription_status}</strong>
                            {currentSchool.term_closing_date && (
                                <> · Closes <strong>{formatDate(currentSchool.term_closing_date)}</strong></>
                            )}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SubscriptionPage;
