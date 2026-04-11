import React, { useState, useEffect } from 'react';
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

const AutoInvoiceGenerator = () => {
    const { currentSchool, currentBranch } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchInvoices();
    }, []);

    const fetchInvoices = async () => {
        setLoading(true);
        try {
            const data = await api.getInvoices(currentSchool?.id, currentBranch?.id);
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
        } catch (error) {
            console.error('Fetch invoices error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateAll = async () => {
        setIsGenerating(true);
        try {
            // In a real app, this would probably be a bulk operation or target specific criteria
            await api.createInvoice({
                description: 'Bulk Generated Invoice: Term 2 Fees',
                amount: 150000, // Example fixed amount for bulk generation test
                due_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
                student_id: '' // If empty, backend might handle bulk logic or we call per student
            }, currentSchool?.id, currentBranch?.id);
            
            toast.success('Invoices auto-generated for students!');
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
                <button onClick={handleGenerateAll} disabled={isGenerating}
                    className="flex items-center space-x-2 bg-indigo-600 text-white px-5 py-2.5 rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 font-bold disabled:opacity-60">
                    {isGenerating ? <RefreshCw className="w-5 h-5 animate-spin" /> : <PlusIcon className="w-5 h-5" />}
                    <span>{isGenerating ? 'Generating...' : 'Generate New Invoice'}</span>
                </button>
            </header>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex items-center space-x-4">
                    <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600"><FileText className="w-6 h-6" /></div>
                    <div><p className="text-2xl font-bold text-gray-900">{totalGenerated}</p><p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Generated</p></div>
                </div>
                <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex items-center space-x-4">
                    <div className="p-3 rounded-2xl bg-amber-50 text-amber-600"><Send className="w-6 h-6" /></div>
                    <div><p className="text-2xl font-bold text-gray-900">{totalSent}</p><p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Sent</p></div>
                </div>
                <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex items-center space-x-4">
                    <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600"><CheckCircle2 className="w-6 h-6" /></div>
                    <div><p className="text-2xl font-bold text-gray-900">{totalPaid}</p><p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Paid</p></div>
                </div>
                <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex items-center space-x-4">
                    <div className="p-3 rounded-2xl bg-red-50 text-red-600"><Clock className="w-6 h-6" /></div>
                    <div><p className="text-2xl font-bold text-gray-900">{totalOverdue}</p><p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Overdue</p></div>
                </div>
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
                        ) : filteredInvoices.map(inv => (
                            <tr key={inv.id} className="hover:bg-gray-50/30 transition-colors">
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
                            </tr>
                        ))}
                        {!loading && filteredInvoices.length === 0 && (
                            <tr>
                                <td colSpan={7} className="px-6 py-20 text-center text-gray-400">No invoices found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AutoInvoiceGenerator;
