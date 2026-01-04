import React from 'react';
import { CheckCircleIcon, ClockIcon, XCircleIcon } from '../../constants';

interface PaymentStatusBadgeProps {
    status: 'Pending' | 'Completed' | 'Failed' | 'Processing';
    size?: 'sm' | 'md' | 'lg';
    showIcon?: boolean;
}

const PaymentStatusBadge: React.FC<PaymentStatusBadgeProps> = ({
    status,
    size = 'md',
    showIcon = true
}) => {
    const getStatusConfig = () => {
        switch (status) {
            case 'Completed':
                return {
                    bg: 'bg-green-100',
                    text: 'text-green-800',
                    border: 'border-green-200',
                    icon: <CheckCircleIcon className="w-4 h-4" />
                };
            case 'Pending':
                return {
                    bg: 'bg-yellow-100',
                    text: 'text-yellow-800',
                    border: 'border-yellow-200',
                    icon: <ClockIcon className="w-4 h-4" />
                };
            case 'Processing':
                return {
                    bg: 'bg-blue-100',
                    text: 'text-blue-800',
                    border: 'border-blue-200',
                    icon: <ClockIcon className="w-4 h-4" />
                };
            case 'Failed':
                return {
                    bg: 'bg-red-100',
                    text: 'text-red-800',
                    border: 'border-red-200',
                    icon: <XCircleIcon className="w-4 h-4" />
                };
            default:
                return {
                    bg: 'bg-gray-100',
                    text: 'text-gray-800',
                    border: 'border-gray-200',
                    icon: <ClockIcon className="w-4 h-4" />
                };
        }
    };

    const sizeClasses = {
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-2.5 py-1 text-sm',
        lg: 'px-3 py-1.5 text-base'
    };

    const config = getStatusConfig();

    return (
        <span
            className={`inline-flex items-center space-x-1 rounded-full font-medium border ${config.bg} ${config.text} ${config.border} ${sizeClasses[size]}`}
        >
            {showIcon && config.icon}
            <span>{status}</span>
        </span>
    );
};

export default PaymentStatusBadge;
