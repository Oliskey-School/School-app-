/**
 * Supabase Storage Helper
 * Handles file uploads, downloads, and deletions for the resources system
 */

import { supabase } from './supabase';

export interface UploadOptions {
    file: File;
    bucket?: string;
    path?: string;
    onProgress?: (progress: number) => void;
}

export interface UploadResult {
    success: boolean;
    url?: string;
    path?: string;
    error?: string;
}

// Configuration
const DEFAULT_BUCKET = 'resources';
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

// Allowed file types
const ALLOWED_TYPES = {
    PDF: ['application/pdf'],
    Video: ['video/mp4', 'video/webm', 'video/ogg'],
    Slides: ['application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'],
    Audio: ['audio/mpeg', 'audio/wav', 'audio/ogg']
};

/**
 * Validate file before upload
 */
export function validateFile(file: File, expectedType?: string): { valid: boolean; error?: string } {
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
        return {
            valid: false,
            error: `File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed size of 50MB`
        };
    }

    // Check file type if specified
    if (expectedType) {
        const allowedMimeTypes = ALLOWED_TYPES[expectedType as keyof typeof ALLOWED_TYPES] || [];
        if (allowedMimeTypes.length > 0 && !allowedMimeTypes.includes(file.type)) {
            return {
                valid: false,
                error: `Invalid file type. Expected ${expectedType}, got ${file.type}`
            };
        }
    }

    return { valid: true };
}

/**
 * Upload a file to Supabase Storage
 */
export async function uploadFile(options: UploadOptions): Promise<UploadResult> {
    const { file, bucket = DEFAULT_BUCKET, path, onProgress } = options;

    try {
        // Validate file
        const validation = validateFile(file);
        if (!validation.valid) {
            return {
                success: false,
                error: validation.error
            };
        }

        // Generate unique filename if path not provided
        const timestamp = Date.now();
        const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filePath = path || `${timestamp}_${sanitizedName}`;

        // Upload to Supabase Storage
        const { data, error } = await supabase.storage
            .from(bucket)
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false
            });

        if (error) {
            console.error('Upload error:', error);
            return {
                success: false,
                error: error.message
            };
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
            .from(bucket)
            .getPublicUrl(data.path);

        return {
            success: true,
            url: publicUrl,
            path: data.path
        };

    } catch (error: any) {
        console.error('Upload exception:', error);
        return {
            success: false,
            error: error.message || 'Upload failed'
        };
    }
}

/**
 * Delete a file from Supabase Storage
 */
export async function deleteFile(filePath: string, bucket: string = DEFAULT_BUCKET): Promise<boolean> {
    try {
        const { error } = await supabase.storage
            .from(bucket)
            .remove([filePath]);

        if (error) {
            console.error('Delete error:', error);
            return false;
        }

        return true;
    } catch (error) {
        console.error('Delete exception:', error);
        return false;
    }
}

/**
 * Get a signed URL for private files (optional, for future use)
 */
export async function getSignedUrl(
    filePath: string,
    expiresIn: number = 3600,
    bucket: string = DEFAULT_BUCKET
): Promise<string | null> {
    try {
        const { data, error } = await supabase.storage
            .from(bucket)
            .createSignedUrl(filePath, expiresIn);

        if (error || !data) {
            console.error('Signed URL error:', error);
            return null;
        }

        return data.signedUrl;
    } catch (error) {
        console.error('Signed URL exception:', error);
        return null;
    }
}

/**
 * Download a file
 */
export async function downloadFile(filePath: string, bucket: string = DEFAULT_BUCKET): Promise<Blob | null> {
    try {
        const { data, error } = await supabase.storage
            .from(bucket)
            .download(filePath);

        if (error || !data) {
            console.error('Download error:', error);
            return null;
        }

        return data;
    } catch (error) {
        console.error('Download exception:', error);
        return null;
    }
}

/**
 * List files in a bucket directory
 */
export async function listFiles(bucketPath: string = '', bucket: string = DEFAULT_BUCKET) {
    try {
        const { data, error } = await supabase.storage
            .from(bucket)
            .list(bucketPath);

        if (error) {
            console.error('List files error:', error);
            return [];
        }

        return data || [];
    } catch (error) {
        console.error('List files exception:', error);
        return [];
    }
}

/**
 * Get file extension from MIME type
 */
export function getExtensionFromMime(mimeType: string): string {
    const mimeMap: Record<string, string> = {
        'application/pdf': 'pdf',
        'video/mp4': 'mp4',
        'video/webm': 'webm',
        'audio/mpeg': 'mp3',
        'audio/wav': 'wav',
        'application/vnd.ms-powerpoint': 'ppt',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx'
    };

    return mimeMap[mimeType] || 'file';
}
