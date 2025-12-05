import React, { useState } from 'react';
import { AIGame, AIGameQuestion } from '../../types';
import { CheckCircleIcon, XCircleIcon } from '../../constants';

interface GamePlayerScreenProps {
  game: AIGame;
  mode: 'test' | 'play';
  handleBack: () => void;
}

const GamePlayerScreen: React.FC<GamePlayerScreenProps> = ({ game, mode, handleBack }) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  const currentQuestion = game.questions[currentQuestionIndex];

  const handleAnswerSelect = (answer: string) => {
    if (selectedAnswer === null) {
      setSelectedAnswer(answer);
      if (answer === currentQuestion.correctAnswer) {
        setScore(s => s + 1);
      }
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex < game.questions.length - 1) {
      setCurrentQuestionIndex(i => i + 1);
      setSelectedAnswer(null);
    } else {
      setIsFinished(true);
    }
  };

  if (isFinished) {
    const percentage = Math.round((score / game.questions.length) * 100);
    return (
      <div className="p-6 flex flex-col items-center justify-center h-full text-center bg-gray-50">
        <h2 className="text-2xl font-bold text-gray-800">{mode === 'test' ? 'Test Complete!' : 'Game Over!'}</h2>
        <p className="text-5xl font-bold my-4 text-purple-600">{percentage}%</p>
        <p className="text-gray-600">You answered <span className="font-semibold">{score}</span> out of <span className="font-semibold">{game.questions.length}</span> questions correctly.</p>
        <button onClick={handleBack} className="mt-8 px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg shadow-sm hover:bg-purple-700">
          {mode === 'test' ? 'Back to Editor' : 'Back to Games'}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-100">
      <div className="p-4 border-b bg-white">
        <p className="text-sm text-gray-500 text-center">Question {currentQuestionIndex + 1} of {game.questions.length}</p>
        <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
            <div className="bg-purple-600 h-2.5 rounded-full" style={{ width: `${((currentQuestionIndex + 1) / game.questions.length) * 100}%` }}></div>
        </div>
      </div>
      
      <main className="flex-grow p-4 flex flex-col justify-between">
        <div>
            <h3 className="text-xl font-bold text-gray-800 leading-tight text-center">{currentQuestion.question}</h3>
            <div className="space-y-3 mt-6">
                {currentQuestion.options.map((option, index) => {
                    const isSelected = selectedAnswer === option;
                    const isCorrect = selectedAnswer && option === currentQuestion.correctAnswer;
                    const isWrong = isSelected && !isCorrect;

                    let style = 'bg-white hover:bg-purple-50 border-gray-300';
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
             {/* FIX: `isCorrect` was out of scope. The condition should check if an answer was selected and if it's not the correct one. */}
             {selectedAnswer && selectedAnswer !== currentQuestion.correctAnswer && (
                <div className="mt-4 p-3 bg-yellow-50 rounded text-yellow-800 border-l-4 border-yellow-300">
                    <strong>💡 Explanation:</strong> {currentQuestion.explanation}
                </div>
            )}
        </div>

        {selectedAnswer && (
            <button
                onClick={handleNext}
                className="w-full py-4 px-4 font-medium text-white bg-purple-600 rounded-lg shadow-sm hover:bg-purple-700"
            >
               {currentQuestionIndex < game.questions.length - 1 ? 'Next Question' : 'Finish Game'}
            </button>
        )}
      </main>
    </div>
  );
};

export default GamePlayerScreen;