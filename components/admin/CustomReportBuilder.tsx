import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';
import {
    BarChart3,
    PlusIcon,
    Trash2,
    Download,
    Filter,
    Eye,
    Save,
    FileSpreadsheet,
    GripVertical,
    ChevronDown,
    CheckCircle2,
    Table,
    PieChart,
    TrendingUp,
    Calendar,
    Users,
    DollarSign,
    BookOpen,
    ClipboardCheck
} from 'lucide-react';
import { api } from '../../lib/api';

interface ReportField {
    id: string;
    name: string;
    source: string;
    selected: boolean;
}

interface ReportFilter {
    id: string;
    field: string;
    operator: string;
    value: string;
}

interface SavedReport {
    id: string;
    name: string;
    description: string;
    data_source: string;
    fields: string[];
    created_at: string;
}

const DATA_SOURCES = [
    { id: 'attendance', name: 'Attendance Records', icon: ClipboardCheck, color: 'bg-blue-50 text-blue-600', fields: ['Student Name', 'Class', 'Date', 'Status', 'Time In', 'Time Out', 'Teacher', 'Term'] },
    { id: 'grades', name: 'Academic Grades', icon: BookOpen, color: 'bg-emerald-50 text-emerald-600', fields: ['Student Name', 'Class', 'Subject', 'CA Score', 'Exam Score', 'Total', 'Grade', 'Term', 'Year'] },
    { id: 'fees', name: 'Fee Payments', icon: DollarSign, color: 'bg-amber-50 text-amber-600', fields: ['Student Name', 'Class', 'Fee Type', 'Amount Due', 'Amount Paid', 'Balance', 'Payment Date', 'Method', 'Receipt No.'] },
    { id: 'students', name: 'Student Records', icon: Users, color: 'bg-purple-50 text-purple-600', fields: ['Name', 'Admission No.', 'Class', 'Gender', 'Date of Birth', 'Parent Name', 'Phone', 'Address', 'Status'] },
    { id: 'teachers', name: 'Staff Records', icon: Users, color: 'bg-pink-50 text-pink-600', fields: ['Name', 'Staff ID', 'Department', 'Subject', 'Qualification', 'Phone', 'Start Date', 'Status'] },
    { id: 'events', name: 'School Events', icon: Calendar, color: 'bg-orange-50 text-orange-600', fields: ['Event Name', 'Date', 'Time', 'Location', 'Category', 'Attendees', 'Status'] },
];

const OPERATORS = ['equals', 'not equals', 'contains', 'greater than', 'less than', 'between', 'is empty', 'is not empty'];

