

import React from 'react';
import { CloseIcon, CharacterIcon, StyleIcon, AgentIcon } from './icons'; 
import { GenerationMode } from '../types';

interface HelpModalProps {
    isOpen: boolean;
    onClose: () => void;
    t: (key: string) => string;
}

const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose, t }) => {
    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/60 z-40 transition-opacity duration-300 opacity-100"
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Modal */}
            <div
                className="fixed inset-0 z-50 flex items-center justify-center p-4"
                role="dialog"
                aria-modal="true"
            >
                <div className="bg-surface rounded-xl shadow-2xl w-full max-w-lg transform transition-all duration-300 scale-100">
                    <div className="flex items-center justify-between p-4 border-b border-border">
                        <h2 className="text-lg font-semibold text-text-primary">{t('helpTitle')}</h2>
                        <button onClick={onClose} className="p-2 text-text-secondary hover:text-text-primary rounded-full transition-colors">
                            <CloseIcon />
                        </button>
                    </div>

                    <div className="p-6 space-y-6 text-text-secondary">
                        <div>
                            <h3 className="font-semibold text-text-primary mb-2">{t('helpGuidedModeTitle')}</h3>
                            <p className="text-sm">{t('helpGuidedModeDesc')}</p>
                        </div>
                        <div>
                            <h3 className="font-semibold text-text-primary mb-2">{t('helpFreestyleModeTitle')}</h3>
                            <p className="text-sm">{t('helpFreestyleModeDesc')}</p>
                        </div>
                        <div>
                            <h3 className="font-semibold text-text-primary mb-2">{t('helpAgentTitle')}</h3>
                            <p className="text-sm">{t('helpAgentDesc')}</p>
                        </div>
                    </div>
                    
                    <div className="p-4 bg-background/50 rounded-b-xl text-right">
                         <button 
                            onClick={onClose}
                            className="py-2 px-4 bg-primary text-white font-semibold rounded-lg transition-colors hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary focus:ring-offset-surface"
                         >
                            {t('helpGotIt')}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default HelpModal;