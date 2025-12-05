import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { DocumentTextIcon } from '../../constants';

interface DetailedLessonNoteScreenProps {
  note: string; // The detailed note content in markdown
  title: string; // e.g., "Week 5: The Circulatory System"
}

const DetailedLessonNoteScreen: React.FC<DetailedLessonNoteScreenProps> = ({ note, title }) => {
  return (
    <div className="p-4 bg-gray-50 printable-area">
        <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="flex items-center space-x-3 mb-4 print:hidden">
                <div className="bg-purple-100 p-2 rounded-lg">
                    <DocumentTextIcon className="w-6 h-6 text-purple-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800">{title || "Detailed Lesson Note"}</h2>
            </div>
            <div className="prose prose-sm max-w-none prose-headings:text-purple-800 prose-strong:text-gray-800 prose-a:text-purple-600 text-gray-700">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{note || "No detailed note content was provided for this lesson."}</ReactMarkdown>
            </div>
        </div>
    </div>
  );
};

export default DetailedLessonNoteScreen;
