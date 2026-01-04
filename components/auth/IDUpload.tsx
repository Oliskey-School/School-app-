import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';

interface IDUploadProps {
    onUploadComplete?: () => void;
}

export function IDUpload({ onUploadComplete }: IDUploadProps) {
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string>('');
    const [docType, setDocType] = useState<'national_id' | 'passport' | 'drivers_license'>('national_id');
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        // Validate file type
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
        if (!validTypes.includes(selectedFile.type)) {
            setError('Please upload a JPG, PNG, or PDF file');
            return;
        }

        // Validate file size (max 5MB)
        if (selectedFile.size > 5 * 1024 * 1024) {
            setError('File size must be less than 5MB');
            return;
        }

        setFile(selectedFile);
        setError('');

        // Create preview for images
        if (selectedFile.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreview(reader.result as string);
            };
            reader.readAsDataURL(selectedFile);
        } else {
            setPreview(''); // No preview for PDFs
        }
    };

    const handleUpload = async () => {
        if (!file) return;

        setUploading(true);
        setError('');

        try {
            // Get current user
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            // Upload to Supabase Storage
            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}-${Date.now()}.${fileExt}`;
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('id-documents')
                .upload(fileName, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (uploadError) throw uploadError;

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('id-documents')
                .getPublicUrl(fileName);

            // Create verification request
            const { error: requestError } = await supabase
                .from('id_verification_requests')
                .insert({
                    user_id: user.id,
                    document_url: publicUrl,
                    document_type: docType,
                    status: 'pending'
                });

            if (requestError) throw requestError;

            // Update profile
            await supabase
                .from('profiles')
                .update({
                    id_document_url: publicUrl,
                    id_document_type: docType,
                    verification_status: 'pending'
                })
                .eq('id', user.id);

            setSuccess('Document uploaded successfully! Pending admin review.');
            setTimeout(() => {
                onUploadComplete?.();
            }, 2000);

        } catch (err: any) {
            console.error('Upload error:', err);
            setError(err.message || 'Failed to upload document');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto p-6">
            <div className="text-center mb-8">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                    </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Upload ID Document</h2>
                <p className="text-gray-600 mt-2">
                    Upload a valid government-issued ID for verification
                </p>
            </div>

            <div className="space-y-6">
                {/* Document Type Selection */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Document Type
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                        {[
                            { value: 'national_id', label: 'National ID', icon: '🪪' },
                            { value: 'passport', label: 'Passport', icon: '🛂' },
                            { value: 'drivers_license', label: "Driver's License", icon: '🚗' }
                        ].map((type) => (
                            <button
                                key={type.value}
                                type="button"
                                onClick={() => setDocType(type.value as any)}
                                className={`p-4 border-2 rounded-lg text-center transition ${docType === type.value
                                        ? 'border-purple-600 bg-purple-50'
                                        : 'border-gray-200 hover:border-gray-300'
                                    }`}
                            >
                                <div className="text-2xl mb-1">{type.icon}</div>
                                <div className="text-sm font-medium">{type.label}</div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* File Upload */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Upload Document
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition">
                        <input
                            type="file"
                            accept="image/*,.pdf"
                            onChange={handleFileSelect}
                            className="hidden"
                            id="file-upload"
                        />
                        <label
                            htmlFor="file-upload"
                            className="cursor-pointer flex flex-col items-center"
                        >
                            <svg className="w-12 h-12 text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                            <p className="text-sm text-gray-600 mb-1">
                                {file ? file.name : 'Click to upload or drag and drop'}
                            </p>
                            <p className="text-xs text-gray-500">
                                JPG, PNG, or PDF (max 5MB)
                            </p>
                        </label>
                    </div>
                </div>

                {/* Preview */}
                {preview && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Preview
                        </label>
                        <div className="border border-gray-200 rounded-lg p-4">
                            <img
                                src={preview}
                                alt="Document preview"
                                className="max-w-full h-auto rounded"
                            />
                        </div>
                    </div>
                )}

                {/* Messages */}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <p className="text-sm text-red-700">{error}</p>
                    </div>
                )}

                {success && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-2">
                        <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <p className="text-sm text-green-700">{success}</p>
                    </div>
                )}

                {/* Upload Button */}
                <button
                    onClick={handleUpload}
                    disabled={!file || uploading}
                    className="w-full bg-purple-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
                >
                    {uploading ? (
                        <>
                            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Uploading...
                        </>
                    ) : (
                        'Upload Document'
                    )}
                </button>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 mb-2">Important Notes:</h4>
                    <ul className="text-sm text-blue-700 space-y-1">
                        <li>• Document must be clear and readable</li>
                        <li>• All corners of the document must be visible</li>
                        <li>• Your face must be clearly visible (for ID cards)</li>
                        <li>• Admin will review within 24-48 hours</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
