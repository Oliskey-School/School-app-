import React, { useState } from 'react';
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
    const { currentSchool } = useAuth();
    const [step, setStep] = useState<'source' | 'fields' | 'filters' | 'preview'>('source');
    const [selectedSource, setSelectedSource] = useState<string | null>(null);
    const [selectedFields, setSelectedFields] = useState<string[]>([]);
    const [filters, setFilters] = useState<ReportFilter[]>([]);
    const [groupBy, setGroupBy] = useState<string>('');
    const [reportName, setReportName] = useState('');
    const [savedReports, setSavedReports] = useState<SavedReport[]>([
        { id: '1', name: 'Term 2 Attendance Summary', description: 'Attendance rates by class for Term 2', data_source: 'attendance', fields: ['Class', 'Student Name', 'Status'], created_at: '2026-03-10' },
        { id: '2', name: 'Outstanding Fees Report', description: 'Students with unpaid balances', data_source: 'fees', fields: ['Student Name', 'Class', 'Balance'], created_at: '2026-03-12' },
        { id: '3', name: 'Staff Qualification Audit', description: 'All staff with qualifications', data_source: 'teachers', fields: ['Name', 'Department', 'Qualification'], created_at: '2026-03-14' },
    ]);
    const [showSaved, setShowSaved] = useState(false);

    const currentSource = DATA_SOURCES.find(s => s.id === selectedSource);

    const generateDemoData = () => {
        if (!currentSource) return [];
        const rows = [];
        const names = ['Femi Adeyemi', 'Chioma Okeke', 'Abubakar Musa', 'Blessing Okafor', 'Tunde Bakare', 'Amina Ibrahim', 'David Eze', 'Grace Nwosu'];
        const classes = ['JSS 1A', 'JSS 2B', 'SS 1A', 'SS 2C', 'JSS 3A'];
        for (let i = 0; i < 8; i++) {
            const row: any = {};
            selectedFields.forEach(field => {
                if (field.includes('Name')) row[field] = names[i % names.length];
                else if (field === 'Class') row[field] = classes[i % classes.length];
                else if (field === 'Status') row[field] = i % 5 === 0 ? 'Absent' : 'Present';
                else if (field === 'Date') row[field] = `2026-03-${(10 + i).toString().padStart(2, '0')}`;
                else if (field.includes('Score') || field === 'Total') row[field] = Math.floor(Math.random() * 40) + 60;
                else if (field === 'Grade') row[field] = ['A', 'B', 'B', 'C', 'A', 'B', 'A', 'C'][i];
                else if (field.includes('Amount') || field === 'Balance') row[field] = `₦${(Math.floor(Math.random() * 50) * 1000 + 10000).toLocaleString()}`;
                else if (field === 'Gender') row[field] = i % 2 === 0 ? 'Male' : 'Female';
                else if (field === 'Subject') row[field] = ['Mathematics', 'English', 'Physics', 'Chemistry', 'Biology', 'Economics'][i % 6];
                else if (field === 'Term') row[field] = 'Term 2';
                else if (field === 'Method') row[field] = ['Paystack', 'Bank Transfer', 'Cash'][i % 3];
                else row[field] = '—';
            });
            rows.push(row);
        }
        return rows;
    };

    const handleExport = (format: 'csv' | 'pdf') => {
        toast.success(`Report exported as ${format.toUpperCase()}`);
    };

    const handleSaveReport = () => {
        if (!reportName.trim()) { toast.error('Please enter a report name'); return; }
        const newReport: SavedReport = {
            id: Date.now().toString(),
            name: reportName,
            description: `Custom report from ${currentSource?.name}`,
            data_source: selectedSource || '',
            fields: selectedFields,
            created_at: new Date().toISOString().split('T')[0],
        };
        setSavedReports(prev => [newReport, ...prev]);
        toast.success('Report template saved!');
        setReportName('');
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
                <button onClick={() => setShowSaved(!showSaved)} className="flex items-center space-x-2 bg-white border border-gray-200 px-5 py-2.5 rounded-2xl hover:bg-gray-50 transition-all font-bold text-gray-600">
                    <FileSpreadsheet className="w-5 h-5" />
                    <span>Saved Reports ({savedReports.length})</span>
                </button>
            </header>

            {/* Saved Reports Drawer */}
            {showSaved && (
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 space-y-4">
                    <h2 className="text-lg font-bold text-gray-800">Saved Report Templates</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {savedReports.map(report => (
                            <div key={report.id} className="p-4 bg-gray-50 rounded-2xl hover:bg-indigo-50 cursor-pointer transition-colors group"
                                onClick={() => { setSelectedSource(report.data_source); setSelectedFields(report.fields); setStep('preview'); setShowSaved(false); }}>
                                <h3 className="font-bold text-gray-800 group-hover:text-indigo-600">{report.name}</h3>
                                <p className="text-sm text-gray-500 mt-1">{report.description}</p>
                                <div className="flex items-center justify-between mt-3">
                                    <span className="text-xs font-bold text-gray-400">{report.created_at}</span>
                                    <span className="text-xs font-bold bg-white px-2 py-1 rounded-lg text-gray-500">{report.fields.length} columns</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Progress Steps */}
            <div className="flex p-1.5 bg-gray-100 rounded-2xl overflow-x-auto">
                {steps.map((s, i) => (
                    <button key={s.key} onClick={() => {
                        if (s.key === 'source') setStep('source');
                        else if (s.key === 'fields' && selectedSource) setStep('fields');
                        else if (s.key === 'filters' && selectedFields.length > 0) setStep('filters');
                        else if (s.key === 'preview' && selectedFields.length > 0) setStep('preview');
                    }}
                        className={`flex items-center space-x-2 px-5 py-2 rounded-xl transition-all font-bold whitespace-nowrap ${step === s.key ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                        <span className="text-sm">{s.label}</span>
                    </button>
                ))}
            </div>

            {/* Step 1: Data Source */}
            {step === 'source' && (
                <div className="space-y-6">
                    <h2 className="text-lg font-bold text-gray-700">Select Data Source</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {DATA_SOURCES.map(source => (
                            <button key={source.id} onClick={() => { setSelectedSource(source.id); setSelectedFields([]); setStep('fields'); }}
                                className={`p-6 rounded-3xl border-2 text-left transition-all hover:shadow-md ${selectedSource === source.id ? 'border-indigo-500 bg-indigo-50/50' : 'border-gray-100 bg-white hover:border-indigo-200'}`}>
                                <div className={`p-3 rounded-2xl ${source.color} w-fit`}>
                                    <source.icon className="w-6 h-6" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 mt-4">{source.name}</h3>
                                <p className="text-sm text-gray-500 mt-1">{source.fields.length} available fields</p>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Step 2: Select Fields */}
            {step === 'fields' && currentSource && (
                <div className="space-y-6">
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
                </div>
            )}

            {/* Step 3: Filters */}
            {step === 'filters' && (
                <div className="space-y-6">
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
                </div>
            )}

            {/* Step 4: Preview */}
            {step === 'preview' && (
                <div className="space-y-6">
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
                                        {generateDemoData().map((row, i) => (
                                            <tr key={i} className="hover:bg-gray-50/30 transition-colors">
                                                <td className="px-4 py-3 text-sm text-gray-400 font-mono">{i + 1}</td>
                                                {selectedFields.map(field => (
                                                    <td key={field} className="px-4 py-3 text-sm font-medium text-gray-700 whitespace-nowrap">{row[field]}</td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
                                <span className="text-sm text-gray-500">Showing 8 demo records</span>
                                <span className="text-xs font-bold text-gray-400">Source: {currentSource?.name}</span>
                            </div>
                        </div>
                    )}
                    <div className="flex justify-between">
                        <button onClick={() => setStep('filters')} className="px-6 py-3 border border-gray-100 rounded-2xl text-gray-600 font-bold hover:bg-gray-50">← Back to Filters</button>
                        <button onClick={() => { setStep('source'); setSelectedSource(null); setSelectedFields([]); setFilters([]); setGroupBy(''); }} className="px-6 py-3 text-indigo-600 font-bold hover:underline">Build New Report</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomReportBuilder;
