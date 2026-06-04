/**
 * Client-side image compression for inline (base64) photo uploads.
 *
 * Resizes to a max dimension and re-encodes as JPEG so a multi-megabyte phone
 * photo becomes a small data-URL (~50–150 KB). This keeps requests under the
 * server body limit and avoids bloating the database / every page load. The
 * picture still displays exactly the same on screen.
 */
export async function compressImage(
    file: File,
    maxDim = 512,
    quality = 0.8
): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('Could not read the selected image.'));
        reader.onload = () => {
            const dataUrl = reader.result as string;
            // Non-raster files (e.g. SVG) — return as-is.
            if (!/^data:image\/(png|jpe?g|webp|bmp|gif)/i.test(dataUrl)) {
                return resolve(dataUrl);
            }
            const img = new Image();
            img.onerror = () => resolve(dataUrl); // fall back to the original
            img.onload = () => {
                let { width, height } = img;
                if (width > height && width > maxDim) {
                    height = Math.round((height * maxDim) / width);
                    width = maxDim;
                } else if (height > maxDim) {
                    width = Math.round((width * maxDim) / height);
                    height = maxDim;
                }
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) return resolve(dataUrl);
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
            img.src = dataUrl;
        };
        reader.readAsDataURL(file);
    });
}
