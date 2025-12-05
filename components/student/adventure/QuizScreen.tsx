import React, { useState, useEffect } from 'react';
import { AdventureData, UserAnswer } from '../../../types';
import { CheckCircleIcon, XCircleIcon } from '../../../constants';

interface QuizScreenProps {
    adventureData: AdventureData;
    onQuizComplete: (answers: UserAnswer[]) => void;
}

const getThemeClass = (theme: string) => {
    const themes: { [key: string]: string } = {
        jungle: 'bg-gradient-to-br from-green-400 to-teal-600',
        space: 'bg-gradient-to-br from-indigo-800 to-gray-900',
        ocean: 'bg-gradient-to-br from-blue-400 to-cyan-600',
        castle: 'bg-gradient-to-br from-slate-500 to-gray-700',
        desert: 'bg-gradient-to-br from-amber-400 to-yellow-600',
        lab: 'bg-gradient-to-br from-sky-300 to-gray-400',
    };
    return themes[theme] || 'bg-gray-100';
};

const QuizScreen: React.FC<QuizScreenProps> = ({ adventureData, onQuizComplete }) => {
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
    const [userAnswers, setUserAnswers] = useState<UserAnswer[]>([]);
    const [themeClass, setThemeClass] = useState('bg-gray-100');

    const currentQuestion = adventureData.quiz[currentQuestionIndex];

    useEffect(() => {
        setThemeClass(getThemeClass(currentQuestion.background_theme));
    }, [currentQuestion]);

    const handleAnswerSelect = (answer: string) => {
        if (selectedAnswer !== null) return;

        const isCorrect = answer === currentQuestion.correct_answer;
        setSelectedAnswer(answer);
        setUserAnswers(prev => [...prev, { questionId: currentQuestion.id, answer, isCorrect }]);
    };

    const handleNext = () => {
        if (currentQuestionIndex < adventureData.quiz.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
            setSelectedAnswer(null);
        } else {
            onQuizComplete(userAnswers);
        }
    };

    const imageUrl = `https://picsum.photos/seed/${currentQuestion.id + currentQuestion.question.length}/500/300`;

    return (
        <div className={`flex flex-col h-full transition-colors duration-500 ${themeClass}`}>
            <div className="p-4 text-white/90">
                <p className="text-center font-bold">Question {currentQuestionIndex + 1} of {adventureData.quiz.length}</p>
                <div className="w-full bg-white/20 rounded-full h-2.5 mt-2">
                    <div className="bg-white h-2.5 rounded-full" style={{ width: `${((currentQuestionIndex + 1) / adventureData.quiz.length) * 100}%` }}></div>
                </div>
            </div>

            <div className="flex-grow flex flex-col justify-center p-4 space-y-4">
                <div className="bg-black/20 rounded-xl shadow-lg overflow-hidden">
                    <img src={imageUrl} alt="Quiz illustration" className="w-full h-48 object-cover" />
                </div>
                <div className="bg-white/80 backdrop-blur-sm p-4 rounded-xl shadow-md">
                    <h2 className="text-xl font-bold text-gray-800 text-center">{currentQuestion.question}</h2>
                </div>
            </div>
            
            <div className="p-4 space-y-3">
                {currentQuestion.options.map((option, index) => {
                    const isSelected = selectedAnswer === option;
                    const isCorrect = selectedAnswer && option === currentQuestion.correct_answer;
                    const isWrong = isSelected && !isCorrect;

                    let style = 'bg-white/80 text-gray-800 hover:bg-white';
                    if (isCorrect) style = 'bg-green-500 text-white ring-2 ring-white';
                    if (isWrong) style = 'bg-red-500 text-white ring-2 ring-white';

                    return (
                        <button
                            key={index}
                            onClick={() => handleAnswerSelect(option)}
                            disabled={selectedAnswer !== null}
                            className={`w-full p-4 rounded-xl text-left font-semibold transition-all duration-200 shadow-md ${style}`}
                        >
                            {option}
                            {isCorrect && <CheckCircleIcon className="float-right w-6 h-6"/>}
                            {isWrong && <XCircleIcon className="float-right w-6 h-6"/>}
                        </button>
                    );
                })}
            </div>
            
            {selectedAnswer && (
                 <div className="p-4">
                    <button onClick={handleNext} className="w-full py-4 text-lg font-bold text-teal-800 bg-white rounded-xl shadow-lg hover:bg-gray-200">
                        {currentQuestionIndex < adventureData.quiz.length - 1 ? 'Next Question' : 'Finish Quest'}
                    </button>
                </div>
            )}
        </div>
    );
};

export default QuizScreen;
