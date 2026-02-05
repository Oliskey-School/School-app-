import React, { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, Loader2, AlertCircle } from 'lucide-react';
import { uploadImage, validateImageFile } from '../../lib/storage';

interface ImageUploadProps {
    value?: string | null;
    onChange: (url: string | null) => void;
    bucket: string;
    folder?: string;
    maxSizeMB?: number;
    accept?: string;
    className?: string;
    circular?: boolean;
}

/**
 * ImageUpload Component
 * Drag-and-drop or click to upload images to Supabase Storage
 * Features: Preview, validation, loading states, glassmorphism design
 */
export const ImageUpload: React.FC<ImageUploadProps> = ({
    value,
    onChange,
    bucket,
    folder,
    maxSizeMB = 2,
    accept = 'image/*',
    className = '',
    circular = false
}) => {
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [preview, setPreview] = useState<string | null>(value || null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFile = async (file: File) => {
        setError(null);

        // Validate file
        const validationError = validateImageFile(file, maxSizeMB);
        if (validationError) {
            setError(validationError);
            return;
        }

        try {
            setIsUploading(true);

            // Create preview
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreview(reader.result as string);
            };
            reader.readAsDataURL(file);

            // Upload to Supabase
            const url = await uploadImage(file, bucket, folder);
            onChange(url);
        } catch (err: any) {
            setError(err.message || 'Failed to upload image');
            setPreview(null);
        } finally {
            setIsUploading(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const file = e.dataTransfer.files[0];
        if (file) {
            handleFile(file);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleFile(file);
        }
    };

    const handleRemove = () => {
        setPreview(null);
        onChange(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <div className={`relative ${className} ${circular ? 'rounded-full' : ''}`}>
            <input
                ref={fileInputRef}
                type="file"
                accept={accept}
                onChange={handleFileChange}
                className="hidden"
            />

            {preview ? (
                // Preview State
                <div className="relative group mx-auto">
                    <div className={`relative ${circular ? 'w-32 h-32 rounded-full' : 'w-full h-48 rounded-xl'} overflow-hidden transition-all duration-300`}>
                        <img
                            src={preview}
                            alt="Preview"
                            className={`w-full h-full ${circular ? 'object-cover' : 'object-contain'}`}
                        />
                        {/* Overlay on hover */}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                            <button
                                onClick={handleClick}
                                className="p-2 bg-white/90 text-indigo-600 rounded-full font-medium hover:bg-white transition-all scale-90 group-hover:scale-100"
                            >
                                <Upload className="w-5 h-5" />
                            </button>
                            <button
                                onClick={handleRemove}
                                className="p-2 bg-red-500/90 text-white rounded-full font-medium hover:bg-red-500 transition-all scale-90 group-hover:scale-100"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                // Upload State
                <div
                    onClick={handleClick}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    className={`
                        relative mx-auto ${circular ? 'w-32 h-32 rounded-full' : 'w-full h-48 rounded-xl'} border-2 border-dashed cursor-pointer
                        transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]
                        ${isDragging
                            ? 'border-indigo-500 bg-indigo-50/50 scale-105'
                            : 'border-slate-300 bg-slate-50/50 hover:border-indigo-400 hover:bg-indigo-50/30'
                        }
                        ${isUploading ? 'pointer-events-none opacity-60' : ''}
                    `}
                >
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4">
                        {isUploading ? (
                            <>
                                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                                <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Uploading</p>
                            </>
                        ) : (
                            <>
                                <div className={`transition-all duration-300 ${circular ? 'w-10 h-10' : 'w-16 h-16'} rounded-full bg-indigo-100 flex items-center justify-center group-hover:bg-indigo-200`}>
                                    <ImageIcon className={`${circular ? 'w-5 h-5' : 'w-8 h-8'} text-indigo-600`} />
                                </div>
                                {!circular && (
                                    <div className="text-center">
                                        <p className="text-sm font-bold text-slate-700">
                                            Click or drag to upload logo
                                        </p>
                                        <p className="text-xs text-slate-500 mt-1 uppercase font-medium">
                                            PNG, JPG, WEBP (Max {maxSizeMB}MB)
                                        </p>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Error Message */}
            {error && (
                <div className="mt-2 flex items-center gap-2 text-sm text-red-600">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{error}</span>
                </div>
            )}
        </div>
    );
};

export default ImageUpload;
