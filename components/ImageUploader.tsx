
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { type ImageSlot } from '../types';
import { TrashIcon, CharacterPlaceholderIcon, EnvironmentPlaceholderIcon, StylePlaceholderIcon, FreestylePlaceholderIcon } from './icons';

interface ImageUploaderProps {
  label: string;
  image: ImageSlot | null;
  onImageSelect: (file: File) => void;
  onImageRemove: () => void;
  onPanChange: (y: number) => void;
  t: (key: string) => string;
  placeholderType?: 'character' | 'environment' | 'style' | 'freestyle';
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ label, image, onImageSelect, onImageRemove, onPanChange, t, placeholderType }) => {
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // State for image panning
  const [isPanning, setIsPanning] = useState(false);
  const [dragStart, setDragStart] = useState({ y: 0, initialPosition: 0 });
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const position = image?.panY ?? 0;

  const handleFileSelect = (files: FileList | null) => {
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        onImageSelect(file);
      }
    }
  };

  const onDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation(); setIsDraggingOver(true);
  };
  const onDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation(); setIsDraggingOver(false);
  };
  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation();
  };
  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation(); setIsDraggingOver(false); handleFileSelect(e.dataTransfer.files);
  };

  const clampPosition = useCallback((newPosition: number) => {
    const imageEl = imageRef.current;
    const containerEl = containerRef.current;
    if (imageEl && containerEl) {
      const containerHeight = containerEl.clientHeight;
      const imageHeight = imageEl.clientHeight;
      if (imageHeight <= containerHeight) return 0; // No panning if image fits

      const minPosition = containerHeight - imageHeight;
      const maxPosition = 0;
      return Math.max(minPosition, Math.min(maxPosition, newPosition));
    }
    return newPosition;
  }, []);

  const handlePanMove = useCallback((clientY: number) => {
    if (!isPanning) return;
    const deltaY = clientY - dragStart.y;
    const newPosition = dragStart.initialPosition + deltaY;
    onPanChange(clampPosition(newPosition));
  }, [isPanning, dragStart, onPanChange, clampPosition]);
  
  const handlePanEnd = useCallback(() => setIsPanning(false), []);

  // Mouse event handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLImageElement>) => {
    e.preventDefault();
    const imageEl = imageRef.current;
    const containerEl = containerRef.current;
    if (!imageEl || !containerEl || imageEl.clientHeight <= containerEl.clientHeight) return;
    setIsPanning(true);
    setDragStart({ y: e.clientY, initialPosition: position });
  };
  
  // Touch event handlers
  const handleTouchStart = (e: React.TouchEvent<HTMLImageElement>) => {
    const imageEl = imageRef.current;
    const containerEl = containerRef.current;
    if (!imageEl || !containerEl || imageEl.clientHeight <= containerEl.clientHeight) return;
    setIsPanning(true);
    setDragStart({ y: e.touches[0].clientY, initialPosition: position });
  };
  
  // Global listeners for move and end events
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => handlePanMove(e.clientY);
    const handleTouchMove = (e: TouchEvent) => handlePanMove(e.touches[0].clientY);

    if (isPanning) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handlePanEnd);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handlePanEnd);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handlePanEnd);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handlePanEnd);
    };
  }, [isPanning, handlePanMove, handlePanEnd]);


  const renderPlaceholder = () => {
    if (image) return null;
    let IconComponent;
    switch (placeholderType) {
        case 'character': IconComponent = CharacterPlaceholderIcon; break;
        case 'environment': IconComponent = EnvironmentPlaceholderIcon; break;
        case 'style': IconComponent = StylePlaceholderIcon; break;
        case 'freestyle': IconComponent = FreestylePlaceholderIcon; break;
        default: return null;
    }
    return <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><IconComponent /></div>;
  };

  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-text-secondary mb-1">{label}</label>
      <div
        ref={containerRef}
        className={`relative w-full h-32 rounded-lg border-2 border-dashed flex items-center justify-center text-center p-2 transition-colors duration-200 overflow-hidden
          ${isDraggingOver ? 'border-primary bg-primary/10' : 'border-border'}
          ${image ? 'border-solid p-0' : ''}`}
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onClick={() => !image && inputRef.current?.click()}
      >
        {renderPlaceholder()}
        <input
          type="file" ref={inputRef} accept="image/*" className="hidden"
          onChange={(e) => handleFileSelect(e.target.files)}
        />
        {image && image.preview ? (
          <>
            <img
              ref={imageRef}
              src={image.preview}
              alt="Preview"
              className={`absolute w-full h-auto select-none ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
              style={{ top: `${position}px`, touchAction: 'none' }}
              onMouseDown={handleMouseDown}
              onTouchStart={handleTouchStart}
              draggable="false"
            />
            <button
              onClick={(e) => { e.stopPropagation(); onImageRemove(); }}
              className="absolute top-1 right-1 z-20 bg-black/50 text-white rounded-full p-1.5 hover:bg-red-500 transition-colors"
              aria-label="Remove image"
            >
              <TrashIcon />
            </button>
          </>
        ) : (
          <div className="text-xs text-text-secondary z-10">
            <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-8 w-8 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
            <p className="mt-1">{t('dropImagePrompt')}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageUploader;