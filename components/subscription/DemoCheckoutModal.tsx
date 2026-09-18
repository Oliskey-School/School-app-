import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShieldCheck, Sparkles } from 'lucide-react';

interface DemoCheckoutModalProps {
    open: boolean;
    planLabel: string;
    amountLabel: string;
    termLabel: string;
    studentCount: number;
    processing: boolean;
    onConfirm: () => void;
    onClose: () => void;
}

/**
 * Stand-in for the Paystack popup in DEMO mode. Visitors "pay" with pretend
 * money: nothing is charged, no card is asked for, and confirming activates
 * the plan on the shared demo school exactly like a real payment would.
 */
const DemoCheckoutModal: React.FC<DemoCheckoutModalProps> = ({
    open, planLabel, amountLabel, termLabel, studentCount, processing, onConfirm, onClose,
}) => (
    <AnimatePresence>
        {open && (
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
                onClick={processing ? undefined : onClose}
                role="dialog" aria-modal="true" aria-labelledby="demo-checkout-title"
            >
                <motion.div
                    initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16, scale: 0.98 }}
                    className="w-full max-w-sm rounded-2xl bg-white shadow-xl border border-slate-200 overflow-hidden"
                    onClick={e => e.stopPropagation()}
                >
                    <div className="flex items-start justify-between gap-3 px-5 pt-5">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                                <Sparkles className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h3 id="demo-checkout-title" className="text-base font-bold text-slate-900">Demo Checkout</h3>
                                <p className="text-xs text-slate-500">No real money is charged.</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={processing}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-40"
                            aria-label="Close"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="px-5 pt-4">
                        <div className="rounded-xl bg-slate-50 border border-slate-100 px-4 py-3 space-y-1.5 text-xs text-slate-500">
                            <div className="flex justify-between"><span>Plan</span><strong className="text-slate-700">{planLabel}</strong></div>
                            <div className="flex justify-between"><span>Term</span><strong className="text-slate-700">{termLabel}</strong></div>
                            <div className="flex justify-between"><span>Students</span><strong className="text-slate-700">{studentCount}</strong></div>
                            <div className="flex justify-between border-t border-slate-200 pt-1.5 mt-1.5 text-sm">
                                <span className="text-slate-600">Total</span><strong className="text-slate-900">{amountLabel}</strong>
                            </div>
                        </div>
                        <div className="mt-3 flex items-start gap-2 rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-2.5">
                            <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-emerald-800 leading-relaxed">
                                You are in the demo. Confirming activates this plan with pretend money so you can see exactly what a real school gets.
                            </p>
                        </div>
                    </div>

                    <div className="px-5 py-5">
                        <button
                            type="button"
                            onClick={onConfirm}
                            disabled={processing}
                            className="w-full rounded-xl bg-indigo-600 text-white px-4 py-3 text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {processing ? 'Activating…' : `Pay now — ${amountLabel} (demo)`}
                        </button>
                        <p className="mt-2 text-center text-[11px] text-slate-400">Real schools pay securely with Paystack.</p>
                    </div>
                </motion.div>
            </motion.div>
        )}
    </AnimatePresence>
);

export default DemoCheckoutModal;
