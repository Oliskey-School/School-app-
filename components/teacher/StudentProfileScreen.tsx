import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { Student, BehaviorNote } from '../../types';
import { DocumentTextIcon, BookOpenIcon, ClipboardListIcon, CheckCircleIcon, PlusIcon, SUBJECT_COLORS, ReportIcon } from '../../constants';

interface StudentProfileScreenProps {
    student: Student;
    navigateTo: (view: string, title: string, props: any) => void;
    handleBack: () => void;
}

const StudentProfileScreen: React.FC<StudentProfileScreenProps> = ({ student, navigateTo, handleBack }) => {
    const [behaviorNotes, setBehaviorNotes] = useState<BehaviorNote[]>(student.behaviorNotes || []);
    const [newNote, setNewNote] = useState('');
    const [newNoteTitle, setNewNoteTitle] = useState('');
    const [newNoteType, setNewNoteType] = useState<'Positive' | 'Negative'>('Positive');
    const [isAddingNote, setIsAddingNote] = useState(false);

    const handleAddNote = () => {
        if (!newNote.trim() || !newNoteTitle.trim()) {
            toast.error('Please fill in both a title and a note.');
            return;
        }
        const noteToAdd: BehaviorNote = {
            id: Date.now(),
            date: new Date().toISOString().split('T')[0],
            type: newNoteType,
            title: newNoteTitle,
            note: newNote,
            by: 'Mrs. Funke Akintola', // Mocked teacher name
        };
        setBehaviorNotes(prev => [noteToAdd, ...prev]);
        setNewNote('');
        setNewNoteTitle('');
        setNewNoteType('Positive');
        setIsAddingNote(false);
    };

    return (
        <div className="p-4 bg-gray-50">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Student Header */}
                <div className="lg:col-span-3 bg-white p-4 rounded-xl shadow-sm flex items-center space-x-4">
                    <img src={student.avatarUrl} alt={student.name} className="w-16 h-16 rounded-full object-cover border-4 border-purple-100" />
                    <div>
                        <h3 className="text-xl font-bold text-gray-800">{student.name}</h3>
                        <p className="text-gray-500 font-medium">Grade {student.grade}{student.section}</p>
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
                        {student.academicPerformance?.map(record => (
                            <div key={record.subject} className={`p-3 rounded-lg flex justify-between items-center ${SUBJECT_COLORS[record.subject] || 'bg-gray-100'}`}>
                                <span className="font-semibold">{record.subject}</span>
                                <span className="font-bold text-lg">{record.score}%</span>
                            </div>
                        ))}
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
                        <div className="space-y-3 mb-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
                            <div className="flex justify-around bg-white p-1 rounded-lg shadow-inner">
                                <button type="button" onClick={() => setNewNoteType('Positive')} className={`w-1/2 py-1 text-sm font-semibold rounded-md transition-colors ${newNoteType === 'Positive' ? 'bg-green-500 text-white shadow' : 'text-gray-600'}`}>Positive</button>
                                <button type="button" onClick={() => setNewNoteType('Negative')} className={`w-1/2 py-1 text-sm font-semibold rounded-md transition-colors ${newNoteType === 'Negative' ? 'bg-red-500 text-white shadow' : 'text-gray-600'}`}>Negative</button>
                            </div>
                            <input
                                type="text"
                                value={newNoteTitle}
                                onChange={(e) => setNewNoteTitle(e.target.value)}
                                placeholder="Title of the note (e.g., Helped a classmate)"
                                className="w-full p-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500"
                            />
                            <textarea
                                value={newNote}
                                onChange={(e) => setNewNote(e.target.value)}
                                placeholder="Type new behavioral note here..."
                                className="w-full h-20 p-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500"
                            />
                            <div className="flex justify-end space-x-2">
                                <button onClick={() => setIsAddingNote(false)} className="px-3 py-1 text-xs font-semibold text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300">Cancel</button>
                                <button onClick={handleAddNote} className="px-3 py-1 text-xs font-semibold text-white bg-purple-600 rounded-md hover:bg-purple-700">Save Note</button>
                            </div>
                        </div>
                    )}

                    <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
                        {behaviorNotes.length > 0 ? [...behaviorNotes].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(note => {
                            const isPositive = note.type === 'Positive';
                            return (
                                <div key={note.id} className={`p-3 rounded-lg border-l-4 ${isPositive ? 'bg-green-50 border-green-400' : 'bg-red-50 border-red-400'}`}>
                                    <div className="flex justify-between items-start">
                                        <h5 className={`font-bold ${isPositive ? 'text-green-800' : 'text-red-800'}`}>{note.title}</h5>
                                        <p className="text-xs text-gray-500 font-medium flex-shrink-0 ml-2">{new Date(note.date.replace(/-/g, '/')).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                                    </div>
                                    <p className="text-sm text-gray-700 mt-1">{note.note}</p>
                                    <p className="text-xs text-gray-500 text-right mt-2 italic">- {note.by}</p>
                                </div>
                            );
                        }) : <p className="text-sm text-gray-400 text-center py-4">No behavioral notes recorded.</p>}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudentProfileScreen;