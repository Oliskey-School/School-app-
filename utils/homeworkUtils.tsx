
import React from 'react';
import { CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { StudentAssignment } from '../types';

export const getHomeworkStatus = (assignment: StudentAssignment) => {
    const isSubmitted = !!assignment.submission;
    const isOverdue = !isSubmitted && new Date(assignment.dueDate) < new Date();

    if (isSubmitted) {
        return {
            text: 'Submitted',
            bg: 'bg-green-100',
            color: 'text-green-700',
            icon: <CheckCircle className="w-4 h-4" />,
            isComplete: true
        };
    }

    if (isOverdue) {
        return {
            text: 'Overdue',
            bg: 'bg-red-100',
            color: 'text-red-700',
            icon: <AlertCircle className="w-4 h-4" />,
            isComplete: false
        };
    }

    return {
        text: 'Pending',
        bg: 'bg-yellow-100',
        color: 'text-yellow-700',
        icon: <Clock className="w-4 h-4" />,
        isComplete: false
    };
};

