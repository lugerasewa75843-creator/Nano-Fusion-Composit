
import React from 'react';
import { GenerationMode, type GuidedSlots, type HistoryItem } from '../types';
import ActionPlank from './ActionPlank';

interface HistoryPanelProps {
  historyItems: HistoryItem[];
  onDelete: (id: number) => void;
  onReuse: (imageData: string, targetSlot: GuidedSlots | number) => void;
  onDownload: (imageData: string) => void;
  generationMode: GenerationMode;
  t: (key: string) => string;
}

const HistoryPanel: React.FC<HistoryPanelProps> = ({
  historyItems,
  onDelete,
  onReuse,
  onDownload,
  generationMode,
  t,
}) => {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-grow p-1 overflow-y-auto">
        {historyItems.length === 0 ? (
          <div className="text-center text-text-secondary h-full flex items-center justify-center">
            <p>{t('noHistory')}</p>
          </div>
        ) : (
          <ul className="space-y-4">
            {historyItems.map((item, index) => (
              <li key={item.id} className="relative bg-background p-3 rounded-lg flex gap-4 group">
                <div className="relative w-24 h-24 flex-shrink-0">
                    <img src={item.imageData} alt={item.prompt} className="w-full h-full object-cover rounded-md" />
                    <div className="absolute top-1 left-1 bg-primary/80 backdrop-blur-sm text-white text-xs font-bold px-1.5 py-0.5 rounded-full flex items-center justify-center z-10 shadow-md">
                      N{index}
                    </div>
                </div>
                <div className="flex-grow flex flex-col justify-center min-w-0">
                  <p className="text-sm text-text-secondary leading-tight truncate" title={item.prompt}>{item.prompt}</p>
                   <span className="text-xs text-gray-500 mt-1">
                    {item.type === 'generated' ? 'Generated' : 'Uploaded'} - {new Date(item.timestamp).toLocaleString()}
                  </span>
                </div>
                <ActionPlank
                    imageData={item.imageData}
                    generationMode={generationMode}
                    onReuse={onReuse}
                    onDelete={() => onDelete(item.id!)}
                    onDownload={() => onDownload(item.imageData)}
                    t={t}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default HistoryPanel;
