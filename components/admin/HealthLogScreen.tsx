import React, { useState, useMemo } from 'react';
import { HealthLogEntry, Student } from '../../types';
import { mockHealthLogs as initialLogs, mockStudents } from '../../data';
import { SearchIcon, PlusIcon, XCircleIcon } from '../../constants';

const HealthLogScreen: React.FC = () => {
    const [logs, setLogs] = useState<HealthLogEntry[]>(initialLogs);
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddForm, setShowAddForm] = useState(false);

    // Form state
    const [selectedStudent, setSelectedStudent] = useState<string>('');
    const [reason, setReason] = useState('');
    const [notes, setNotes] = useState('');
    const [medication, setMedication] = useState('');
    const [dosage, setDosage] = useState('');
    const [parentNotified, setParentNotified] = useState(false);

    const filteredLogs = useMemo(() => {
        return logs
            .filter(log => log.studentName.toLowerCase().includes(searchTerm.toLowerCase()))
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [logs, searchTerm]);

    const handleAddEntry = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedStudent || !reason || !notes) {
            alert("Please select a student and fill in the reason and notes.");
            return;
        }

        const student = mockStudents.find(s => s.id === parseInt(selectedStudent));
        if (!student) {
            alert("Selected student not found.");
            return;
        }

        const newLog: HealthLogEntry = {
            id: Date.now(),
            studentId: student.id,
            studentName: student.name,
            studentAvatar: student.avatarUrl,
            date: new Date().toISOString(),
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            reason,
            notes,
            medicationAdministered: medication ? { name: medication, dosage } : undefined,
            parentNotified,
            recordedBy: 'Admin Nurse',
        };

        setLogs(prev => [newLog, ...prev]);
        setShowAddForm(false);
        // Reset form
        setSelectedStudent('');
        setReason('');
        setNotes('');
        setMedication('');
        setDosage('');
        setParentNotified(false);
    };

    return (
        <div className="flex flex-col h-full bg-gray-100 relative">
            {/* Search Bar */}
            <div className="p-4 bg-gray-100/80 backdrop-blur-sm sticky top-0 z-10 border-b border-gray-200">
                <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                        <SearchIcon className="text-gray-400" />
                    </span>
                    <input
                        type="text"
                        placeholder="Search by student name..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                    />
                </div>
            </div>

            {/* Log List */}
            <main className="flex-grow p-4 space-y-3 overflow-y-auto pb-24">
                {filteredLogs.map(log => (
                    <div key={log.id} className="bg-white p-4 rounded-xl shadow-sm">
                        <div className="flex items-start space-x-4">
                            <img src={log.studentAvatar} alt={log.studentName} className="w-12 h-12 rounded-full object-cover" />
                            <div className="flex-grow">
                                <div className="flex justify-between items-center">
                                    <p className="font-bold text-gray-800">{log.studentName}</p>
                                    <p className="text-xs text-gray-500">{new Date(log.date).toLocaleDateString()}</p>
                                </div>
                                <p className="font-semibold text-indigo-600">{log.reason}</p>
                                <p className="text-sm text-gray-600 mt-1">{log.notes}</p>
                                {log.medicationAdministered && (
                                    <p className="text-xs text-red-600 mt-2 font-medium">Medication: {log.medicationAdministered.name} ({log.medicationAdministered.dosage})</p>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </main>

            {/* Add New Entry Form (Modal-like) */}
            {showAddForm && (
                <div className="absolute inset-0 bg-black/40 z-20 flex items-end">
                    <div className="w-full bg-gray-100 rounded-t-2xl shadow-2xl p-4 animate-slide-in-up">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-gray-800">New Health Entry</h3>
                            <button onClick={() => setShowAddForm(false)} className="text-gray-500 hover:text-red-500">
                                <XCircleIcon className="w-7 h-7" />
                            </button>
                        </div>
                        <form onSubmit={handleAddEntry} className="space-y-3">
                             <select value={selectedStudent} onChange={e => setSelectedStudent(e.target.value)} required className="w-full p-2 border rounded-md">
                                <option value="">-- Select Student --</option>
                                {mockStudents.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                            <input type="text" value={reason} onChange={e => setReason(e.target.value)} placeholder="Reason for visit (e.g., Headache)" required className="w-full p-2 border rounded-md" />
                            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes..." required rows={3} className="w-full p-2 border rounded-md"></textarea>
                            <div className="grid grid-cols-2 gap-2">
                                <input type="text" value={medication} onChange={e => setMedication(e.target.value)} placeholder="Medication (if any)" className="w-full p-2 border rounded-md" />
                                <input type="text" value={dosage} onChange={e => setDosage(e.target.value)} placeholder="Dosage" className="w-full p-2 border rounded-md" />
                            </div>
                            <div className="flex items-center space-x-2">
                                <input type="checkbox" id="parentNotified" checked={parentNotified} onChange={e => setParentNotified(e.target.checked)} className="h-4 w-4"/>
                                <label htmlFor="parentNotified" className="text-sm font-medium">Parent Notified</label>
                            </div>
                            <button type="submit" className="w-full py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700">Save Entry</button>
                        </form>
                    </div>
                </div>
            )}

            {/* Add FAB */}
            <div className="absolute bottom-6 right-6 z-10">
                <button
                    onClick={() => setShowAddForm(true)}
                    className="bg-indigo-600 text-white p-4 rounded-full shadow-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    aria-label="Add new health entry"
                >
                    <PlusIcon className="h-6 w-6" />
                </button>
            </div>
        </div>
    );
};

export default HealthLogScreen;
