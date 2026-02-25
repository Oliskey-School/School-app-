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
  getFormattedClassName,
} from '../../constants';
import { ClassInfo, Assignment } from '../../types';
import { supabase } from '../../lib/supabase';
import api from '../../lib/api';
import { useTeacherClasses } from '../../hooks/useTeacherClasses';
import { useProfile } from '../../context/ProfileContext';

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
  onAssignmentAdded?: (newAssignment: Omit<Assignment, 'id'>) => void;
  handleBack: () => void;
}

const CreateAssignmentScreen: React.FC<CreateAssignmentScreenProps> = ({ classInfo, onAssignmentAdded, handleBack }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [selectedClassId, setSelectedClassId] = useState(classInfo?.id || '');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [loading, setLoading] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const { classes: availableClasses, subjects: dbSubjects, assignments: rawAssignments, loading: dataLoading, teacherId: resolvedTeacherId } = useTeacherClasses();
  const { user, currentSchool } = useAuth();
  const { profile } = useProfile();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Derive subjects filtered by selected class
  const teacherSubjects = useMemo(() => {
    if (!selectedClassId) return dbSubjects;
    if (rawAssignments.length > 0) {
      // rawAssignments is Array<{ classId, subjectId }>
      const classSubjectIds = rawAssignments
        .filter(a => a.classId === selectedClassId)
        .map(a => a.subjectId);
      if (classSubjectIds.length > 0) {
        return dbSubjects.filter(sub => classSubjectIds.includes(sub.id));
      }
    }
    return dbSubjects;
  }, [selectedClassId, dbSubjects, rawAssignments]);

  useEffect(() => {
    if (classInfo?.id && !selectedClassId) {
      setSelectedClassId(classInfo.id);
    }
    if (classInfo?.subject && dbSubjects.length > 0 && !selectedSubjectId) {
      const matchedSub = dbSubjects.find(s => s.name === classInfo.subject);
      if (matchedSub) {
        setSelectedSubjectId(matchedSub.id);
      }
    }
  }, [classInfo, dbSubjects]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) setAttachedFiles(prev => [...prev, ...Array.from(event.target.files!)]);
  };

  const handleRemoveFile = (file: File) => setAttachedFiles(prev => prev.filter(f => f !== file));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description || !dueDate || !selectedClassId || !selectedSubjectId) {
      toast.error("Please fill all required fields.");
      return;
    }

    const targetClass = availableClasses.find(c => c.id === selectedClassId);
    const targetSubject = dbSubjects.find(s => s.id === selectedSubjectId);

    const activeTeacherId = resolvedTeacherId;

    if (!activeTeacherId) {
      toast.error("Could not resolve Teacher ID.");
      return;
    }

    setLoading(true);
    try {
      // 1. Upload files if any
      const fileUrls: string[] = [];
      for (const file of attachedFiles) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${activeTeacherId}/${fileName}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('assignments')
          .upload(filePath, file);

        if (uploadError) {
          console.error('Error uploading file:', uploadError);
          // If bucket doesn't exist, we might get an error. Continuing without files or showing error.
          // For now, let's just log and continue, or we could throw.
          continue;
        }

        if (uploadData) {
          const { data: { publicUrl } } = supabase.storage
            .from('assignments')
            .getPublicUrl(filePath);
          fileUrls.push(publicUrl);
        }
      }

      const dbPayload = {
        title,
        description,
        content_summary: description.substring(0, 200),
        class_name: targetClass?.name || 'Unknown',
        subject: targetSubject?.name || 'Unknown',
        due_date: new Date(dueDate).toISOString(),
        due_at: new Date(dueDate).toISOString(), // Added for compatibility
        total_students: targetClass?.studentCount || 0,
        submissions_count: 0,
        teacher_id: activeTeacherId,
        school_id: currentSchool?.id || profile?.schoolId,
        class_id: selectedClassId,
        subject_id: selectedSubjectId,
        branch_id: targetClass?.branch_id || profile?.branchId,
        attachment_url: fileUrls[0] || null,
        attachments: attachedFiles.map((file, index) => ({
          file_name: file.name,
          file_url: fileUrls[index],
          file_type: file.type,
          file_size: file.size
        })),
        status: 'published',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (!dbPayload.school_id) {
        toast.error("School context missing. Please re-login.");
        return;
      }

      await api.createAssignment(dbPayload);

      if (onAssignmentAdded) {
        onAssignmentAdded({
          title,
          description,
          className: dbPayload.class_name,
          subject: dbPayload.subject,
          dueDate: dbPayload.due_date,
          totalStudents: dbPayload.total_students,
          submissionsCount: 0
        });
      }
      toast.success("Assignment published!");
      handleBack();
    } catch (err) {
      console.error('Submit error:', err);
      toast.error("Failed to publish assignment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <form onSubmit={handleSubmit} className="flex-grow flex flex-col">
        <main className="flex-grow p-4 overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 bg-white p-4 rounded-xl shadow-sm space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)} required className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={12} required className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg" />
              </div>
            </div>
            <div className="lg:col-span-1 space-y-5">
              <div className="bg-white p-4 rounded-xl shadow-sm space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
                  <select
                    value={selectedClassId}
                    onChange={e => {
                      const classId = e.target.value;
                      setSelectedClassId(classId);
                      // Auto-select subject if mapping exists
                      const mapping = rawAssignments.find(a => a.classId === classId);
                      if (mapping) {
                        setSelectedSubjectId(mapping.subjectId);
                      }
                    }}
                    required
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg"
                  >
                    <option value="">Select class</option>
                    {availableClasses.map(c => (
                      <option key={`${c.id}-${c.subject}`} value={c.id}>
                        {getFormattedClassName(c.grade, c.section)} - {c.subject}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                  <select value={selectedSubjectId} onChange={e => setSelectedSubjectId(e.target.value)} required className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg">
                    <option value="">Select subject</option>
                    {teacherSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                  <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} required className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg" />
                </div>
              </div>
              <div className="bg-white p-4 rounded-xl shadow-sm space-y-4">
                <label className="block text-sm font-medium text-gray-700">Attachments</label>
                <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors">
                  Attach Files
                </button>
                {attachedFiles.length > 0 && (
                  <div className="space-y-2">
                    {attachedFiles.map((file, i) => (
                      <div key={i} className="flex items-center p-2 bg-gray-50 rounded-lg text-sm">
                        {getFileIcon(file.name)}
                        <span className="ml-2 truncate">{file.name}</span>
                        <button type="button" onClick={() => handleRemoveFile(file)} className="ml-auto text-red-500 p-1">×</button>
                      </div>
                    ))}
                  </div>
                )}
                <input type="file" multiple ref={fileInputRef} onChange={handleFileChange} className="hidden" />
              </div>
            </div>
          </div>
        </main>
        <div className="p-4 bg-white border-t">
          <button type="submit" disabled={loading} className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors">
            {loading ? 'Processing...' : 'Create Assignment'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateAssignmentScreen;