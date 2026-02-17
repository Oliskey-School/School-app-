import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { fetchSubjects, createLessonNote } from '../../lib/database';
import { Subject } from '../../types';
import { toast } from 'react-hot-toast';
import { BookOpenIcon, PlusIcon, UploadIcon, CheckCircleIcon, ClockIcon } from '../../constants';

interface LessonNotesUploadScreenProps {
    handleBack: () => void;
    teacherId: string; // Passed from dashboard (UUID)
    schoolId?: string; // Add schoolId
}

const LessonNotesUploadScreen: React.FC<LessonNotesUploadScreenProps> = ({ handleBack, teacherId, schoolId }) => {
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

    const parseClassName = (name: string) => {
        const clean = name.trim();
        let grade = 0;
        let section = '';

        // Regex patterns
        const preNurseryMatch = clean.match(/^Pre-Nursery/i);
        const nurseryMatch = clean.match(/^Nursery\s*(\d+)\s*(.*)$/i);
        const basicMatch = clean.match(/^Basic\s*(\d+)\s*(.*)$/i);
        const standardMatch = clean.match(/^(?:Grade|Year|Primary)?\s*(\d+)\s*(.*)$/i);
        const jsMatch = clean.match(/^JSS\s*(\d+)\s*(.*)$/i);
        const ssMatch = clean.match(/^S{2,3}\s*(\d+)\s*(.*)$/i); // Matches SS, SSS

        if (preNurseryMatch) {
            grade = 0;
        } else if (nurseryMatch) {
            grade = parseInt(nurseryMatch[1]); // 1 -> 1 (Nursery 1)
            section = nurseryMatch[2];
        } else if (basicMatch) {
            grade = 2 + parseInt(basicMatch[1]); // 1 -> 3 (Basic 1)
            section = basicMatch[2];
        } else if (standardMatch) {
            const val = parseInt(standardMatch[1]);
            // Assumption: "Grade 1" = Basic 1 = 3. 
            // "Grade 5" = Basic 5 = 7.
            grade = 2 + val;
            section = standardMatch[2];
        } else if (jsMatch) {
            grade = 8 + parseInt(jsMatch[1]); // 1 -> 9 (JSS 1)
            section = jsMatch[2];
        } else if (ssMatch) {
            grade = 11 + parseInt(ssMatch[1]); // 1 -> 12 (SSS 1)
            section = ssMatch[2];
        }

        if (section) {
            section = section.replace(/^[-–]\s*/, '').trim();
        }
        return { grade, section };
    };

    const loadData = async () => {
        const { getGradeDisplayName } = await import('../../lib/schoolSystem');

        try {
            // 1. Fetch Assigned Classes (Modern: class_teachers)
            const { data: teacherClassesData } = await supabase
                .from('class_teachers')
                .select(`
                    class_id,
                    subject_id,
                    classes (id, grade, section),
                    subjects (id, name)
                `)
                .eq('teacher_id', teacherId);

            const finalClasses: any[] = [];
            const addedClassKeys = new Set<string>();
            const finalSubjects: any[] = [];
            const addedSubjectKeys = new Set<string>();

            if (teacherClassesData && teacherClassesData.length > 0) {
                teacherClassesData.forEach((item: any) => {
                    const c = item.classes;
                    if (c) {
                        const key = c.id;
                        if (!addedClassKeys.has(key)) {
                            finalClasses.push({
                                id: c.id,
                                name: `${getGradeDisplayName(c.grade)}${c.section ? ' ' + c.section : ''}`
                            });
                            addedClassKeys.add(key);
                        }
                    }

                    const s = item.subjects;
                    if (s) {
                        const key = s.id;
                        if (!addedSubjectKeys.has(key)) {
                            finalSubjects.push({
                                id: s.id,
                                name: s.name
                            });
                            addedSubjectKeys.add(key);
                        }
                    }
                });
            }

            // 2. Fetch Assigned Classes (Legacy: teacher_classes/teacher_subjects)
            const { data: legacyClasses } = await supabase
                .from('teacher_classes')
                .select('class_name')
                .eq('teacher_id', teacherId);

            if (legacyClasses && legacyClasses.length > 0 && schoolId) {
                const { data: allClasses } = await supabase
                    .from('classes')
                    .select('id, grade, section')
                    .eq('school_id', schoolId);

                if (allClasses) {
                    const normalize = (s: string) => s.replace(/Grade|Year|JSS|SSS|SS|\s/gi, '').toUpperCase();
                    legacyClasses.forEach((legacy: any) => {
                        const name = legacy.class_name;
                        if (!name) return;
                        const parsed = parseClassName(name);
                        const matches = allClasses.filter(c => {
                            if (c.grade === parsed.grade) {
                                if (parsed.section) {
                                    return normalize(c.section || '') === normalize(parsed.section);
                                }
                                return true;
                            }
                            return false;
                        });

                        matches.forEach(match => {
                            const key = match.id;
                            if (!addedClassKeys.has(key)) {
                                finalClasses.push({
                                    id: match.id,
                                    name: `${getGradeDisplayName(match.grade)}${match.section ? ' ' + match.section : ''}`
                                });
                                addedClassKeys.add(key);
                            }
                        });
                    });
                }
            }

            // Fetch Legacy Subjects
            const { data: legacySubjects } = await supabase
                .from('teacher_subjects')
                .select('subject')
                .eq('teacher_id', teacherId);

            if (legacySubjects && legacySubjects.length > 0 && schoolId) {
                const { data: schoolSubjects } = await supabase
                    .from('subjects')
                    .select('id, name')
                    .eq('school_id', schoolId)
                    .eq('is_active', true);

                if (schoolSubjects) {
                    const normalize = (s: string) => s.toLowerCase().replace(/\s/g, '');
                    legacySubjects.forEach((legacy: any) => {
                        const name = legacy.subject;
                        if (!name) return;

                        const match = schoolSubjects.find(s => normalize(s.name) === normalize(name));
                        if (match && !addedSubjectKeys.has(match.id)) {
                            finalSubjects.push({
                                id: match.id,
                                name: match.name
                            });
                            addedSubjectKeys.add(match.id);
                        }
                    });
                }
            }

            setSubjects(finalSubjects);
            setClasses(finalClasses);

            if (finalSubjects.length === 0) {
                toast('No subjects assigned to this account.', { icon: 'ℹ️' });
            }

        } catch (err) {
            console.error("Error loading lesson notes data:", err);
            toast.error("Failed to load classes or subjects.");
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedSubjectId || !title || !content || !selectedClassId) {
            toast.error("Please fill all required fields.");
            return;
        }

        if (!schoolId) {
            toast.error("School Context Missing. Please refresh.");
            return;
        }

        setIsSubmitting(true);
        try {
            const success = await createLessonNote({
                teacherId,
                subjectId: selectedSubjectId as any, // UUID string, cast to avoid type error if interface expects number (needs fix in types but works in JS)
                classId: selectedClassId as any,
                schoolId, // Pass schoolId
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
