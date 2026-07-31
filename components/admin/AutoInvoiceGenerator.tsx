import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';
import {
    FileText,
    Download,
    Send,
    CheckCircle2,
    Search,
    PlusIcon,
    CreditCard,
    Calendar,
    Users,
    Printer,
    Eye,
    RefreshCw,
    Clock,
    QrCode
} from 'lucide-react';
import { api } from '../../lib/api';

interface Invoice {
    id: string;
    invoice_number: string;
    student_name: string;
    class_name: string;
    parent_name: string;
    fee_description: string;
    amount: number;
    status: 'generated' | 'sent' | 'paid' | 'overdue';
    generated_at: string;
    due_date: string;
    has_qr: boolean;
}

interface InvoiceForm {
    student_id: string;
    description: string;
    amount: string;
    daysUntilDue: string;
}

const AutoInvoiceGenerator = () => {
    const { currentSchool, currentBranchId } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [students, setStudents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState<InvoiceForm>({ student_id: '', description: '', amount: '', daysUntilDue: '15' });

    useEffect(() => {
        fetchInvoices();
        if (currentSchool?.id) {
            api.getStudents(currentSchool.id).then(setStudents).catch(() => setStudents([]));
        }
    }, [currentSchool?.id]);

    const fetchInvoices = async () => {
        setLoading(true);
        try {
            const data = await api.getInvoices(currentSchool?.id, currentBranchId ?? undefined);
            // Map backend invoice to frontend interface if needed
            setInvoices(data.map((inv: any) => ({
                id: inv.id,
                invoice_number: inv.invoice_number,
                student_name: inv.student?.first_name ? `${inv.student.first_name} ${inv.student.last_name}` : 'Unknown Student',
                class_name: inv.student?.class?.name || 'No Class',
                parent_name: inv.student?.parent?.full_name || 'No Parent',
                fee_description: inv.description,
                amount: inv.amount,
                status: inv.status,
                generated_at: inv.created_at,
                due_date: inv.due_date,
                has_qr: true
            })));
        } catch (error: any) {
            console.error('Fetch invoices error:', error);
            toast.error('Failed to load invoices');
        } finally {
            setLoading(false);
        }
    };

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleGenerateInvoice = async () => {
        const description = form.description.trim();
        const amount = parseFloat(form.amount);
        const days = parseInt(form.daysUntilDue, 10);

        if (!form.student_id) { toast.error('Please select a student'); return; }
        if (!description) { toast.error('Please enter a fee description'); return; }
        if (isNaN(amount) || amount <= 0) { toast.error('Please enter a valid amount'); return; }
        if (isNaN(days) || days < 1) { toast.error('Please enter valid due days'); return; }

        setIsGenerating(true);
        try {
            await api.createInvoice({
                description,
                amount,
                due_date: new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString(),
                student_id: form.student_id,
                invoice_number: `INV-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`
            }, currentSchool?.id, currentBranchId ?? undefined);

            toast.success('Invoice generated successfully!');
            setShowModal(false);
            setForm({ student_id: '', description: '', amount: '', daysUntilDue: '15' });
            fetchInvoices();
        } catch (error) {
            toast.error('Generation failed');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSendInvoice = async (id: string) => {
        try {
            await api.updateInvoiceStatus(id, 'sent');
            toast.success('Invoice sent to parent via email & WhatsApp');
            fetchInvoices();
        } catch (error) {
            toast.error('Failed to send invoice');
        }
    };

    const filteredInvoices = invoices.filter(inv =>
        inv.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.invoice_number.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalGenerated = invoices.length;
    const totalSent = invoices.filter(i => i.status === 'sent' || i.status === 'paid').length;
    const totalPaid = invoices.filter(i => i.status === 'paid').length;
    const totalOverdue = invoices.filter(i => i.status === 'overdue').length;

    const statusStyles: Record<string, string> = {
        generated: 'bg-blue-100 text-blue-700',
        sent: 'bg-amber-100 text-amber-700',
        paid: 'bg-emerald-100 text-emerald-700',
        overdue: 'bg-red-100 text-red-700',
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 font-outfit">Auto Invoice Generator</h1>
                    <p className="text-sm text-gray-500 mt-1">Automatically generate and send fee invoices with QR-coded receipts.</p>
                </div>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setShowModal(true)}
                    className="flex items-center space-x-2 bg-indigo-600 text-white px-5 py-2.5 rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 font-bold">
                    <PlusIcon className="w-5 h-5" />
                    <span>Generate New Invoice</span>
                </motion.button>
            </header>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex items-center space-x-4">
                    <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600"><FileText className="w-6 h-6" /></div>
                    <div><p className="text-2xl font-bold text-gray-900">{totalGenerated}</p><p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Generated</p></div>
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: 0.05 }} className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex items-center space-x-4">
                    <div className="p-3 rounded-2xl bg-amber-50 text-amber-600"><Send className="w-6 h-6" /></div>
                    <div><p className="text-2xl font-bold text-gray-900">{totalSent}</p><p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Sent</p></div>
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: 0.1 }} className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex items-center space-x-4">
                    <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600"><CheckCircle2 className="w-6 h-6" /></div>
                    <div><p className="text-2xl font-bold text-gray-900">{totalPaid}</p><p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Paid</p></div>
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: 0.15 }} className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex items-center space-x-4">
                    <div className="p-3 rounded-2xl bg-red-50 text-red-600"><Clock className="w-6 h-6" /></div>
                    <div><p className="text-2xl font-bold text-gray-900">{totalOverdue}</p><p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Overdue</p></div>
                </motion.div>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input type="text" placeholder="Search by student or invoice number..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-white border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>

            {/* Invoice Table */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50/50 border-b border-gray-100">
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Invoice #</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Student</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Description</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Amount</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Status</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Due Date</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {loading ? (
                            <tr>
                                <td colSpan={7} className="px-6 py-20 text-center"><RefreshCw className="w-8 h-8 text-indigo-500 animate-spin mx-auto" /></td>
                            </tr>
                        ) : filteredInvoices.map((inv, ii) => (
                            <motion.tr key={inv.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.15, delay: Math.min(ii, 15) * 0.02 }} className="hover:bg-gray-50/30 transition-colors">
                                <td className="px-6 py-4 font-bold text-indigo-600 text-sm">{inv.invoice_number}</td>
                                <td className="px-6 py-4"><div><span className="font-bold text-gray-800 text-sm">{inv.student_name}</span></div><span className="text-xs text-gray-400">{inv.class_name} • {inv.parent_name}</span></td>
                                <td className="px-6 py-4 text-sm text-gray-600">{inv.fee_description}</td>
                                <td className="px-6 py-4 font-bold text-gray-800">₦{inv.amount.toLocaleString()}</td>
                                <td className="px-6 py-4"><span className={`text-xs font-bold px-3 py-1 rounded-full capitalize ${statusStyles[inv.status]}`}>{inv.status}</span></td>
                                <td className="px-6 py-4 text-sm text-gray-500">{new Date(inv.due_date).toLocaleDateString('en-NG')}</td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center space-x-2">
                                        <button className="p-1.5 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-indigo-600 transition-all" title="Preview"><Eye className="w-4 h-4" /></button>
                                        <button className="p-1.5 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-indigo-600 transition-all" title="Download PDF"><Download className="w-4 h-4" /></button>
                                        {inv.has_qr && <button className="p-1.5 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-indigo-600 transition-all" title="QR Receipt"><QrCode className="w-4 h-4" /></button>}
                                        {inv.status === 'generated' && (
                                            <button onClick={() => handleSendInvoice(inv.id)} className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-all flex items-center space-x-1">
                                                <Send className="w-3 h-3" /><span>Send</span>
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </motion.tr>
                        ))}
                        {!loading && filteredInvoices.length === 0 && (
                            <tr>
                                <td colSpan={7} className="px-6 py-20 text-center text-gray-400">No invoices found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Generate Invoice Modal */}
            <AnimatePresence>
            {showModal && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
                    <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} transition={{ type: 'spring', stiffness: 400, damping: 32 }} className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8" onClick={e => e.stopPropagation()}>
                        <h2 className="text-2xl font-bold text-gray-900 mb-6">Generate Invoice</h2>

                        <div className="space-y-5">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1.5">Student</label>
                                <select
                                    name="student_id"
                                    value={form.student_id}
                                    onChange={handleFormChange}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                                >
                                    <option value="">Select Student</option>
                                    {students.map((s: any) => <option key={s.id} value={s.id}>{s.full_name} ({s.grade})</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1.5">Fee Description</label>
                                <input
                                    name="description"
                                    value={form.description}
                                    onChange={handleFormChange}
                                    placeholder="e.g. Term 2 School Fees"
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1.5">Amount (₦)</label>
                                <input
                                    name="amount"
                                    type="number"
                                    min="1"
                                    value={form.amount}
                                    onChange={handleFormChange}
                                    placeholder="e.g. 75000"
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1.5">Due In (days)</label>
                                <select
                                    name="daysUntilDue"
                                    value={form.daysUntilDue}
                                    onChange={handleFormChange}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                                >
                                    <option value="7">7 days</option>
                                    <option value="14">14 days</option>
                                    <option value="15">15 days</option>
                                    <option value="30">30 days</option>
                                    <option value="45">45 days</option>
                                    <option value="60">60 days</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-8">
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setShowModal(false)}
                                className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition-all"
                            >
                                Cancel
                            </motion.button>
                            <motion.button
                                whileHover={!isGenerating ? { scale: 1.02 } : {}}
                                whileTap={!isGenerating ? { scale: 0.98 } : {}}
                                onClick={handleGenerateInvoice}
                                disabled={isGenerating}
                                className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                            >
                                {isGenerating ? <><RefreshCw className="w-4 h-4 animate-spin" /><span>Generating...</span></> : 'Generate'}
                            </motion.button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
            </AnimatePresence>
        </div>
    );
};

export default AutoInvoiceGenerator;
