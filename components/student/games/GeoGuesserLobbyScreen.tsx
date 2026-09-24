import React from 'react';
import { ShareIcon, GlobeIcon, MapIcon } from '../../../constants';
import { Student } from '../../../types';
import { toast } from 'react-hot-toast';

interface GeoGuesserLobbyScreenProps {
    navigateTo: (view: string, title: string, props?: any) => void;
    student?: Student;
}

const GeoGuesserLobbyScreen: React.FC<GeoGuesserLobbyScreenProps> = ({ navigateTo, student }) => {

    const handleShareChallenge = () => {
        if (navigator.share) {
            navigator.share({
                title: 'GeoGuesser Challenge!',
                text: "I'm travelling the world in GeoGuesser! Can you beat my score on the Smart School App?",
            }).catch((error) => console.log('Error sharing:', error));
        } else {
            toast('Sharing is not supported on your browser. You can copy the link manually!', { icon: '📋' });
        }
    };

    return (
        <div className="p-6 flex flex-col items-center justify-center h-full text-center bg-gray-50 min-h-screen">
            <div className="relative mb-8">
                <div className="absolute inset-0 bg-green-400 blur-2xl opacity-20 rounded-full"></div>
                <div className="relative w-32 h-32 rounded-full bg-gradient-to-br from-green-400 to-teal-600 text-white flex items-center justify-center text-6xl font-bold shadow-2xl animate-float">
                    <GlobeIcon className="w-16 h-16" />
                </div>
                <div className="absolute -bottom-2 -right-2 bg-yellow-400 p-2 rounded-full border-4 border-white shadow-lg">
                    <MapIcon className="w-6 h-6 text-yellow-900" />
                </div>
            </div>

            <h1 className="text-4xl font-extrabold text-gray-800 tracking-tight mb-2">GeoGuesser</h1>
            <p className="text-gray-600 text-lg max-w-sm font-medium">
                Travel the world from your screen! Identify famous landmarks and cities before time runs out.
            </p>

            <div className="grid grid-cols-2 gap-4 w-full max-w-sm mt-8 mb-8">
                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm text-center">
                    <div className="text-3xl font-black text-green-500 mb-1">50+</div>
                    <div className="text-xs text-gray-400 font-bold uppercase tracking-wider">Locations</div>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm text-center">
                    <div className="text-3xl font-black text-teal-500 mb-1">5</div>
                    <div className="text-xs text-gray-400 font-bold uppercase tracking-wider">Continents</div>
                </div>
            </div>

            <div className="w-full max-w-sm space-y-4">
                <button
                    onClick={() => navigateTo('geoGuesserGame', 'GeoGuesser', { student })}
                    className="w-full py-4 text-xl font-bold text-white bg-green-500 rounded-2xl shadow-xl hover:bg-green-600 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
                >
                    <GlobeIcon className="w-6 h-6 shrink-0" />
                    Start Exploring
                </button>

                <button
                    onClick={handleShareChallenge}
                    className="w-full py-4 text-lg font-bold text-green-700 bg-green-50 border-2 border-green-200 rounded-2xl hover:bg-green-100 transition-colors flex items-center justify-center space-x-2"
                >
                    <ShareIcon className="w-5 h-5 shrink-0" />
                    <span className="min-w-0">Challenge Friends</span>
                </button>
            </div>

            <p className="mt-8 text-xs text-gray-400 font-medium">
                Geography • Culture • Landmarks
            </p>
        </div>
    );
};

export default GeoGuesserLobbyScreen;
