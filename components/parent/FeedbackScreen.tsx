
import React, { useState, useRef } from 'react';
import { mockComplaints } from '../../data';
import { Complaint, ComplaintStatus } from '../../types';
import { CameraIcon, ChevronRightIcon, StarIcon, CheckCircleIcon, ClockIcon } from '../../constants';

const StarRatingInput = ({ rating, setRating }: { rating: number, setRating: (r: number) => void }) => (
    <div className="flex items-center justify-center space-x-2">
        {[...Array(5)].map((_, index) => (
            <button
                key={index}
                type="button"
                onClick={() => setRating(index + 1)}
                className="text-gray-300 transition-colors"
                aria-label={`Rate ${index + 1} star`}
            >
                <StarIcon filled={index < rating} className={`h-8 w-8 ${index < rating ? 'text-yellow-400' : 'text-gray-300'}`} />
            </button>
        ))}
    </div>
);

const SubmitNewTab: React.FC<{ onSubmitted: () => void }> = ({ onSubmitted }) => {
    const [category, setCategory] = useState('');
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [image, setImage] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = (event) => {
                setImage(event.target?.result as string);
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    };
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!category || !comment) {
            alert('Please select a category and provide a comment.');
            return;
        }

        const newComplaint: Complaint = {
            id: `COMP-${Date.now()}`,
            category: category as Complaint['category'],
            rating,
            comment,
            imageUrl: image || undefined,
            timeline: [
                {
                    timestamp: new Date().toISOString(),
                    status: 'Submitted',
                    comment: comment,
                    by: 'You',
                }
            ]
        };
        mockComplaints.unshift(newComplaint);
        onSubmitted();
    };
    
    return (
        <form onSubmit={handleSubmit} className="p-4 space-y-5">
            <div>
                <label className="text-sm font-medium text-gray-700">Category</label>
                <select value={category} onChange={e => setCategory(e.target.value)} required className="mt-1 w-full p-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500">
                    <option value="">Select a category...</option>
                    <option>Bus Service</option>
                    <option>Academics</option>
                    <option>Teacher Conduct</option>
                    <option>Facilities</option>
                    <option>Other</option>
                </select>
            </div>
            <div>
                <label className="text-sm font-medium text-gray-700 text-center block">Rating</label>
                <StarRatingInput rating={rating} setRating={setRating} />
            </div>
            <div>
                 <label htmlFor="comment" className="text-sm font-medium text-gray-700">Comments</label>
                 <textarea id="comment" value={comment} onChange={e => setComment(e.target.value)} rows={5} placeholder="Share your feedback in detail..." required className="mt-1 w-full p-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"></textarea>
            </div>
            <div>
                 <label className="text-sm font-medium text-gray-700">Attach Photo (Optional)</label>
                 <input type="file" ref={fileInputRef} onChange={handleImageChange} className="hidden" accept="image/*" />
                 <button type="button" onClick={() => fileInputRef.current?.click()} className="mt-1 w-full flex items-center justify-center space-x-2 p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-green-400 hover:text-green-600">
                     <CameraIcon className="h-5 w-5" />
                     <span>{image ? "Change Photo" : "Upload Photo"}</span>
                 </button>
                 {image && <img src={image} alt="Preview" className="mt-3 rounded-lg max-h-40 mx-auto" />}
            </div>
             <button type="submit" className="w-full py-3 px-4 font-medium text-white bg-green-500 rounded-lg shadow-sm hover:bg-green-600">Submit Feedback</button>
        </form>
    );
};

