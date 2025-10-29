
import React from 'react';
import SidePanel from './SidePanel';
import { CloseIcon } from './icons';
import { GenerationMode, type HistoryItem, type ChatMessage, type Preset } from '../types';

type ActiveTab = 'history' | 'agent' | 'presets';

interface SideDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    historyItems: HistoryItem[];
    onDeleteHistoryItem: (id: number) => void;
    onReuseImage: (imageData: string, targetSlot: number | "character" | "environment" | "style") => void;
    onDownloadImage: (imageData: string) => void;
    generationMode: GenerationMode;
    // Agent Props
    agentMessages: ChatMessage[];
    onAgentSendMessage: (input: string) => Promise<void>;
    isAgentLoading: boolean;
    isLoading: boolean;
    onAbort: () => void;
    agentError: string | null;
    activeTab: ActiveTab;
    setActiveTab: (tab: ActiveTab) => void;
    agentUserInput: string;
    setAgentUserInput: (value: string) => void;
    // Presets Props
    presets: Preset[];
    onLoadPreset: (preset: Preset) => void;
    onDeletePreset: (id: number) => void;
    t: (key: string) => string;
}

const SideDrawer: React.FC<SideDrawerProps> = (props) => {
    const { isOpen, onClose } = props;

    return (
        <>
            {/* Backdrop */}
            <div
                className={`fixed inset-0 bg-black/60 z-40 transition-opacity duration-300 2xl:hidden ${
                    isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Drawer */}
            <div
                className={`fixed top-0 right-0 h-full w-full max-w-sm sm:max-w-md bg-surface shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
                    isOpen ? 'translate-x-0' : 'translate-x-full'
                }`}
                role="dialog"
                aria-modal="true"
            >
                <div className="flex flex-col h-full">
                    <div className="flex items-center justify-between p-4 border-b border-border">
                        <h2 className="text-lg font-semibold text-text-primary">{props.t('agentTab')} / {props.t('historyTab')}</h2>
                        <button onClick={onClose} className="p-2 text-text-secondary hover:text-text-primary rounded-full transition-colors">
                            <CloseIcon />
                        </button>
                    </div>
                    <div className="flex-grow overflow-hidden p-4">
                        <SidePanel {...props} />
                    </div>
                </div>
            </div>
        </>
    );
};

export default SideDrawer;
