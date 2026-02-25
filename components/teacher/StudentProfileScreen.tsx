import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Student, BehaviorNote } from '../../types';
import { DocumentTextIcon, BookOpenIcon, ClipboardListIcon, CheckCircleIcon, PlusIcon, SUBJECT_COLORS, ReportIcon } from '../../constants';
import { fetchBehaviorNotes, createBehaviorNote, fetchAcademicPerformance } from '../../lib/database';

interface StudentProfileScreenProps {
    student: Student;
    navigateTo: (view: string, title: string, props: any) => void;
    handleBack: () => void;
}

const StudentProfileScreen: React.FC<StudentProfileScreenProps> = ({ student, navigateTo, handleBack }) => {
    const [behaviorNotes, setBehaviorNotes] = useState<BehaviorNote[]>([]);
    const [academicRecords, setAcademicRecords] = useState<any[]>([]);
    const [newNote, setNewNote] = useState('');
    const [newNoteTitle, setNewNoteTitle] = useState('');
    const [newNoteType, setNewNoteType] = useState<'Positive' | 'Negative'>('Positive');
    const [isAddingNote, setIsAddingNote] = useState(false);
    const [loadingNotes, setLoadingNotes] = useState(true);

    useEffect(() => {
        loadData();
    }, [student.id]);

    const loadData = async () => {
        setLoadingNotes(true);
        try {
            const [notes, performance] = await Promise.all([
                fetchBehaviorNotes(student.id),
                fetchAcademicPerformance(student.id)
            ]);
            setBehaviorNotes(notes);
            setAcademicRecords(performance);
        } catch (error) {
            console.error('Error loading student profile data:', error);
            toast.error('Failed to load student data');
        } finally {
            setLoadingNotes(false);
        }
    };

    const handleAddNote = async () => {
        if (!newNote.trim() || !newNoteTitle.trim()) {
            toast.error('Please fill in both a title and a note.');
            return;
        }

        try {
            const success = await createBehaviorNote({
                studentId: student.id,
                title: newNoteTitle,
                note: newNote,
                type: newNoteType,
                date: new Date().toISOString().split('T')[0],
                teacherName: 'Teacher', // Ideally fetch from Auth Context
            });

            if (success) {
                toast.success('Note added successfully');
                setNewNote('');
                setNewNoteTitle('');
                setNewNoteType('Positive');
                setIsAddingNote(false);
                loadData(); // Refresh list
            } else {
                toast.error('Failed to save note');
            }
        } catch (error) {
            console.error('Error adding note:', error);
            toast.error('Error saving note');
        }
    };

    return (
        <div className="p-4 bg-gray-50 h-full overflow-y-auto">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pb-20">
                {/* Student Header */}
                <div className="lg:col-span-3 bg-white p-4 rounded-xl shadow-sm flex items-center space-x-4">
                    <img src={student.avatarUrl} alt={student.name} className="w-16 h-16 rounded-full object-cover border-4 border-purple-100" />
                    <div>
                        <h3 className="text-xl font-bold text-gray-800">{student.name}</h3>
                        <p className="text-gray-500 font-medium">Grade {student.grade}{student.section}</p>
                        <p className="text-xs text-gray-400">ID: {student.schoolId || 'Pending Generation'}</p>
                    </div>
                </div>

                <div className="lg:col-span-3">
                    <button
                        onClick={() => navigateTo('selectTermForReport', 'Select Term', { student })}
                        className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-purple-600 text-white font-semibold rounded-xl shadow-md hover:bg-purple-700 transition-colors"
                    >
                        <ReportIcon className="w-5 h-5" />
                        <span>Enter Report Card</span>
                    </button>
                </div>

                {/* Academic Performance */}
                <div className="lg:col-span-2 bg-white p-4 rounded-xl shadow-sm">
                    <div className="flex items-center space-x-2 mb-3">
                        <BookOpenIcon className="h-5 w-5 text-purple-600" />
                        <h4 className="font-bold text-gray-800">Academic Performance</h4>
                    </div>
                    <div className="space-y-2">
                        {academicRecords.length > 0 ? (
                            academicRecords.map((record, idx) => (
                                <div key={`${record.subject}-${idx}`} className={`p-3 rounded-lg flex justify-between items-center ${SUBJECT_COLORS[record.subject] || 'bg-gray-100'}`}>
                                    <div>
                                        <span className="font-semibold block">{record.subject}</span>
                                        <span className="text-xs text-gray-500">{record.term}</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="font-bold text-lg block">{record.score}%</span>
                                        <span className="text-xs font-medium bg-white px-2 py-0.5 rounded border">{record.grade}</span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-gray-400 text-sm text-center py-4">No academic records found.</p>
                        )}
                    </div>
                </div>

                {/* Behavioral Notes */}
                <div className="lg:col-span-1 bg-white p-4 rounded-xl shadow-sm">
                    <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center space-x-2">
                            <ClipboardListIcon className="h-5 w-5 text-purple-600" />
                            <h4 className="font-bold text-gray-800">Behavioral Notes</h4>
                        </div>
                        {!isAddingNote && (
                            <button onClick={() => setIsAddingNote(true)} className="flex items-center space-x-1 px-2 py-1 text-xs font-semibold text-purple-700 bg-purple-100 rounded-full hover:bg-purple-200">
                                <PlusIcon className="w-4 h-4" />
                                <span>Add Note</span>
                            </button>
                        )}
                    </div>

                    {isAddingNote && (
                        <div className="space-y-3 mb-4 p-3 bg-purple-50 rounded-lg border border-purple-200 animate-fade-in">
                            <div className="flex justify-around bg-white p-1 rounded-lg shadow-inner">
                                <button type="button" onClick={() => setNewNoteType('Positive')} className={`w-1/2 py-1 text-sm font-semibold rounded-md transition-colors ${newNoteType === 'Positive' ? 'bg-green-500 text-white shadow' : 'text-gray-600'}`}>Positive</button>
                                <button type="button" onClick={() => setNewNoteType('Negative')} className={`w-1/2 py-1 text-sm font-semibold rounded-md transition-colors ${newNoteType === 'Negative' ? 'bg-red-500 text-white shadow' : 'text-gray-600'}`}>Negative</button>
                            </div>
                            <input
                                type="text"
                                value={newNoteTitle}
                                onChange={(e) => setNewNoteTitle(e.target.value)}
                                placeholder="Title (e.g. Helpful)"
                                className="w-full p-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500"
                            />
                            <textarea
                                value={newNote}
                                onChange={(e) => setNewNote(e.target.value)}
                                placeholder="Note details..."
                                className="w-full h-20 p-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500"
                            />
                            <div className="flex justify-end space-x-2">
                                <button onClick={() => setIsAddingNote(false)} className="px-3 py-1 text-xs font-semibold text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300">Cancel</button>
                                <button onClick={handleAddNote} className="px-3 py-1 text-xs font-semibold text-white bg-purple-600 rounded-md hover:bg-purple-700">Save</button>
                            </div>
                        </div>
                    )}

                    <div className="space-y-3 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                        {loadingNotes ? (
                            <div className="text-center py-4"><span className="text-purple-600 text-sm animate-pulse">Loading notes...</span></div>
                        ) : behaviorNotes.length > 0 ? (
                            behaviorNotes.map(note => {
                                const isPositive = note.type === 'Positive';
                                return (
                                    <div key={note.id} className={`p-3 rounded-lg border-l-4 ${isPositive ? 'bg-green-50 border-green-400' : 'bg-red-50 border-red-400'}`}>
                                        <div className="flex justify-between items-start">
                                            <h5 className={`font-bold ${isPositive ? 'text-green-800' : 'text-red-800'}`}>{note.title}</h5>
                                            <p className="text-xs text-gray-500 font-medium flex-shrink-0 ml-2">{new Date(note.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                                        </div>
                                        <p className="text-sm text-gray-700 mt-1">{note.note}</p>
                                        <p className="text-xs text-gray-500 text-right mt-2 italic">- {note.by}</p>
                                    </div>
                                );
                            })
                        ) : (
                            <p className="text-sm text-gray-400 text-center py-4">No behavioral notes recorded.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudentProfileScreen;