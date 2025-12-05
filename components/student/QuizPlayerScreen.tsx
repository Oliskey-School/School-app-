import React, { useState } from 'react';
import { Quiz, QuizQuestion } from '../../types';
import { CheckCircleIcon, XCircleIcon } from '../../constants';

interface QuizPlayerScreenProps {
  quiz: Quiz;
  handleBack: () => void;
}

const QuizPlayerScreen: React.FC<QuizPlayerScreenProps> = ({ quiz, handleBack }) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  const currentQuestion = quiz.questions[currentQuestionIndex];

  const handleAnswerSelect = (answer: string) => {
    if (selectedAnswer === null) {
      setSelectedAnswer(answer);
      if (answer === currentQuestion.correctAnswer) {
        setScore(s => s + 1);
      }
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex < quiz.questions.length - 1) {
      setCurrentQuestionIndex(i => i + 1);
      setSelectedAnswer(null);
    } else {
      setIsFinished(true);
    }
  };

  if (isFinished) {
    const percentage = Math.round((score / quiz.questions.length) * 100);
    return (
      <div className="p-6 flex flex-col items-center justify-center h-full text-center bg-gray-50">
        <h2 className="text-2xl font-bold text-gray-800">Quiz Complete!</h2>
        <p className="text-5xl font-bold my-4 text-orange-500">{percentage}%</p>
        <p className="text-gray-600">You answered <span className="font-semibold">{score}</span> out of <span className="font-semibold">{quiz.questions.length}</span> questions correctly.</p>
        <p className="font-bold text-lg text-green-600 mt-2">You've earned +{Math.round(quiz.points * (score / quiz.questions.length))} points!</p>
        <button onClick={handleBack} className="mt-8 px-6 py-3 bg-orange-500 text-white font-semibold rounded-lg shadow-sm hover:bg-orange-600">
          Back to Quizzes
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="p-4 border-b bg-white">
        <p className="text-sm text-gray-500 text-center">Question {currentQuestionIndex + 1} of {quiz.questions.length}</p>
        <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
            <div className="bg-orange-500 h-2.5 rounded-full" style={{ width: `${((currentQuestionIndex + 1) / quiz.questions.length) * 100}%` }}></div>
        </div>
      </div>
      
      <main className="flex-grow p-4 flex flex-col justify-between">
        <div>
            <h3 className="text-xl font-bold text-gray-800 leading-tight">{currentQuestion.question}</h3>
            <div className="space-y-3 mt-6">
                {currentQuestion.options.map((option, index) => {
                    const isSelected = selectedAnswer === option;
                    const isCorrect = selectedAnswer && option === currentQuestion.correctAnswer;
                    const isWrong = isSelected && !isCorrect;

                    let style = 'bg-white hover:bg-orange-50 border-gray-300';
                    if(isCorrect) style = 'bg-green-100 border-green-400 ring-2 ring-green-300';
                    if(isWrong) style = 'bg-red-100 border-red-400 ring-2 ring-red-300';

                    return (
                        <button 
                            key={index} 
                            onClick={() => handleAnswerSelect(option)}
                            disabled={selectedAnswer !== null}
                            className={`w-full p-4 rounded-lg border-2 text-left font-semibold text-gray-700 transition-all ${style}`}
                        >
                            {option}
                            {isCorrect && <CheckCircleIcon className="float-right text-green-600 w-6 h-6"/>}
                            {isWrong && <XCircleIcon className="float-right text-red-600 w-6 h-6"/>}
                        </button>
                    );
                })}
            </div>
        </div>

        {selectedAnswer && (
            <button
                onClick={handleNext}
                className="w-full py-4 px-4 font-medium text-white bg-orange-500 rounded-lg shadow-sm hover:bg-orange-600"
            >
               {currentQuestionIndex < quiz.questions.length - 1 ? 'Next Question' : 'Finish Quiz'}
            </button>
        )}
      </main>
    </div>
  );
};

export default QuizPlayerScreen;