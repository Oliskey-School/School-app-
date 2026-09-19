import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

/**
 * Full-screen viewer for a profile picture (or any image).
 *
 * Mounted once at the app root; any screen opens it with `viewImage(src, alt)`
 * — no prop drilling, no per-screen modal. Closes on tap, Escape or the ✕.
 */
const EVENT = 'oliskey:view-image';

export function viewImage(src: string | null | undefined, alt = 'Photo') {
    if (!src) return;
    window.dispatchEvent(new CustomEvent(EVENT, { detail: { src, alt } }));
}

/** Click handler for an <img>: opens the picture full-screen. */
export const onImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    e.stopPropagation();
    viewImage(img.currentSrc || img.src, img.alt || 'Photo');
};

export const ImageLightbox: React.FC = () => {
    const [image, setImage] = useState<{ src: string; alt: string } | null>(null);

    useEffect(() => {
        const open = (e: Event) => setImage((e as CustomEvent).detail);
        const key = (e: KeyboardEvent) => { if (e.key === 'Escape') setImage(null); };
        window.addEventListener(EVENT, open);
        window.addEventListener('keydown', key);
        return () => { window.removeEventListener(EVENT, open); window.removeEventListener('keydown', key); };
    }, []);

    return (
        <AnimatePresence>
            {image && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    onClick={() => setImage(null)}
                    role="dialog"
                    aria-modal="true"
                    aria-label={image.alt}
                    className="fixed inset-0 z-[1000] bg-black/90 flex items-center justify-center p-4"
                >
                    <button
                        type="button"
                        onClick={() => setImage(null)}
                        aria-label="Close"
                        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/15 text-white text-2xl leading-none flex items-center justify-center hover:bg-white/25"
                    >
                        ×
                    </button>
                    <motion.img
                        initial={{ scale: 0.92, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.92, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 26 }}
                        src={image.src}
                        alt={image.alt}
                        onClick={(e) => e.stopPropagation()}
                        className="max-w-full max-h-full rounded-2xl shadow-2xl object-contain"
                    />
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default ImageLightbox;
