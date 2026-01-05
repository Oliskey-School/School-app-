// Simple UI components for the school management app
// These replace the @/components/ui/* imports that don't exist in this project

import React from 'react';

// Card Components
export const Card = ({
    children,
    className = '',
    onClick,
    ...props
}: {
    children: React.ReactNode;
    className?: string;
    onClick?: () => void;
    [key: string]: any;
}) => (
    <div
        className={`bg-white rounded-lg border border-gray-200 shadow-sm ${className} ${onClick ? 'cursor-pointer' : ''}`}
        onClick={onClick}
        {...props}
    >
        {children}
    </div>
);

export const CardHeader = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
    <div className={`p-6 ${className}`}>
        {children}
    </div>
);

export const CardTitle = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
    <h3 className={`text-lg font-semibold leading-none tracking-tight ${className}`}>
        {children}
    </h3>
);

export const CardContent = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
    <div className={`p-6 pt-0 ${className}`}>
        {children}
    </div>
);

// Button Component
export const Button = ({
    children,
    onClick,
    disabled = false,
    variant = 'default',
    size = 'default',
    className = '',
    ...props
}: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    variant?: 'default' | 'outline' | 'link';
    size?: 'default' | 'sm' | 'lg';
    className?: string;
    [key: string]: any;
}) => {
    const baseClasses = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50';

    const variantClasses = {
        default: 'bg-indigo-600 text-white hover:bg-indigo-700',
        outline: 'border border-gray-300 bg-white hover:bg-gray-50',
        link: 'underline-offset-4 hover:underline text-indigo-600',
    };

    const sizeClasses = {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 px-3 text-sm',
        lg: 'h-11 px-8',
    };

    return (
        <button
            className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
            onClick={onClick}
            disabled={disabled}
            {...props}
        >
            {children}
        </button>
    );
};

// Input Component
export const Input = ({
    className = '',
    type = 'text',
    ...props
}: {
    className?: string;
    type?: string;
    [key: string]: any;
}) => (
    <input
        type={type}
        className={`flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
        {...props}
    />
);

// Label Component
export const Label = ({
    children,
    htmlFor,
    className = '',
}: {
    children: React.ReactNode;
    htmlFor?: string;
    className?: string;
}) => (
    <label
        htmlFor={htmlFor}
        className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${className}`}
    >
        {children}
    </label>
);

// Badge Component
export const Badge = ({
    children,
    variant = 'default',
    className = '',
}: {
    children: React.ReactNode;
    variant?: 'default' | 'outline';
    className?: string;
}) => {
    const variantClasses = {
        default: 'bg-indigo-600 text-white',
        outline: 'border border-gray-300 bg-white text-gray-900',
    };

    return (
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${variantClasses[variant]} ${className}`}>
            {children}
        </span>
    );
};

// Tabs Components
export const Tabs = ({
    children,
    defaultValue,
    className = '',
}: {
    children: React.ReactNode;
    defaultValue?: string;
    className?: string;
}) => {
    const [activeTab, setActiveTab] = React.useState(defaultValue || '');

    return (
        <div className={className} data-active-tab={activeTab}>
            {React.Children.map(children, (child) => {
                if (React.isValidElement(child)) {
                    return React.cloneElement(child as React.ReactElement<any>, {
                        activeTab,
                        setActiveTab,
                    });
                }
                return child;
            })}
        </div>
    );
};

export const TabsList = ({
    children,
    className = '',
    activeTab,
    setActiveTab,
}: {
    children: React.ReactNode;
    className?: string;
    activeTab?: string;
    setActiveTab?: (tab: string) => void;
}) => (
    <div className={`inline-flex h-10 items-center justify-center rounded-md bg-gray-100 p-1 ${className}`}>
        {React.Children.map(children, (child) => {
            if (React.isValidElement(child)) {
                return React.cloneElement(child as React.ReactElement<any>, {
                    activeTab,
                    setActiveTab,
                });
            }
            return child;
        })}
    </div>
);

export const TabsTrigger = ({
    children,
    value,
    activeTab,
    setActiveTab,
    className = '',
}: {
    children: React.ReactNode;
    value: string;
    activeTab?: string;
    setActiveTab?: (tab: string) => void;
    className?: string;
}) => {
    const isActive = activeTab === value;

    return (
        <button
            className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${isActive ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                } ${className}`}
            onClick={() => setActiveTab?.(value)}
        >
            {children}
        </button>
    );
};

export const TabsContent = ({
    children,
    value,
    activeTab,
    className = '',
}: {
    children: React.ReactNode;
    value: string;
    activeTab?: string;
    className?: string;
}) => {
    if (activeTab !== value) return null;

    return (
        <div className={`mt-2 ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${className}`}>
            {children}
        </div>
    );
};

// Toast hook (simple implementation)
export const useToast = () => {
    const toast = ({
        title,
        description,
        variant = 'default',
    }: {
        title: string;
        description?: string;
        variant?: 'default' | 'destructive';
    }) => {
        // In production, this would trigger a real toast library
        // For now, we keep it silent or minimal as per polishing requirements
        // console.log(`[Toast ${variant}] ${title}`); 
    };

    return { toast };
};
