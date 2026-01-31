import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { GeneratedLessonPlan, DetailedNote } from '../../types';
import { BookOpenIcon, ClipboardListIcon, ShareIcon, CheckCircleIcon } from '../../constants';
import { useAuth } from '../../context/AuthContext';

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


const LessonContentScreen: React.FC<{ lessonPlan: GeneratedLessonPlan; detailedNote?: DetailedNote; context?: any }> = ({ lessonPlan, detailedNote, context }) => {
  const { currentSchool, user } = useAuth();
  const [isPublishing, setIsPublishing] = useState(false);

  const handlePublish = async () => {
    if (!context?.classId || !context?.subjectId || !context?.teacherId) {
      toast.error("Missing Class or Subject information. Please regenerate the plan using the dropdown selectors.");
      return;
    }

    setIsPublishing(true);
    try {
      const payload = {
        school_id: currentSchool?.id,
        teacher_id: context.teacherId,
        class_id: context.classId,
        subject_id: context.subjectId,
        week_number: parseInt(lessonPlan.week.toString().replace(/\D/g, '')) || 1,
        title: lessonPlan.topic,
        objectives: lessonPlan.objectives?.join('\n'),
        content: detailedNote?.note || lessonPlan.teachingSteps?.map(s => `**${s.step}**: ${s.description}`).join('\n\n'),
        methodology: lessonPlan.teachingSteps?.map(s => s.step).join(', '),
        resources_needed: lessonPlan.materials?.join(', '),
        status: 'Draft' // Default to draft for review
      };

      const { error } = await supabase.from('lesson_plans').insert([payload]);
      if (error) throw error;

      toast.success("Lesson Plan published to official records!");
    } catch (err: any) {
      console.error("Publish error:", err);
      toast.error(`Failed to publish: ${err.message}`);
    } finally {
      setIsPublishing(false);
    }
  };
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

          <div className="flex justify-between items-center bg-purple-50 p-4 rounded-lg mb-6 border border-purple-100">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Week {lessonPlan.week}: {lessonPlan.topic}</h1>
              <p className="text-sm text-gray-500">AI Generated Content</p>
            </div>
            <button
              onClick={handlePublish}
              disabled={isPublishing}
              className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 disabled:opacity-50 shadow-sm transition-colors"
            >
              <ShareIcon className="w-5 h-5" />
              <span>{isPublishing ? 'Publishing...' : 'Publish to Official'}</span>
            </button>
          </div>

          <DocumentSection title="Lesson Plan Overview" icon={<ClipboardListIcon className="w-7 h-7" />}>
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