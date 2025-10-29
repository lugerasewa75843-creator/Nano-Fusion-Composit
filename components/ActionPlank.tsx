
import React from 'react';
import { GenerationMode, type GuidedSlots } from '../types';
import { 
    DownloadIcon, 
    TrashIcon, 
    CharacterIcon, 
    EnvironmentIcon, 
    StyleIcon 
} from './icons';

interface ActionPlankProps {
    imageData: string;
    generationMode: GenerationMode;
    onReuse: (imageData: string, targetSlot: GuidedSlots | number) => void;
    onDelete?: () => void;
    onDownload?: () => void;
    t: (key: string) => string;
}

const ActionPlank: React.FC<ActionPlankProps> = ({
    imageData,
    generationMode,
    onReuse,
    onDelete,
    onDownload,
    t
}) => {

    const buttonClass = "p-2 bg-background/70 text-white rounded-md backdrop-blur-sm hover:bg-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary";

    return (
        <div className="absolute bottom-2 right-2 flex items-center gap-1 p-1 bg-black/30 backdrop-blur-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            {onDownload && (
                <button onClick={onDownload} className={buttonClass} title="Download">
                    <DownloadIcon />
                </button>
            )}
            
            {generationMode === GenerationMode.Guided ? (
                <>
                    <button onClick={() => onReuse(imageData, 'character')} className={buttonClass} title={t('reuseAsCharacter')}>
                        <CharacterIcon />
                    </button>
                    <button onClick={() => onReuse(imageData, 'environment')} className={buttonClass} title={t('reuseAsEnvironment')}>
                        <EnvironmentIcon />
                    </button>
                    <button onClick={() => onReuse(imageData, 'style')} className={buttonClass} title={t('reuseAsStyle')}>
                        <StyleIcon />
                    </button>
                </>
            ) : (
                 <>
                    <button onClick={() => onReuse(imageData, 0)} className={buttonClass} title={t('reuseInSlot1')}>
                        <span className="font-bold text-sm">1</span>
                    </button>
                    <button onClick={() => onReuse(imageData, 1)} className={buttonClass} title={t('reuseInSlot2')}>
                        <span className="font-bold text-sm">2</span>
                    </button>
                 </>
            )}

            {onDelete && (
                <button onClick={onDelete} className={`${buttonClass} hover:!bg-red-500`} title={t('deleteHistoryItem')}>
                    <TrashIcon />
                </button>
            )}
        </div>
    );
};

export default ActionPlank;
