import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { mockStudents } from '../../../data';
import { Student } from '../../../types';

// Using the same logged-in student for grade-level difficulty scaling
const loggedInStudent: Student = mockStudents.find(s => s.id === 4)!;

interface MathSprintGameScreenProps {
    navigateTo: (view: string, title: string, props?: any) => void;
}

const MathSprintGameScreen: React.FC<MathSprintGameScreenProps> = ({ navigateTo }) => {
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(60);
    const [problem, setProblem] = useState({ a: 0, b: 0, operator: '+', answer: 0 });
    const [userAnswer, setUserAnswer] = useState('');
    const [questionsAnswered, setQuestionsAnswered] = useState(0);

    const generateProblem = useCallback(() => {
        const grade = loggedInStudent.grade;
        let maxNumber = 10;
        if (grade >= 10) maxNumber = 20;
        if (grade >= 7) maxNumber = 15;

        const a = Math.floor(Math.random() * maxNumber) + 1;
        const b = Math.floor(Math.random() * maxNumber) + 1;
        const operators = ['+', '-', '*'];
        const operator = operators[Math.floor(Math.random() * operators.length)];

        let answer = 0;
        let displayA = a;
        let displayB = b;
        
        switch (operator) {
            case '+':
                answer = a + b;
                break;
            case '-':
                // Ensure the result is not negative for simplicity
                displayA = Math.max(a, b);
                displayB = Math.min(a, b);
                answer = displayA - displayB;
                break;
            case '*':
                answer = a * b;
                break;
        }

        setProblem({ a: displayA, b: displayB, operator, answer });
        setUserAnswer('');
    }, []);

    useEffect(() => {
        generateProblem();
    }, [generateProblem]);

    useEffect(() => {
        if (timeLeft > 0) {
            const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
            return () => clearTimeout(timer);
        } else {
            navigateTo('mathSprintResults', 'Game Over', { score, questionsAnswered });
        }
    }, [timeLeft, navigateTo, score, questionsAnswered]);

    const handleAnswerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setUserAnswer(value);

        if (parseInt(value, 10) === problem.answer) {
            setScore(s => s + 10);
            setQuestionsAnswered(q => q + 1);
            setTimeout(generateProblem, 100); // Quick delay for feedback
        }
    };

    return (
        <div className="flex flex-col h-full bg-gradient-to-br from-sky-400 to-blue-600 text-white p-4">
            <header className="flex justify-between items-center text-lg font-bold">
                <div>Score: {score}</div>
                <div>Time: {timeLeft}s</div>
            </header>

            <main className="flex-grow flex flex-col items-center justify-center">
                <div className="text-6xl font-bold tracking-widest">
                    <span>{problem.a}</span>
                    <span className="mx-4">{problem.operator}</span>
                    <span>{problem.b}</span>
                </div>
                
                <input
                    type="number"
                    value={userAnswer}
                    onChange={handleAnswerChange}
                    autoFocus
                    className="mt-8 w-48 h-20 text-center text-5xl font-bold bg-white/20 rounded-xl border-2 border-white/50 focus:outline-none focus:ring-4 focus:ring-white/50 text-white"
                />
            </main>

            <footer className="text-center text-sm opacity-80">
                Type your answer and press enter!
            </footer>
        </div>
    );
};

export default MathSprintGameScreen;
