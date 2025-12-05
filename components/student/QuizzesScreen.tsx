
import React from 'react';
import { Quiz } from '../../types';
import { mockQuizzes } from '../../data';
import { SUBJECT_COLORS, HelpIcon, ChevronRightIcon } from '../../constants';

interface QuizzesScreenProps {
  navigateTo: (view: string, title: string, props: any) => void;
}

const QuizzesScreen: React.FC<QuizzesScreenProps> = ({ navigateTo }) => {
  return (
    <div className="flex flex-col h-full bg-gray-50">
      <main className="flex-grow p-4 space-y-3 overflow-y-auto">
        <div className="bg-orange-50 p-4 rounded-xl text-center border border-orange-200">
          <HelpIcon className="h-10 w-10 mx-auto text-orange-400 mb-2" />
          <h3 className="font-bold text-lg text-orange-800">Knowledge Challenge</h3>
          <p className="text-sm text-orange-700">Test your skills and earn points!</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {mockQuizzes.map(quiz => {
            const colorClass = SUBJECT_COLORS[quiz.subject] || 'bg-gray-200 text-gray-800';
            const [bgColor] = colorClass.split(' ');
            
            return (
                <button
                key={quiz.id}
                onClick={() => navigateTo('quizPlayer', quiz.title, { quiz })}
                className="w-full bg-white rounded-xl shadow-sm p-4 flex items-center justify-between text-left hover:bg-gray-50 hover:ring-2 hover:ring-orange-200 transition-all"
                >
                <div className="flex items-center space-x-4">
                    <div className={`w-12 h-12 rounded-lg ${bgColor} flex items-center justify-center`}>
                    <HelpIcon className="w-6 h-6 text-white"/>
                    </div>
                    <div>
                    <h4 className="font-bold text-gray-800">{quiz.title}</h4>
                    <p className="text-sm text-gray-500">{quiz.subject} - {quiz.questionCount} Questions</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="font-bold text-lg text-orange-600">+{quiz.points} PTS</p>
                </div>
                </button>
            )
            })}
        </div>
      </main>
    </div>
  );
};

export default QuizzesScreen;