import React, { useState, useCallback, useEffect } from 'react';
import { ChevronRightIcon, XCircleIcon, ChevronLeftIcon, PhotoIcon } from '../../constants';
import { api } from '../../lib/api';
import { Photo } from '../../types';

interface ParentPhotoGalleryScreenProps {
    schoolId?: string;
}

const ParentPhotoGalleryScreen: React.FC<ParentPhotoGalleryScreenProps> = ({ schoolId }) => {
    const [photos, setPhotos] = useState<Photo[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);

    useEffect(() => {
        loadPhotos();
    }, [schoolId]);

    const loadPhotos = async () => {
        if (!schoolId) {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const data = await api.getPhotos(schoolId);
            setPhotos(data || []);
        } catch (err) {
            console.error('Error fetching photos:', err);
        } finally {
            setLoading(false);
        }
    };

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

    if (loading) {
        return <div className="flex justify-center items-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div></div>;
    }

    if (photos.length === 0) {
        return (
            <div className="flex flex-col h-full items-center justify-center p-6 text-center bg-gray-50">
                <div className="bg-green-50 p-4 rounded-full mb-4">
                    <PhotoIcon className="h-12 w-12 text-green-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-800">No Photos Yet</h3>
                <p className="text-gray-500 mt-2">Check back later for school memories and event photos.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-gray-50">
            <main className="flex-grow p-4 overflow-y-auto">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {photos.map((photo, index) => (
                        <button
                            key={photo.id}
                            onClick={() => handleOpenPhoto(index)}
                            className="relative block w-full aspect-square rounded-lg overflow-hidden shadow-md group focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
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
                </div>
            </main>

            {selectedPhotoIndex !== null && (
                <div
                    className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 animate-fade-in"
                    onClick={handleClosePhoto}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="photo-caption"
                >
                    <div className="relative w-full max-w-lg p-4" onClick={(e) => e.stopPropagation()}>
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

                        <button onClick={handleClosePhoto} className="absolute -top-2 -right-2 text-white bg-black/50 rounded-full hover:bg-black/80" aria-label="Close photo viewer">
                            <XCircleIcon className="w-9 h-9" />
                        </button>
                    </div>

                    <button onClick={handlePrevPhoto} className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-white/20 text-white rounded-full hover:bg-white/40" aria-label="Previous photo">
                        <ChevronLeftIcon className="h-8 w-8" />
                    </button>

                    <button onClick={handleNextPhoto} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-white/20 text-white rounded-full hover:bg-white/40" aria-label="Next photo">
                        <ChevronRightIcon className="h-8 w-8" />
                    </button>
                </div>
            )}
        </div>
    );
};

export default ParentPhotoGalleryScreen;
