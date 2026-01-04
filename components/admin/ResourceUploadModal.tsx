
import React, { useState, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../lib/supabase'; // Assuming strict supabase client
import { XCircleIcon, CloudUploadIcon, DocumentTextIcon, FilmIcon, PhotographIcon, MusicNoteIcon } from '../../constants';
// import { useAuth } from '../../context/AuthContext'; // If needed for uploader ref

interface ResourceUploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUploadComplete: () => void;
    teacherId: number; // passed from parent
}

const ResourceUploadModal: React.FC<ResourceUploadModalProps> = ({ isOpen, onClose, onUploadComplete, teacherId }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [subject, setSubject] = useState('');
    const [grade, setGrade] = useState('');
    const [language, setLanguage] = useState<'English' | 'Hausa' | 'Yoruba' | 'Igbo'>('English');
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const getFileType = (file: File): 'PDF' | 'Video' | 'Slides' | 'Audio' => {
        if (file.type.includes('pdf')) return 'PDF';
        if (file.type.includes('video')) return 'Video';
        if (file.type.includes('audio')) return 'Audio';
        if (file.type.includes('presentation') || file.type.includes('powerpoint')) return 'Slides';
        return 'PDF'; // Default fallback
    };

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file || !title || !subject) {
            toast.error('Please fill in all required fields and select a file.');
            return;
        }

        setUploading(true);
        setProgress(10);

        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
            const filePath = `lesson-materials/${fileName}`;

            // 1. Upload to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from('lesson-materials')
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (uploadError) throw uploadError;

            setProgress(60);

            // 2. Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('lesson-materials')
                .getPublicUrl(filePath);

            // 3. Insert into Resources Table
            const { error: dbError } = await supabase
                .from('resources')
                .insert([{
                    title,
                    description,
                    type: getFileType(file),
                    subject,
                    grade: parseInt(grade) || 0,
                    url: publicUrl,
                    language,
                    teacher_id: teacherId,
                    is_public: true // Default to public for MVP
                }]);

            if (dbError) throw dbError;

            setProgress(100);
            toast.success('Resource uploaded successfully!');
            onUploadComplete();
            onClose();

        } catch (error: any) {
            console.error('Upload failed:', error);
            toast.error(`Upload failed: ${error.message}`);
        } finally {
            setUploading(false);
            setProgress(0);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col max-h-[90vh]">
                <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-2xl">
                    <h3 className="text-lg font-bold text-gray-800">Upload Learning Material</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><XCircleIcon className="w-6 h-6" /></button>
                </div>

                <form onSubmit={handleUpload} className="p-6 space-y-4 overflow-y-auto">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                        <input type="text" value={title} onChange={e => setTitle(e.target.value)} required className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500" placeholder="e.g. Intro to Algebra" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
                            <input type="text" value={subject} onChange={e => setSubject(e.target.value)} required className="w-full p-2 border border-gray-300 rounded-lg" placeholder="Mathematics" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Grade Level</label>
                            <input type="number" value={grade} onChange={e => setGrade(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg" placeholder="10" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
                        <select value={language} onChange={(e: any) => setLanguage(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg">
                            <option value="English">English</option>
                            <option value="Hausa">Hausa</option>
                            <option value="Yoruba">Yoruba</option>
                            <option value="Igbo">Igbo</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="w-full p-2 border border-gray-300 rounded-lg" placeholder="Brief summary of the content..." />
                    </div>

                    <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".pdf,.doc,.docx,.ppt,.pptx,.mp4,.mp3" />

                        {file ? (
                            <div className="flex items-center justify-center text-green-600 font-medium">
                                <DocumentTextIcon className="w-6 h-6 mr-2" />
                                <span className="truncate max-w-[200px]">{file.name}</span>
                                <span className="ml-2 text-xs text-gray-500">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                            </div>
                        ) : (
                            <div className="text-gray-500">
                                <CloudUploadIcon className="w-10 h-10 mx-auto mb-2 text-gray-400" />
                                <p className="font-medium">Click to upload file</p>
                                <p className="text-xs mt-1">PDF, Video, Audio, Slides (Max 50MB)</p>
                            </div>
                        )}
                    </div>

                    {uploading && (
                        <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                            <div className="bg-orange-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                        </div>
                    )}

                    <div className="pt-2">
                        <button type="submit" disabled={uploading} className="w-full py-3 px-4 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center">
                            {uploading ? 'Uploading...' : 'Publish Material'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ResourceUploadModal;