const StatusTimeline: React.FC<{ complaint: Complaint }> = ({ complaint }) => {
    const statusConfig: { [key in ComplaintStatus]: { icon: React.ComponentType<{ className?: string }>, color: string } } = {
        Submitted: { icon: ClockIcon, color: 'bg-blue-500' },
        'In Progress': { icon: ClockIcon, color: 'bg-amber-500' },
        Resolved: { icon: CheckCircleIcon, color: 'bg-green-500' },
        Closed: { icon: CheckCircleIcon, color: 'bg-gray-500' },
    };
    
    return (
        <div className="p-4 bg-gray-50 rounded-b-lg">
            {complaint.timeline.map((update, index) => {
                const Icon = statusConfig[update.status].icon;
                return (
                    <div key={index} className="flex space-x-4">
                        <div className="flex flex-col items-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${statusConfig[update.status].color}`}>
                                <Icon className="h-5 w-5" />
                            </div>
                            {index < complaint.timeline.length - 1 && <div className="w-0.5 flex-grow bg-gray-300"></div>}
                        </div>
                        <div className="pb-6">
                            <p className="font-bold text-gray-800">{update.status} <span className="text-xs text-gray-500 font-normal">- {new Date(update.timestamp).toLocaleDateString()}</span></p>
                            <p className="text-sm text-gray-600 mt-1">{update.comment}</p>
                            <p className="text-xs text-gray-400 mt-1">by {update.by}</p>
                        </div>
                    </div>
                )
            })}
        </div>
    );
}

const TrackStatusTab: React.FC = () => {
    const [openId, setOpenId] = useState<string | null>(mockComplaints[0]?.id || null);

    const statusColors = {
        Submitted: 'bg-blue-100 text-blue-800',
        'In Progress': 'bg-amber-100 text-amber-800',
        Resolved: 'bg-green-100 text-green-800',
        Closed: 'bg-gray-100 text-gray-800',
    };
    
    return (
        <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {mockComplaints.map(c => {
                    const latestStatus = c.timeline[c.timeline.length - 1].status;
                    const isOpen = openId === c.id;
                    return (
                        <div key={c.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
                            <button onClick={() => setOpenId(isOpen ? null : c.id)} className="w-full flex justify-between items-center p-4 text-left">
                                <div>
                                    <h4 className="font-bold text-gray-800">{c.category}</h4>
                                    <span className={`mt-1 text-xs font-semibold px-2 py-0.5 rounded-full ${statusColors[latestStatus]}`}>{latestStatus}</span>
                                </div>
                                <ChevronRightIcon className={`h-5 w-5 text-gray-400 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                            </button>
                            {isOpen && <StatusTimeline complaint={c} />}
                        </div>
                    )
                })}
            </div>
        </div>
    );
};

interface FeedbackScreenProps {
    forceUpdate: () => void;
}

const FeedbackScreen: React.FC<FeedbackScreenProps> = ({ forceUpdate }) => {
    const [activeTab, setActiveTab] = useState<'submit' | 'track'>('submit');
    const theme = { mainBg: 'bg-green-500', textColor: 'text-green-600' };
    
    const handleFormSubmitted = () => {
        forceUpdate();
        alert('Feedback submitted successfully!');
        setActiveTab('track');
    };

    return (
        <div className="flex flex-col h-full bg-gray-100">
            <div className="p-2 bg-white/80 backdrop-blur-sm border-b border-gray-200">
                <div className="flex space-x-1 bg-gray-200 p-1 rounded-lg">
                    <button onClick={() => setActiveTab('submit')} className={`w-1/2 py-2 text-sm font-semibold rounded-md transition-colors ${activeTab === 'submit' ? `${theme.mainBg} text-white shadow` : 'text-gray-600'}`}>Submit New</button>
                    <button onClick={() => setActiveTab('track')} className={`w-1/2 py-2 text-sm font-semibold rounded-md transition-colors ${activeTab === 'track' ? `${theme.mainBg} text-white shadow` : 'text-gray-600'}`}>Track Status</button>
                </div>
            </div>

            <div className="flex-grow overflow-y-auto">
                {activeTab === 'submit' ? <SubmitNewTab onSubmitted={handleFormSubmitted} /> : <TrackStatusTab />}
            </div>
        </div>
    );
};

export default FeedbackScreen;
