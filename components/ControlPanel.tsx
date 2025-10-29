

import React, { useRef, useState } from 'react';
import { GenerationMode, type ImageSlot, type GuidedSlots } from '../types';
import ImageUploader from './ImageUploader';
import { SaveIcon } from './icons';

interface ControlPanelProps {
  generationMode: GenerationMode;
  setGenerationMode: (mode: GenerationMode) => void;
  guidedImages: Record<GuidedSlots, ImageSlot | null>;
  freestyleImages: ImageSlot[];
  onGuidedImageUpdate: (slot: GuidedSlots, image: Partial<ImageSlot> | null) => void;
  onFreestyleImageUpdate: (index: number, image: Partial<ImageSlot> | null) => void;
  onAddFreestyleSlot: () => void;
  onSaveUploadToHistory: (file: File) => void;
  prompt: string;
  setPrompt: (prompt: string) => void;
  onGenerate: () => void;
  isGenerateDisabled: boolean;
  isPromptVisible: boolean;
  setIsPromptVisible: (visible: boolean) => void;
  isLoading: boolean;
  t: (key: string) => string;
  onSavePreset: () => void;
}

const ModeToggle: React.FC<{
  generationMode: GenerationMode;
  setGenerationMode: (mode: GenerationMode) => void;
  t: (key: string) => string;
}> = ({ generationMode, setGenerationMode, t }) => (
  <div className="flex items-center justify-center bg-background rounded-full p-1 w-full max-w-md mx-auto">
    <button
      onClick={() => setGenerationMode(GenerationMode.Guided)}
      className={`w-1/2 py-2 px-4 rounded-full text-sm font-semibold transition-colors duration-300 ease-in-out focus:outline-none ${
        generationMode === GenerationMode.Guided
          ? 'bg-primary text-white shadow-md'
          : 'bg-transparent text-text-secondary hover:bg-surface'
      }`}
    >
      {t('guidedMode')}
    </button>
    <button
      onClick={() => setGenerationMode(GenerationMode.Freestyle)}
      className={`w-1/2 py-2 px-4 rounded-full text-sm font-semibold transition-colors duration-300 ease-in-out focus:outline-none ${
        generationMode === GenerationMode.Freestyle
          ? 'bg-primary text-white shadow-md'
          : 'bg-transparent text-text-secondary hover:bg-surface'
      }`}
    >
      {t('freestyleMode')}
    </button>
  </div>
);

const PromptHelpers: React.FC<{
    generationMode: GenerationMode;
    guidedImages: Record<GuidedSlots, ImageSlot | null>;
    freestyleImages: ImageSlot[];
    onInsert: (text: string) => void;
    t: (key: string) => string;
}> = ({ generationMode, guidedImages, freestyleImages, onInsert, t }) => {
    const helpers = [];
    if (generationMode === GenerationMode.Guided) {
        if (guidedImages.character) helpers.push({ label: `[Image 1]`, text: ` image 1 ` });
        if (guidedImages.environment) helpers.push({ label: `[Image 2]`, text: ` image 2 ` });
        if (guidedImages.style) helpers.push({ label: `[Image 3]`, text: ` image 3 ` });
    } else {
        freestyleImages.forEach((img, index) => {
            if (img.file) {
                helpers.push({ label: `[${t('imageSlot')} ${index + 1}]`, text: ` image ${index + 1} ` });
            }
        });
    }

    if (helpers.length === 0) return null;

    return (
        <div className="flex flex-wrap gap-2">
            {helpers.map(helper => (
                <button
                    key={helper.label}
                    onClick={() => onInsert(helper.text)}
                    className="px-2 py-1 bg-background border border-border rounded-md text-xs text-text-secondary hover:bg-primary hover:text-white transition-colors"
                >
                    {helper.label}
                </button>
            ))}
        </div>
    );
};


