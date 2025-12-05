import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { GeneratedLessonPlan, DetailedNote } from '../../types';
import { BookOpenIcon, ClipboardListIcon } from '../../constants';

// A helper component for sections in the document-style view
const DocumentSection: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode }> = ({ title, icon, children }) => (
    <div>
        <div className="flex items-center space-x-3 py-2 border-b-2 border-gray-200 mb-4">
            <div className="text-purple-600">{icon}</div>
            <h2 className="text-2xl font-bold text-gray-800 tracking-tight">{title}</h2>
        </div>
        <div className="prose prose-base max-w-none text-gray-800">
            {children}
        </div>
    </div>
);


const LessonContentScreen: React.FC<{ lessonPlan: GeneratedLessonPlan; detailedNote?: DetailedNote }> = ({ lessonPlan, detailedNote }) => {
  const lessonPlanMarkdown = `
**Week:** ${lessonPlan.week}
**Duration:** ${lessonPlan.duration}

### Objectives
${(lessonPlan.objectives || []).map(o => `- ${o}`).join('\n')}

### Materials
${(lessonPlan.materials || []).map(m => `- ${m}`).join('\n')}

### Key Vocabulary
${(lessonPlan.keyVocabulary || []).map(v => `- ${v}`).join('\n')}

### Teaching Steps
${(lessonPlan.teachingSteps || []).map((s, i) => `${i + 1}. **${s.step}:** ${s.description}`).join('\n')}

### Assessment Methods
${(lessonPlan.assessmentMethods || []).map(a => `- ${a}`).join('\n')}
  `;

  return (
    <div className="p-4 bg-gray-50 font-sans">
      <div className="max-w-3xl mx-auto bg-white p-8 rounded-lg shadow-lg printable-area">
        <div className="space-y-12">
          
          <DocumentSection title={`Lesson Plan: ${lessonPlan.topic}`} icon={<ClipboardListIcon className="w-7 h-7" />}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{lessonPlanMarkdown}</ReactMarkdown>
          </DocumentSection>
          
          <DocumentSection title="Detailed Lesson Note" icon={<BookOpenIcon className="w-7 h-7" />}>
            {detailedNote ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{detailedNote.note}</ReactMarkdown>
            ) : (
                <p className="text-center text-gray-500 py-4 italic">Detailed note not available for this topic.</p>
            )}
          </DocumentSection>
          
        </div>
      </div>
    </div>
  );
};

export default LessonContentScreen;