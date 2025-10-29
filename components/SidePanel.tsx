
import React from 'react';
import { GenerationMode, type ChatMessage, type GuidedSlots, type HistoryItem, type Preset } from '../types';
import HistoryPanel from './HistoryPanel';
import AgentPanel from './AgentPanel';
import PresetsPanel from './PresetsPanel';
import { AgentIcon, HistoryIcon, PresetIcon } from './icons';

type ActiveTab = 'history' | 'agent' | 'presets';

interface SidePanelProps {
    historyItems: HistoryItem[];
    onDeleteHistoryItem: (id: number) => void;
    onReuseImage: (imageData: string, targetSlot: GuidedSlots | number) => void;
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


const SidePanel: React.FC<SidePanelProps> = (props) => {
  const { activeTab, setActiveTab } = props;

  const getTabClass = (tabName: ActiveTab) => 
    `w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-semibold transition-colors duration-300 ease-in-out focus:outline-none ${
        activeTab === tabName
        ? 'bg-primary text-white shadow-md'
        : 'bg-transparent text-text-secondary hover:bg-surface'
    }`;


  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-center bg-background rounded-lg p-1 mb-4">
        <button onClick={() => setActiveTab('agent')} className={getTabClass('agent')}>
            <AgentIcon />
            {props.t('agentTab')}
        </button>
        <button onClick={() => setActiveTab('history')} className={getTabClass('history')}>
            <HistoryIcon />
            {props.t('historyTab')}
        </button>
        <button onClick={() => setActiveTab('presets')} className={getTabClass('presets')}>
            <PresetIcon />
            {props.t('presetsTab')}
        </button>
      </div>
      <div className="flex-grow h-0">
        {activeTab === 'history' && (
          <HistoryPanel
            historyItems={props.historyItems}
            onDelete={props.onDeleteHistoryItem}
            onReuse={props.onReuseImage}
            onDownload={props.onDownloadImage}
            generationMode={props.generationMode}
            t={props.t}
          />
        )}
        {activeTab === 'agent' && (
          <AgentPanel
            messages={props.agentMessages}
            onAgentSendMessage={props.onAgentSendMessage}
            isAgentLoading={props.isAgentLoading}
            isLoading={props.isLoading}
            onAbortAgent={props.onAbort}
            agentError={props.agentError}
            userInput={props.agentUserInput}
            setUserInput={props.setAgentUserInput}
            t={props.t}
          />
        )}
        {activeTab === 'presets' && (
            <PresetsPanel
                presets={props.presets}
                onLoad={props.onLoadPreset}
                onDelete={props.onDeletePreset}
                t={props.t}
            />
        )}
      </div>
    </div>
  );
};

export default SidePanel;
