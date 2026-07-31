import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePaystackPayment } from 'react-paystack';
import { useAuth } from '../../context/AuthContext';
import { useBranch } from '../../context/BranchContext';
import { api } from '../../lib/api';
import { toast } from 'react-hot-toast';
import { usePlanStatus } from '../../lib/hooks/usePlanStatus';
import { Check, Users, ArrowLeft, Sparkles, Clock, AlertTriangle, Plus, Minus, CheckCircle, Lock, Zap } from 'lucide-react';

type PlanKey = 'free' | 'basic' | 'advanced';

interface TermInfo {
    session: string;
    term: number;
    resumption_date: string;
    closing_date: string;
    label: string;
    is_vacation: boolean;
}

const formatNaira = (n: number) =>
    new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(n);

const formatDate = (iso: string | null | undefined) =>
    iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

const BASIC_RATE = 1000;  // ₦ per child per term
const ADVANCED_RATE = 3000;

interface SubscriptionPageProps {
    navigateTo?: (view: string, title?: string, props?: any) => void;
    handleBack?: () => void;
    onBack?: () => void;
}

const SubscriptionPage: React.FC<SubscriptionPageProps> = ({ navigateTo, handleBack, onBack }) => {
    const { user, currentSchool, refreshCurrentSchool } = useAuth() as any;
    const { currentBranch } = useBranch();
    const { planStatus } = usePlanStatus();
    const currentPlanKey = (currentSchool?.plan_type as PlanKey) || 'free';

    const [selectedPlan, setSelectedPlan] = useState<PlanKey>(
        currentPlanKey === 'free' ? 'basic' : currentPlanKey
    );
    const [studentCount, setStudentCount] = useState<number>(currentSchool?.student_count || 0);
    const [term, setTerm] = useState<TermInfo | null>(null);
    const [loading, setLoading] = useState(false);
    const studentCountTouched = useRef(false);
    const [minStudents, setMinStudents] = useState<number>(Math.max(1, currentSchool?.student_count || 1));

    const isUpgradeFromBasic = currentPlanKey === 'basic' && selectedPlan === 'advanced';
    const selectedRate = selectedPlan === 'free' ? 0 : selectedPlan === 'basic' ? BASIC_RATE : ADVANCED_RATE;
    const effectiveRate = Math.max(0, selectedRate - (isUpgradeFromBasic ? BASIC_RATE : 0));

    const selfPaidAiCount = useMemo(() => {
        if (!isUpgradeFromBasic) return 0;
        try {
            const s = typeof currentSchool?.settings === 'string'
                ? JSON.parse(currentSchool.settings)
                : currentSchool?.settings;
            const map = s?.ai_self_paid || {};
            return Object.values(map).filter((r: any) =>
                String(r?.term) === String(currentSchool?.current_term) &&
                String(r?.session) === String(currentSchool?.academic_session)
            ).length;
        } catch { return 0; }
    }, [isUpgradeFromBasic, currentSchool]);

    const billableStudents = Math.max(0, studentCount - selfPaidAiCount);
    const total = effectiveRate * billableStudents;

    const goBack = () => {
        if (handleBack) return handleBack();
        if (onBack) return onBack();
        if (navigateTo) return navigateTo('overview', 'Admin Dashboard');
    };
    const canGoBack = !!(handleBack || onBack || navigateTo);

    useEffect(() => {
        (api.get as any)('/subscription/current-term')
            .then((r: any) => setTerm(r?.term ?? null))
            .catch(() => setTerm(null));
    }, []);

    useEffect(() => {
        const applyCount = (n: any) => {
            if (!(typeof n === 'number' && n > 0)) return;
            setMinStudents(Math.max(1, n));
            setStudentCount(prev => (studentCountTouched.current ? Math.max(prev, n) : n));
        };

        // Each branch pays for its own students — always fetch branch-scoped count.
        const fetchLiveCount = async () => {
            try {
                const s = await api.getDashboardStats(currentSchool?.id, currentBranch?.id || undefined);
                if (typeof s?.totalStudents === 'number' && s.totalStudents > 0) {
                    applyCount(s.totalStudents);
                    return;
                }
            } catch {}
            // Fallback: cached value on school object (may be slightly stale)
            if (currentSchool?.student_count) applyCount(currentSchool.student_count);
        };

        fetchLiveCount();
    }, [currentSchool?.id, currentBranch?.id]);

    const paystackConfig = useMemo(() => ({
        reference: `OLISKEY_TERM_${Date.now()}`,
        email: currentSchool?.contact_email || currentSchool?.email || user?.email || 'admin@school.com',
        amount: total * 100,
        publicKey: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || '',
    }), [total, currentSchool, user]);

    const initializePayment = usePaystackPayment(paystackConfig);

    const activateOnBackend = async (reference: string) => {
        setLoading(true);
        try {
            await (api as any).post('/subscription/activate', {
                plan_type: selectedPlan,
                student_count: studentCount,
                reference,
            });
            const planLabel = selectedPlan === 'basic' ? 'Basic' : selectedPlan === 'advanced' ? 'Advanced' : 'Free';
            toast.success(`${planLabel} activated for Term ${term?.term ?? '—'}.`);
            await refreshCurrentSchool?.();
        } catch (err: any) {
            toast.error(err.message || 'Activation failed. Contact support with your payment reference.');
        } finally {
            setLoading(false);
        }
    };

    const handlePay = () => {
        if (selectedPlan === 'free') {
            if (planStatus.is_term1_free) {
                toast('You are already on the free period — all features except AI are active at no cost.', { icon: '✅' });
                return;
            }
            activateOnBackend('FREE');
            return;
        }
        if (!import.meta.env.VITE_PAYSTACK_PUBLIC_KEY) {
            toast.error('Payment is not configured yet. Contact the platform administrator.');
            return;
        }
        if (!term) { toast.error('No active academic term configured. Contact support.'); return; }
        if (studentCount <= 0) { toast.error('Enter the number of students to bill.'); return; }
        if (studentCount < minStudents) {
            toast.error(`You have ${minStudents} students — bill for at least ${minStudents}.`);
            setStudentCount(minStudents);
            return;
        }
        (initializePayment as any)({
            onSuccess: (ref: any) => activateOnBackend(ref.reference),
            onClose: () => toast('Payment cancelled.'),
        });
    };

    const ctaLabel = (() => {
        if (loading) return 'Processing…';
        if (selectedPlan === 'free') {
            return planStatus.is_term1_free ? 'Already on Free Period' : 'Switch to Free Plan';
        }
        if (!term) return 'No active term configured';
        if (planStatus.is_term1_free) {
            if (selectedPlan === 'advanced') return `Unlock AI Now — ${formatNaira(total)}`;
            return `Lock in Basic for Term 3 — ${formatNaira(total)}`;
        }
        return `Pay ${formatNaira(total)} for Term ${term.term}`;
    })();

    // ── Shared card base ──────────────────────────────────────────────────
    const freeSelected = selectedPlan === 'free';
    const basicSelected = selectedPlan === 'basic';
    const advancedSelected = selectedPlan === 'advanced';

    return (
        <div className="w-full min-h-full bg-gray-50 py-6 sm:py-10 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">

                {/* Back button */}
                {canGoBack && (
                    <motion.button
                        whileHover={{ x: -2 }}
                        type="button"
                        onClick={goBack}
                        className="mb-6 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-indigo-300 hover:text-indigo-700"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back
                    </motion.button>
                )}

                {/* Free period banner */}
                {planStatus.is_term1_free && (
                    <div className="mb-6 rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-4 flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                            <p className="font-bold text-emerald-900 text-sm">
                                Free Period Active — Term {planStatus.current_term} of 2
                            </p>
                            <p className="text-xs text-emerald-700 mt-1 leading-relaxed">
                                All features are available at no cost through Term 2 —{' '}
                                <strong>except AI tools</strong>, which require the Advanced plan.
                                Payment is required from Term 3 onwards.
                            </p>
                            <div className="mt-2.5 flex items-center gap-1.5 text-xs font-semibold text-emerald-800">
                                <Zap className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                                Want AI now? Select <span className="text-indigo-700 ml-0.5">Advanced</span> below and pay to unlock it immediately.
                            </div>
                        </div>
                    </div>
                )}

                {/* 30-day warning banner */}
                {planStatus.days_until_exam_block !== null && !planStatus.exam_block_active && (
                    <div className="mb-6 rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3.5 flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="font-bold text-amber-900 text-sm">
                                {planStatus.days_until_exam_block} day{planStatus.days_until_exam_block === 1 ? '' : 's'} until access is locked
                            </p>
                            <p className="text-xs text-amber-700 mt-0.5">
                                Renew before your exam dates to keep all users uninterrupted.
                            </p>
                        </div>
                    </div>
                )}

                {/* Hard lock warning */}
                {planStatus.exam_block_active && (
                    <div className="mb-6 rounded-2xl bg-red-50 border border-red-200 px-4 py-3.5 flex items-start gap-3">
                        <Lock className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="font-bold text-red-900 text-sm">All users are currently locked out</p>
                            <p className="text-xs text-red-700 mt-0.5">
                                Choose a plan and pay below to restore access immediately.
                            </p>
                        </div>
                    </div>
                )}

                {/* Page heading */}
                <div className="mb-7">
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                        Choose Your Plan
                    </h1>
                    <p className="mt-2 text-sm sm:text-base text-slate-500">
                        Per child, per term. Pay once — no monthly surprises.
                    </p>
                </div>

                {/* Term info card */}
                {term && (
                    <div className="mb-6 rounded-2xl bg-white border border-slate-200 p-4 flex items-start gap-3 shadow-sm">
                        <div className="p-2 rounded-xl bg-indigo-50 flex-shrink-0">
                            <Clock className="w-4 h-4 text-indigo-600" />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">
                                {term.is_vacation ? 'Paying for next term' : 'You are paying for'}
                            </p>
                            <p className="font-bold text-slate-900 mt-0.5">{term.label}</p>
                            <p className="text-xs text-slate-500 mt-0.5">
                                {formatDate(term.resumption_date)} → {formatDate(term.closing_date)}
                                {term.is_vacation && (
                                    <span className="ml-2 text-indigo-600 font-medium">Pay now to start from day one.</span>
                                )}
                            </p>
                        </div>
                    </div>
                )}

                {/* ── Plan cards — ASYMMETRIC visual weights ── */}
                <div className="grid gap-3 grid-cols-1 md:grid-cols-3 mb-6">

                    {/* FREE — compact, muted gray */}
                    <motion.button
                        whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                        type="button"
                        onClick={() => setSelectedPlan('free')}
                        className={[
                            'w-full rounded-2xl border p-4 text-left transition-all duration-200',
                            freeSelected
                                ? 'border-slate-400 bg-slate-50 ring-2 ring-slate-400'
                                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60',
                        ].join(' ')}
                    >
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Free</p>
                        <p className="text-2xl font-extrabold text-slate-600 mt-1">Free</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">forever</p>
                        <p className="text-xs text-slate-400 mt-3 leading-relaxed">
                            Try with a small school. Limited to 10 students.
                        </p>
                        <ul className="mt-3 space-y-1.5">
                            {['Max 10 students', 'Max 10 teachers', 'No AI tools'].map(f => (
                                <li key={f} className="flex items-center gap-1.5 text-xs text-slate-400">
                                    <Check className="w-3 h-3 text-slate-300 flex-shrink-0" />
                                    {f}
                                </li>
                            ))}
                        </ul>
                        {planStatus.is_term1_free ? (
                            <span className="mt-4 inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                                Free Period Active
                            </span>
                        ) : currentPlanKey === 'free' && (
                            <span className="mt-4 inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold text-slate-500">
                                Current plan
                            </span>
                        )}
                    </motion.button>

                    {/* BASIC — white with indigo ring, featured */}
                    <motion.button
                        whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                        type="button"
                        onClick={() => setSelectedPlan('basic')}
                        className={[
                            'w-full rounded-2xl border p-5 text-left transition-all duration-200',
                            basicSelected
                                ? 'border-indigo-500 bg-indigo-50/50 ring-2 ring-indigo-500 shadow-md shadow-indigo-100'
                                : 'border-indigo-200 bg-white hover:border-indigo-400 hover:shadow-sm',
                        ].join(' ')}
                    >
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                            <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">Basic</p>
                            <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
                                Most Popular
                            </span>
                        </div>
                        <p className="text-2xl font-extrabold text-slate-900 mt-1">₦1,000</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">per child / term</p>
                        <p className="text-xs text-slate-600 mt-3 leading-relaxed">
                            Unlimited users + all core features, no AI.
                        </p>
                        <ul className="mt-3 space-y-1.5">
                            {['Unlimited students', 'All core features', 'Email support'].map(f => (
                                <li key={f} className="flex items-center gap-1.5 text-xs text-slate-600">
                                    <Check className="w-3 h-3 text-indigo-500 flex-shrink-0" />
                                    {f}
                                </li>
                            ))}
                        </ul>
                        {currentPlanKey === 'basic' && (
                            <span className="mt-4 inline-flex rounded-full bg-indigo-100 px-2.5 py-0.5 text-[10px] font-semibold text-indigo-700">
                                Current plan
                            </span>
                        )}
                    </motion.button>

                    {/* ADVANCED — dark slate, premium */}
                    <motion.button
                        whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                        type="button"
                        onClick={() => setSelectedPlan('advanced')}
                        className={[
                            'w-full rounded-2xl border p-5 text-left transition-all duration-200 bg-slate-900',
                            advancedSelected
                                ? 'border-indigo-500 ring-2 ring-indigo-500 shadow-lg shadow-slate-900/20'
                                : 'border-transparent hover:opacity-90',
                        ].join(' ')}
                    >
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                            <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Advanced</p>
                            <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-[10px] font-semibold text-indigo-300">
                                Recommended
                            </span>
                        </div>
                        <p className="text-2xl font-extrabold text-white mt-1">₦3,000</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">per child / term</p>
                        <p className="text-xs text-slate-300 mt-3 leading-relaxed">
                            Everything in Basic, plus every AI tool.
                        </p>
                        <ul className="mt-3 space-y-1.5">
                            {['Unlimited students', 'All core features', 'All AI tools', 'Priority support'].map(f => (
                                <li key={f} className="flex items-center gap-1.5 text-xs text-slate-300">
                                    <Check className="w-3 h-3 text-indigo-400 flex-shrink-0" />
                                    {f}
                                </li>
                            ))}
                        </ul>
                        <div className="mt-4 pt-3 border-t border-slate-700/60">
                            <div className="flex items-center gap-1.5 mb-1">
                                <Sparkles className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                                <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">
                                    Includes all AI features
                                </p>
                            </div>
                            <p className="text-[11px] text-slate-500 leading-relaxed">
                                Study Buddy · Timetable AI · Quiz Generator · Parenting Tips
                            </p>
                            {planStatus.is_term1_free && (
                                <div className="mt-2 flex items-center gap-1.5 rounded-xl bg-indigo-500/20 px-2.5 py-1.5">
                                    <Zap className="w-3 h-3 text-indigo-300 flex-shrink-0" />
                                    <p className="text-[10px] font-bold text-indigo-300">
                                        Pay now to unlock AI during your free period
                                    </p>
                                </div>
                            )}
                        </div>
                        {currentPlanKey === 'advanced' && (
                            <span className="mt-3 inline-flex rounded-full bg-indigo-500/20 px-2.5 py-0.5 text-[10px] font-semibold text-indigo-300">
                                Current plan
                            </span>
                        )}
                    </motion.button>
                </div>

                {/* ── Calculator ── */}
                <AnimatePresence>
                {selectedPlan !== 'free' && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="rounded-2xl bg-white border border-slate-200 overflow-hidden mb-4 shadow-sm">
                        <div className="bg-slate-50 border-b border-slate-100 px-5 py-3">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                Calculate your term cost
                            </p>
                        </div>
                        <div className="p-5">
                            {/* Student stepper */}
                            <div className="flex items-center gap-4 mb-4">
                                <div className="flex items-center gap-3 flex-1">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            studentCountTouched.current = true;
                                            setStudentCount(Math.max(minStudents, studentCount - 1));
                                        }}
                                        disabled={studentCount <= minStudents}
                                        className="w-9 h-9 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center hover:bg-slate-100 transition-colors flex-shrink-0 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-slate-50"
                                        aria-label="Decrease student count"
                                    >
                                        <Minus className="w-4 h-4 text-slate-600" />
                                    </button>
                                    <div className="flex-1 text-center">
                                        <input
                                            type="number"
                                            min={minStudents}
                                            value={studentCount}
                                            onChange={e => {
                                                studentCountTouched.current = true;
                                                setStudentCount(Math.max(minStudents, parseInt(e.target.value || String(minStudents), 10)));
                                            }}
                                            className="w-20 text-center text-2xl font-extrabold text-slate-900 border-none outline-none bg-transparent"
                                            aria-label="Number of students"
                                        />
                                        <p className="text-[11px] text-slate-400">students</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            studentCountTouched.current = true;
                                            setStudentCount(studentCount + 1);
                                        }}
                                        className="w-9 h-9 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center hover:bg-slate-100 transition-colors flex-shrink-0"
                                        aria-label="Increase student count"
                                    >
                                        <Plus className="w-4 h-4 text-slate-600" />
                                    </button>
                                </div>
                                <div className="text-right flex-shrink-0">
                                    <p className="text-[11px] text-slate-400">term total</p>
                                    <p className="text-2xl font-extrabold text-slate-900">{formatNaira(total)}</p>
                                </div>
                            </div>

                            {/* Formula */}
                            <div className="rounded-xl bg-slate-50 border border-slate-100 px-4 py-2.5 text-xs text-slate-500">
                                {formatNaira(effectiveRate)} × {billableStudents} students ={' '}
                                <strong className="text-slate-700">{formatNaira(total)}</strong> for one term
                            </div>

                            {isUpgradeFromBasic && (
                                <p className="mt-2.5 text-xs text-emerald-700 font-semibold">
                                    Upgrade credit: Basic payment ({formatNaira(BASIC_RATE)}/child) deducted — you pay only{' '}
                                    {formatNaira(ADVANCED_RATE - BASIC_RATE)}/child difference.
                                </p>
                            )}
                            {isUpgradeFromBasic && selfPaidAiCount > 0 && (
                                <p className="mt-1.5 text-xs text-emerald-700 font-semibold">
                                    {selfPaidAiCount} user{selfPaidAiCount === 1 ? '' : 's'} already paid for AI this term —
                                    credited ({billableStudents} billable instead of {studentCount}).
                                </p>
                            )}

                            <p className="mt-2.5 text-[11px] text-slate-400">
                                You have <strong className="text-slate-600">{minStudents}</strong> enrolled student{minStudents === 1 ? '' : 's'} — minimum billable count.
                            </p>
                        </div>
                    </motion.div>
                )}
                </AnimatePresence>

                {/* ── CTA ── */}
                <motion.button
                    whileHover={!loading ? { scale: 1.01 } : {}} whileTap={!loading ? { scale: 0.98 } : {}}
                    type="button"
                    onClick={handlePay}
                    disabled={loading || (selectedPlan !== 'free' && !term && !planStatus.is_term1_free)}
                    className="w-full py-4 rounded-2xl bg-indigo-600 text-white font-bold text-base hover:bg-indigo-700 transition-all duration-150 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed shadow-lg shadow-indigo-100 mb-3"
                >
                    {ctaLabel}
                </motion.button>

                {selectedPlan !== 'free' && term && (
                    <p className="text-center text-xs text-slate-400 mb-6">
                        Access runs until{' '}
                        <strong className="text-slate-600">{formatDate(term.closing_date)}</strong>.
                        Renew each term to stay active.
                    </p>
                )}

                {/* Current status footer */}
                {currentSchool && (
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 flex items-center gap-3">
                        <Users className="h-4 w-4 text-indigo-400 flex-shrink-0" />
                        <p className="text-xs text-slate-500">
                            Current plan:{' '}
                            <strong className="text-slate-700 capitalize">{currentSchool.plan_type}</strong>
                            {' · '}Status:{' '}
                            <strong className="text-slate-700 capitalize">{currentSchool.subscription_status}</strong>
                            {currentSchool.term_closing_date && (
                                <> · Closes{' '}
                                    <strong className="text-slate-700">{formatDate(currentSchool.term_closing_date)}</strong>
                                </>
                            )}
                        </p>
                    </div>
                )}

            </div>
        </div>
    );
};

export default SubscriptionPage;
