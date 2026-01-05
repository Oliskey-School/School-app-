
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Quiz } from '../../types';
import { SUBJECT_COLORS, HelpIcon, ChevronRightIcon, ClockIcon } from '../../constants';
import { toast } from 'react-hot-toast';

interface QuizzesScreenProps {
  navigateTo: (view: string, title: string, props: any) => void;
}

const QuizzesScreen: React.FC<QuizzesScreenProps> = ({ navigateTo }) => {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchQuizzes();
  }, []);

  const fetchQuizzes = async () => {
    try {
      // 1. Get current student ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: student } = await supabase.from('students')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!student) return;

      // 2. Fetch published quizzes
      const { data: quizzesData, error: quizError } = await supabase
        .from('quizzes')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      if (quizError) {
        if (quizError.message?.includes('does not exist') || quizError.code === '42P01') {
          setError('database_not_ready');
        } else {
          throw quizError;
        }
        return;
      }

      // 3. Fetch submissions for this student
      const { data: submissions } = await supabase
        .from('quiz_submissions')
        .select('quiz_id, score, status')
        .eq('student_id', student.id);

      // 4. Merge
      const merged = (quizzesData || []).map((q: any) => {
        const sub = submissions?.find(s => s.quiz_id === q.id);
        return { ...q, submission: sub }; // Add submission info
      });

      setQuizzes(merged);
    } catch (err: any) {
      console.error('Error fetching quizzes:', err);
      setError('general_error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  // Show helpful message if database not ready
  if (error === 'database_not_ready') {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center bg-gray-50">
        <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">📚</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Quizzes Coming Soon!</h2>
          <p className="text-gray-600 mb-4">
            The quiz system needs to be set up by your administrator.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800 mb-4">
            <strong>For Admin:</strong> Deploy Phase 2 database schema to enable quizzes.
          </div>
          <button
            onClick={() => window.location.reload()}
            className="w-full py-3 px-4 bg-orange-500 text-white font-semibold rounded-xl hover:bg-orange-600 transition-colors"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <main className="flex-grow p-4 space-y-4 overflow-y-auto">
        <div className="bg-orange-50 p-4 rounded-xl text-center border border-orange-200 shadow-sm">
          <HelpIcon className="h-10 w-10 mx-auto text-orange-400 mb-2" />
          <h3 className="font-bold text-lg text-orange-800">Assessments & Quizzes</h3>
          <p className="text-sm text-orange-700">Complete your assigned tasks.</p>
        </div>

        {quizzes.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <p>No active quizzes available at the moment.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {quizzes.map(quiz => {
              const colorClass = SUBJECT_COLORS[quiz.subject] || 'bg-gray-200 text-gray-800';
              const [bgColor] = colorClass.split(' ');

              return (
                <button
                  key={quiz.id}
                  onClick={() => navigateTo('quizPlayer', quiz.title, { quizId: quiz.id })} // Pass ID, not full obj
                  className="w-full bg-white rounded-xl shadow-sm p-4 flex items-center justify-between text-left hover:bg-gray-50 hover:ring-2 hover:ring-orange-200 transition-all border border-gray-100"
                >
                  <div className="flex items-center space-x-4">
                    <div className={`w-12 h-12 rounded-lg ${bgColor} flex items-center justify-center shrink-0`}>
                      <HelpIcon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-gray-800 line-clamp-1">{quiz.title}</h4>
                        {(quiz as any).submission && (
                          <span className="px-2 py-0.5 text-xs font-bold text-green-700 bg-green-100 rounded-full border border-green-200">
                            Done: {(quiz as any).submission.score}%
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 text-xs text-gray-500 mt-1">
                        <span className="bg-gray-100 px-2 py-0.5 rounded">{quiz.subject}</span>
                        {quiz.durationMinutes > 0 && (
                          <span className="flex items-center"><ClockIcon className="w-3 h-3 mr-1" /> {quiz.durationMinutes}m</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <ChevronRightIcon className="w-5 h-5 text-gray-300" />
                </button>
              )
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default QuizzesScreen;
