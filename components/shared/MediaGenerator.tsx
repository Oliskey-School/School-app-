
import React, { useState, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { getAIClient, AI_MODEL_NAME } from '../../lib/ai';
import { SparklesIcon, VideoIcon, CameraIcon, PhotoIcon, XCircleIcon, DownloadIcon } from '../../constants';

const MediaGenerator: React.FC = () => {
    const [mode, setMode] = useState<'image' | 'video' | 'edit' | 'animate'>('image');
    const [prompt, setPrompt] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [resultUrl, setResultUrl] = useState<string | null>(null);
    const [aspectRatio, setAspectRatio] = useState('1:1');
    const [uploadImage, setUploadImage] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Configs
    const aspectRatios = ['1:1', '3:4', '4:3', '9:16', '16:9'];
    const videoRatios = ['16:9', '9:16'];

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setUploadImage(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleGenerate = async () => {
        if (!prompt && mode !== 'animate') return;
        setIsLoading(true);
        setResultUrl(null);

        try {
            const ai = getAIClient(import.meta.env.VITE_OPENAI_API_KEY || '');

            if (mode === 'image') {
                // Generate Image
                const response = await ai.models.generateContent({
                    model: 'gemini-2.0-flash',
                    contents: { parts: [{ text: prompt }] },
                    config: {
                        imageConfig: { aspectRatio: aspectRatio, imageSize: '2K' }
                    }
                });

                const imgPart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
                if (imgPart?.inlineData) {
                    setResultUrl(`data:${imgPart.inlineData.mimeType};base64,${imgPart.inlineData.data}`);
                }

            } else if (mode === 'video') {
                // Generate Video (Veo)
                let operation = await ai.models.generateVideos({
                    model: 'veo-3.1-fast-generate-preview',
                    prompt: prompt,
                    config: {
                        numberOfVideos: 1,
                        resolution: '720p',
                        aspectRatio: aspectRatio as '16:9' | '9:16'
                    }
                });

                // Polling
                while (!operation.done) {
                    await new Promise(r => setTimeout(r, 5000));
                    operation = await ai.operations.getVideosOperation({ operation });
                }

                const uri = operation.response?.generatedVideos?.[0]?.video?.uri;
                if (uri) setResultUrl(`${uri}&key=${import.meta.env.VITE_OPENAI_API_KEY}`);

            } else if (mode === 'edit' && uploadImage) {
                // Edit Image (Nano Banana)
                const base64Data = uploadImage.split(',')[1];
                const response = await ai.models.generateContent({
                    model: 'gemini-2.0-flash',
                    contents: {
                        parts: [
                            { inlineData: { mimeType: 'image/jpeg', data: base64Data } },
                            { text: prompt }
                        ]
                    }
                });
                const imgPart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
                if (imgPart?.inlineData) {
                    setResultUrl(`data:${imgPart.inlineData.mimeType};base64,${imgPart.inlineData.data}`);
                }

            } else if (mode === 'animate' && uploadImage) {
                // Animate Image (Veo)
                const base64Data = uploadImage.split(',')[1];
                let operation = await ai.models.generateVideos({
                    model: 'veo-3.1-fast-generate-preview',
                    prompt: prompt || "Animate this image cinematically",
                    image: {
                        imageBytes: base64Data,
                        mimeType: 'image/jpeg'
                    },
                    config: {
                        numberOfVideos: 1,
                        resolution: '720p',
                        aspectRatio: '16:9' // Veo image-to-video constraint
                    }
                });
                while (!operation.done) {
                    await new Promise(r => setTimeout(r, 5000));
                    operation = await ai.operations.getVideosOperation({ operation });
                }
                const uri = operation.response?.generatedVideos?.[0]?.video?.uri;
                if (uri) setResultUrl(`${uri}&key=${import.meta.env.VITE_OPENAI_API_KEY}`);
            }

        } catch (error) {
            console.error("Generation failed:", error);
            toast.error("Failed to generate media. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full p-4 bg-gray-50 space-y-4">
            {/* Mode Selector */}
            <div className="flex space-x-2 bg-white p-1.5 rounded-xl shadow-sm overflow-x-auto">
                {[
                    { id: 'image', label: 'Create Image', icon: PhotoIcon },
                    { id: 'video', label: 'Create Video', icon: VideoIcon },
                    { id: 'edit', label: 'Edit Image', icon: SparklesIcon },
                    { id: 'animate', label: 'Animate', icon: VideoIcon },
                ].map(m => (
                    <button
                        key={m.id}
                        onClick={() => { setMode(m.id as any); setResultUrl(null); }}
                        className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors ${mode === m.id ? 'bg-purple-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'
                            }`}
                    >
                        <m.icon className="w-4 h-4" />
                        <span>{m.label}</span>
                    </button>
                ))}
            </div>

            {/* Input Area */}
            <div className="flex-grow overflow-y-auto space-y-4">
                {/* Result Display */}
                {resultUrl ? (
                    <div className="bg-black rounded-xl overflow-hidden shadow-lg relative group">
                        {(mode === 'video' || mode === 'animate') ? (
                            <video src={resultUrl} controls autoPlay loop className="w-full h-auto max-h-[60vh]" />
                        ) : (
                            <img src={resultUrl} alt="Generated" className="w-full h-auto max-h-[60vh] object-contain" />
                        )}
                        <a href={resultUrl} download="generated_media" className="absolute top-4 right-4 p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/40 opacity-0 group-hover:opacity-100 transition-opacity">
                            <DownloadIcon className="w-6 h-6" />
                        </a>
                    </div>
                ) : (
                    <div className="h-64 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center text-gray-400">
                        {isLoading ? (
                            <div className="flex flex-col items-center">
                                <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mb-4"></div>
                                <p className="animate-pulse">Creating magic with AI...</p>
                            </div>
                        ) : (
                            <>
                                <SparklesIcon className="w-12 h-12 mb-2 opacity-50" />
                                <p>Your creation will appear here</p>
                            </>
                        )}
                    </div>
                )}

                {/* Controls */}
                <div className="bg-white p-4 rounded-xl shadow-sm space-y-4">
                    {(mode === 'edit' || mode === 'animate') && (
                        <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center hover:bg-gray-50 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
                            {uploadImage ? (
                                <div className="relative inline-block">
                                    <img src={uploadImage} className="h-20 rounded-md border" alt="Upload" />
                                    <button onClick={(e) => { e.stopPropagation(); setUploadImage(null); }} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"><XCircleIcon className="w-4 h-4" /></button>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center text-gray-500">
                                    <CameraIcon className="w-8 h-8 mb-1" />
                                    <span className="text-sm">Upload Reference Image</span>
                                </div>
                            )}
                        </div>
                    )}

                    {(mode === 'image' || mode === 'video') && (
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Aspect Ratio</label>
                            <div className="flex flex-wrap gap-2">
                                {(mode === 'video' ? videoRatios : aspectRatios).map(r => (
                                    <button
                                        key={r}
                                        onClick={() => setAspectRatio(r)}
                                        className={`px-3 py-1 text-xs rounded-md border ${aspectRatio === r ? 'bg-purple-50 border-purple-500 text-purple-700' : 'border-gray-200 text-gray-600'}`}
                                    >
                                        {r}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="relative">
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder={mode === 'edit' ? "Describe changes (e.g., 'add a hat')" : "Describe what you want to create..."}
                            className="w-full p-3 pr-12 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none min-h-[80px]"
                        />
                        <button
                            onClick={handleGenerate}
                            disabled={isLoading || (!prompt && mode !== 'animate')}
                            className="absolute bottom-3 right-3 p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                        >
                            <SparklesIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MediaGenerator;
