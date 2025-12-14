import React, { useState, useEffect, useRef } from 'react';
import { MicrophoneIcon, VideoIcon, StopIcon, ShareIcon, UsersIcon, MessagesIcon, BellIcon } from '../../constants';
import { notifyStudentsAndParents } from '../../lib/notifications';
import { mockStudents } from '../../data';

const Participant: React.FC<{ name: string, isMuted: boolean, isCameraOff: boolean }> = ({ name, isMuted, isCameraOff }) => (
    <div className="bg-gray-700 rounded-lg p-2 flex items-center space-x-2">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isCameraOff ? 'bg-gray-500' : 'bg-purple-400'}`}>
            {isCameraOff ? <VideoIcon className="w-4 h-4 text-white"/> : name.charAt(0)}
        </div>
        <p className="text-sm text-white flex-grow truncate">{name}</p>
        {isMuted && <MicrophoneIcon className="w-4 h-4 text-red-400"/>}
    </div>
);

const ChatMessage: React.FC<{ name: string, message: string, isYou?: boolean }> = ({ name, message, isYou }) => (
    <div className={`text-sm ${isYou ? 'text-right' : ''}`}>
        <p className={`font-bold ${isYou ? 'text-purple-300' : 'text-sky-300'}`}>{name}</p>
        <p className="text-white">{message}</p>
    </div>
);

const VirtualClassScreen: React.FC = () => {
    const [isMuted, setIsMuted] = useState(false);
    const [isCameraOff, setIsCameraOff] = useState(false);
    const [activeTab, setActiveTab] = useState<'participants' | 'chat'>('participants');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    useEffect(() => {
        const startCamera = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                streamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            } catch (error) {
                console.error("Error accessing camera:", error);
                setIsCameraOff(true); // Default to camera off if permission denied
            }
        };
        startCamera();
        
        return () => { // Cleanup on unmount
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    const toggleMute = () => setIsMuted(prev => !prev);
    const toggleCamera = () => {
        if(streamRef.current) {
            streamRef.current.getVideoTracks().forEach(track => track.enabled = !track.enabled);
        }
        setIsCameraOff(prev => !prev);
    };

    const studentParticipants = mockStudents.slice(0, 8).map((s, i) => ({
        name: s.name,
        isMuted: i % 3 === 0,
        isCameraOff: i % 4 === 0,
    }));
    
    return (
        <div className="flex flex-col h-full bg-gray-900 text-white">
            <div className="flex-grow flex flex-col md:flex-row p-3 md:p-4 gap-4">
                {/* Main Content */}
                <div className="flex-grow flex flex-col">
                    <div className="bg-black rounded-xl overflow-hidden relative w-full">
                        <div className="w-full bg-black">
                            <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover aspect-video" />
                        </div>
                        <div className="absolute bottom-3 left-3 bg-black/60 px-3 py-1 rounded text-sm">Mrs. Funke Akintola (You)</div>
                    </div>

                    {/* mobile participants row */}
                    <div className="md:hidden mt-3 flex space-x-2 overflow-x-auto pb-2">
                        <div className="flex items-center space-x-2">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isCameraOff ? 'bg-gray-500' : 'bg-purple-400'}`}>{isCameraOff ? <VideoIcon className="w-4 h-4 text-white" /> : 'You'.charAt(0)}</div>
                            <p className="text-sm">You</p>
                        </div>
                        {studentParticipants.map(p => (
                            <div key={p.name} className="flex flex-col items-center text-xs min-w-[64px]">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${p.isCameraOff ? 'bg-gray-500' : 'bg-purple-400'}`}>{p.isCameraOff ? <VideoIcon className="w-4 h-4 text-white" /> : p.name.charAt(0)}</div>
                                <p className="truncate max-w-[64px] text-xs mt-1">{p.name.split(' ')[0]}</p>
                            </div>
                        ))}
                    </div>

                    <div className="flex-shrink-0 mt-4 flex justify-center items-center space-x-3">
                         <button onClick={toggleMute} className={`p-3 rounded-full ${isMuted ? 'bg-red-500' : 'bg-gray-700'}`} aria-label="Toggle mute"><MicrophoneIcon /></button>
                         <button onClick={toggleCamera} className={`p-3 rounded-full ${isCameraOff ? 'bg-red-500' : 'bg-gray-700'}`} aria-label="Toggle camera"><VideoIcon /></button>
                         <button className="p-3 rounded-full bg-gray-700" aria-label="Share"><ShareIcon /></button>
                         <button onClick={async () => {
                             const msg = window.prompt('Enter notification message to send to this class:');
                             if (!msg) return;
                             try {
                                 // Use mock students' ids if DB not configured
                                 const studentIds = [] as number[];
                                 // Attempt to notify; if DB tables exist, this will deliver
                                 await notifyStudentsAndParents({ studentIds, message: msg, title: 'Class announcement' });
                                 alert('Notification queued for students and their parents.');
                             } catch (e) {
                                 console.error('Notify error:', e);
                                 alert('Failed to send notifications. See console for details.');
                             }
                         }} className="p-3 rounded-full bg-yellow-600" aria-label="Notify class"><BellIcon /></button>
                         <button className="p-3 rounded-full bg-red-600 font-bold" aria-label="Leave"><StopIcon /></button>
                    </div>
                </div>

                {/* Sidebar for md+ */}
                <div className="hidden md:flex w-72 flex-shrink-0 bg-gray-800 rounded-xl flex flex-col">
                    <div className="flex border-b border-gray-700">
                        <button onClick={() => setActiveTab('participants')} className={`flex-1 py-2 flex items-center justify-center space-x-2 ${activeTab === 'participants' ? 'bg-gray-700' : ''}`}><UsersIcon /><span>Participants ({studentParticipants.length + 1})</span></button>
                        <button onClick={() => setActiveTab('chat')} className={`flex-1 py-2 flex items-center justify-center space-x-2 ${activeTab === 'chat' ? 'bg-gray-700' : ''}`}><MessagesIcon /><span>Chat</span></button>
                    </div>
                    <div className="flex-grow p-3 space-y-2 overflow-y-auto">
                        {activeTab === 'participants' ? (
                            <>
                                <Participant name="You" isMuted={isMuted} isCameraOff={isCameraOff} />
                                {studentParticipants.map(p => <Participant key={p.name} {...p} />)}
                            </>
                        ) : (
                            <div className="space-y-4">
                                <ChatMessage name="Adebayo" message="Good morning, ma'am." />
                                <ChatMessage name="You" message="Good morning, everyone! Welcome." isYou />
                                <ChatMessage name="Chidinma" message="I have a question about the last topic." />
                            </div>
                        )}
                    </div>
                     {activeTab === 'chat' && (
                        <div className="p-2 border-t border-gray-700">
                            <input type="text" placeholder="Type a message..." className="w-full bg-gray-600 rounded-full px-4 py-2 text-sm focus:outline-none"/>
                        </div>
                    )}
                </div>

                {/* Mobile sidebar drawer */}
                {isSidebarOpen && (
                    <div className="md:hidden fixed inset-0 z-50 flex">
                        <div className="w-0 flex-1" onClick={() => setIsSidebarOpen(false)} />
                        <div className="w-80 bg-gray-800 p-3 overflow-y-auto">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-lg font-semibold">{activeTab === 'participants' ? 'Participants' : 'Chat'}</h3>
                                <button onClick={() => setIsSidebarOpen(false)} className="text-gray-300">Close</button>
                            </div>
                            <div className="space-y-2">
                                {activeTab === 'participants' ? (
                                    <>
                                        <Participant name="You" isMuted={isMuted} isCameraOff={isCameraOff} />
                                        {studentParticipants.map(p => <Participant key={p.name} {...p} />)}
                                    </>
                                ) : (
                                    <div className="space-y-4">
                                        <ChatMessage name="Adebayo" message="Good morning, ma'am." />
                                        <ChatMessage name="You" message="Good morning, everyone! Welcome." isYou />
                                        <ChatMessage name="Chidinma" message="I have a question about the last topic." />
                                    </div>
                                )}
                            </div>
                            {activeTab === 'chat' && (
                                <div className="p-2 border-t border-gray-700 mt-3">
                                    <input type="text" placeholder="Type a message..." className="w-full bg-gray-600 rounded-full px-4 py-2 text-sm focus:outline-none"/>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* floating toggle for mobile sidebar */}
                <button onClick={() => setIsSidebarOpen(true)} className="md:hidden fixed bottom-6 right-4 z-40 p-3 bg-gray-800 rounded-full shadow-lg" aria-label="Open sidebar">
                    <UsersIcon />
                </button>
            </div>
        </div>
    );
};

export default VirtualClassScreen;
