/**
 * Payload Compression Utilities
 * 
 * Compress/decompress sync payloads to reduce network usage
 */

import pako from 'pako';

/**
 * Compression methods
 */
export enum CompressionMethod {
    NONE = 'none',
    GZIP = 'gzip',
    BASE64 = 'base64'
}

/**
 * Compress data using gzip
 */
export function compressWithGzip(data: any): string {
    try {
        const json = JSON.stringify(data);
        const compressed = pako.gzip(json);
        const base64 = btoa(String.fromCharCode(...compressed));
        return base64;
    } catch (error) {
        console.error('❌ Gzip compression failed:', error);
        return JSON.stringify(data);
    }
}

/**
 * Decompress gzip data
 */
export function decompressWithGzip(compressed: string): any {
    try {
        const binary = atob(compressed);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        const decompressed = pako.ungzip(bytes, { to: 'string' });
        return JSON.parse(decompressed);
    } catch (error) {
        console.error('❌ Gzip decompression failed:', error);
        return JSON.parse(compressed);
    }
}

/**
 * Simple base64 compression
 */
export function compressWithBase64(data: any): string {
    const json = JSON.stringify(data);
    return btoa(json);
}

/**
 * Decompress base64
 */
export function decompressBase64(compressed: string): any {
    const json = atob(compressed);
    return JSON.parse(json);
}

/**
 * Compress data with automatic method selection
 */
export function compressPayload(
    data: any,
    method: CompressionMethod = CompressionMethod.GZIP
): { compressed: string; method: CompressionMethod; originalSize: number; compressedSize: number } {
    const originalSize = JSON.stringify(data).length;

    let compressed: string;
    let actualMethod = method;

    try {
        switch (method) {
            case CompressionMethod.GZIP:
                compressed = compressWithGzip(data);
                break;
            case CompressionMethod.BASE64:
                compressed = compressWithBase64(data);
                break;
            default:
                compressed = JSON.stringify(data);
                actualMethod = CompressionMethod.NONE;
        }
    } catch (error) {
        console.warn('Compression failed, using uncompressed:', error);
        compressed = JSON.stringify(data);
        actualMethod = CompressionMethod.NONE;
    }

    const compressedSize = compressed.length;

    // If compression didn't help, use original
    if (compressedSize >= originalSize && method !== CompressionMethod.NONE) {
        console.log(`⚠️ Compression ineffective (${originalSize} → ${compressedSize}), using original`);
        compressed = JSON.stringify(data);
        actualMethod = CompressionMethod.NONE;
    }

    return {
        compressed,
        method: actualMethod,
        originalSize,
        compressedSize
    };
}

/**
 * Decompress payload
 */
export function decompressPayload(
    compressed: string,
    method: CompressionMethod
): any {
    try {
        switch (method) {
            case CompressionMethod.GZIP:
                return decompressWithGzip(compressed);
            case CompressionMethod.BASE64:
                return decompressBase64(compressed);
            default:
                return JSON.parse(compressed);
        }
    } catch (error) {
        console.error('❌ Decompression failed:', error);
        return JSON.parse(compressed);
    }
}

/**
 * Batch compress multiple records
 */
export async function compressBatch(
    records: any[],
    method: CompressionMethod = CompressionMethod.GZIP
): Promise<{ compressed: string; method: CompressionMethod; stats: { originalSize: number; compressedSize: number; ratio: number } }> {
    const result = compressPayload(records, method);

    const ratio = result.originalSize > 0
        ? ((result.originalSize - result.compressedSize) / result.originalSize) * 100
        : 0;

    console.log(`📦 Batch compressed: ${result.originalSize} → ${result.compressedSize} bytes (${ratio.toFixed(1)}% reduction)`);

    return {
        compressed: result.compressed,
        method: result.method,
        stats: {
            originalSize: result.originalSize,
            compressedSize: result.compressedSize,
            ratio
        }
    };
}

/**
 * Smart compression - only compress if beneficial
 */
export function smartCompress(
    data: any,
    minSizeThreshold: number = 1024 // 1KB
): { compressed: string; method: CompressionMethod; shouldCompress: boolean } {
    const originalSize = JSON.stringify(data).length;

    // Don't compress small payloads
    if (originalSize < minSizeThreshold) {
        return {
            compressed: JSON.stringify(data),
            method: CompressionMethod.NONE,
            shouldCompress: false
        };
    }

    const result = compressPayload(data, CompressionMethod.GZIP);

    return {
        compressed: result.compressed,
        method: result.method,
        shouldCompress: result.compressedSize < result.originalSize
    };
}
