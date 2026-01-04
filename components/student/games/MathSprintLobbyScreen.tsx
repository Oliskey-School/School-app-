import { toast } from 'react-hot-toast';
import React from 'react';
import { ShareIcon } from '../../../constants';

interface MathSprintLobbyScreenProps {
    navigateTo: (view: string, title: string, props?: any) => void;
}

const MathSprintLobbyScreen: React.FC<MathSprintLobbyScreenProps> = ({ navigateTo }) => {

    const handleShareChallenge = () => {
        if (navigator.share) {
            navigator.share({
                title: 'Math Sprint Challenge!',
                text: "Think you're faster at math? Challenge me in Math Sprint on the Smart School App!",
            }).catch((error) => console.log('Error sharing:', error));
        } else {
            toast('Sharing is not supported on your browser. You can copy the link manually!', { icon: '📋' });
        }
    };

    return (
        <div className="p-6 flex flex-col items-center justify-center h-full text-center bg-gray-50">
            <div className="w-24 h-24 rounded-full bg-sky-500 text-white flex items-center justify-center text-4xl font-bold mb-4 shadow-lg">
                123
            </div>
            <h1 className="text-3xl font-bold text-gray-800">Math Sprint</h1>
            <p className="text-gray-600 mt-2 max-w-xs">Answer as many math problems as you can before the timer runs out!</p>

            <div className="w-full max-w-sm mt-8 space-y-4">
                <button
                    onClick={() => navigateTo('mathSprintGame', 'Math Sprint', {})}
                    className="w-full py-4 text-lg font-bold text-white bg-orange-500 rounded-xl shadow-lg hover:bg-orange-600 transition-colors"
                >
                    Play Solo
                </button>

                <button
                    onClick={handleShareChallenge}
                    className="w-full py-4 text-lg font-bold text-orange-600 bg-white border-2 border-orange-500 rounded-xl shadow-lg hover:bg-orange-50 transition-colors flex items-center justify-center space-x-2"
                >
                    <ShareIcon />
                    <span>Challenge a Friend</span>
                </button>
            </div>
        </div>
    );
};

export default MathSprintLobbyScreen;