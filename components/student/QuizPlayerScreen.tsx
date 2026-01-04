
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Quiz, Question, QuestionOption } from '../../types';
import { CheckCircleIcon, XCircleIcon, ClockIcon } from '../../constants';
import { toast } from 'react-hot-toast';

interface QuizPlayerScreenProps {
  quizId: number;
  handleBack: () => void;
  title?: string; // Optional title passed from nav
}

const QuizPlayerScreen: React.FC<QuizPlayerScreenProps> = ({ quizId, handleBack, title }) => {
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswerId, setSelectedAnswerId] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Integrity State
  const [timeLeft, setTimeLeft] = useState<number | null>(null); // in seconds
  const [focusViolations, setFocusViolations] = useState(0);

  useEffect(() => {
    fetchQuizDetails();
  }, [quizId]);

  // Timer Logic
  useEffect(() => {
    if (!timeLeft || isFinished || loading) return;

    if (timeLeft <= 0) {
      finishQuiz(true); // Auto-submit
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, isFinished, loading]);

  // Focus Mode Logic (Anti-Cheat)
  useEffect(() => {
    if (isFinished || loading) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setFocusViolations(prev => {
          const newVal = prev + 1;
          if (newVal <= 3) {
            toast.error(`⚠️ Warning: Playing elsewhere? Focus violation ${newVal}/3 recorded.`);
          } else {
            toast.error(`⚠️ Multiple violations detected. Exam flagged.`);
          }
          return newVal;
        });
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [isFinished, loading]);

  const fetchQuizDetails = async () => {
    try {
      const { data: quizData, error: quizError } = await supabase
        .from('quizzes')
        .select('*')
        .eq('id', quizId)
        .single();

      if (quizError) throw quizError;
      setQuiz(quizData);

      if (quizData.duration_minutes) {
        setTimeLeft(quizData.duration_minutes * 60);
      }

      const { data: questionData, error: qError } = await supabase
        .from('questions')
        .select('*')
        .eq('quiz_id', quizId)
        .order('id', { ascending: true });

      if (qError) throw qError;

      // Randomization
      let loadedQuestions = questionData || [];
      // Simple Fisher-Yates Shuffle for Questions
      for (let i = loadedQuestions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [loadedQuestions[i], loadedQuestions[j]] = [loadedQuestions[j], loadedQuestions[i]];
      }

      setQuestions(loadedQuestions);

    } catch (err: any) {
      console.error('Error fetching quiz details:', err);
      toast.error('Failed to load quiz');
      handleBack();
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = (optionId: string) => {
    if (selectedAnswerId === null) {
      setSelectedAnswerId(optionId);
      const currentQ = questions[currentQuestionIndex];
      const selectedOpt = currentQ.options?.find(o => o.id === optionId);
      if (selectedOpt && selectedOpt.isCorrect) {
        setScore(s => s + 1);
      }
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(i => i + 1);
      setSelectedAnswerId(null);
    } else {
      finishQuiz();
    }
  };

  const finishQuiz = async (autoSubmit = false) => {
    setIsFinished(true);
    if (autoSubmit) {
      toast('Time is up! Submitting automatically.', { icon: '⏰' });
    }
    // TODO: Save violations to DB
    if (focusViolations > 0) {
      // toast.error(`Exam submitted with ${focusViolations} focus violations.`);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (!quiz || questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-6 bg-gray-50">
        <p className="text-gray-500 mb-4">Quiz not found or has no questions.</p>
        <button onClick={handleBack} className="text-blue-600 hover:underline">Go Back</button>
      </div>
    );
  }

  if (isFinished) {
    const percentage = Math.round((score / questions.length) * 100);
    const totalPoints = questions.reduce((acc, q) => acc + (q.points || 1), 0);
    const earnedPoints = Math.round((score / questions.length) * totalPoints);

    return (
      <div className="p-6 flex flex-col items-center justify-center h-full text-center bg-gray-50 animate-fade-in">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
          <CheckCircleIcon className="w-10 h-10 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800">Quiz Complete!</h2>
        <p className="text-5xl font-bold my-6 text-orange-500">{percentage}%</p>

        <div className="bg-white p-4 rounded-xl shadow-sm w-full max-w-sm mb-6 space-y-2">
          <div className="flex justify-between text-gray-600">
            <span>Correct Answers</span>
            <span className="font-bold text-gray-800">{score} / {questions.length}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Points Earned</span>
            <span className="font-bold text-green-600">+{earnedPoints} XP</span>
          </div>
          {focusViolations > 0 && (
            <div className="flex justify-between text-red-500 mt-2 pt-2 border-t border-gray-100">
              <span className="flex items-center"><XCircleIcon className="w-4 h-4 mr-1" /> Focus Violations</span>
              <span className="font-bold">{focusViolations}</span>
            </div>
          )}
        </div>

        <button onClick={handleBack} className="w-full max-w-sm px-6 py-3 bg-orange-500 text-white font-bold rounded-xl shadow-lg hover:bg-orange-600 transition-transform active:scale-95">
          Back to Assessments
        </button>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header / Progress */}
      <div className="p-4 border-b bg-white sticky top-0 z-10 transition-colors duration-300">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-bold text-gray-700 truncate max-w-[150px]">{quiz.title}</h3>

          <div className="flex items-center space-x-2">
            {timeLeft !== null && (
              <div className={`flex items-center text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${timeLeft < 60 ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-orange-50 text-orange-600'}`}>
                <ClockIcon className="w-4 h-4 mr-1.5" />
                <span>{formatTime(timeLeft)}</span>
              </div>
            )}

            <div className="flex items-center text-xs text-gray-500 bg-gray-100 px-2 py-1.5 rounded-lg">
              <span>{currentQuestionIndex + 1}/{questions.length}</span>
            </div>
          </div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-orange-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
          ></div>
        </div>
      </div>

      <main className="flex-grow p-4 md:p-6 overflow-y-auto flex flex-col max-w-2xl mx-auto w-full">
        {focusViolations > 0 && !isFinished && (
          <div className="mb-4 bg-red-50 border border-red-200 p-2 rounded-lg flex items-center text-red-700 text-xs font-bold animate-bounce">
            <XCircleIcon className="w-4 h-4 mr-2" />
            Focus Lost Detected! ({focusViolations})
          </div>
        )}

        <div className="flex-grow">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6">
            <span className="text-xs font-bold text-blue-500 uppercase tracking-wide mb-2 block">Question {currentQuestionIndex + 1}</span>
            <h3 className="text-xl font-bold text-gray-800 leading-snug">{currentQuestion.text}</h3>
            {currentQuestion.type === 'Theory' && (
              <p className="mt-2 text-sm text-gray-400 italic">This is a theory question. Please write your answer in your notebook.</p>
            )}
          </div>

          <div className="space-y-3">
            {currentQuestion.options && currentQuestion.options.map((option) => {
              const isSelected = selectedAnswerId === option.id;
              // Only show correct/wrong feedback AFTER selection
              const showFeedback = selectedAnswerId !== null;
              const isCorrect = option.isCorrect;

              let cardClass = 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300';
              let icon = null;

              if (showFeedback) {
                if (isSelected && isCorrect) {
                  cardClass = 'bg-green-50 border-green-500 ring-1 ring-green-500';
                  icon = <CheckCircleIcon className="text-green-600 w-6 h-6" />;
                } else if (isSelected && !isCorrect) {
                  cardClass = 'bg-red-50 border-red-500 ring-1 ring-red-500';
                  icon = <XCircleIcon className="text-red-600 w-6 h-6" />;
                } else if (!isSelected && isCorrect) {
                  // Show correct answer if they picked wrong
                  cardClass = 'bg-green-50/50 border-green-200';
                  icon = <CheckCircleIcon className="text-green-400 w-5 h-5 opacity-70" />;
                } else {
                  cardClass = 'bg-gray-50 opacity-50 border-gray-100';
                }
              }

              return (
                <button
                  key={option.id}
                  onClick={() => handleAnswerSelect(option.id)}
                  disabled={selectedAnswerId !== null}
                  className={`w-full p-4 rounded-xl border-2 text-left font-semibold text-gray-700 transition-all flex justify-between items-center ${cardClass} shadow-sm`}
                >
                  <span>{option.text}</span>
                  {icon}
                </button>
              );
            })}

            {currentQuestion.type === 'Theory' && (
              <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-200 text-yellow-800 text-sm">
                Theory questions are not auto-graded in this mode. Tap 'Next' to continue.
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-gray-100 sticky bottom-0 bg-gray-50 pb-2">
          <button
            onClick={handleNext}
            disabled={selectedAnswerId === null && currentQuestion.type !== 'Theory'} // Theory allows skip for now, MCQ requires answer
            className="w-full py-4 px-6 font-bold text-white bg-orange-600 rounded-xl shadow-lg hover:bg-orange-700 hover:shadow-xl active:scale-95 transition-all disabled:opacity-50 disabled:shadow-none disabled:active:scale-100"
          >
            {currentQuestionIndex < questions.length - 1 ? 'Next Question' : 'Finish Quiz'}
          </button>
        </div>
      </main>
    </div>
  );
};

export default QuizPlayerScreen;
