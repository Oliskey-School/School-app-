import React, { useState, useCallback, useEffect } from 'react';
import { ChevronRightIcon, XCircleIcon, ChevronLeftIcon } from '../../constants';
import { api } from '../../lib/api';
import CenteredLoader from '../ui/CenteredLoader';

const PhotoGalleryScreen: React.FC = () => {
    const [photos, setPhotos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);

    useEffect(() => {
        const fetchPhotos = async () => {
            try {
                const data = await api.getGalleryPhotos();
                // Map the data to the UI format — ensure the field names match the component's expectations
                const formattedPhotos = data.map((p: any) => ({
                    id: p.id,
                    imageUrl: p.file_url || p.url || p.imageUrl,
                    caption: p.caption || 'No caption'
                }));
                setPhotos(formattedPhotos);
            } catch (err) {
                console.error('Error fetching photos:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchPhotos();
    }, []);

    const handleOpenPhoto = useCallback((index: number) => {
        setSelectedPhotoIndex(index);
    }, []);

    const handleClosePhoto = useCallback(() => {
        setSelectedPhotoIndex(null);
    }, []);

    const handleNextPhoto = useCallback(() => {
        if (selectedPhotoIndex === null) return;
        setSelectedPhotoIndex((prevIndex) => (prevIndex! + 1) % photos.length);
    }, [selectedPhotoIndex, photos.length]);

    const handlePrevPhoto = useCallback(() => {
        if (selectedPhotoIndex === null) return;
        setSelectedPhotoIndex((prevIndex) => (prevIndex! - 1 + photos.length) % photos.length);
    }, [selectedPhotoIndex, photos.length]);

    if (loading) return <CenteredLoader message="Loading gallery..." />;

    return (
        <div className="flex flex-col h-full bg-gray-50">
            {/* Photo Grid */}
            <main className="flex-grow p-4 overflow-y-auto">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {photos.map((photo, index) => (
                        <button
                            key={photo.id}
                            onClick={() => handleOpenPhoto(index)}
                            className="relative block w-full aspect-square rounded-lg overflow-hidden shadow-md group focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500"
                        >
                            <img
                                src={photo.imageUrl}
                                alt={photo.caption}
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                            <p className="absolute bottom-0 left-0 right-0 p-2 text-white text-xs font-semibold">
                                {photo.caption}
                            </p>
                        </button>
                    ))}
                    {photos.length === 0 && (
                        <div className="col-span-full py-20 text-center text-gray-500">
                            No photos found in the school gallery.
                        </div>
                    )}
                </div>
            </main>

            {/* Lightbox/Modal for selected photo */}
            {selectedPhotoIndex !== null && photos.length > 0 && (
                <div 
                    className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 animate-fade-in"
                    onClick={handleClosePhoto}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="photo-caption"
                >
                    <div className="relative w-full max-w-lg p-4" onClick={(e) => e.stopPropagation()}>
                        {/* Image and Caption */}
                        <div className="bg-white rounded-lg shadow-2xl overflow-hidden">
                            <img
                                src={photos[selectedPhotoIndex].imageUrl}
                                alt={photos[selectedPhotoIndex].caption}
                                className="w-full h-auto max-h-[70vh] object-contain"
                            />
                            <p id="photo-caption" className="p-4 text-center font-semibold text-gray-800">
                                {photos[selectedPhotoIndex].caption}
                            </p>
                        </div>
                        
                        {/* Close Button */}
                        <button
                            onClick={handleClosePhoto}
                            className="absolute -top-2 -right-2 text-white bg-black/50 rounded-full hover:bg-black/80 transition-colors"
                            aria-label="Close photo viewer"
                        >
                            <XCircleIcon className="w-9 h-9" />
                        </button>
                    </div>
                    
                    {/* Prev Button */}
                    <button
                        onClick={handlePrevPhoto}
                        className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-white/20 text-white rounded-full hover:bg-white/40 transition-colors"
                        aria-label="Previous photo"
                    >
                        <ChevronLeftIcon className="h-8 w-8" />
                    </button>

                    {/* Next Button */}
                    <button
                        onClick={handleNextPhoto}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-white/20 text-white rounded-full hover:bg-white/40 transition-colors"
                        aria-label="Next photo"
                    >
                        <ChevronRightIcon className="h-8 w-8" />
                    </button>
                </div>
            )}
        </div>
    );
};

export default PhotoGalleryScreen;
