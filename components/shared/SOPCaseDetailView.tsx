import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../lib/api';
import { toast } from 'react-hot-toast';
import {
    CheckCircle2, Circle, Clock, Paperclip, FileText, Send, ChevronRight,
    AlertTriangle, ArrowRight, Mail
} from 'lucide-react';
import CenteredLoader from '../ui/CenteredLoader';

interface SOPCaseDetailViewProps {
    caseId: string;
    mode: 'admin' | 'teacher';
}

function fmtDateTime(value: string | null | undefined): string {
    if (!value) return '—';
    const d = new Date(value);
    return isNaN(d.getTime()) ? String(value) : d.toLocaleString();
}

const STATUS_STYLES: Record<string, string> = {
    open: 'bg-amber-50 text-amber-700',
    in_progress: 'bg-blue-50 text-blue-700',
    resolved: 'bg-green-50 text-green-700',
    archived: 'bg-gray-100 text-gray-600',
};

const SOPCaseDetailView: React.FC<SOPCaseDetailViewProps> = ({ caseId, mode }) => {
    const [caseData, setCaseData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [advancing, setAdvancing] = useState(false);
    const [advanceNotes, setAdvanceNotes] = useState('');

    const [showDecision, setShowDecision] = useState(false);
    const [decisionText, setDecisionText] = useState('');
    const [outcome, setOutcome] = useState('no_action');
    const [savingDecision, setSavingDecision] = useState(false);

    const [showLetter, setShowLetter] = useState(false);
    const [letterDraft, setLetterDraft] = useState('');
    const [recipientId, setRecipientId] = useState('');
    const [recipientType, setRecipientType] = useState('parent');
    const [savingLetter, setSavingLetter] = useState(false);

    const fetchCase = useCallback(async () => {
        setLoading(true);
        try {
            const data = await api.get<any>(`/sop/cases/${caseId}`);
            setCaseData(data);
        } catch (err: any) {
            console.error('Error loading case:', err);
            toast.error(err?.message || 'Failed to load case');
        } finally {
            setLoading(false);
        }
    }, [caseId]);

    useEffect(() => { fetchCase(); }, [fetchCase]);

    const handleUploadEvidence = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;
        setUploading(true);
        try {
            for (const f of files) {
                const res = await api.uploadFile(f);
                const url = (res as any).publicUrl || (res as any).url;
                if (url) {
                    await api.post(`/sop/cases/${caseId}/evidence`, { url, file_type: f.type, description: f.name });
                }
            }
            toast.success('Evidence uploaded');
            fetchCase();
        } catch (err: any) {
            toast.error(err?.message || 'Failed to upload evidence');
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };

    const handleAdvance = async () => {
        setAdvancing(true);
        try {
            await api.post(`/sop/cases/${caseId}/advance`, { notes: advanceNotes });
            toast.success('Stage completed');
            setAdvanceNotes('');
            fetchCase();
        } catch (err: any) {
            toast.error(err?.message || 'Failed to advance the case');
        } finally {
            setAdvancing(false);
        }
    };

    const handleRecordDecision = async () => {
        if (!decisionText.trim()) { toast.error('Please describe the decision'); return; }
        setSavingDecision(true);
        try {
            await api.post(`/sop/cases/${caseId}/decision`, { decision_text: decisionText, outcome });
            toast.success('Decision recorded');
            setShowDecision(false);
            setDecisionText(''); setOutcome('no_action');
            fetchCase();
        } catch (err: any) {
            toast.error(err?.message || 'Failed to record decision');
        } finally {
            setSavingDecision(false);
        }
    };

    const handleGenerateLetter = async () => {
        setSavingLetter(true);
        try {
            const letter: any = await api.post(`/sop/cases/${caseId}/letters`, { recipient_type: recipientType });
            setLetterDraft(letter.draft_text);
            toast.success('Letter drafted — review and send when ready');
            fetchCase();
        } catch (err: any) {
            toast.error(err?.message || 'Failed to draft letter');
        } finally {
            setSavingLetter(false);
        }
    };

    const handleSendLetter = async (letterId: string) => {
        if (!window.confirm('Send this letter now? It cannot be edited afterward.')) return;
        try {
            await api.put(`/sop/letters/${letterId}`, { draft_text: letterDraft, recipient_id: recipientId, recipient_type: recipientType });
            await api.post(`/sop/letters/${letterId}/send`, {});
            toast.success('Letter sent');
            setShowLetter(false);
            fetchCase();
        } catch (err: any) {
            toast.error(err?.message || 'Failed to send letter');
        }
    };

    if (loading) return <CenteredLoader message="Loading case..." className="py-12" />;
    if (!caseData) return <div className="text-center py-12 text-gray-500">Case not found.</div>;

    const stages = caseData.incident_type.stages;
    const currentStage = stages.find((s: any) => s.order === caseData.current_stage_order);
    const isArchived = caseData.status === 'archived';
    const canAct = mode === 'admin' && !isArchived;

    return (
        <div className="p-4 lg:p-6 max-w-4xl mx-auto space-y-6 pb-24">
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                        <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider">{caseData.incident_type.name}</p>
                        <h1 className="text-xl font-bold text-gray-900 font-outfit mt-0.5">{caseData.title}</h1>
                    </div>
                    <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${STATUS_STYLES[caseData.status] || 'bg-gray-100 text-gray-600'}`}>
                        {caseData.status.replace('_', ' ')}
                    </span>
                </div>
                <p className="text-sm text-gray-600 mt-3 whitespace-pre-wrap">{caseData.description}</p>
                <p className="text-xs text-gray-400 mt-3">Reported {fmtDateTime(caseData.created_at)}</p>
                {caseData.critical_alert_sent && (
                    <div className="flex items-center gap-2 mt-3 bg-red-50 border border-red-200 rounded-xl p-3">
                        <AlertTriangle className="w-4 h-4 text-red-600" />
                        <p className="text-sm text-red-700 font-semibold">A critical alert was sent when this case was reported.</p>
                    </div>
                )}
            </motion.div>

            {/* Stage timeline */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: 0.05 }} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100"><h3 className="font-bold text-gray-900">Workflow</h3></div>
                <div className="divide-y divide-gray-50">
                    {stages.map((stage: any) => {
                        const log = caseData.stage_logs.find((l: any) => l.stage_order === stage.order);
                        const isCompleted = log?.status === 'completed';
                        const isCurrent = stage.order === caseData.current_stage_order && !isArchived;
                        return (
                            <div key={stage.id} className={`px-5 py-4 flex items-start gap-3 ${isCurrent ? 'bg-indigo-50/40' : ''}`}>
                                {isCompleted ? <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" /> : <Circle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${isCurrent ? 'text-indigo-500' : 'text-gray-300'}`} />}
                                <div className="flex-1 min-w-0">
                                    <p className={`font-semibold text-sm ${isCurrent ? 'text-indigo-900' : 'text-gray-800'}`}>
                                        {stage.order}. {stage.name}
                                        {stage.requires_evidence && <span className="ml-2 text-xs font-normal text-amber-600">(needs evidence)</span>}
                                        {stage.requires_decision && <span className="ml-2 text-xs font-normal text-amber-600">(needs decision)</span>}
                                    </p>
                                    {log?.notes && <p className="text-sm text-gray-500 mt-0.5">{log.notes}</p>}
                                    {isCompleted && <p className="text-xs text-gray-400 mt-0.5">Completed {fmtDateTime(log.completed_at)}</p>}
                                </div>
                            </div>
                        );
                    })}
                </div>
                {canAct && !isArchived && currentStage && (
                    <div className="p-4 bg-gray-50 border-t border-gray-100 space-y-2">
                        <textarea rows={2} placeholder="Notes for this stage (optional)"
                            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            value={advanceNotes} onChange={e => setAdvanceNotes(e.target.value)} />
                        <motion.button whileHover={!advancing ? { scale: 1.01 } : {}} whileTap={!advancing ? { scale: 0.98 } : {}} onClick={handleAdvance} disabled={advancing}
                            className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors disabled:opacity-60">
                            <ArrowRight className="w-4 h-4" /> {advancing ? 'Completing...' : `Complete "${currentStage.name}"`}
                        </motion.button>
                    </div>
                )}
            </motion.div>

            {/* Evidence */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: 0.1 }} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="font-bold text-gray-900">Evidence</h3>
                    {!isArchived && (
                        <label className="flex items-center gap-1.5 text-sm font-semibold text-indigo-600 cursor-pointer hover:text-indigo-800">
                            <Paperclip className="w-4 h-4" /> {uploading ? 'Uploading...' : 'Upload'}
                            <input type="file" multiple className="hidden" onChange={handleUploadEvidence} disabled={uploading} />
                        </label>
                    )}
                </div>
                {caseData.evidence.length === 0
                    ? <p className="px-5 py-6 text-sm text-gray-400 text-center">No evidence uploaded yet.</p>
                    : <div className="divide-y divide-gray-50">
                        {caseData.evidence.map((ev: any) => (
                            <a key={ev.id} href={ev.url} target="_blank" rel="noopener noreferrer" className="px-5 py-3 flex items-center gap-2 hover:bg-gray-50">
                                <Paperclip className="w-4 h-4 text-indigo-500" />
                                <span className="text-sm text-indigo-600 font-semibold">{ev.description || 'Document'}</span>
                                <span className="text-xs text-gray-400 ml-auto">{fmtDateTime(ev.created_at)}</span>
                            </a>
                        ))}
                    </div>}
            </motion.div>

            {/* Decisions */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: 0.15 }} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="font-bold text-gray-900">Decisions</h3>
                    {canAct && (
                        <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => setShowDecision(true)} className="text-sm font-semibold text-indigo-600 hover:text-indigo-800">+ Record Decision</motion.button>
                    )}
                </div>
                {caseData.decisions.length === 0
                    ? <p className="px-5 py-6 text-sm text-gray-400 text-center">No decisions recorded yet.</p>
                    : <div className="divide-y divide-gray-50">
                        {caseData.decisions.map((d: any) => (
                            <div key={d.id} className="px-5 py-3">
                                <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full uppercase">{d.outcome.replace('_', ' ')}</span>
                                <p className="text-sm text-gray-700 mt-1.5">{d.decision_text}</p>
                                <p className="text-xs text-gray-400 mt-1">{fmtDateTime(d.decided_at)}</p>
                            </div>
                        ))}
                    </div>}
            </motion.div>

            {/* Letters */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: 0.2 }} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="font-bold text-gray-900">Letters</h3>
                    {canAct && (
                        <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => setShowLetter(true)} className="text-sm font-semibold text-indigo-600 hover:text-indigo-800">+ Generate Letter</motion.button>
                    )}
                </div>
                {caseData.letters.length === 0
                    ? <p className="px-5 py-6 text-sm text-gray-400 text-center">No letters generated yet.</p>
                    : <div className="divide-y divide-gray-50">
                        {caseData.letters.map((l: any) => (
                            <div key={l.id} className="px-5 py-3">
                                <div className="flex items-center justify-between">
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${l.status === 'sent' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                                        {l.status === 'sent' ? 'Sent' : 'Draft'}
                                    </span>
                                    <span className="text-xs text-gray-400">{fmtDateTime(l.sent_at || l.created_at)}</span>
                                </div>
                                <p className="text-sm text-gray-600 mt-1.5 whitespace-pre-wrap line-clamp-3">{l.final_text || l.draft_text}</p>
                            </div>
                        ))}
                    </div>}
            </motion.div>

            {/* Record Decision modal */}
            <AnimatePresence>
            {showDecision && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} transition={{ type: 'spring', stiffness: 400, damping: 32 }} className="bg-white rounded-3xl p-6 max-w-md w-full space-y-5 shadow-2xl">
                        <h2 className="text-xl font-bold text-gray-900 font-outfit">Record Decision</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Outcome</label>
                                <select className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                    value={outcome} onChange={e => setOutcome(e.target.value)}>
                                    <option value="no_action">No Action</option>
                                    <option value="warning">Warning</option>
                                    <option value="suspension">Suspension</option>
                                    <option value="expulsion">Expulsion</option>
                                    <option value="other">Other</option>
                                </select>
                                {(outcome === 'warning' || outcome === 'suspension') && (
                                    <p className="text-xs text-gray-400 mt-1">A {outcome === 'warning' ? 'teacher warning' : 'student suspension'} can be created directly from Personnel Files / Past Students screens using this decision as the reason.</p>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Decision Details</label>
                                <textarea rows={5} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                    value={decisionText} onChange={e => setDecisionText(e.target.value)} />
                            </div>
                        </div>
                        <div className="flex space-x-3">
                            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setShowDecision(false)} className="flex-grow py-3 px-4 border border-gray-200 rounded-2xl text-gray-600 font-bold hover:bg-gray-50 transition-colors">Cancel</motion.button>
                            <motion.button whileHover={!savingDecision ? { scale: 1.02 } : {}} whileTap={!savingDecision ? { scale: 0.98 } : {}} onClick={handleRecordDecision} disabled={savingDecision}
                                className="flex-grow py-3 px-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 disabled:opacity-60">
                                {savingDecision ? 'Saving...' : 'Record'}
                            </motion.button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
            </AnimatePresence>

            {/* Generate/Send Letter modal */}
            <AnimatePresence>
            {showLetter && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} transition={{ type: 'spring', stiffness: 400, damping: 32 }} className="bg-white rounded-3xl p-6 max-w-lg w-full space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
                        <h2 className="text-xl font-bold text-gray-900 font-outfit">Generate Letter</h2>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Recipient Type</label>
                                    <select className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                        value={recipientType} onChange={e => setRecipientType(e.target.value)}>
                                        <option value="parent">Parent</option>
                                        <option value="student">Student</option>
                                        <option value="teacher">Teacher</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Recipient User ID</label>
                                    <input type="text" placeholder="Paste recipient's user ID" className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                        value={recipientId} onChange={e => setRecipientId(e.target.value)} />
                                </div>
                            </div>
                            {!letterDraft ? (
                                <motion.button whileHover={!savingLetter ? { scale: 1.01 } : {}} whileTap={!savingLetter ? { scale: 0.98 } : {}} onClick={handleGenerateLetter} disabled={savingLetter}
                                    className="w-full flex items-center justify-center gap-2 py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition-colors disabled:opacity-60">
                                    <FileText className="w-4 h-4" /> {savingLetter ? 'Drafting...' : 'Auto-Draft Letter'}
                                </motion.button>
                            ) : (
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Letter Text (editable)</label>
                                    <textarea rows={10} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm"
                                        value={letterDraft} onChange={e => setLetterDraft(e.target.value)} />
                                </div>
                            )}
                        </div>
                        <div className="flex space-x-3">
                            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => { setShowLetter(false); setLetterDraft(''); }} className="flex-grow py-3 px-4 border border-gray-200 rounded-2xl text-gray-600 font-bold hover:bg-gray-50 transition-colors">Close</motion.button>
                            {letterDraft && caseData.letters[0]?.status !== 'sent' && (
                                <motion.button whileHover={recipientId ? { scale: 1.02 } : {}} whileTap={recipientId ? { scale: 0.98 } : {}} onClick={() => handleSendLetter(caseData.letters[0]?.id)} disabled={!recipientId}
                                    className="flex-grow flex items-center justify-center gap-2 py-3 px-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 disabled:opacity-60">
                                    <Send className="w-4 h-4" /> Send Letter
                                </motion.button>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
            </AnimatePresence>
        </div>
    );
};

export default SOPCaseDetailView;
