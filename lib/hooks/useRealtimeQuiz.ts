import { useEffect, useState } from 'react';
import { supabase } from '../supabase'; // Your type-safe client

interface QuizState {
    score: number | null;
    status: 'in_progress' | 'submitted' | 'graded';
}

export const useRealtimeQuiz = (quizId: number, studentId: string) => {
    const [quizState, setQuizState] = useState<QuizState>({ score: null, status: 'in_progress' });

    useEffect(() => {
        // 1. Initial Fetch
        const fetchInitialState = async () => {
            const { data } = await supabase
                .from('quiz_submissions')
                .select('score, status')
                .eq('quiz_id', quizId)
                .eq('student_id', studentId)
                .single();

            if (data) {
                // Cast the string status to our specific union type if necessary, or let TS infer if it matches
                setQuizState({
                    score: data.score,
                    status: data.status as QuizState['status']
                });
            }
        };

        if (quizId && studentId) {
            fetchInitialState();
        }

        // 2. Real-Time Subscription
        const channel = supabase
            .channel(`quiz-updates-${quizId}-${studentId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'quiz_submissions',
                    filter: `quiz_id=eq.${quizId}`, // Filter by Quiz
                },
                (payload) => {
                    // Verify student ID in payload to ensure relevance
                    if (payload.new.student_id === studentId) {
                        console.log('Real-time Quiz Update:', payload.new);
                        setQuizState({
                            score: payload.new.score,
                            status: payload.new.status as QuizState['status']
                        });
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [quizId, studentId]);

    return quizState;
};
