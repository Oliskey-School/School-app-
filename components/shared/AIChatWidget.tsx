
import React from 'react';
import { SparklesIcon } from '../../constants';
import { THEME_CONFIG } from '../../constants';
import { DashboardType } from '../../types';

interface AIChatWidgetProps {
    dashboardType: DashboardType;
    onClick: () => void;
}

const AIChatWidget: React.FC<AIChatWidgetProps> = ({ dashboardType, onClick }) => {
    const theme = THEME_CONFIG[dashboardType];

    return (
        <button
            onClick={onClick}
            className={`fixed bottom-[min(calc(1rem+var(--bottom-nav-height,0px)+var(--docked-bar-height,0px)),calc(100dvh-6rem))] right-4 p-4 rounded-full text-white shadow-lg transition-transform transform hover:scale-110 z-40 ${theme.mainBg}`}
            aria-label="Open AI Assistant"
        >
            <SparklesIcon className="h-7 w-7" />
        </button>
    );
};

export default AIChatWidget;
