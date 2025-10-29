import React from 'react';

interface AgentStatusIndicatorProps {
    isVisible: boolean;
    onStop: () => void;
    t: (key: string) => string;
}

const AgentStatusIndicator: React.FC<AgentStatusIndicatorProps> = ({ isVisible, onStop, t }) => {
    if (!isVisible) {
        return null;
    }

    return (
        <div className="fixed bottom-6 left-6 z-50 flex items-center gap-3 p-3 bg-surface rounded-full shadow-lg border border-border transition-all animate-fade-in-up">
            <svg className="animate-spin h-5 w-5 text-primary" xmlns="http://www.w.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <button
                onClick={onStop}
                className="py-1 px-3 bg-secondary text-white text-sm font-semibold rounded-full hover:bg-border transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary focus:ring-offset-surface"
            >
                {t('stopAgentAction')}
            </button>
        </div>
    );
};

export default AgentStatusIndicator;