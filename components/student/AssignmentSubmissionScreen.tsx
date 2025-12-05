
import React, { useState, useRef } from 'react';
import { StudentAssignment, Submission } from '../../types';
import { SUBJECT_COLORS, ClockIcon, PaperclipIcon, XCircleIcon, FileDocIcon, FilePdfIcon, FileImageIcon, DocumentTextIcon } from '../../constants';
// FIX: Imported mockAssignments to allow updating the global state for the demo.
import { mockSubmissions, mockAssignments } from '../../data';

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

interface AssignmentSubmissionScreenProps {
  assignment: StudentAssignment;
  handleBack: () => void;
  forceUpdate: () => void;
  studentId: number;
}

const AssignmentSubmissionScreen: React.FC<AssignmentSubmissionScreenProps> = ({ assignment, handleBack, forceUpdate, studentId }) => {
  const [textAnswer, setTextAnswer] = useState(assignment.submission?.textSubmission || '');
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const subjectColor = SUBJECT_COLORS[assignment.subject] || 'bg-gray-100 text-gray-800';
  const isSubmitted = !!assignment.submission;

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textAnswer && attachedFiles.length === 0) {
      alert("Please provide an answer or attach a file.");
      return;
    }
    
    const existingSubmissionIndex = mockSubmissions.findIndex(s => s.assignmentId === assignment.id && s.student.id === studentId);

    const submissionData = {
        student: { id: 4, name: 'Fatima Bello', avatarUrl: 'https://i.pravatar.cc/150?u=fatima' }, // Assuming student ID 4 is logged in
        submittedAt: new Date().toISOString(),
        isLate: new Date() > new Date(assignment.dueDate),
        status: 'Ungraded' as 'Ungraded',
        textSubmission: textAnswer,
        files: attachedFiles.map(f => ({ name: f.name, size: f.size }))
    };

    if (existingSubmissionIndex > -1) {
        mockSubmissions[existingSubmissionIndex] = {
            ...mockSubmissions[existingSubmissionIndex],
            ...submissionData,
        };
    } else {
        const newSubmission: Submission = {
            id: Date.now(),
            assignmentId: assignment.id,
            ...submissionData
        };
        mockSubmissions.push(newSubmission);
        
        // Also update the submission count on the assignment
        const assignmentIndex = mockAssignments.findIndex(a => a.id === assignment.id);
        if (assignmentIndex > -1) {
            mockAssignments[assignmentIndex].submissionsCount++;
        }
    }

    alert("Assignment submitted successfully!");
    forceUpdate();
    handleBack();
  };
  
  return (
    <div className="flex flex-col h-full bg-gray-50">
      <form onSubmit={handleSubmit} className="flex-grow flex flex-col">
        <main className="flex-grow p-4 space-y-4 overflow-y-auto">
          {/* Assignment Details */}
          <div className="bg-white p-4 rounded-xl shadow-sm">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-bold text-xl text-gray-800 pr-2 flex-1">{assignment.title}</h3>
              <span className={`px-2.5 py-1 text-xs font-semibold rounded-full flex-shrink-0 ${subjectColor}`}>
                {assignment.subject}
              </span>
            </div>
            <div className="flex items-center text-sm text-gray-500">
              <ClockIcon className="w-4 h-4 mr-1.5" />
              <span>Due: {new Date(assignment.dueDate).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Answer Textbox */}
            <div className="bg-white p-4 rounded-xl shadow-sm">
                <label htmlFor="text-answer" className="block text-md font-bold text-gray-700 mb-2">Your Answer</label>
                <textarea
                id="text-answer"
                value={textAnswer}
                onChange={e => setTextAnswer(e.target.value)}
                rows={12}
                placeholder="Type your answer here..."
                className="w-full h-full px-3 py-2 text-gray-700 bg-gray-50 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
                disabled={isSubmitted}
                />
            </div>
            
            {/* File Attachments */}
            <div className="bg-white p-4 rounded-xl shadow-sm">
                <h3 className="block text-md font-bold text-gray-700 mb-2">Attachments</h3>
                <input type="file" multiple ref={fileInputRef} onChange={handleFileChange} className="hidden" disabled={isSubmitted} />
                {!isSubmitted && (
                    <button type="button" onClick={handleAttachClick} className="w-full flex items-center justify-center space-x-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:bg-gray-100 hover:border-orange-400 hover:text-orange-600 transition-colors">
                        <PaperclipIcon className="h-5 w-5" />
                        <span className="font-semibold">Attach Files</span>
                    </button>
                )}
                
                {(attachedFiles.length > 0 || (isSubmitted && assignment.submission?.files)) && (
                    <div className="space-y-2 pt-3 max-h-96 overflow-y-auto">
                        <h4 className="text-xs font-semibold text-gray-500">Attached Files:</h4>
                        {assignment.submission?.files?.map((file, index) => (
                            <div key={index} className="flex items-center p-2 bg-gray-100 rounded-lg">
                            {getFileIcon(file.name)}
                            <div className="ml-3 flex-grow overflow-hidden">
                                <p className="text-sm font-medium text-gray-800 truncate">{file.name}</p>
                                <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                            </div>
                            </div>
                        ))}
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
        </main>
        
        {!isSubmitted && (
            <div className="p-4 mt-auto bg-white border-t border-gray-200">
              <button type="submit" className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm font-medium text-white bg-orange-500 hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500">
                Submit Assignment
              </button>
            </div>
        )}
      </form>
    </div>
  );
};

export default AssignmentSubmissionScreen;