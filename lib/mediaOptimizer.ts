/**
 * Media Optimizer - Dynamic compression for low-bandwidth environments.
 * Uses the Canvas API to resize and re-encode images.
 */

import { networkManager, ConnectionQuality } from './networkManager';

export interface OptimizationOptions {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number; // 0.0 to 1.0
    format?: 'image/jpeg' | 'image/webp' | 'image/png';
}

/**
 * Automagically determines optimization levels based on current network quality.
 */
export async function autoOptimize(file: File): Promise<File> {
    if (!file.type.startsWith('image/')) return file;

    const quality = networkManager.getQuality();
    const hasDataSaver = networkManager.hasDataSaver();

    let options: OptimizationOptions = {
        maxWidth: 1920,
        maxHeight: 1080,
        quality: 0.8,
        format: 'image/webp'
    };

    if (quality === ConnectionQuality.POOR || hasDataSaver) {
        options = {
            maxWidth: 800,
            maxHeight: 800,
            quality: 0.5,
            format: 'image/webp'
        };
        console.log('📉 Network Poor/Data Saver: Applying aggressive compression');
    } else if (quality === ConnectionQuality.FAIR) {
        options = {
            maxWidth: 1280,
            maxHeight: 1280,
            quality: 0.7,
            format: 'image/webp'
        };
        console.log('📶 Network Fair: Applying moderate compression');
    }

    try {
        return await optimizeImage(file, options);
    } catch (error) {
        console.error('❌ Optimization failed, falling back to original file:', error);
        return file;
    }
}

/**
 * Core image optimization logic using Canvas.
 */
export async function optimizeImage(file: File, options: OptimizationOptions): Promise<File> {
    return new Promise((resolve, reject) => {
        const { 
            maxWidth = 1920, 
            maxHeight = 1080, 
            quality = 0.8, 
            format = 'image/webp' 
        } = options;

        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // Aspect ratio preservation
                if (width > height) {
                    if (width > maxWidth) {
                        height *= maxWidth / width;
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width *= maxHeight / height;
                        height = maxHeight;
                    }
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Failed to get canvas context'));
                    return;
                }

                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            const optimizedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + (format === 'image/webp' ? '.webp' : '.jpg'), {
                                type: format,
                                lastModified: Date.now(),
                            });
                            
                            const reduction = ((file.size - optimizedFile.size) / file.size * 100).toFixed(1);
                            console.log(`✅ Optimized: ${file.size} -> ${optimizedFile.size} bytes (-${reduction}%)`);
                            
                            resolve(optimizedFile);
                        } else {
                            reject(new Error('Blob conversion failed'));
                        }
                    },
                    format,
                    quality
                );
            };
            img.onerror = reject;
        };
        reader.onerror = reject;
    });
}
