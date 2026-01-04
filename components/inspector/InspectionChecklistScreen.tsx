import React, { useState, useEffect } from 'react';
import {
    CheckCircle, XCircle, AlertCircle, Camera, Upload,
    ChevronDown, ChevronUp, Save, Send, FileText, Award
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface InspectionChecklistScreenProps {
    inspectionId: string;
    schoolId: number;
    onComplete: () => void;
    onBack: () => void;
}

interface ChecklistCategory {
    id: string;
    title: string;
    category: string;
    questions: Question[];
    maxScore: number;
    currentScore: number;
}

interface Question {
    id: number;
    question: string;
    max_points: number;
    required: boolean;
    score?: number;
    notes?: string;
    evidencePhoto?: string;
}

export default function InspectionChecklistScreen({
    inspectionId,
    schoolId,
    onComplete,
    onBack
}: InspectionChecklistScreenProps) {
    const [categories, setCategories] = useState<ChecklistCategory[]>([]);
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
    const [totalScore, setTotalScore] = useState(0);
    const [maxTotalScore, setMaxTotalScore] = useState(0);
    const [percentage, setPercentage] = useState(0);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadChecklistTemplates();
    }, []);

    useEffect(() => {
        calculateScores();
    }, [categories]);

    const loadChecklistTemplates = async () => {
        setLoading(true);
        try {
            // Load all active checklist templates
            const { data: templates } = await supabase
                .from('inspection_checklist_templates')
                .select('*')
                .eq('active', true)
                .order('category');

            if (templates) {
                // Load existing responses if this is a resumed inspection
                const { data: existingResponses } = await supabase
                    .from('inspection_responses')
                    .select('*')
                    .eq('inspection_id', inspectionId);

                const formattedCategories: ChecklistCategory[] = templates.map((template) => {
                    const questions = JSON.parse(JSON.stringify(template.questions)) as Question[];

                    // Merge existing responses
                    questions.forEach((q) => {
                        const existing = existingResponses?.find(
                            r => r.template_id === template.id && r.question_id === q.id
                        );
                        if (existing) {
                            q.score = existing.score;
                            q.notes = existing.notes;
                            q.evidencePhoto = existing.evidence_photo;
                        }
                    });

                    const maxScore = questions.reduce((sum, q) => sum + (q.max_points || 0), 0);
                    const currentScore = questions.reduce((sum, q) => sum + (q.score || 0), 0);

                    return {
                        id: template.id,
                        title: template.title,
                        category: template.category,
                        questions,
                        maxScore,
                        currentScore,
                    };
                });

                setCategories(formattedCategories);
                // Expand all categories by default
                setExpandedCategories(new Set(formattedCategories.map(c => c.id)));
            }
        } catch (error) {
            console.error('Error loading checklist:', error);
        } finally {
            setLoading(false);
        }
    };

    const calculateScores = () => {
        let total = 0;
        let maxTotal = 0;

        categories.forEach(category => {
            total += category.currentScore;
            maxTotal += category.maxScore;
        });

        setTotalScore(total);
        setMaxTotalScore(maxTotal);
        setPercentage(maxTotal > 0 ? Math.round((total / maxTotal) * 100) : 0);
    };

    const updateQuestionScore = (categoryId: string, questionId: number, score: number) => {
        setCategories(prev => prev.map(category => {
            if (category.id === categoryId) {
                const updatedQuestions = category.questions.map(q =>
                    q.id === questionId ? { ...q, score } : q
                );
                const currentScore = updatedQuestions.reduce((sum, q) => sum + (q.score || 0), 0);

                return {
                    ...category,
                    questions: updatedQuestions,
                    currentScore,
                };
            }
            return category;
        }));
    };

    const updateQuestionNotes = (categoryId: string, questionId: number, notes: string) => {
        setCategories(prev => prev.map(category => {
            if (category.id === categoryId) {
                return {
                    ...category,
                    questions: category.questions.map(q =>
                        q.id === questionId ? { ...q, notes } : q
                    ),
                };
            }
            return category;
        }));
    };

    const saveProgress = async () => {
        setSaving(true);
        try {
            // Delete existing responses for this inspection
            await supabase
                .from('inspection_responses')
                .delete()
                .eq('inspection_id', inspectionId);

            // Insert new responses
            const responses: any[] = [];
            categories.forEach(category => {
                category.questions.forEach(question => {
                    if (question.score !== undefined) {
                        responses.push({
                            inspection_id: inspectionId,
                            template_id: category.id,
                            question_id: question.id,
                            score: question.score,
                            notes: question.notes || null,
                            evidence_photo: question.evidencePhoto || null,
                        });
                    }
                });
            });

            if (responses.length > 0) {
                await supabase.from('inspection_responses').insert(responses);
            }

            // Update inspection record
            await supabase
                .from('inspections')
                .update({
                    total_score: totalScore,
                    max_score: maxTotalScore,
                    percentage,
                    status: 'In Progress',
                    updated_at: new Date().toISOString(),
                })
                .eq('id', inspectionId);

            alert('✅ Progress saved successfully!');
        } catch (error) {
            console.error('Error saving progress:', error);
            alert('❌ Failed to save progress');
        } finally {
            setSaving(false);
        }
    };

    const completeInspection = async () => {
        // Check if all required questions are answered
        const unansweredRequired: string[] = [];
        categories.forEach(category => {
            category.questions.forEach(q => {
                if (q.required && q.score === undefined) {
                    unansweredRequired.push(`${category.title}: ${q.question}`);
                }
            });
        });

        if (unansweredRequired.length > 0) {
            alert(`Please answer all required questions:\n\n${unansweredRequired.join('\n')}`);
            return;
        }

        await saveProgress();

        // Determine overall rating based on percentage
        let overallRating = 'Inadequate';
        if (percentage >= 90) overallRating = 'Outstanding';
        else if (percentage >= 75) overallRating = 'Good';
        else if (percentage >= 50) overallRating = 'Requires Improvement';

        // Update inspection to completed
        await supabase
            .from('inspections')
            .update({
                status: 'Completed',
                overall_rating: overallRating,
            })
            .eq('id', inspectionId);

        onComplete();
    };

    const toggleCategory = (categoryId: string) => {
        setExpandedCategories(prev => {
            const newSet = new Set(prev);
            if (newSet.has(categoryId)) {
                newSet.delete(categoryId);
            } else {
                newSet.add(categoryId);
            }
            return newSet;
        });
    };

    const getOverallRating = () => {
        if (percentage >= 90) return { label: 'Outstanding', color: 'text-emerald-600' };
        if (percentage >= 75) return { label: 'Good', color: 'text-blue-600' };
        if (percentage >= 50) return { label: 'Requires Improvement', color: 'text-amber-600' };
        return { label: 'Inadequate', color: 'text-red-600' };
    };

    const rating = getOverallRating();

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-50">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-slate-600 font-medium">Loading inspection checklist...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 lg:p-8">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <button
                        onClick={onBack}
                        className="mb-4 flex items-center gap-2 text-slate-600 hover:text-slate-900 font-medium"
                    >
                        ← Back
                    </button>
                    <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-2xl font-bold text-slate-900 mb-2">
                                    Inspection Checklist
                                </h1>
                                <p className="text-slate-600">Complete all sections to finalize inspection</p>
                            </div>
                            <div className="text-right">
                                <div className={`text-3xl font-bold ${rating.color} mb-1`}>
                                    {percentage}%
                                </div>
                                <div className="text-sm text-slate-600">
                                    {totalScore} / {maxTotalScore} points
                                </div>
                                <div className={`text-sm font-semibold ${rating.color} mt-1`}>
                                    {rating.label}
                                </div>
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="mt-6">
                            <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
                                    style={{ width: `${percentage}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Checklist Categories */}
                <div className="space-y-4 mb-8">
                    {categories.map((category) => (
                        <CategoryCard
                            key={category.id}
                            category={category}
                            isExpanded={expandedCategories.has(category.id)}
                            onToggle={() => toggleCategory(category.id)}
                            onUpdateScore={updateQuestionScore}
                            onUpdateNotes={updateQuestionNotes}
                        />
                    ))}
                </div>

                {/* Action Buttons */}
                <div className="sticky bottom-6 bg-white rounded-2xl shadow-xl border border-slate-200 p-6">
                    <div className="flex gap-4">
                        <button
                            onClick={saveProgress}
                            disabled={saving}
                            className="flex-1 py-3 px-6 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            <Save className="w-5 h-5" />
                            {saving ? 'Saving...' : 'Save Progress'}
                        </button>
                        <button
                            onClick={completeInspection}
                            className="flex-1 py-3 px-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all flex items-center justify-center gap-2"
                        >
                            <Send className="w-5 h-5" />
                            Complete Inspection
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Category Card Component
function CategoryCard({ category, isExpanded, onToggle, onUpdateScore, onUpdateNotes }: any) {
    const completionPercentage = category.maxScore > 0
        ? Math.round((category.currentScore / category.maxScore) * 100)
        : 0;

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            {/* Category Header */}
            <button
                onClick={onToggle}
                className="w-full p-6 flex items-center justify-between hover:bg-slate-50 transition-colors"
            >
                <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${getCategoryColor(category.category)}`}>
                        {getCategoryIcon(category.category)}
                    </div>
                    <div className="text-left">
                        <h3 className="text-lg font-bold text-slate-900">{category.title}</h3>
                        <p className="text-sm text-slate-600">
                            {category.currentScore} / {category.maxScore} points ({completionPercentage}%)
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="w-24 bg-slate-200 rounded-full h-2">
                        <div
                            className="bg-indigo-500 h-2 rounded-full transition-all"
                            style={{ width: `${completionPercentage}%` }}
                        />
                    </div>
                    {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-slate-400" />
                    ) : (
                        <ChevronDown className="w-5 h-5 text-slate-400" />
                    )}
                </div>
            </button>

            {/* Questions */}
            {isExpanded && (
                <div className="border-t border-slate-200 p-6 bg-slate-50/50">
                    <div className="space-y-6">
                        {category.questions.map((question: Question) => (
                            <QuestionCard
                                key={question.id}
                                question={question}
                                categoryId={category.id}
                                onUpdateScore={onUpdateScore}
                                onUpdateNotes={onUpdateNotes}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// Question Card Component
function QuestionCard({ question, categoryId, onUpdateScore, onUpdateNotes }: any) {
    const [showNotes, setShowNotes] = useState(!!question.notes);

    return (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-start gap-4">
                <div className="flex-1">
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                            <h4 className="font-semibold text-slate-900 mb-1">
                                {question.question}
                                {question.required && <span className="text-red-500 ml-1">*</span>}
                            </h4>
                            <p className="text-sm text-slate-600">Max points: {question.max_points}</p>
                        </div>
                    </div>

                    {/* Score Selection */}
                    <div className="flex items-center gap-2 mb-3">
                        {Array.from({ length: question.max_points + 1 }, (_, i) => i).map((score) => (
                            <button
                                key={score}
                                onClick={() => onUpdateScore(categoryId, question.id, score)}
                                className={`w-10 h-10 rounded-lg font-semibold transition-all ${question.score === score
                                        ? 'bg-indigo-600 text-white shadow-lg scale-110'
                                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                    }`}
                            >
                                {score}
                            </button>
                        ))}
                    </div>

                    {/* Notes Section */}
                    <button
                        onClick={() => setShowNotes(!showNotes)}
                        className="text-sm text-indigo-600 font-medium hover:text-indigo-700 mb-2"
                    >
                        {showNotes ? '− Hide Notes' : '+ Add Notes'}
                    </button>

                    {showNotes && (
                        <textarea
                            value={question.notes || ''}
                            onChange={(e) => onUpdateNotes(categoryId, question.id, e.target.value)}
                            placeholder="Add inspection notes for this question..."
                            className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                            rows={3}
                        />
                    )}
                </div>

                {/* Evidence Upload (placeholder) */}
                <button className="p-3 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
                    <Camera className="w-5 h-5 text-slate-600" />
                </button>
            </div>
        </div>
    );
}

// Helper functions
function getCategoryColor(category: string) {
    const colors: any = {
        'Documentation': 'bg-blue-100 text-blue-600',
        'Facilities': 'bg-purple-100 text-purple-600',
        'Teaching Quality': 'bg-emerald-100 text-emerald-600',
        'Health & Safety': 'bg-amber-100 text-amber-600',
    };
    return colors[category] || 'bg-slate-100 text-slate-600';
}

function getCategoryIcon(category: string) {
    const icons: any = {
        'Documentation': <FileText className="w-5 h-5" />,
        'Facilities': <CheckCircle className="w-5 h-5" />,
        'Teaching Quality': <Award className="w-5 h-5" />,
        'Health & Safety': <AlertCircle className="w-5 h-5" />,
    };
    return icons[category] || <FileText className="w-5 h-5" />;
}
