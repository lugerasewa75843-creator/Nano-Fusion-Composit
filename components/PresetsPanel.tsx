
import React from 'react';
import { type Preset } from '../types';
import { TrashIcon } from './icons';

interface PresetsPanelProps {
  presets: Preset[];
  onLoad: (preset: Preset) => void;
  onDelete: (id: number) => void;
  t: (key: string) => string;
}

const PresetsPanel: React.FC<PresetsPanelProps> = ({ presets, onLoad, onDelete, t }) => {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-grow p-1 overflow-y-auto">
        {presets.length === 0 ? (
          <div className="text-center text-text-secondary h-full flex items-center justify-center">
            <p>{t('noPresets')}</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {presets.map(preset => (
              <li key={preset.id} className="bg-background p-3 rounded-lg flex items-center justify-between gap-2">
                <div className="flex-grow min-w-0">
                  <p className="text-sm font-semibold text-text-primary truncate" title={preset.name}>{preset.name}</p>
                  <p className="text-xs text-gray-500">{new Date(preset.timestamp).toLocaleString()}</p>
                </div>
                <div className="flex-shrink-0 flex items-center gap-2">
                  <button 
                    onClick={() => onLoad(preset)} 
                    className="py-2 px-4 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary-hover transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary focus:ring-offset-surface"
                  >
                    {t('loadPreset')}
                  </button>
                  <button 
                    onClick={() => onDelete(preset.id!)} 
                    className="p-2 text-text-secondary hover:text-white hover:bg-red-500 rounded-lg transition-colors" 
                    title={t('deletePreset')}
                  >
                    <TrashIcon />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default PresetsPanel;
