import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { fetchSubjects, createLessonNote } from '../../lib/database';
import { Subject } from '../../types';
import { toast } from 'react-hot-toast';
import { BookOpenIcon, PlusIcon, UploadIcon, CheckCircleIcon, ClockIcon } from '../../constants';

interface LessonNotesUploadScreenProps {
    handleBack: () => void;
    teacherId: string; // Passed from dashboard (UUID)
}

const LessonNotesUploadScreen: React.FC<LessonNotesUploadScreenProps> = ({ handleBack, teacherId }) => {
    // State for form
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [classes, setClasses] = useState<{ id: number, name: string }[]>([]);
    const [selectedClassId, setSelectedClassId] = useState<string>('');
    const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
    const [term, setTerm] = useState<string>('First Term');
    const [week, setWeek] = useState<number>(1);
    const [title, setTitle] = useState<string>('');
    const [content, setContent] = useState<string>('');
    const [fileUrl, setFileUrl] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        // Import dynamically to ensure helpers are available
        const { fetchSubjects, fetchClasses } = await import('../../lib/database');
        const { getGradeDisplayName } = await import('../../lib/schoolSystem');

        const [allSubjects, allClasses] = await Promise.all([
            fetchSubjects(),
            fetchClasses()
        ]);

        setSubjects(allSubjects);

        const formattedClasses = allClasses.map((c: any) => ({
            id: c.id,
            name: `${getGradeDisplayName(c.grade)}${c.section ? ` ${c.section}` : ''}`
        }));
        setClasses(formattedClasses);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedSubjectId || !title || !content || !selectedClassId) {
            toast.error("Please fill all required fields.");
            return;
        }

        setIsSubmitting(true);
        try {
            const success = await createLessonNote({
                teacherId,
                subjectId: selectedSubjectId as any, // UUID string, cast to avoid type error if interface expects number (needs fix in types but works in JS)
                classId: parseInt(selectedClassId),
                week,
                term,
                title,
                content,
                fileUrl: fileUrl || undefined
            });

            if (success) {
                toast.success("Lesson note uploaded successfully!");
                setTitle('');
                setContent('');
                setFileUrl('');
            } else {
                toast.error("Failed to upload note.");
            }
        } catch (error) {
            console.error(error);
            toast.error("An error occurred.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b px-6 py-4 flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    <button onClick={handleBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-gray-800">Upload Lesson Note</h1>
                        <p className="text-sm text-gray-500">Submit weekly notes for approval</p>
                    </div>
                </div>
            </div>

            <main className="flex-1 overflow-y-auto p-6">
                <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <form onSubmit={handleSubmit} className="space-y-6">

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Term</label>
                                <select value={term} onChange={e => setTerm(e.target.value)} className="w-full p-2 border rounded-lg">
                                    <option>First Term</option>
                                    <option>Second Term</option>
                                    <option>Third Term</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Week</label>
                                <input type="number" min="1" max="13" value={week} onChange={e => setWeek(parseInt(e.target.value))} className="w-full p-2 border rounded-lg" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                                <select value={selectedSubjectId} onChange={e => setSelectedSubjectId(e.target.value)} className="w-full p-2 border rounded-lg">
                                    <option value="">Select Subject</option>
                                    {subjects.map(s => (
                                        <option key={s.id} value={s.id}>{s.name} ({s.gradeLevel || 'Gen'})</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
                                <select value={selectedClassId} onChange={e => setSelectedClassId(e.target.value)} className="w-full p-2 border rounded-lg">
                                    <option value="">Select Class</option>
                                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Note Title</label>
                            <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., Introduction to Photosynthesis" className="w-full p-2 border rounded-lg" />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Content / Summary</label>
                            <textarea rows={5} value={content} onChange={e => setContent(e.target.value)} placeholder="Brief summary of the lesson..." className="w-full p-2 border rounded-lg"></textarea>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Attachment (Optional URL)</label>
                            <div className="flex items-center gap-2">
                                <UploadIcon className="w-5 h-5 text-gray-400" />
                                <input type="text" value={fileUrl} onChange={e => setFileUrl(e.target.value)} placeholder="https://..." className="w-full p-2 border rounded-lg" />
                            </div>
                            <p className="text-xs text-gray-400 mt-1">Paste a link to your Google Drive or Drop box file.</p>
                        </div>

                        <div className="pt-4 border-t">
                            <button type="submit" disabled={isSubmitting} className="w-full bg-indigo-600 text-white font-semibold py-2 rounded-lg hover:bg-indigo-700 disabled:bg-gray-400">
                                {isSubmitting ? 'Uploading...' : 'Submit Lesson Note'}
                            </button>
                        </div>

                    </form>
                </div>
            </main>
        </div>
    );
};

export default LessonNotesUploadScreen;
