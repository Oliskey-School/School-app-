
import React, { useState } from 'react';
import { StarIcon } from '../../constants';
import { Teacher } from '../../types';

// Re-usable Line Chart component
const SimpleLineChart = ({ data, color }: { data: number[], color: string }) => {
    const width = 280;
    const height = 120;
    const padding = 20;
    const maxValue = 100;
    const stepX = (width - padding * 2) / (data.length - 1);
    const stepY = (height - padding * 2) / maxValue;
    const points = data.map((d, i) => `${padding + i * stepX},${height - padding - d * stepY}`).join(' ');
    const labels = ["Term 1", "Term 2", "Term 3"];

    return (
        <div className="relative">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
                <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#e5e7eb" strokeWidth="1" />
                <polyline fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={points} />
                {data.map((d, i) => (
                    <circle key={i} cx={padding + i * stepX} cy={height - padding - d * stepY} r="3" fill="white" stroke={color} strokeWidth="2" />
                ))}
            </svg>
            <div className="flex justify-between -mt-2 px-5">
                {labels.map(label => <span key={label} className="text-xs text-gray-500">{label}</span>)}
            </div>
        </div>
    );
};

// Re-usable Star Rating component
const StarRating = ({ count, rating, onRatingChange }: { count: number, rating: number, onRatingChange: (newRating: number) => void }) => {
    const [hoverRating, setHoverRating] = useState(0);

    return (
        <div className="flex items-center space-x-1">
            {[...Array(count)].map((_, index) => {
                const starRating = index + 1;
                return (
                    <button
                        key={starRating}
                        onClick={() => onRatingChange(starRating)}
                        onMouseEnter={() => setHoverRating(starRating)}
                        onMouseLeave={() => setHoverRating(0)}
                        aria-label={`Rate ${starRating} of ${count} stars`}
                        className="text-yellow-400 transition-transform transform hover:scale-125"
                    >
                        <StarIcon filled={starRating <= (hoverRating || rating)} className="h-7 w-7" />
                    </button>
                );
            })}
        </div>
    );
};


interface TeacherPerformanceScreenProps {
  teacher: Teacher;
}

const TeacherPerformanceScreen: React.FC<TeacherPerformanceScreenProps> = ({ teacher }) => {
    const [rating, setRating] = useState(4);
    const [feedback, setFeedback] = useState('Mrs. Akintola has shown great dedication this term. Her lesson plans are well-structured, though she could incorporate more interactive activities to boost student engagement.');
    
    // Mock data for the chart
    const performanceData = [85, 92, 88];

    return (
        <div className="flex flex-col h-full bg-gray-50">
            <main className="flex-grow p-4 space-y-5 overflow-y-auto">
                {/* Teacher Info */}
                <div className="flex items-center space-x-4 bg-white p-4 rounded-xl shadow-sm">
                     <img src={teacher.avatarUrl} alt={teacher.name} className="w-20 h-20 rounded-full object-cover" />
                     <div>
                        <p className="font-bold text-xl text-gray-800">{teacher.name}</p>
                        <p className="font-medium text-gray-500">{teacher.subjects[0]}</p>
                     </div>
                </div>
                
                {/* Overall Rating */}
                <div className="bg-white p-4 rounded-xl shadow-sm space-y-3">
                    <h3 className="font-bold text-gray-800">Overall Rating</h3>
                    <div className="flex items-center justify-between">
                        <StarRating count={5} rating={rating} onRatingChange={setRating} />
                        <span className="font-bold text-lg text-gray-700">{rating} / 5</span>
                    </div>
                </div>

                {/* Written Feedback */}
                 <div className="bg-white p-4 rounded-xl shadow-sm space-y-3">
                    <h3 className="font-bold text-gray-800">Written Feedback</h3>
                    <textarea
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        placeholder="Provide detailed feedback on performance, strengths, and areas for improvement..."
                        className="w-full h-28 p-3 text-gray-700 bg-gray-50 border border-gray-200 rounded-lg focus:ring-sky-500 focus:border-sky-500"
                        aria-label="Written feedback text area"
                    />
                </div>

                {/* Term-wise Performance */}
                 <div className="bg-white p-4 rounded-xl shadow-sm space-y-3">
                    <h3 className="font-bold text-gray-800">Term-wise Performance</h3>
                    <SimpleLineChart data={performanceData} color="#0ea5e9" />
                 </div>
            </main>
            
            {/* Action Button */}
            <div className="p-4 mt-auto bg-gray-50 border-t border-gray-200">
                <button
                    type="submit"
                    className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm font-medium text-white bg-sky-500 hover:bg-sky-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500"
                >
                    Submit Evaluation
                </button>
            </div>
        </div>
    );
};

export default TeacherPerformanceScreen;