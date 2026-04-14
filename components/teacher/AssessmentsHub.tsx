import React from 'react';
import { ClipboardListIcon, EditIcon, ChevronRightIcon, SparklesIcon, BookOpenIcon } from '../../constants';

interface AssessmentsHubProps {
  navigateTo: (view: string, title: string, props: any) => void;
  teacherId: string | null;
  currentBranchId: string | null;
  schoolId: string;
}

const AssessmentsHub: React.FC<AssessmentsHubProps> = ({ navigateTo, teacherId, currentBranchId, schoolId }) => {
  const categories = [
    {
      id: 'assignments',
      title: 'Manage Assignments',
      description: 'Create, edit and grade student assignments',
      icon: <ClipboardListIcon className="w-8 h-8" />,
      color: 'bg-indigo-500',
      lightColor: 'bg-indigo-50',
      textColor: 'text-indigo-600',
      action: () => navigateTo('assignmentsList', 'Manage Assignments', { teacherId, branchId: currentBranchId })
    },
    {
      id: 'quizzes',
      title: 'Quiz Builder',
      description: 'Create manual assessments and practice quizzes',
      icon: <EditIcon className="w-8 h-8" />,
      color: 'bg-orange-500',
      lightColor: 'bg-orange-50',
      textColor: 'text-orange-600',
      action: () => navigateTo('quizBuilder', 'Quiz Builder', { teacherId })
    }
  ];

  return (
    <div className="p-6 bg-gray-50 min-h-full">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Assessments & Quizzes</h1>
          <p className="mt-2 text-lg text-gray-500">Manage all your classroom assessments and practice materials in one place.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={cat.action}
              className="group relative bg-white rounded-3xl p-8 text-left shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 flex flex-col h-full active:scale-[0.98]"
            >
              <div className={`w-16 h-16 ${cat.lightColor} ${cat.textColor} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                {cat.icon}
              </div>
              
              <h3 className="text-xl font-bold text-gray-900 mb-2">{cat.title}</h3>
              <p className="text-gray-500 mb-8 flex-grow">{cat.description}</p>
              
              <div className="flex items-center text-sm font-bold text-gray-900 group-hover:translate-x-1 transition-transform">
                Get Started
                <ChevronRightIcon className="w-4 h-4 ml-1" />
              </div>

              {/* Decorative gradient overlay */}
              <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <SparklesIcon className={`w-6 h-6 ${cat.textColor} opacity-20`} />
              </div>
            </button>
          ))}
        </div>

        {/* Quick Info / Stats Section */}
        <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm overflow-hidden relative">
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
            <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center shrink-0">
              <BookOpenIcon className="w-10 h-10" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Teaching Tip</h2>
              <p className="text-gray-600">
                Did you know? Regular low-stakes quizzes can improve long-term retention by up to 50%. 
                Use the Quiz Builder for quick knowledge checks!
              </p>
            </div>
          </div>
          
          {/* Decorative background shape */}
          <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-blue-50 rounded-full opacity-50" />
        </div>
      </div>
    </div>
  );
};

export default AssessmentsHub;
