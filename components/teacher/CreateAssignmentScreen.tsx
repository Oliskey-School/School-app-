import React, { useState, useRef, useEffect, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import {
  PaperclipIcon,
  CalendarIcon,
  XCircleIcon,
  FileDocIcon,
  FilePdfIcon,
  FileImageIcon,
  DocumentTextIcon,
} from '../../constants';
// import { mockClasses, mockTeachers } from '../../data';
import { ClassInfo, Assignment } from '../../types';
import { SUBJECTS_LIST } from '../../constants';
import { supabase } from '../../lib/supabase';

const getFileIcon = (fileName: string): React.ReactElement => {
  const extension = fileName.split('.').pop()?.toLowerCase();
  if (extension === 'pdf') return <FilePdfIcon className="text-red-500 w-8 h-8" />;
  if (extension === 'doc' || extension === 'docx') return <FileDocIcon className="text-blue-500 w-8 h-8" />;
  if (['jpg', 'jpeg', 'png', 'gif'].includes(extension || '')) return <FileImageIcon className="text-green-500 w-8 h-8" />;
  return <DocumentTextIcon className="text-gray-500 w-8 h-8" />;
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

interface CreateAssignmentScreenProps {
  classInfo?: ClassInfo;
  onAssignmentAdded: (newAssignment: Omit<Assignment, 'id'>) => void;
  handleBack: () => void;
}

const CreateAssignmentScreen: React.FC<CreateAssignmentScreenProps> = ({ classInfo, onAssignmentAdded, handleBack }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [selectedClassId, setSelectedClassId] = useState(classInfo?.id || '');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [availableClasses, setAvailableClasses] = useState<any[]>([]);
  const [rawAssignments, setRawAssignments] = useState<any[]>([]); // To store UUIDs for insertion
  const { user, currentSchool } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [teacherProfileId, setTeacherProfileId] = useState<string | null>(null);

  // const teacher = useMemo(() => mockTeachers.find(t => t.id === LOGGED_IN_TEACHER_ID)!, []);
  // const teacherSubjects = useMemo(() => SUBJECTS_LIST.filter(s => teacher.subjects.includes(s.name)), [teacher]);
  const [dbSubjects, setDbSubjects] = useState<any[]>([]);
  // STRICT: Only show subjects from DB. If empty, show empty.
  const teacherSubjects = dbSubjects;

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

  useEffect(() => {
    const fetchClassesAndSubjects = async () => {
      // Dynamic import
      const { fetchSubjects } = await import('../../lib/database');
      const { getGradeDisplayName } = await import('../../lib/schoolSystem');

      if (!user?.id) return;

      try {
        // STRICT: First get ALL teacher profile IDs linked to the auth user ID
        const { data: teacherProfiles, error: profileError } = await supabase
          .from('teachers')
          .select('id, school_id')
          .eq('user_id', user.id);

        if (profileError || !teacherProfiles || teacherProfiles.length === 0) {
          console.error("Teacher profile not found for user:", user.id);
          setAvailableClasses([]);
          setDbSubjects([]);
          return;
        }

        let activeTeacherId: string | undefined;
        let activeSchoolId = currentSchool?.id;

        // If no teacherId passed, resolve manually (Fallback)
        if (!activeTeacherId && user?.id) {
          let targetProfile = teacherProfiles.find(t => t.school_id === activeSchoolId);
          if (!targetProfile) targetProfile = teacherProfiles[0];

          activeTeacherId = targetProfile.id;
          if (!activeSchoolId) activeSchoolId = targetProfile.school_id;
        }

        if (!activeTeacherId) return;

        // Store for creation payload
        setTeacherProfileId(activeTeacherId);

        // 1. Use the strict teacher.id(s) to fetch assignments from modern table
        const { data: teacherClassesData, error: teacherClassesError } = await supabase
          .from('class_teachers')
          .select(`
            teacher_id,
            school_id,
            class_id,
            subject_id,
            classes (
              id,
              grade,
              section,
              branch_id
            ),
            subjects (
              id,
              name
            )
          `)
          .eq('teacher_id', activeTeacherId);

        const finalClasses: any[] = [];
        const addedClassKeys = new Set<string>();
        const finalSubjects: any[] = [];
        const addedSubjectKeys = new Set<string>();

        if (teacherClassesData && teacherClassesData.length > 0) {
          setRawAssignments(teacherClassesData);

          teacherClassesData.forEach((item: any) => {
            const c = item.classes;
            if (c) {
              const key = c.id;
              if (!addedClassKeys.has(key)) {
                finalClasses.push({
                  ...c,
                  displayName: `${getGradeDisplayName(c.grade)}${c.section ? ' ' + c.section : ''}`
                });
                addedClassKeys.add(key);
              }
            }

            const s = item.subjects;
            if (s) {
              const key = s.id;
              if (!addedSubjectKeys.has(key)) {
                finalSubjects.push(s);
                addedSubjectKeys.add(key);
              }
            }
          });
        }

        // 2. Fetch assignments via legacy teacher_classes if schoolId is available
        const { data: legacyAssignments } = await supabase
          .from('teacher_classes')
          .select('class_name')
          .eq('teacher_id', activeTeacherId);

        if (legacyAssignments && legacyAssignments.length > 0 && activeSchoolId) {
          // Fetch all classes for this school to match against
          const { data: allClasses } = await supabase
            .from('classes')
            .select('id, grade, section, branch_id')
            .eq('school_id', activeSchoolId);

          if (allClasses) {
            const normalize = (s: string) => s.replace(/Grade|Year|JSS|SSS|SS|\s/gi, '').toUpperCase();

            legacyAssignments.forEach((legacy: any) => {
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
                    ...match,
                    displayName: `${getGradeDisplayName(match.grade)}${match.section ? ' ' + match.section : ''}`
                  });
                  addedClassKeys.add(key);
                }
              });
            });
          }
        }

        // 3. Fetch subjects via legacy teacher_subjects if schoolId is available
        if (activeSchoolId) {
          const { data: legacyTeacherSubjects } = await supabase
            .from('teacher_subjects')
            .select('subject')
            .eq('teacher_id', activeTeacherId);

          if (legacyTeacherSubjects && legacyTeacherSubjects.length > 0) {
            const { data: schoolSubjects } = await supabase
              .from('subjects')
              .select('id, name')
              .eq('school_id', activeSchoolId)
              .eq('is_active', true);

            if (schoolSubjects) {
              const normalize = (s: string) => s.toLowerCase().replace(/\s/g, '');
              legacyTeacherSubjects.forEach((legacy: any) => {
                const name = legacy.subject;
                if (!name) return;

                const match = schoolSubjects.find(s => normalize(s.name) === normalize(name));
                if (match && !addedSubjectKeys.has(match.id)) {
                  finalSubjects.push(match);
                  addedSubjectKeys.add(match.id);
                }
              });
            }
          }
        }

        setDbSubjects(finalSubjects);
        setAvailableClasses(finalClasses);

        if (finalClasses.length === 0) {
          toast('No classes assigned to this account.', { icon: 'ℹ️' });
        }

        if (finalSubjects.length === 0) {
          toast('No subjects assigned to this account.', { icon: 'ℹ️' });
        }

        // Auto-select subject if possible
        if (classInfo?.subject) {
          const matchedSub = finalSubjects.find(s => s.name === classInfo.subject);
          if (matchedSub) setSelectedSubjectId(matchedSub.id);
        }

      } catch (err) {
        console.error("Error fetching teacher assignments:", err);
      }
    };
    fetchClassesAndSubjects();
  }, [user?.id, currentSchool?.id]);



  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setAttachedFiles(prevFiles => [...prevFiles, ...Array.from(event.target.files!)]);
    }
  };

  const handleRemoveFile = (fileToRemove: File) => {
    setAttachedFiles(prevFiles => prevFiles.filter(file => file !== fileToRemove));
  };

  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description || !dueDate || !selectedClassId || !selectedSubjectId) {
      toast.error("Please fill out all required fields.");
      return;
    }

    const targetClass = availableClasses.find(c => c.id === selectedClassId);
    const targetSubject = dbSubjects.find(s => s.id === selectedSubjectId);

    const targetNode = rawAssignments.find(item =>
      item.class_id === selectedClassId && item.subject_id === selectedSubjectId
    );

    const totalStudentsCount = 25; // Default fallback

    // Ensure we have a valid teacher ID (Row ID)
    const activeTeacherId = targetNode?.teacher_id || teacherProfileId;
    if (!activeTeacherId) {
      toast.error("Could not resolve Teacher ID. Please check your profile.");
      return;
    }

    // Prepare payload for Database (Snake Case for columns)
    const dbPayload: any = {
      title,
      description,
      content_summary: description, // REQUIRED column
      class_name: targetClass?.displayName || 'Unknown Class',
      subject: targetSubject?.name || 'Unknown Subject',
      due_date: new Date(dueDate).toISOString(),
      total_students: totalStudentsCount,
      submissions_count: 0,
      teacher_id: activeTeacherId,
      school_id: targetNode?.school_id || classInfo?.schoolId || currentSchool?.id,
      class_id: selectedClassId,
      subject_id: selectedSubjectId,
      branch_id: targetClass?.branch_id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (!dbPayload.school_id) {
      toast.error("School ID is missing. Please refresh or contact support.");
      return;
    }

    try {
      // 1. Save to Supabase
      const { data, error } = await supabase
        .from('assignments')
        .insert([dbPayload])
        .select();

      if (error) {
        throw error;
      }

      // 2. Update Local State (Camel Case for frontend)
      const newAssignmentData = {
        title,
        description,
        className: targetClass?.displayName || 'Unknown Class',
        subject: targetSubject?.name || 'Unknown Subject',
        dueDate: new Date(dueDate).toISOString(),
        totalStudents: totalStudentsCount,
        submissionsCount: 0,
      };

      onAssignmentAdded(newAssignmentData);

    } catch (err: any) {
      console.error('Error saving assignment:', err);
      // Fallback for demo purposes if table is missing, still update UI but warn
      if (err?.message?.includes('relation "assignments" does not exist')) {
        toast.error("Database table 'assignments' not found. Creating locally only.");
        const newAssignmentData = {
          title,
          description,
          className: targetClass?.displayName || 'Unknown Class',
          subject: targetSubject?.name || 'Unknown Subject',
          dueDate: new Date(dueDate).toISOString(),
          totalStudents: totalStudentsCount,
          submissionsCount: 0,
        };
        onAssignmentAdded(newAssignmentData);
      } else {
        toast.error("Failed to publish assignment: " + (err.message || "Unknown error"));
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <form onSubmit={handleSubmit} className="flex-grow flex flex-col">
        <main className="flex-grow p-4 overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Main Details */}
            <div className="lg:col-span-2 bg-white p-4 rounded-xl shadow-sm space-y-4">
              <div>
                <label htmlFor="assignment-title" className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input id="assignment-title" type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., Photosynthesis Essay" required className="w-full px-3 py-2 text-gray-700 bg-gray-50 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500" />
              </div>
              <div>
                <label htmlFor="assignment-description" className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea id="assignment-description" value={description} onChange={e => setDescription(e.target.value)} rows={12} placeholder="Provide instructions for the assignment..." required className="w-full px-3 py-2 text-gray-700 bg-gray-50 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500" />
              </div>
            </div>

            <div className="lg:col-span-1 space-y-5">
              {/* Settings */}
              <div className="bg-white p-4 rounded-xl shadow-sm space-y-4">
                <div>
                  <label htmlFor="assignment-class" className="block text-sm font-medium text-gray-700 mb-1">Class</label>
                  <select id="assignment-class" value={selectedClassId} onChange={e => setSelectedClassId(e.target.value)} required className="w-full px-3 py-2 text-gray-700 bg-gray-50 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500">
                    <option value="" disabled>Select a class</option>
                    {availableClasses.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.displayName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                  <select id="subject" value={selectedSubjectId} onChange={e => setSelectedSubjectId(e.target.value)} required className="w-full px-3 py-2 text-gray-700 bg-gray-50 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500">
                    <option value="" disabled>Select subject...</option>
                    {teacherSubjects.length > 0 ? (
                      teacherSubjects.map(sub => <option key={sub.id} value={sub.id}>{sub.name}</option>)
                    ) : (
                      <option value="" disabled>No subjects assigned</option>
                    )}
                  </select>
                </div>
                <div>
                  <label htmlFor="due-date" className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                  <div className="relative">
                    <input id="due-date" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} required className="w-full pl-3 pr-10 py-2 text-gray-700 bg-gray-50 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500" />
                    <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <CalendarIcon className="h-5 w-5 text-gray-400" />
                    </span>
                  </div>
                </div>
              </div>

              {/* Attachments */}
              <div className="bg-white p-4 rounded-xl shadow-sm space-y-4">
                <label className="block text-sm font-medium text-gray-700">Attachments</label>
                <input type="file" multiple ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                <button type="button" onClick={handleAttachClick} className="w-full flex items-center justify-center space-x-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:bg-gray-100 hover:border-purple-400 hover:text-purple-600 transition-colors">
                  <PaperclipIcon className="h-5 w-5" />
                  <span className="font-semibold">Attach Files</span>
                </button>
                {attachedFiles.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <h4 className="text-xs font-semibold text-gray-500">Attached Files:</h4>
                    {attachedFiles.map((file, index) => (
                      <div key={index} className="flex items-center p-2 bg-gray-50 rounded-lg">
                        {getFileIcon(file.name)}
                        <div className="ml-3 flex-grow overflow-hidden">
                          <p className="text-sm font-medium text-gray-800 truncate">{file.name}</p>
                          <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                        </div>
                        <button type="button" onClick={() => handleRemoveFile(file)} className="ml-2 p-1 text-gray-400 hover:text-red-500" aria-label={`Remove ${file.name}`}>
                          <XCircleIcon className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
        <div className="p-4 mt-auto bg-white border-t border-gray-200">
          <button type="submit" className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500">
            Create Assignment
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateAssignmentScreen;