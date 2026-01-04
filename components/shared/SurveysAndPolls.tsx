import React, { useState, useEffect } from 'react';
import { useProfile } from '../../context/ProfileContext';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { CheckCircle, BarChart2, MessageSquare, Star, ThumbsUp } from 'lucide-react';

interface Survey {
    id: number;
    title: string;
    description: string;
    start_date: string;
    end_date: string;
    target_audience: string;
    is_anonymous: boolean;
    is_active: boolean;
    response_count: number;
}

interface Question {
    id: number;
    survey_id: number;
    question_text: string;
    question_type: string;
    question_order: number;
    options: string[];
    is_required: boolean;
}

const SurveysAndPolls: React.FC = () => {
    const { profile } = useProfile();
    const [surveys, setSurveys] = useState<Survey[]>([]);
    const [selectedSurvey, setSelectedSurvey] = useState<Survey | null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [responses, setResponses] = useState<{ [key: number]: any }>({});
    const [loading, setLoading] = useState(true);
    const [hasResponded, setHasResponded] = useState(false);
    const [showSurveyModal, setShowSurveyModal] = useState(false);

    useEffect(() => {
        fetchSurveys();
    }, []);

    const fetchSurveys = async () => {
        try {
            const today = new Date().toISOString().split('T')[0];

            const { data, error } = await supabase
                .from('surveys')
                .select('*')
                .eq('is_active', true)
                .lte('start_date', today)
                .gte('end_date', today)
                .in('target_audience', ['Parents', 'All'])
                .order('created_at', { ascending: false });

            if (error) throw error;
            setSurveys(data || []);
        } catch (error: any) {
            console.error('Error fetching surveys:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchQuestions = async (surveyId: number) => {
        try {
            const { data, error } = await supabase
                .from('survey_questions')
                .select('*')
                .eq('survey_id', surveyId)
                .order('question_order', { ascending: true });

            if (error) throw error;
            setQuestions(data || []);

            // Check if user has already responded
            const { data: existingResponse } = await supabase
                .from('survey_responses')
                .select('id')
                .eq('survey_id', surveyId)
                .eq('user_id', profile.id)
                .limit(1);

            setHasResponded(!!existingResponse && existingResponse.length > 0);
        } catch (error: any) {
            console.error('Error fetching questions:', error);
        }
    };

    const handleSelectSurvey = async (survey: Survey) => {
        setSelectedSurvey(survey);
        await fetchQuestions(survey.id);
        setShowSurveyModal(true);
    };

    const handleResponseChange = (questionId: number, value: any) => {
        setResponses(prev => ({
            ...prev,
            [questionId]: value
        }));
    };

    const handleSubmitSurvey = async () => {
        if (!selectedSurvey) return;

        // Validate required questions
        const unanswered = questions.filter(q =>
            q.is_required && !responses[q.id]
        );

        if (unanswered.length > 0) {
            toast.error(`Please answer all required questions (${unanswered.length} remaining)`);
            return;
        }

        try {
            // Insert all responses
            const responseData = questions.map(q => ({
                survey_id: selectedSurvey.id,
                question_id: q.id,
                user_id: selectedSurvey.is_anonymous ? null : profile.id,
                user_type: 'Parent',
                response_text: q.question_type === 'Text' ? responses[q.id] : null,
                response_option: q.question_type === 'Multiple Choice' || q.question_type === 'Yes/No' ? responses[q.id] : null,
                rating: q.question_type === 'Rating' ? responses[q.id] : null
            }));

            const { error } = await supabase
                .from('survey_responses')
                .insert(responseData);

            if (error) throw error;

            // Update survey response count
            await supabase
                .from('surveys')
                .update({ response_count: selectedSurvey.response_count + 1 })
                .eq('id', selectedSurvey.id);

            toast.success('Thank you for your feedback! 🎉');
            setShowSurveyModal(false);
            setResponses({});
            fetchSurveys();
        } catch (error: any) {
            toast.error('Failed to submit survey');
            console.error(error);
        }
    };

    const renderQuestion = (question: Question) => {
        switch (question.question_type) {
            case 'Multiple Choice':
                return (
                    <div className="space-y-2">
                        {question.options.map((option, index) => (
                            <label key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors">
                                <input
                                    type="radio"
                                    name={`question-${question.id}`}
                                    value={option}
                                    checked={responses[question.id] === option}
                                    onChange={(e) => handleResponseChange(question.id, e.target.value)}
                                    className="w-4 h-4 text-indigo-600"
                                />
                                <span className="text-gray-800">{option}</span>
                            </label>
                        ))}
                    </div>
                );

            case 'Checkbox':
                return (
                    <div className="space-y-2">
                        {question.options.map((option, index) => (
                            <label key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors">
                                <input
                                    type="checkbox"
                                    checked={(responses[question.id] || []).includes(option)}
                                    onChange={(e) => {
                                        const current = responses[question.id] || [];
                                        const updated = e.target.checked
                                            ? [...current, option]
                                            : current.filter((o: string) => o !== option);
                                        handleResponseChange(question.id, updated);
                                    }}
                                    className="w-4 h-4 text-indigo-600 rounded"
                                />
                                <span className="text-gray-800">{option}</span>
                            </label>
                        ))}
                    </div>
                );

            case 'Text':
                return (
                    <textarea
                        value={responses[question.id] || ''}
                        onChange={(e) => handleResponseChange(question.id, e.target.value)}
                        placeholder="Your answer..."
                        rows={4}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    ></textarea>
                );

            case 'Rating':
                return (
                    <div className="flex space-x-2">
                        {[1, 2, 3, 4, 5].map(rating => (
                            <button
                                key={rating}
                                type="button"
                                onClick={() => handleResponseChange(question.id, rating)}
                                className={`p-3 rounded-lg transition-all ${responses[question.id] >= rating
                                        ? 'bg-yellow-400 text-white scale-110'
                                        : 'bg-gray-200 text-gray-400 hover:bg-gray-300'
                                    }`}
                            >
                                <Star className="h-6 w-6 fill-current" />
                            </button>
                        ))}
                        <span className="ml-2 text-gray-600 self-center">
                            {responses[question.id] ? `${responses[question.id]}/5` : 'Not rated'}
                        </span>
                    </div>
                );

            case 'Yes/No':
                return (
                    <div className="flex space-x-4">
                        <button
                            type="button"
                            onClick={() => handleResponseChange(question.id, 'Yes')}
                            className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all ${responses[question.id] === 'Yes'
                                    ? 'bg-green-600 text-white'
                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                }`}
                        >
                            <ThumbsUp className="h-5 w-5 inline mr-2" />
                            Yes
                        </button>
                        <button
                            type="button"
                            onClick={() => handleResponseChange(question.id, 'No')}
                            className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all ${responses[question.id] === 'No'
                                    ? 'bg-red-600 text-white'
                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                }`}
                        >
                            No
                        </button>
                    </div>
                );

            default:
                return null;
        }
    };

    if (loading) {
        return <div className="flex justify-center items-center h-64"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>;
    }

    return (
        <div className="p-6 max-w-4xl mx-auto">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-6 text-white mb-6">
                <h1 className="text-3xl font-bold mb-2">Surveys & Polls</h1>
                <p className="text-purple-100">Your voice matters - share your feedback</p>
            </div>

            {/* Active Surveys */}
            <div className="space-y-4">
                {surveys.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-500">
                        <BarChart2 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                        <p className="text-lg">No active surveys at the moment</p>
                        <p className="text-sm">Check back later for new surveys</p>
                    </div>
                ) : (
                    surveys.map(survey => (
                        <div key={survey.id} className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-6">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex-1">
                                    <h3 className="text-xl font-bold text-gray-900 mb-2">{survey.title}</h3>
                                    <p className="text-gray-600 mb-3">{survey.description}</p>
                                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                                        <div className="flex items-center space-x-1">
                                            <MessageSquare className="h-4 w-4" />
                                            <span>{survey.response_count} responses</span>
                                        </div>
                                        {survey.is_anonymous && (
                                            <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-semibold">
                                                Anonymous
                                            </span>
                                        )}
                                        <span className="text-xs">
                                            Ends: {new Date(survey.end_date).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleSelectSurvey(survey)}
                                    className="ml-4 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold transition-colors"
                                >
                                    Take Survey
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Survey Modal */}
            {showSurveyModal && selectedSurvey && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="bg-white rounded-xl max-w-2xl w-full my-8">
                        <div className="p-6">
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">{selectedSurvey.title}</h2>
                            <p className="text-gray-600 mb-6">{selectedSurvey.description}</p>

                            {hasResponded ? (
                                <div className="text-center py-12">
                                    <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
                                    <h3 className="text-xl font-bold text-gray-900 mb-2">Already Submitted</h3>
                                    <p className="text-gray-600">Thank you for your previous response!</p>
                                    <button
                                        onClick={() => setShowSurveyModal(false)}
                                        className="mt-6 px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold"
                                    >
                                        Close
                                    </button>
                                </div>
                            ) : (
                                <>
                                    {/* Questions */}
                                    <div className="space-y-6 mb-6 max-h-[60vh] overflow-y-auto">
                                        {questions.map((question, index) => (
                                            <div key={question.id} className="pb-6 border-b border-gray-200 last:border-0">
                                                <label className="block text-lg font-semibold text-gray-900 mb-3">
                                                    {index + 1}. {question.question_text}
                                                    {question.is_required && <span className="text-red-500 ml-1">*</span>}
                                                </label>
                                                {renderQuestion(question)}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Actions */}
                                    <div className="flex space-x-3 pt-4 border-t border-gray-200">
                                        <button
                                            onClick={() => {
                                                setShowSurveyModal(false);
                                                setResponses({});
                                            }}
                                            className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleSubmitSurvey}
                                            className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold"
                                        >
                                            Submit Survey
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SurveysAndPolls;
