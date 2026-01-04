import React, { useState, useRef, useEffect, useMemo } from 'react';
import { toast } from 'react-hot-toast';
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
  const [selectedClass, setSelectedClass] = useState(classInfo ? `Grade ${classInfo.grade}${classInfo.section}` : '');
  const [subject, setSubject] = useState(classInfo?.subject || '');
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [availableClasses, setAvailableClasses] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // const teacher = useMemo(() => mockTeachers.find(t => t.id === LOGGED_IN_TEACHER_ID)!, []);
  // const teacherSubjects = useMemo(() => SUBJECTS_LIST.filter(s => teacher.subjects.includes(s.name)), [teacher]);
  const teacherSubjects = SUBJECTS_LIST; // DEMO: Show all subjects

  useEffect(() => {
    const fetchClasses = async () => {
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .order('grade', { ascending: true })
        .order('section', { ascending: true });

      if (data) {
        setAvailableClasses(data);
      }
    };
    fetchClasses();
  }, []);


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
    if (!title || !description || !dueDate || !selectedClass || !subject) {
      toast.error("Please fill out all required fields.");
      return;
    }

    const targetClass = availableClasses.find(c => `Grade ${c.grade}${c.section}` === selectedClass);
    const totalStudents = targetClass ? targetClass.student_count : 0;

    // Prepare payload for Database (Snake Case for columns)
    const dbPayload = {
      title,
      description,
      class_name: selectedClass,
      subject,
      due_date: new Date(dueDate).toISOString(),
      total_students: totalStudents || 25,
      submissions_count: 0,
      // teacher_id: 2 // TEMPORARY: Commented out to prevent schema error until DB is updated
    };

    try {
      // 1. Save to Supabase
      const { data, error } = await supabase
        .from('assignments')
        .insert([dbPayload])
        .select();

      if (error) {
        throw error;
      }

      console.log('Assignment saved:', data);

      // 2. Update Local State (Camel Case for frontend)
      const newAssignmentData = {
        title,
        description,
        className: selectedClass,
        subject,
        dueDate: new Date(dueDate).toISOString(),
        totalStudents: totalStudents || 25,
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
          className: selectedClass,
          subject,
          dueDate: new Date(dueDate).toISOString(),
          totalStudents: totalStudents || 25,
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
                  <select id="assignment-class" value={selectedClass} onChange={e => setSelectedClass(e.target.value)} required className="w-full px-3 py-2 text-gray-700 bg-gray-50 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500">
                    <option value="" disabled>Select a class</option>
                    {availableClasses.map(c => (
                      <option key={c.id} value={`Grade ${c.grade}${c.section}`}>
                        Grade {c.grade}{c.section}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                  <select id="subject" value={subject} onChange={e => setSubject(e.target.value)} required className="w-full px-3 py-2 text-gray-700 bg-gray-50 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500">
                    <option value="" disabled>Select subject...</option>
                    {teacherSubjects.map(sub => <option key={sub.id} value={sub.name}>{sub.name}</option>)}
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