const CustomReportBuilder = () => {
    const { currentSchool, currentBranchId } = useAuth() as any;
    const [step, setStep] = useState<'source' | 'fields' | 'filters' | 'preview'>('source');
    const [selectedSource, setSelectedSource] = useState<string | null>(null);
    const [selectedFields, setSelectedFields] = useState<string[]>([]);
    const [filters, setFilters] = useState<ReportFilter[]>([]);
    const [groupBy, setGroupBy] = useState<string>('');
    const [reportName, setReportName] = useState('');
    const [savedReports, setSavedReports] = useState<SavedReport[]>([]);
    const [showSaved, setShowSaved] = useState(false);
    const [loading, setLoading] = useState(false);
    // REAL rows fetched for the preview/export — this screen must never show
    // invented data: an admin will print what they see here.
    const [reportRows, setReportRows] = useState<any[]>([]);
    const [rowsLoading, setRowsLoading] = useState(false);

    useEffect(() => {
        fetchSavedReports();
    }, []);

    const fetchSavedReports = async () => {
        try {
            const data = await api.getSavedReports(currentSchool?.id);
            setSavedReports(data);
        } catch (error) {
            console.error('Fetch reports error:', error);
        }
    };

    const handleSaveReport = async () => {
        if (!reportName.trim()) { toast.error('Please enter a report name'); return; }
        setLoading(true);
        try {
            await api.createSavedReport({
                name: reportName,
                description: `Custom report from ${currentSource?.name}`,
                data_source: selectedSource || '',
                fields: selectedFields,
                filters: filters
            }, currentSchool?.id);
            toast.success('Report template saved!');
            setReportName('');
            fetchSavedReports();
        } catch (error: any) {
            toast.error('Save failed');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteReport = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!window.confirm('Delete this report template?')) return;
        try {
            await api.deleteSavedReport(id, currentSchool?.id);
            toast.success('Report deleted');
            fetchSavedReports();
        } catch (error: any) {
            toast.error('Delete failed');
        }
    };

    const currentSource = DATA_SOURCES.find(s => s.id === selectedSource);

    // --- REAL data per source. Each mapper turns an API record into a row keyed
    // by the human field names offered in step 2.
    const fetchSourceRows = async (): Promise<any[]> => {
        const sid = currentSchool?.id;
        const bid = currentBranchId && currentBranchId !== 'all' ? currentBranchId : undefined;
        if (!sid || !currentSource) return [];
        const cls = (r: any) => r.class?.name || r.class_name
            || (r.grade != null ? `${r.grade}${r.section || ''}` : '—');

        switch (currentSource.id) {
            case 'students': {
                const students = await api.getStudents(sid, bid);
                return (students || []).map((s: any) => ({
                    'Name': s.full_name || s.name,
                    'Admission No.': s.school_generated_id || s.admission_number || '—',
                    'Class': cls(s),
                    'Gender': s.gender || '—',
                    'Date of Birth': s.dob ? String(s.dob).slice(0, 10) : '—',
                    'Parent Name': s.parent_name || s.guardian_name || '—',
                    'Phone': s.phone || s.user?.phone || '—',
                    'Address': s.address || '—',
                    'Status': s.status || '—',
                }));
            }
            case 'teachers': {
                const teachers = await api.getTeachers(sid, bid);
                return (teachers || []).map((t: any) => ({
                    'Name': t.full_name || t.name,
                    'Staff ID': t.school_generated_id || '—',
                    'Department': t.department || '—',
                    'Subject': Array.isArray(t.subject_specialty) ? t.subject_specialty.join(', ') : (t.subject_specialty || '—'),
                    'Qualification': t.qualification || '—',
                    'Phone': t.phone || '—',
                    'Start Date': t.hire_date ? String(t.hire_date).slice(0, 10) : (t.created_at ? String(t.created_at).slice(0, 10) : '—'),
                    'Status': t.status || 'Active',
                }));
            }
            case 'fees': {
                const fees = await api.getFees(sid, bid);
                return (fees || []).map((f: any) => {
                    const due = Number(f.amount) || 0;
                    const paid = Number(f.paid_amount ?? f.amount_paid) || (String(f.status).toLowerCase() === 'paid' ? due : 0);
                    return {
                        'Student Name': f.student?.full_name || f.student_name || '—',
                        'Class': cls(f.student || f),
                        'Fee Type': f.fee_type || f.type || f.description || '—',
                        'Amount Due': due,
                        'Amount Paid': paid,
                        'Balance': Math.max(0, due - paid),
                        'Payment Date': f.paid_date || f.payment_date ? String(f.paid_date || f.payment_date).slice(0, 10) : '—',
                        'Method': f.payment_method || '—',
                        'Receipt No.': f.receipt_number || '—',
                    };
                });
            }
            case 'grades': {
                const reportCards = await api.getReportCards(sid, bid);
                const rows: any[] = [];
                (reportCards || []).forEach((rc: any) => {
                    const grades = Array.isArray(rc.academic_records) ? rc.academic_records : [];
                    grades.forEach((g: any) => rows.push({
                        'Student Name': rc.student?.full_name || '—',
                        'Class': cls(rc.student || {}),
                        'Subject': g.subject || '—',
                        'CA Score': g.ca ?? ((Number(g.test1) || 0) + (Number(g.test2) || 0)),
                        'Exam Score': g.exam ?? 0,
                        'Total': g.total ?? 0,
                        'Grade': g.grade || '—',
                        'Term': rc.term || '—',
                        'Year': rc.session || '—',
                    }));
                });
                return rows;
            }
            case 'attendance': {
                const today = new Date().toISOString().slice(0, 10);
                const records = await api.getAttendanceByDate(sid, today);
                return (records || []).map((r: any) => ({
                    'Student Name': r.student?.full_name || r.student_name || '—',
                    'Class': cls(r.student || r),
                    'Date': r.date ? String(r.date).slice(0, 10) : today,
                    'Status': r.status || '—',
                    'Time In': r.time_in || '—',
                    'Time Out': r.time_out || '—',
                    'Teacher': r.marked_by_name || r.teacher?.full_name || '—',
                    'Term': r.term || '—',
                }));
            }
            case 'events': {
                const events = await api.getEvents(sid, bid);
                return (events || []).map((e: any) => ({
                    'Event Name': e.title || e.name || '—',
                    'Date': e.date || e.start_date ? String(e.date || e.start_date).slice(0, 10) : '—',
                    'Time': e.time || e.start_time || '—',
                    'Location': e.location || '—',
                    'Category': e.category || e.type || '—',
                    'Attendees': e.attendees ?? '—',
                    'Status': e.status || '—',
                }));
            }
            default:
                return [];
        }
    };

    // Apply the step-3 filters to real rows.
    const applyFilters = (rows: any[]): any[] => {
        const active = filters.filter(f => f.field && f.operator);
        if (active.length === 0) return rows;
        return rows.filter(row => active.every(f => {
            const raw = row[f.field];
            const cell = raw == null ? '' : String(raw);
            const val = f.value || '';
            const cellNum = parseFloat(cell.replace(/[₦,]/g, ''));
            const valNum = parseFloat(val);
            switch (f.operator) {
                case 'equals': return cell.toLowerCase() === val.toLowerCase();
                case 'not equals': return cell.toLowerCase() !== val.toLowerCase();
                case 'contains': return cell.toLowerCase().includes(val.toLowerCase());
                case 'greater than': return !isNaN(cellNum) && !isNaN(valNum) && cellNum > valNum;
                case 'less than': return !isNaN(cellNum) && !isNaN(valNum) && cellNum < valNum;
                case 'between': {
                    const [lo, hi] = val.split(/[,\-]/).map(v => parseFloat(v.trim()));
                    return !isNaN(cellNum) && !isNaN(lo) && !isNaN(hi) && cellNum >= lo && cellNum <= hi;
                }
                case 'is empty': return cell === '' || cell === '—';
                case 'is not empty': return cell !== '' && cell !== '—';
                default: return true;
            }
        }));
    };

    // Load real rows whenever the preview opens (or its inputs change).
    useEffect(() => {
        if (step !== 'preview' || !currentSource || selectedFields.length === 0) return;
        let active = true;
        setRowsLoading(true);
        fetchSourceRows()
            .then(rows => { if (active) setReportRows(applyFilters(rows)); })
            .catch(err => {
                console.error('Report data fetch failed:', err);
                if (active) { setReportRows([]); toast.error('Could not load report data.'); }
            })
            .finally(() => { if (active) setRowsLoading(false); });
        return () => { active = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [step, selectedSource, JSON.stringify(filters), selectedFields.length]);

    const handleExport = (format: 'csv' | 'pdf') => {
        if (reportRows.length === 0) { toast.error('No records to export.'); return; }
        if (format === 'pdf') {
            // Browser print dialog — the preview table is what prints.
            window.print();
            return;
        }
        const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
        const csv = [
            selectedFields.map(esc).join(','),
            ...reportRows.map(row => selectedFields.map(f => esc(row[f])).join(',')),
        ].join('\n');
        const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${(reportName || currentSource?.name || 'report').replace(/[^\w\- ]+/g, '')}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success(`Exported ${reportRows.length} records as CSV`);
    };
    const handleAddFilter = () => {
        setFilters(prev => [...prev, { id: Date.now().toString(), field: selectedFields[0] || '', operator: 'equals', value: '' }]);
    };

    const handleRemoveFilter = (id: string) => {
        setFilters(prev => prev.filter(f => f.id !== id));
    };

    const steps = [
        { key: 'source', label: '1. Data Source' },
        { key: 'fields', label: '2. Columns' },
        { key: 'filters', label: '3. Filters' },
        { key: 'preview', label: '4. Preview' },
    ];

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 font-outfit">Custom Report Builder</h1>
                    <div className="flex items-center space-x-2 text-gray-500 text-sm mt-1">
                        <BarChart3 className="w-4 h-4 text-indigo-500" />
                        <span>Build custom reports from any data source.</span>
                    </div>
                </div>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setShowSaved(!showSaved)} className="flex items-center space-x-2 bg-white border border-gray-200 px-5 py-2.5 rounded-2xl hover:bg-gray-50 transition-all font-bold text-gray-600">
                    <FileSpreadsheet className="w-5 h-5" />
                    <span>Saved Reports ({savedReports.length})</span>
                </motion.button>
            </header>

            {/* Saved Reports Drawer */}
            <AnimatePresence>
            {showSaved && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 space-y-4 overflow-hidden">
                    <h2 className="text-lg font-bold text-gray-800">Saved Report Templates</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {savedReports.map((report, ri) => (
                            <motion.div key={report.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: ri * 0.04 }} className="p-4 bg-gray-50 rounded-2xl hover:bg-indigo-50 cursor-pointer transition-colors group relative"
                                onClick={() => { setSelectedSource(report.data_source); setSelectedFields(report.fields); setStep('preview'); setShowSaved(false); }}>
                                <h3 className="font-bold text-gray-800 group-hover:text-indigo-600">{report.name}</h3>
                                <p className="text-sm text-gray-500 mt-1">{report.description}</p>
                                <div className="flex items-center justify-between mt-3">
                                    <span className="text-xs font-bold text-gray-400">{new Date(report.created_at).toLocaleDateString()}</span>
                                    <span className="text-xs font-bold bg-white px-2 py-1 rounded-lg text-gray-500">{report.fields.length} columns</span>
                                </div>
                                <button onClick={(e) => handleDeleteReport(report.id, e)} className="absolute top-3 right-3 p-1.5 opacity-0 group-hover:opacity-100 hover:bg-red-50 rounded-lg text-red-500 transition-all">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>
            )}
            </AnimatePresence>

            {/* Progress Steps */}
            <div className="flex p-1.5 bg-gray-100 rounded-2xl overflow-x-auto">
                {steps.map((s, i) => (
                    <button key={s.key} onClick={() => {
                        if (s.key === 'source') setStep('source');
                        else if (s.key === 'fields' && selectedSource) setStep('fields');
                        else if (s.key === 'filters' && selectedFields.length > 0) setStep('filters');
                        else if (s.key === 'preview' && selectedFields.length > 0) setStep('preview');
                    }}
                        className={`relative flex items-center space-x-2 px-5 py-2 rounded-xl transition-colors font-bold whitespace-nowrap ${step === s.key ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}>
                        {step === s.key && <motion.div layoutId="reportBuilderStep" className="absolute inset-0 bg-white rounded-xl shadow-sm" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
                        <span className="relative text-sm">{s.label}</span>
                    </button>
                ))}
            </div>

            <AnimatePresence mode="wait">
            {/* Step 1: Data Source */}
            {step === 'source' && (
                <motion.div key="source" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="space-y-6">
                    <h2 className="text-lg font-bold text-gray-700">Select Data Source</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {DATA_SOURCES.map((source, si) => {
                            const Icon = source.icon;
                            return (
                            <motion.button key={source.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: si * 0.04 }} whileHover={{ y: -2 }} onClick={() => { setSelectedSource(source.id); setSelectedFields([]); setStep('fields'); }}
                                className={`p-6 rounded-3xl border-2 text-left transition-colors hover:shadow-md ${selectedSource === source.id ? 'border-indigo-500 bg-indigo-50/50' : 'border-gray-100 bg-white hover:border-indigo-200'}`}>
                                <div className={`p-3 rounded-2xl ${source.color} w-fit`}>
                                    <Icon className="w-6 h-6" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 mt-4">{source.name}</h3>
                                <p className="text-sm text-gray-500 mt-1">{source.fields.length} available fields</p>
                            </motion.button>
                            );
                        })}
                    </div>
                </motion.div>
            )}

            {/* Step 2: Select Fields */}
            {step === 'fields' && currentSource && (
                <motion.div key="fields" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="space-y-6">
                    <div className="flex justify-between items-center">
                        <h2 className="text-lg font-bold text-gray-700">Select Columns — {currentSource.name}</h2>
                        <div className="flex space-x-3">
                            <button onClick={() => setSelectedFields(currentSource.fields)} className="text-sm font-bold text-indigo-600 hover:underline">Select All</button>
                            <button onClick={() => setSelectedFields([])} className="text-sm font-bold text-gray-400 hover:underline">Clear</button>
                        </div>
                    </div>
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {currentSource.fields.map(field => (
                                <button key={field} onClick={() => {
                                    setSelectedFields(prev => prev.includes(field) ? prev.filter(f => f !== field) : [...prev, field]);
                                }}
                                    className={`p-4 rounded-2xl border-2 text-left transition-all font-bold ${selectedFields.includes(field) ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-100 text-gray-600 hover:border-indigo-200'}`}>
                                    <div className="flex items-center space-x-2">
                                        {selectedFields.includes(field) ? <CheckCircle2 className="w-4 h-4 text-indigo-600" /> : <div className="w-4 h-4 rounded-full border-2 border-gray-300" />}
                                        <span className="text-sm">{field}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="flex justify-between">
                        <button onClick={() => setStep('source')} className="px-6 py-3 border border-gray-100 rounded-2xl text-gray-600 font-bold hover:bg-gray-50">← Back</button>
                        <button onClick={() => { if (selectedFields.length === 0) { toast.error('Select at least one column'); return; } setStep('filters'); }} className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-100">Next → Filters</button>
                    </div>
                </motion.div>
            )}

            {/* Step 3: Filters */}
            {step === 'filters' && (
                <motion.div key="filters" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="space-y-6">
                    <div className="flex justify-between items-center">
                        <h2 className="text-lg font-bold text-gray-700">Add Filters (Optional)</h2>
                        <button onClick={handleAddFilter} className="flex items-center space-x-2 bg-white border border-gray-200 px-4 py-2 rounded-2xl hover:bg-gray-50 transition-all font-bold text-gray-600">
                            <PlusIcon className="w-4 h-4" /><span>Add Filter</span>
                        </button>
                    </div>
                    {filters.length === 0 ? (
                        <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-gray-200">
                            <Filter className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                            <p className="text-gray-400 font-medium">No filters applied. Report will include all records.</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 space-y-4">
                            {filters.map(filter => (
                                <div key={filter.id} className="flex items-center space-x-3">
                                    <select className="px-4 py-2.5 bg-gray-50 rounded-xl font-bold text-sm border-none focus:ring-2 focus:ring-indigo-500" value={filter.field} onChange={e => setFilters(prev => prev.map(f => f.id === filter.id ? { ...f, field: e.target.value } : f))}>
                                        {selectedFields.map(f => <option key={f} value={f}>{f}</option>)}
                                    </select>
                                    <select className="px-4 py-2.5 bg-gray-50 rounded-xl font-bold text-sm border-none focus:ring-2 focus:ring-indigo-500" value={filter.operator} onChange={e => setFilters(prev => prev.map(f => f.id === filter.id ? { ...f, operator: e.target.value } : f))}>
                                        {OPERATORS.map(op => <option key={op} value={op}>{op}</option>)}
                                    </select>
                                    <input type="text" placeholder="Value..." className="flex-grow px-4 py-2.5 bg-gray-50 rounded-xl font-medium text-sm border-none focus:ring-2 focus:ring-indigo-500" value={filter.value} onChange={e => setFilters(prev => prev.map(f => f.id === filter.id ? { ...f, value: e.target.value } : f))} />
                                    <button onClick={() => handleRemoveFilter(filter.id)} className="p-2 hover:bg-red-50 rounded-xl text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                                </div>
                            ))}
                        </div>
                    )}
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Group By (Optional)</label>
                        <select className="w-full max-w-xs px-5 py-3 bg-white border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold" value={groupBy} onChange={e => setGroupBy(e.target.value)}>
                            <option value="">No Grouping</option>
                            {selectedFields.map(f => <option key={f} value={f}>{f}</option>)}
                        </select>
                    </div>
                    <div className="flex justify-between">
                        <button onClick={() => setStep('fields')} className="px-6 py-3 border border-gray-100 rounded-2xl text-gray-600 font-bold hover:bg-gray-50">← Back</button>
                        <button onClick={() => setStep('preview')} className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-100">Next → Preview</button>
                    </div>
                </motion.div>
            )}

            {/* Step 4: Preview */}
            {step === 'preview' && (
                <motion.div key="preview" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="space-y-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <h2 className="text-lg font-bold text-gray-700">Report Preview</h2>
                        <div className="flex items-center space-x-3">
                            <div className="flex items-center space-x-2">
                                <input type="text" placeholder="Report name..." className="px-4 py-2.5 bg-white border border-gray-100 rounded-xl font-medium text-sm focus:ring-2 focus:ring-indigo-500 outline-none" value={reportName} onChange={e => setReportName(e.target.value)} />
                                <button onClick={handleSaveReport} className="flex items-center space-x-1 px-4 py-2.5 bg-white border border-gray-200 rounded-xl font-bold text-sm text-gray-600 hover:bg-gray-50"><Save className="w-4 h-4" /><span>Save</span></button>
                            </div>
                            <button onClick={() => handleExport('csv')} className="flex items-center space-x-1 px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700"><Download className="w-4 h-4" /><span>CSV</span></button>
                            <button onClick={() => handleExport('pdf')} className="flex items-center space-x-1 px-4 py-2.5 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700"><Download className="w-4 h-4" /><span>PDF</span></button>
                        </div>
                    </div>

                    {selectedFields.length === 0 ? (
                        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
                            <Table className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                            <p className="text-gray-400 font-medium">Select fields to preview the report.</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-gray-50/50 border-b border-gray-100">
                                            <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-widest">#</th>
                                            {selectedFields.map(field => (
                                                <th key={field} className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">{field}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {rowsLoading ? (
                                            <tr>
                                                <td colSpan={selectedFields.length + 1} className="px-4 py-10 text-center text-sm text-gray-400 font-medium">
                                                    Loading records…
                                                </td>
                                            </tr>
                                        ) : reportRows.length === 0 ? (
                                            <tr>
                                                <td colSpan={selectedFields.length + 1} className="px-4 py-10 text-center text-sm text-gray-400 font-medium">
                                                    No records match this report.
                                                </td>
                                            </tr>
                                        ) : reportRows.map((row, i) => (
                                            <tr key={i} className="hover:bg-gray-50/30 transition-colors">
                                                <td className="px-4 py-3 text-sm text-gray-400 font-mono">{i + 1}</td>
                                                {selectedFields.map(field => (
                                                    <td key={field} className="px-4 py-3 text-sm font-medium text-gray-700 whitespace-nowrap">
                                                        {typeof row[field] === 'number' && (field.includes('Amount') || field === 'Balance')
                                                            ? `₦${Number(row[field]).toLocaleString()}`
                                                            : String(row[field] ?? '—')}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
                                <span className="text-sm text-gray-500">
                                    {rowsLoading ? 'Loading…' : `Showing ${reportRows.length} record${reportRows.length === 1 ? '' : 's'}`}
                                    {currentSource?.id === 'attendance' ? ' (today)' : ''}
                                </span>
                                <span className="text-xs font-bold text-gray-400">Source: {currentSource?.name}</span>
                            </div>
                        </div>
                    )}
                    <div className="flex justify-between">
                        <button onClick={() => setStep('filters')} className="px-6 py-3 border border-gray-100 rounded-2xl text-gray-600 font-bold hover:bg-gray-50">← Back to Filters</button>
                        <button onClick={() => { setStep('source'); setSelectedSource(null); setSelectedFields([]); setFilters([]); setGroupBy(''); }} className="px-6 py-3 text-indigo-600 font-bold hover:underline">Build New Report</button>
                    </div>
                </motion.div>
            )}
            </AnimatePresence>
        </div>
    );
};

export default CustomReportBuilder;
