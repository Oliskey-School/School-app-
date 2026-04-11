import { useEffect, useState } from 'react';
import api from '../api';

interface QuizState {
    score: number | null;
    status: 'in_progress' | 'submitted' | 'graded';
}

export const useRealtimeQuiz = (quizId: string | number, studentId: string) => {
    const [quizState, setQuizState] = useState<QuizState>({ score: null, status: 'in_progress' });

    useEffect(() => {
        let isMounted = true;
        let pollInterval: NodeJS.Timeout;

        const fetchState = async () => {
            try {
                const data = await api.getQuizSubmission(quizId, studentId);
                
                if (data && isMounted) {
                    setQuizState({
                        score: data.score,
                        status: data.status as QuizState['status']
                    });

                    // If it's already graded or submitted, we can stop polling
                    if (data.status === 'graded' || data.status === 'submitted') {
                        clearInterval(pollInterval);
                    }
                }
            } catch (err) {
                console.error("Error fetching quiz state:", err);
            }
        };

        if (quizId && studentId) {
            fetchState();
            // Start polling every 5 seconds as a replacement for Realtime
            pollInterval = setInterval(fetchState, 5000);
        }

        return () => {
            isMounted = false;
            if (pollInterval) clearInterval(pollInterval);
        };
    }, [quizId, studentId]);

    return quizState;
};
