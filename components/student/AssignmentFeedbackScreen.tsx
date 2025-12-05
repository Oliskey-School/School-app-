
import React from 'react';
import { StudentAssignment } from '../../types';
import { SUBJECT_COLORS, DocumentTextIcon, PaperclipIcon } from '../../constants';
import { FileDocIcon, FilePdfIcon, FileImageIcon } from '../../constants';

const getFileIcon = (fileName: string): React.ReactElement => {
  const extension = fileName.split('.').pop()?.toLowerCase();
  if (extension === 'pdf') return <FilePdfIcon className="text-red-500 w-6 h-6" />;
  if (extension === 'doc' || extension === 'docx') return <FileDocIcon className="text-blue-500 w-6 h-6" />;
  if (['jpg', 'jpeg', 'png', 'gif'].includes(extension || '')) return <FileImageIcon className="text-green-500 w-6 h-6" />;
  return <DocumentTextIcon className="text-gray-500 w-6 h-6" />;
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

interface AssignmentFeedbackScreenProps {
  assignment: StudentAssignment;
}

const AssignmentFeedbackScreen: React.FC<AssignmentFeedbackScreenProps> = ({ assignment }) => {
  const subjectColor = SUBJECT_COLORS[assignment.subject] || 'bg-gray-100 text-gray-800';
  const submission = assignment.submission;

  if (!submission || submission.status !== 'Graded') {
    return (
      <div className="p-4 text-center">
        <p>This assignment has not been graded yet.</p>
      </div>
    );
  }

  const getGradeColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 75) return 'text-sky-600';
    if (score >= 60) return 'text-amber-600';
    return 'text-red-600';
  };

  const gradeColor = getGradeColor(submission.grade || 0);

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <main className="flex-grow p-4 space-y-4 overflow-y-auto">
        {/* Assignment Header */}
        <div className="bg-white p-4 rounded-xl shadow-sm">
            <div className="flex justify-between items-start mb-1">
              <h3 className="font-bold text-xl text-gray-800 pr-2 flex-1">{assignment.title}</h3>
              <span className={`px-2.5 py-1 text-xs font-semibold rounded-full flex-shrink-0 ${subjectColor}`}>
                {assignment.subject}
              </span>
            </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-4">
                {/* Grade Display */}
                <div className="bg-white p-4 rounded-xl shadow-sm text-center">
                    <p className="text-sm font-medium text-gray-500">YOUR GRADE</p>
                    <p className={`text-6xl font-bold ${gradeColor}`}>{submission.grade}<span className="text-3xl text-gray-400 font-medium">/100</span></p>
                </div>

                {/* Teacher's Feedback */}
                <div className="bg-white p-4 rounded-xl shadow-sm">
                    <h4 className="font-bold text-gray-800 mb-2">Teacher's Comments</h4>
                    <div className="bg-orange-50 p-3 rounded-lg border-l-4 border-orange-300">
                        <p className="text-gray-700 whitespace-pre-wrap">{submission.feedback || 'No comments provided.'}</p>
                    </div>
                </div>
            </div>

            {/* Your Submission */}
            <div className="bg-white p-4 rounded-xl shadow-sm">
                <h4 className="font-bold text-gray-800 mb-2">Your Submission</h4>
                {submission.textSubmission && (
                    <div className="mb-3">
                        <div className="flex items-center space-x-2 text-sm font-semibold text-gray-600 mb-1">
                            <DocumentTextIcon className="w-5 h-5"/>
                            <span>Text Answer</span>
                        </div>
                        <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-200">{submission.textSubmission}</p>
                    </div>
                )}
                {submission.files && submission.files.length > 0 && (
                    <div>
                        <div className="flex items-center space-x-2 text-sm font-semibold text-gray-600 mb-2">
                            <PaperclipIcon className="w-5 h-5"/>
                            <span>Attached Files</span>
                        </div>
                        <div className="space-y-2">
                            {submission.files.map((file, index) => (
                                <div key={index} className="flex items-center p-2 bg-gray-50 rounded-lg border border-gray-200">
                                {getFileIcon(file.name)}
                                <div className="ml-3 flex-grow overflow-hidden">
                                    <p className="text-sm font-medium text-gray-800 truncate">{file.name}</p>
                                    <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                                </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
      </main>
    </div>
  );
};

export default AssignmentFeedbackScreen;