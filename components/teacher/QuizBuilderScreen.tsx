
import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { PlusIcon, TrashIcon, SaveIcon, CheckCircleIcon, XCircleIcon, ClockIcon } from '../../constants';
// Note: Using new 'Quiz', 'Question' types from types.ts automatically if imported, ensuring no conflict with 'GamifiedQuiz' if explicit.
import { Question } from '../../types';

interface QuizBuilderScreenProps {
    teacherId: number;
    onClose: () => void;
}

// Temporary local type for form state before saving
interface WarningQuestionState {
    id: number; // temp id
    text: string;
    type: 'MultipleChoice' | 'Theory';
    options: { id: string; text: string; isCorrect: boolean }[];
    points: number;
}

const QuizBuilderScreen: React.FC<QuizBuilderScreenProps> = ({ teacherId, onClose }) => {
    const [title, setTitle] = useState('');
    const [subject, setSubject] = useState('');
    const [grade, setGrade] = useState('');
    const [duration, setDuration] = useState(30);
    const [description, setDescription] = useState('');
    const [questions, setQuestions] = useState<WarningQuestionState[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const addQuestion = (type: 'MultipleChoice' | 'Theory') => {
        const newQ: WarningQuestionState = {
            id: Date.now(),
            text: '',
            type,
            options: type === 'MultipleChoice' ? [
                { id: 'opt1', text: '', isCorrect: false },
                { id: 'opt2', text: '', isCorrect: false },
                { id: 'opt3', text: '', isCorrect: false },
                { id: 'opt4', text: '', isCorrect: false }
            ] : [],
            points: type === 'MultipleChoice' ? 1 : 5
        };
        setQuestions([...questions, newQ]);
        toast.success(`Added ${type === 'MultipleChoice' ? 'Multiple Choice' : 'Theory'} Question`);
    };

    const updateQuestionText = (id: number, text: string) => {
        setQuestions(questions.map(q => q.id === id ? { ...q, text } : q));
    };

    const updateOptionText = (qId: number, optId: string, text: string) => {
        setQuestions(questions.map(q => {
            if (q.id === qId) {
                return {
                    ...q,
                    options: q.options.map(o => o.id === optId ? { ...o, text } : o)
                };
            }
            return q;
        }));
    };

    const setCorrectOption = (qId: number, optId: string) => {
        setQuestions(questions.map(q => {
            if (q.id === qId) {
                return {
                    ...q,
                    options: q.options.map(o => ({ ...o, isCorrect: o.id === optId }))
                };
            }
            return q;
        }));
    };

    const removeQuestion = (id: number) => {
        setQuestions(questions.filter(q => q.id !== id));
    };

    const handleSaveQuiz = async () => {
        if (!title || !subject || questions.length === 0) {
            toast.error('Please provide a title, subject, and at least one question.');
            return;
        }

        setIsSubmitting(true);
        try {
            // 1. Create Quiz Record
            const { data: quizData, error: quizError } = await supabase
                .from('quizzes')
                .insert([{
                    title,
                    subject,
                    grade: parseInt(grade) || 0,
                    teacher_id: teacherId,
                    duration_minutes: duration,
                    description,
                    is_published: true // auto-publish for now
                }])
                .select()
                .single();

            if (quizError) throw quizError;

            // 2. Create Questions
            const formattedQuestions = questions.map(q => ({
                quiz_id: quizData.id,
                text: q.text,
                type: q.type,
                points: q.points,
                options: q.type === 'MultipleChoice' ? q.options : null
            }));

            const { error: qError } = await supabase
                .from('questions')
                .insert(formattedQuestions);

            if (qError) throw qError;

            toast.success('Quiz created successfully!');
            onClose();

        } catch (error: any) {
            console.error('Error creating quiz:', error);
            toast.error(`Failed to create quiz: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-gray-50 overflow-hidden">
            {/* Header */}
            <div className="bg-white px-6 py-4 border-b border-gray-200 flex justify-between items-center sticky top-0 z-10">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Quiz Builder</h1>
                    <p className="text-gray-500 text-sm">Create assessments for your students</p>
                </div>
                <div className="flex space-x-3">
                    <button onClick={onClose} className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg">
                        Cancel
                    </button>
                    <button
                        onClick={handleSaveQuiz}
                        disabled={isSubmitting}
                        className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg shadow hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
                    >
                        <SaveIcon className="w-5 h-5" />
                        <span>{isSubmitting ? 'Saving...' : 'Publish Quiz'}</span>
                    </button>
                </div>
            </div>

            <div className="flex-grow overflow-y-auto p-6 space-y-6">

                {/* Quiz Details Card */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-4">
                    <h2 className="text-lg font-bold text-gray-800 border-b pb-2">Quiz Details</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Quiz Title</label>
                            <input
                                type="text"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="e.g. Weekly Math Assessment"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                            <input
                                type="text"
                                value={subject}
                                onChange={e => setSubject(e.target.value)}
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="e.g. Mathematics"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Grade Level</label>
                            <input
                                type="number"
                                value={grade}
                                onChange={e => setGrade(e.target.value)}
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="e.g. 10"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Duration (Minutes)</label>
                            <div className="relative">
                                <ClockIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="number"
                                    value={duration}
                                    onChange={e => setDuration(parseInt(e.target.value))}
                                    className="w-full pl-10 p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Description / Instructions</label>
                            <textarea
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                rows={2}
                                placeholder="Instructions for students..."
                            />
                        </div>
                    </div>
                </div>

                {/* Questions List */}
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-bold text-gray-800">Questions ({questions.length})</h2>
                        <div className="flex space-x-2">
                            <button
                                onClick={() => addQuestion('MultipleChoice')}
                                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 flex items-center shadow-sm"
                            >
                                <PlusIcon className="w-4 h-4 mr-2" /> MCQ
                            </button>
                            <button
                                onClick={() => addQuestion('Theory')}
                                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 flex items-center shadow-sm"
                            >
                                <PlusIcon className="w-4 h-4 mr-2" /> Theory
                            </button>
                        </div>
                    </div>

                    {questions.map((q, index) => (
                        <div key={q.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 relative group transition-all hover:shadow-md">
                            <div className="absolute top-4 right-4">
                                <button onClick={() => removeQuestion(q.id)} className="text-gray-400 hover:text-red-500">
                                    <TrashIcon className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="flex items-start space-x-4">
                                <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full font-bold text-sm">Q{index + 1}</span>
                                <div className="flex-grow space-y-4">
                                    <input
                                        type="text"
                                        value={q.text}
                                        onChange={e => updateQuestionText(q.id, e.target.value)}
                                        placeholder="Enter your question here..."
                                        className="w-full text-lg font-medium border-b border-gray-200 outline-none focus:border-blue-500 pb-2 bg-transparent"
                                    />

                                    {q.type === 'MultipleChoice' && (
                                        <div className="space-y-3 mt-4">
                                            {q.options.map((opt) => (
                                                <div key={opt.id} className="flex items-center space-x-3">
                                                    <button
                                                        onClick={() => setCorrectOption(q.id, opt.id)}
                                                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${opt.isCorrect ? 'border-green-500 bg-green-50' : 'border-gray-300'
                                                            }`}
                                                        title="Mark as correct answer"
                                                    >
                                                        {opt.isCorrect && <div className="w-3 h-3 bg-green-500 rounded-full" />}
                                                    </button>
                                                    <input
                                                        type="text"
                                                        value={opt.text}
                                                        onChange={e => updateOptionText(q.id, opt.id, e.target.value)}
                                                        className={`flex-grow p-2 border rounded-lg outline-none text-sm ${opt.isCorrect ? 'border-green-200 bg-green-50/30' : 'border-gray-200 focus:border-blue-500'}`}
                                                        placeholder={`Option ${opt.id}`}
                                                    />
                                                </div>
                                            ))}
                                            <p className="text-xs text-gray-400 italic mt-2 ml-9">Select the radio button to mark the correct answer.</p>
                                        </div>
                                    )}

                                    {q.type === 'Theory' && (
                                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 border-dashed text-gray-400 text-sm">
                                            Student will input a text answer for this question.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}

                    {questions.length === 0 && (
                        <div className="text-center py-12 bg-white rounded-xl border-2 border-dashed border-gray-200 text-gray-400">
                            <p>No questions added yet.</p>
                            <p className="text-sm">Click the buttons above to add your first question.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default QuizBuilderScreen;
