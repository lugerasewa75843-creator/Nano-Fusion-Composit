



import React from 'react';
import { GenerationMode, type GuidedSlots } from '../types';
import ActionPlank from './ActionPlank';

interface ResultPanelProps {
  isLoading: boolean;
  isAgentInitiatedGeneration: boolean;
  loadingMessage: string;
  error: string | null;
  generatedImage: string | null;
  onReuseImage: (imageData: string, targetSlot: GuidedSlots | number) => void;
  onDownloadImage: (imageData: string) => void;
  onAbort: () => void;
  generationMode: GenerationMode;
  t: (key: string) => string;
}

const ResultPanel: React.FC<ResultPanelProps> = ({
  isLoading,
  isAgentInitiatedGeneration,
  loadingMessage,
  error,
  generatedImage,
  onReuseImage,
  onDownloadImage,
  onAbort,
  generationMode,
  t,
}) => {

  const handleDownload = () => {
    if (generatedImage) {
      onDownloadImage(generatedImage);
    }
  };

  return (
    <div className="relative bg-surface p-6 rounded-xl shadow-lg flex flex-col items-center justify-center min-h-[500px] h-full">
      {isLoading && (
         <div className="absolute inset-0 bg-black/60 z-20 flex flex-col items-center justify-center gap-4 rounded-xl">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
            <p className="text-lg font-semibold text-text-primary">{t('generatingTitle')}</p>
            <p className="text-text-secondary">{loadingMessage}</p>
            { !isAgentInitiatedGeneration && (
                <button 
                    onClick={onAbort} 
                    className="mt-4 py-2 px-6 bg-secondary text-white font-semibold rounded-lg hover:bg-border transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary focus:ring-offset-background"
                >
                    {t('stopUserGenerationButton')}
                </button>
            )}
        </div>
      )}

      {error ? (
        <div className="text-center text-red-500 z-10">
          <p className="font-bold">{t('errorTitle')}</p>
          <p className="text-sm">{error}</p>
        </div>
      ) : generatedImage ? (
        <div className="w-full h-full flex flex-col gap-4">
          <div className="relative w-full aspect-square rounded-lg overflow-hidden group">
            <img src={generatedImage} alt={t('generatedImageAlt')} className="w-full h-full object-contain" />
            <ActionPlank
                imageData={generatedImage}
                generationMode={generationMode}
                onReuse={onReuseImage}
                onDownload={handleDownload}
                t={t}
              />
          </div>
        </div>
      ) : (
        <div className={`text-center text-text-secondary transition-opacity duration-300 ${isLoading ? 'opacity-20' : 'opacity-100'}`}>
          <p className="text-lg">{t('resultPanelTitle')}</p>
          <p>{t('resultPanelDescription')}</p>
        </div>
      )}
    </div>
  );
};

export default ResultPanel;