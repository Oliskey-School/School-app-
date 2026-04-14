
import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Quiz, Question, QuestionOption, Student } from '../../types';
import { CheckCircleIcon, XCircleIcon, ClockIcon, ChevronRightIcon, ChevronLeftIcon } from '../../constants';
import { toast } from 'react-hot-toast';

interface QuizPlayerScreenProps {
  quizId?: string | number;
  cbtExamId?: string | number;
  handleBack: () => void;
  title?: string;
  student?: Student;
}

const QuizPlayerScreen: React.FC<QuizPlayerScreenProps> = ({ quizId, cbtExamId, handleBack, title, student }) => {
  const [quizInfo, setQuizInfo] = useState<{ id: any; title: string; durationMinutes: number; type: 'cbt' | 'quiz' } | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answersLog, setAnswersLog] = useState<Record<string, string>>({}); // questionId -> optionId
  const [isFinished, setIsFinished] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [showInstructions, setShowInstructions] = useState(true);

  // Integrity State
  const [timeLeft, setTimeLeft] = useState<number | null>(null); // in seconds
  const [focusViolations, setFocusViolations] = useState(0);

  useEffect(() => {
    fetchQuizDetails();
  }, [quizId, cbtExamId]);

  // Timer Logic
  useEffect(() => {
    if (timeLeft === null || isFinished || loading) return;

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

  // Focus Mode Logic (Anti-Cheat)
  useEffect(() => {
    if (isFinished || loading) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setFocusViolations(prev => {
          const newVal = prev + 1;
          if (newVal >= 3) {
            toast.error(`❌ Anti-cheat triggered: Limit (3/3) exceeded. Auto-submitting assessment...`, { duration: 5000 });
            // Small delay to allow the toast to be seen before submission/redirect
            setTimeout(() => {
              finishQuiz(true);
            }, 1500);
          } else {
            toast.error(`⚠️ Warning: View changed! Violation ${newVal}/3 recorded.`);
          }
          return newVal;
        });
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [isFinished, loading]);

  const fetchQuizDetails = async () => {
    setLoading(true);
    try {
      const targetId = cbtExamId || quizId;
      if (!targetId) {
        setLoading(false);
        return;
      }

      // 1. Fetch Quiz Metadata
      const quizData = await api.getQuizDetails(String(targetId));

      setQuizInfo({
        id: quizData.id,
        title: quizData.title,
        durationMinutes: quizData.duration_minutes || 0,
        type: quizData.description === 'Exam' ? 'cbt' : 'quiz'
      });

      if (quizData.duration_minutes) {
        setTimeLeft(quizData.duration_minutes * 60);
      }

      // 2. Fetch Questions
      const questionsData = await api.getQuizQuestions(String(targetId));

      // Map to local Question format
      const mappedQuestions: Question[] = (questionsData || []).map((q: any) => {
        let options: QuestionOption[] = [];

        if (Array.isArray(q.options)) {
          if (q.options.length > 0 && typeof q.options[0] === 'string') {
            options = q.options.map((opt: string, idx: number) => ({
              id: String.fromCharCode(65 + idx),
              text: opt,
              isCorrect: String.fromCharCode(65 + idx) === q.correct_answer
            }));
          } else {
            options = q.options.map((opt: any) => ({
              id: opt.id,
              text: opt.text,
              isCorrect: opt.isCorrect
            }));
          }
        }

        return {
          id: q.id,
          quizId: String(targetId),
          text: q.question_text,
          type: q.question_type === 'multiple_choice' ? 'MultipleChoice' : 'Theory',
          points: q.marks || 1,
          options: options
        };
      });

      setQuestions(mappedQuestions);

    } catch (err: any) {
      console.error('Error fetching details:', err);
      toast.error('Failed to load assessment content');
      handleBack();
    } finally {
      setLoading(false);
    }
  };

  const mapCBTQuestions = (data: any[], qzId: any): Question[] => {
    return (data || []).map((q: any) => ({
      id: q.id,
      quizId: qzId,
      text: q.question_text,
      type: 'MultipleChoice',
      points: q.marks || 1,
      options: [
        { id: 'A', text: q.option_a, isCorrect: q.correct_option === 'A' },
        { id: 'B', text: q.option_b, isCorrect: q.correct_option === 'B' },
        { id: 'C', text: q.option_c, isCorrect: q.correct_option === 'C' },
        { id: 'D', text: q.option_d, isCorrect: q.correct_option === 'D' },
      ]
    }));
  };

  const mapRegularQuestions = (data: any[], qzId: any): Question[] => {
    return (data || []).map((q: any) => ({
      id: q.id,
      quizId: qzId,
      text: q.text,
      type: q.type as any,
      points: q.points || 1,
      options: q.options || [] // Assuming options stored as JSONB in 'questions' table
    }));
  };

  const handleAnswerSelect = (optionId: string) => {
    const currentQ = questions[currentQuestionIndex];
    setAnswersLog(prev => ({
      ...prev,
      [currentQ.id]: optionId
    }));
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      finishQuiz();
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const finishQuiz = async (autoSubmit = false) => {
    if (isSubmitting || isFinished) return;
    setIsSubmitting(true);

    if (autoSubmit) {
      toast('Violation limit reached! Auto-submitting... (v1.2)', { icon: '🚫' });
    } else {
      toast.loading('Submitting assessment... (v1.2)');
    }

    try {
      let score = 0;
      let totalMaxPoints = 0;

      const submissionAnswers = questions.map(q => {
        const selected = answersLog[q.id];
        const correctOpt = q.options?.find(o => o.isCorrect);
        const isCorrect = correctOpt?.id === selected;
        if (isCorrect) score += (q.points || 1);
        totalMaxPoints += (q.points || 1);

        return {
          questionId: q.id,
          selectedOption: selected || null,
          isCorrect
        };
      });

      setFinalScore(score);
      const percentage = Math.round((score / (totalMaxPoints || 1)) * 100);

      const studentId = student?.id;
      if (!studentId) throw new Error("Student ID missing");

      // BACKEND SUBMISSION
      await api.submitQuiz(String(quizInfo?.id), {
        score: percentage,
        total_questions: questions.length,
        answers: answersLog,
        focus_violations: focusViolations,
        student_id: String(studentId)
      });

      toast.dismiss();
      toast.success(autoSubmit ? 'Assessment ended & saved.' : 'Submitted successfully!');
      setIsFinished(true);

      if (autoSubmit) {
        // Force exit after violation
        setTimeout(() => handleBack(), 3000);
      }

    } catch (err: any) {
      console.error("Submission error:", err);
      toast.error('Submission failed. Please check your connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-full bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mb-4"></div>
        <p className="text-gray-500 font-medium">Preparing your assessment...</p>
      </div>
    );
  }

  if (showInstructions) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-6 overflow-y-auto">
        <div className="bg-white rounded-3xl shadow-xl p-8 max-w-lg w-full border border-orange-100 animate-fade-in my-auto">
          <div className="w-20 h-20 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-6 transform rotate-3 shadow-inner">
            <span className="text-4xl">📜</span>
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900 text-center mb-4">Assessment Rules</h2>

          <div className="space-y-4 mb-8">
            <div className="flex items-start gap-4 p-4 bg-red-50 rounded-2xl border border-red-100">
              <span className="text-2xl mt-1">🚫</span>
              <div>
                <h4 className="font-bold text-red-800">No Window Switching</h4>
                <p className="text-sm text-red-700 leading-relaxed">Changing tabs or minimizing the browser 3 times will trigger an <strong>automatic submission</strong> and you will be returned to the dashboard.</p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 bg-blue-50 rounded-2xl border border-blue-100">
              <span className="text-2xl mt-1">⏱️</span>
              <div>
                <h4 className="font-bold text-blue-800">Timed Assessment</h4>
                <p className="text-sm text-blue-700 leading-relaxed">The timer starts as soon as you begin. Ensure you have a stable connection and enough time to finish.</p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 bg-green-50 rounded-2xl border border-green-100">
              <span className="text-2xl mt-1">☝️</span>
              <div>
                <h4 className="font-bold text-green-800">Single Attempt</h4>
                <p className="text-sm text-green-700 leading-relaxed">You cannot retake this assessment once submitted. Ensure your answers are finalized before time runs out.</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => setShowInstructions(false)}
              className="w-full py-4 bg-orange-500 text-white font-bold rounded-2xl hover:bg-orange-600 transition-all shadow-lg shadow-orange-200 active:scale-95 text-lg"
            >
              I Understand, Start Now
            </button>

            <button
              onClick={handleBack}
              className="w-full py-3 text-gray-500 font-semibold rounded-xl hover:bg-gray-100 transition-colors"
            >
              Maybe Later
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isFinished) {
    return (
      <div className="p-8 flex flex-col items-center justify-center h-full text-center bg-gray-50 animate-fade-in">
        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-8 shadow-inner">
          <CheckCircleIcon className="w-12 h-12 text-green-600" />
        </div>
        <h2 className="text-3xl font-bold text-gray-800 mb-2">Well Done!</h2>
        <p className="text-gray-500 mb-8">You have successfully completed the assessment.</p>

        <div className="bg-white p-6 rounded-3xl shadow-sm w-full max-w-sm mb-8 border border-gray-100">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 block">Your Score</span>
          <div className="text-5xl font-black text-orange-500 mb-2">{finalScore}%</div>
          <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
            <div className="bg-orange-500 h-full transition-all duration-1000" style={{ width: `${finalScore}%` }}></div>
          </div>
        </div>

        <button
          onClick={handleBack}
          className="w-full max-w-sm py-4 bg-orange-500 text-white font-black rounded-2xl shadow-xl hover:bg-orange-600 hover:shadow-orange-200 transition-all active:scale-95"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const selectedAnswerId = answersLog[currentQuestion?.id];

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
      {/* Quiz Header */}
      <div className="bg-white px-4 py-4 border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="flex justify-between items-center max-w-3xl mx-auto w-full">
          <div className="flex items-center gap-3">
            <button onClick={handleBack} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
              <ChevronLeftIcon className="w-6 h-6 text-slate-400" />
            </button>
            <div>
              <h3 className="font-bold text-slate-800 truncate max-w-[180px] leading-tight">{quizInfo?.title}</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Question {currentQuestionIndex + 1} of {questions.length}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {timeLeft !== null && (
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-sm shadow-sm transition-all ${timeLeft < 60 ? 'bg-red-500 text-white animate-pulse' : 'bg-orange-100 text-orange-700'
                }`}>
                <ClockIcon className="w-4 h-4" />
                <span>{formatTime(timeLeft)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="max-w-3xl mx-auto w-full mt-4 h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-orange-500 transition-all duration-500 ease-out"
            style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-2xl mx-auto w-full space-y-6">

          {/* Question Card */}
          <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-orange-500"></div>
            <h2 className="text-xl md:text-2xl font-bold text-slate-800 leading-snug">
              {currentQuestion?.text}
            </h2>
          </div>

          {/* Options */}
          <div className="space-y-3">
            {currentQuestion?.options?.map((option) => {
              const isSelected = selectedAnswerId === option.id;

              return (
                <button
                  key={option.id}
                  onClick={() => handleAnswerSelect(option.id)}
                  className={`w-full group p-4 md:p-5 rounded-2xl border-2 text-left transition-all flex items-center gap-4 ${isSelected
                    ? 'bg-orange-50 border-orange-500 shadow-md ring-1 ring-orange-500/20'
                    : 'bg-white border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                    }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm transition-all ${isSelected ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'
                    }`}>
                    {option.id}
                  </div>
                  <span className={`flex-1 font-bold ${isSelected ? 'text-orange-900' : 'text-slate-700'}`}>
                    {option.text}
                  </span>
                  {isSelected && (
                    <div className="w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center text-white text-[10px]">
                      ✓
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </main>

      {/* Footer Navigation */}
      <footer className="bg-white p-4 border-t border-slate-200">
        <div className="max-w-2xl mx-auto w-full flex gap-3">
          <button
            onClick={handlePrevious}
            disabled={currentQuestionIndex === 0}
            className="flex-1 py-4 px-6 font-bold text-slate-400 bg-slate-50 border border-slate-200 rounded-2xl disabled:opacity-30 transition-all flex items-center justify-center gap-2"
          >
            <ChevronLeftIcon className="w-5 h-5" />
            Back
          </button>

          {currentQuestionIndex < questions.length - 1 ? (
            <button
              onClick={handleNext}
              className="flex-[2] py-4 px-6 font-bold text-white bg-slate-800 rounded-2xl shadow-lg hover:shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              Next Question
              <ChevronRightIcon className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={() => finishQuiz()}
              disabled={isSubmitting}
              className="flex-[2] py-4 px-6 font-black text-white bg-orange-600 rounded-2xl shadow-lg hover:bg-orange-700 transition-all active:scale-95"
            >
              {isSubmitting ? 'Submitting...' : 'Finish & Submit'}
            </button>
          )}
        </div>
      </footer>
    </div>
  );
};

export default QuizPlayerScreen;

