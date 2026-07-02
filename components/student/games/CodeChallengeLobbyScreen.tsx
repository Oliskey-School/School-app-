import React from 'react';
import { Share2 as ShareIcon, Code as CodeIcon, Terminal as TerminalIcon, Cpu as CpuIcon } from 'lucide-react';
import { Student } from '../../../types';
import { toast } from 'react-hot-toast';

interface CodeChallengeLobbyScreenProps {
    navigateTo: (view: string, title: string, props?: any) => void;
    student?: Student;
}

const CodeChallengeLobbyScreen: React.FC<CodeChallengeLobbyScreenProps> = ({ navigateTo, student }) => {

    const handleShareChallenge = () => {
        if (navigator.share) {
            navigator.share({
                title: 'Code Challenge!',
                text: "I'm mastering logic in Code Challenge! Can you solve the algorithm on the Smart School App?",
            }).catch((error) => console.log('Error sharing:', error));
        } else {
            toast('Sharing is not supported on your browser. You can copy the link manually!', { icon: '💻' });
        }
    };

    return (
        <div className="p-6 flex flex-col items-center justify-center h-full text-center bg-gray-50 min-h-screen">
            <div className="relative mb-8 group">
                <div className="absolute inset-0 bg-purple-500 blur-2xl opacity-20 rounded-full group-hover:opacity-40 transition duration-500"></div>
                <div className="relative w-32 h-32 rounded-3xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white flex items-center justify-center text-6xl font-bold shadow-2xl transform group-hover:scale-105 transition duration-300">
                    <CodeIcon className="w-16 h-16" />
                </div>
                <div className="absolute -top-2 -right-2 bg-pink-400 p-2 rounded-xl border-4 border-white shadow-lg animate-pulse">
                    <TerminalIcon className="w-6 h-6 text-white" />
                </div>
            </div>

            <h1 className="text-4xl font-black text-purple-600 tracking-tight mb-2">
                Code Challenge
            </h1>
            <p className="text-gray-600 text-lg max-w-sm font-medium">
                Master the language of the future. Use logic blocks to solve puzzles and control the bot!
            </p>

            <div className="grid grid-cols-2 gap-4 w-full max-w-sm mt-8 mb-8">
                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm text-center">
                    <div className="text-3xl font-black text-purple-500 mb-1">10</div>
                    <div className="text-xs text-gray-400 font-bold uppercase tracking-wider">Levels</div>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm text-center">
                    <div className="text-3xl font-black text-indigo-500 mb-1">Logic</div>
                    <div className="text-xs text-gray-400 font-bold uppercase tracking-wider">Skill</div>
                </div>
            </div>

            <div className="w-full max-w-sm space-y-4">
                <button
                    onClick={() => navigateTo('codeChallengeGame', 'Code Challenge', { student })}
                    className="w-full py-4 text-xl font-bold text-white bg-purple-600 rounded-2xl shadow-xl hover:bg-purple-700 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
                >
                    <CpuIcon className="w-6 h-6" />
                    Start Coding
                </button>

                <button
                    onClick={handleShareChallenge}
                    className="w-full py-4 text-lg font-bold text-purple-700 bg-purple-50 border-2 border-purple-200 rounded-2xl hover:bg-purple-100 transition-colors flex items-center justify-center space-x-2"
                >
                    <ShareIcon className="w-5 h-5" />
                    <span>Invite Programmers</span>
                </button>
            </div>

            <p className="mt-8 text-xs text-gray-400 font-medium">
                Algorithms • Logic • Loops
            </p>
        </div>
    );
};

export default CodeChallengeLobbyScreen;
