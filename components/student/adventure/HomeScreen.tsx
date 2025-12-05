
import React, { useState, useRef } from 'react';
import { AdventureDifficulty } from '../../../types';
import { SparklesIcon, PaperclipIcon } from '../../../constants';

interface HomeScreenProps {
    onStartAdventure: (source: { type: 'file'; value: File } | { type: 'url'; value: string }, difficulty: AdventureDifficulty) => void;
    error: string | null;
}

const LinkIcon = ({ className }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${className || ''}`.trim()} viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M10 14a3.5 3.5 0 0 0 5 0l4 -4a3.5 3.5 0 0 0 -5 -5l-.5 .5" /><path d="M14 10a3.5 3.5 0 0 0 -5 0l-4 4a3.5 3.5 0 0 0 5 5l.5 -.5" /></svg>;

const HomeScreen: React.FC<HomeScreenProps> = ({ onStartAdventure, error }) => {
    const [inputType, setInputType] = useState<'file' | 'url'>('file');
    const [file, setFile] = useState<File | null>(null);
    const [url, setUrl] = useState('');
    const [difficulty, setDifficulty] = useState<AdventureDifficulty | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const isReady = (file || (inputType === 'url' && url)) && difficulty;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleStart = () => {
        if (!isReady) return;
        if (inputType === 'file' && file) {
            onStartAdventure({ type: 'file', value: file }, difficulty!);
        } else if (inputType === 'url' && url) {
            onStartAdventure({ type: 'url', value: url }, difficulty!);
        }
    };

    const difficulties: AdventureDifficulty[] = ['Young Explorer (4-7 years)', 'Brave Adventurer (8-11 years)', 'Master Sage (12-15 years)'];

    return (
        <div className="flex flex-col h-full bg-gradient-to-br from-orange-50 via-red-50 to-amber-100 p-4">
            <div className="text-center">
                <SparklesIcon className="w-12 h-12 mx-auto text-orange-400" />
                <h1 className="text-3xl font-bold text-gray-800 mt-2">Start Your Adventure!</h1>
                <p className="text-gray-600 mt-1">Turn any lesson into a fun quest.</p>
            </div>

            {error && (
                <div className="mt-4 p-3 bg-red-100 border border-red-200 text-red-800 rounded-lg text-sm text-center">
                    {error}
                </div>
            )}

            <div className="mt-6 space-y-5 flex-grow">
                {/* Content Input */}
                <div className="bg-white p-4 rounded-xl shadow-sm">
                    <div className="flex bg-gray-100 p-1 rounded-lg">
                        <button onClick={() => setInputType('file')} className={`w-1/2 py-2 text-sm font-semibold rounded-md transition-colors ${inputType === 'file' ? 'bg-white shadow' : 'text-gray-600'}`}>
                            Upload File
                        </button>
                        <button onClick={() => setInputType('url')} className={`w-1/2 py-2 text-sm font-semibold rounded-md transition-colors ${inputType === 'url' ? 'bg-white shadow' : 'text-gray-600'}`}>
                            Paste Link
                        </button>
                    </div>

                    <div className="mt-4">
                        {inputType === 'file' ? (
                            <>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                    className="hidden"
                                    accept="image/*,video/*,text/*,.pdf,.doc,.docx"
                                />
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-full h-24 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-500 hover:border-orange-400 hover:text-orange-500 transition-colors"
                                >
                                    <PaperclipIcon className="w-6 h-6" />
                                    <span className="mt-1 font-semibold text-sm">{file ? 'Change file' : 'Click to upload a file'}</span>
                                    <span className="text-xs">Image, Video, PDF, DOCX, TXT</span>
                                </button>
                                {file && <p className="text-center text-sm text-gray-700 mt-2 truncate">Selected: {file.name}</p>}
                            </>
                        ) : (
                            <div className="relative">
                                <LinkIcon className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="url"
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                    placeholder="Paste a web link here..."
                                    className="w-full pl-10 pr-3 py-3 text-gray-700 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400"
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Challenge Level */}
                <div className="bg-white p-4 rounded-xl shadow-sm">
                    <h3 className="font-bold text-gray-700 mb-3 text-center">Challenge Level</h3>
                    <div className="space-y-2">
                        {difficulties.map(d => (
                            <button
                                key={d}
                                onClick={() => setDifficulty(d)}
                                className={`w-full p-3 text-left font-semibold rounded-lg border-2 transition-all ${difficulty === d ? 'bg-orange-100 border-orange-400 text-orange-800' : 'bg-gray-50 border-transparent hover:border-gray-300 text-gray-700'}`}
                            >
                                {d}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="mt-auto pt-4">
                <button
                    onClick={handleStart}
                    disabled={!isReady}
                    className="w-full py-4 text-lg font-bold text-white bg-orange-500 rounded-xl shadow-lg hover:bg-orange-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                    Start Adventure!
                </button>
            </div>
        </div>
    );
};

export default HomeScreen;