const ControlPanel: React.FC<ControlPanelProps> = ({
  generationMode, setGenerationMode, guidedImages, freestyleImages,
  onGuidedImageUpdate, onFreestyleImageUpdate, onAddFreestyleSlot, onSaveUploadToHistory,
  prompt, setPrompt, onGenerate, isGenerateDisabled, isPromptVisible, setIsPromptVisible, isLoading, t,
  onSavePreset
}) => {
  const promptRef = useRef<HTMLTextAreaElement>(null);

  const handleImageSelect = (file: File, slot: GuidedSlots | number) => {
    onSaveUploadToHistory(file);
    const newImage: Partial<ImageSlot> = {
      file,
      preview: URL.createObjectURL(file),
      mimeType: file.type,
      panY: 0, // Reset pan on new image
    };
    if (typeof slot === 'string') {
      onGuidedImageUpdate(slot, newImage);
    } else {
      onFreestyleImageUpdate(slot, newImage);
    }
  };
  
  const handleInsertToPrompt = (text: string) => {
    const textarea = promptRef.current;
    if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const newPrompt = prompt.substring(0, start) + text + prompt.substring(end);
        setPrompt(newPrompt);
        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + text.length, start + text.length);
        }, 0);
    }
  };

  return (
    <div className="bg-surface p-6 rounded-xl shadow-lg flex flex-col space-y-6">
      <ModeToggle generationMode={generationMode} setGenerationMode={setGenerationMode} t={t} />

      <div className="flex-grow space-y-4">
        {generationMode === GenerationMode.Guided ? (
          <div className="flex flex-col space-y-4">
            <ImageUploader placeholderType="character" label={`1. ${t('characterSlot')}`} image={guidedImages.character} onImageSelect={(file) => handleImageSelect(file, 'character')} onImageRemove={() => onGuidedImageUpdate('character', null)} onPanChange={(y) => onGuidedImageUpdate('character', { panY: y })} t={t} />
            <ImageUploader placeholderType="environment" label={`2. ${t('environmentSlot')}`} image={guidedImages.environment} onImageSelect={(file) => handleImageSelect(file, 'environment')} onImageRemove={() => onGuidedImageUpdate('environment', null)} onPanChange={(y) => onGuidedImageUpdate('environment', { panY: y })} t={t} />
            <ImageUploader placeholderType="style" label={`3. ${t('styleObjectSlot')}`} image={guidedImages.style} onImageSelect={(file) => handleImageSelect(file, 'style')} onImageRemove={() => onGuidedImageUpdate('style', null)} onPanChange={(y) => onGuidedImageUpdate('style', { panY: y })} t={t} />
          </div>
        ) : (
          <div className="flex flex-col space-y-4">
            {freestyleImages.map((img, index) => (
              <ImageUploader 
                key={img.id} 
                label={`${t('imageSlot')} ${index + 1}`} 
                image={img.file ? img : null} 
                onImageSelect={(file) => handleImageSelect(file, index)} 
                onImageRemove={() => onFreestyleImageUpdate(index, null)} 
                onPanChange={(y) => onFreestyleImageUpdate(index, { panY: y })}
                t={t} 
                placeholderType="freestyle" 
              />
            ))}
             {freestyleImages.length < 5 && (
              <button onClick={onAddFreestyleSlot} className="flex flex-col items-center justify-center w-full h-32 text-text-secondary border-2 border-dashed border-border rounded-lg hover:bg-background hover:border-primary transition-colors">
                <span className="text-2xl">+</span>
                <span>{t('addImageButton')}</span>
              </button>
            )}
          </div>
        )}
      </div>
      
      <div className="flex-grow flex flex-col space-y-2">
        {!isPromptVisible ? (
          <div className="text-center p-4 border-2 border-dashed border-border rounded-lg">
            <button onClick={() => setIsPromptVisible(true)} className="text-primary font-semibold hover:underline">
              {t('addPromptButton')}
            </button>
            <p className="text-xs text-text-secondary mt-1">{t('promptToggleInstruction')}</p>
          </div>
        ) : (
          <>
            <textarea
              ref={promptRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={t('promptPlaceholder')}
              className="w-full h-40 p-3 bg-background border border-border rounded-lg text-text-secondary placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition resize-none"
            />
            <PromptHelpers 
                generationMode={generationMode}
                guidedImages={guidedImages}
                freestyleImages={freestyleImages}
                onInsert={handleInsertToPrompt}
                t={t}
            />
          </>
        )}
      </div>

      <div className="flex items-stretch gap-2">
        <button
          onClick={onGenerate}
          disabled={isGenerateDisabled || isLoading}
          className={`w-full py-3 px-4 text-white font-semibold rounded-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary focus:ring-offset-background ${
            isLoading
              ? 'bg-primary-hover scale-95 shadow-inner cursor-wait'
              : isGenerateDisabled
              ? 'bg-gray-500 cursor-not-allowed'
              : 'bg-primary shadow-md hover:bg-primary-hover'
          }`}
        >
          {t('generateButton')}
        </button>
        <button
          onClick={onSavePreset}
          disabled={isLoading}
          title={t('savePresetTitle')}
          className="flex-shrink-0 p-3 bg-secondary text-white font-semibold rounded-lg transition-colors hover:bg-border focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary focus:ring-offset-background disabled:bg-gray-600 disabled:cursor-not-allowed"
        >
            <SaveIcon />
        </button>
      </div>
    </div>
  );
};

export default ControlPanel;
