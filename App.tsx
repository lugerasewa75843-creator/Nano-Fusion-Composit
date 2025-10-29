
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
// Fix: Removed `GuidedSlots` from this import to resolve a name collision. It's now imported from `./types`.
import { GoogleGenAI, Modality, Type, FunctionDeclaration } from '@google/genai';
// Fix: Added a type-only import for `Part` to correctly type an array of different content parts.
import type { Part } from '@google/genai';
import { useLiveQuery } from 'dexie-react-hooks';
import JSZip from 'jszip';

import { db } from './services/db';
import { dataUrlToFile, fileToDataUrl } from './utils/imageUtils';
import { useLocalization } from './hooks/useLocalization';
import { usePersistentState } from './hooks/usePersistentState';
// Fix: Added `GuidedSlots` to this import to use the correct local type definition.
import { GenerationMode, type ImageSlot, type ChatMessage, type GuidedSlots, type Preset } from './types';

import Header from './components/Header';
import ControlPanel from './components/ControlPanel';
import ResultPanel from './components/ResultPanel';
import SideDrawer from './components/SideDrawer';
import HelpModal from './components/HelpModal';
import SidePanel from './components/SidePanel';
import AgentStatusIndicator from './components/AgentStatusIndicator';


const LOADING_MESSAGES = [
  "Fusing pixels...", "Consulting digital muses...", "Painting with light...",
  "Reticulating splines...", "Awakening the AI's imagination...", "Mixing virtual colors...",
];

const updatePromptFunctionDeclaration: FunctionDeclaration = {
  name: 'updatePrompt',
  parameters: {
    type: Type.OBJECT,
    description: 'Updates the main prompt text area with the provided content.',
    properties: {
      newPrompt: {
        type: Type.STRING,
        description: 'The new text to set as the main prompt for image generation.',
      },
    },
    required: ['newPrompt'],
  },
};

const setGenerationModeFunctionDeclaration: FunctionDeclaration = {
  name: 'setGenerationMode',
  parameters: {
    type: Type.OBJECT,
    description: 'Sets the image generation mode.',
    properties: {
      mode: {
        type: Type.STRING,
        description: 'The mode to switch to. Must be either "structured" or "freestyle".',
        enum: ['structured', 'freestyle'],
      },
    },
    required: ['mode'],
  },
};

const startGenerationFunctionDeclaration: FunctionDeclaration = {
  name: 'startGeneration',
  parameters: {
    type: Type.OBJECT,
    description: 'Starts the image generation process using the current images and prompt text.',
    properties: {},
    required: [],
  },
};

const startBatchGenerationFunctionDeclaration: FunctionDeclaration = {
  name: 'startBatchGeneration',
  parameters: {
    type: Type.OBJECT,
    description: 'Generates a specified number of images with the SAME settings sequentially. DANGER: Use ONLY when a user explicitly requests a specific number. For single images, ALWAYS use startGeneration. Max count is 5.',
    properties: {
        count: {
            type: Type.NUMBER,
            description: 'The total number of images to generate. Must be a positive integer, max 5.',
        },
        delay: {
            type: Type.NUMBER,
            description: 'The delay in seconds between each generation. Useful for respecting rate limits. Defaults to 2 seconds if not provided.',
        },
    },
    required: ['count'],
  },
};

const generateSequenceOfImagesFunctionDeclaration: FunctionDeclaration = {
  name: 'generateSequenceOfImages',
  parameters: {
    type: Type.OBJECT,
    description: 'Generates a sequence of images with DIFFERENT settings. Use this for tasks requiring different aspect ratios or prompts for each image.',
    properties: {
      steps: {
        type: Type.ARRAY,
        description: 'An array of generation steps. Each step defines one image to be generated.',
        items: {
          type: Type.OBJECT,
          properties: {
            prompt: {
              type: Type.STRING,
              description: 'The prompt for this specific image.',
            },
            aspectRatio: {
              type: Type.STRING,
              description: "The desired aspect ratio for this image in 'W:H' format (e.g., '16:9', '5:7').",
            },
          },
          required: ['prompt', 'aspectRatio'],
        },
      },
    },
    required: ['steps'],
  },
};


const downloadCurrentImageFunctionDeclaration: FunctionDeclaration = {
  name: 'downloadCurrentImage',
  parameters: {
    type: Type.OBJECT,
    description: 'Downloads the most recently generated image that is currently displayed in the result panel.',
    properties: {},
    required: [],
  },
};

const downloadHistoryImageFunctionDeclaration: FunctionDeclaration = {
  name: 'downloadHistoryImage',
  parameters: {
    type: Type.OBJECT,
    description: 'Downloads an image from the generation history based on its position (index).',
    properties: {
      index: {
        type: Type.NUMBER,
        description: 'The index of the image in the history to download. Use 0 for the most recent, 1 for the second most recent, etc.',
      },
    },
    required: ['index'],
  },
};

const downloadAllHistoryImagesFunctionDeclaration: FunctionDeclaration = {
  name: 'downloadAllHistoryImages',
  parameters: {
    type: Type.OBJECT,
    description: 'Downloads all images from the generation history as a single ZIP archive. This is the most reliable method for multiple files.',
    properties: {
       asZip: {
        type: Type.BOOLEAN,
        description: 'If true or omitted, downloads all images as a single ZIP file. This is the default and recommended behavior.',
      },
    },
    required: [],
  },
};

const createBlankImageFunctionDeclaration: FunctionDeclaration = {
  name: 'createBlankImage',
  parameters: {
    type: Type.OBJECT,
    description: 'Creates a blank, single-color image and places it in a specified slot or the first available one. This is essential for controlling aspect ratio before generation.',
    properties: {
      aspectRatio: {
        type: Type.STRING,
        description: "The desired aspect ratio in 'W:H' format (e.g., '16:9', '1:1', '5:7'). If the user provides a format like '5x7', you must convert it to '5:7'. Defaults to '1:1'.",
      },
      color: {
        type: Type.STRING,
        description: "The background color of the canvas, e.g., 'white', '#FF0000', 'red'. You MUST use this if the user specifies a color. Defaults to 'white'.",
      },
      slot: {
        type: Type.STRING,
        description: "For Structured mode, specifies which slot to place the new canvas in. Must be 'character', 'environment', or 'style'. If omitted, it will use the first empty slot.",
        enum: ['character', 'environment', 'style'],
      },
      index: {
        type: Type.NUMBER,
        description: "For Freestyle mode, specifies the index (0-4) of the slot to place the new canvas in. If omitted, it will use the first empty slot.",
      }
    },
    required: [],
  },
};

const useHistoryImageInSlotFunctionDeclaration: FunctionDeclaration = {
  name: 'useHistoryImageInSlot',
  parameters: {
    type: Type.OBJECT,
    description: 'Takes an image from the history and places it into one of the specific slots in Structured mode.',
    properties: {
      index: {
        type: Type.NUMBER,
        description: 'The index of the image in the history to use. Use 0 for the most recent, 1 for the second most recent, etc.',
      },
      slot: {
        type: Type.STRING,
        description: 'The structured mode slot to place the image in.',
        enum: ['character', 'environment', 'style'],
      },
    },
    required: ['index', 'slot'],
  },
};

const reuseGeneratedImageFunctionDeclaration: FunctionDeclaration = {
  name: 'reuseGeneratedImage',
  parameters: {
    type: Type.OBJECT,
    description: 'Takes the most recently generated image from the result panel and places it into one of the specific slots for further generation.',
    properties: {
      slot: {
        type: Type.STRING,
        description: "The slot to place the image in. For Structured mode, use 'character', 'environment', or 'style'. For Freestyle, this will target the first available slot.",
        enum: ['character', 'environment', 'style'],
      },
    },
    required: ['slot'],
  },
};

const removeImageFromSlotFunctionDeclaration: FunctionDeclaration = {
  name: 'removeImageFromSlot',
  parameters: {
    type: Type.OBJECT,
    description: 'Removes an image from a specified slot. Use this to clear a slot before adding a new image or to control the final aspect ratio.',
    properties: {
      slot: {
        type: Type.STRING,
        description: "For Structured mode, the slot to clear. Must be 'character', 'environment', or 'style'.",
      },
      index: {
        type: Type.NUMBER,
        description: "For Freestyle mode, the index of the image slot to clear (starting from 0).",
      },
    },
  },
};

const clearAllSlotsFunctionDeclaration: FunctionDeclaration = {
    name: 'clearAllSlots',
    parameters: {
        type: Type.OBJECT,
        description: 'Removes all images from all input slots in both Structured and Freestyle modes. Essential for starting a new generation with a clean slate.',
        properties: {},
        required: [],
    },
};

const setPromptVisibilityFunctionDeclaration: FunctionDeclaration = {
  name: 'setPromptVisibility',
  parameters: {
    type: Type.OBJECT,
    description: 'Shows or hides the main prompt text area in the UI.',
    properties: {
      visible: {
        type: Type.BOOLEAN,
        description: 'Set to true to show the prompt area, false to hide it.',
      },
    },
    required: ['visible'],
  },
};

const setLanguageFunctionDeclaration: FunctionDeclaration = {
  name: 'setLanguage',
  parameters: {
    type: Type.OBJECT,
    description: "Changes the application's display language.",
    properties: {
      lang: {
        type: Type.STRING,
        description: "The language code to switch to. Supported values are 'en', 'ru', 'uk'.",
        enum: ['en', 'ru', 'uk'],
      },
    },
    required: ['lang'],
  },
};

const showHelpModalFunctionDeclaration: FunctionDeclaration = {
  name: 'showHelpModal',
  parameters: {
    type: Type.OBJECT,
    description: 'Displays the help modal window to the user.',
    properties: {},
    required: [],
  },
};


const fileToGenerativePart = async (file: File | string) => {
    const dataUrl = typeof file === 'string' ? file : await fileToDataUrl(file);
    const mimeType = typeof file === 'string' ? (dataUrl.match(/^data:(.*?);/)?.[1] ?? 'image/png') : file.type;
    
    const base64data = dataUrl.split(',')[1];
    return {
        inlineData: {
            mimeType: mimeType,
            data: base64data,
        },
    };
};

const createBlankImageFile = (
    aspectRatio: string = '1:1',
    color: string = 'white',
    width: number = 1024
): Promise<File> => {
    return new Promise((resolve, reject) => {
        try {
            const canvas = document.createElement('canvas');
            const [ratioW, ratioH] = aspectRatio.split(':').map(Number);
            if (isNaN(ratioW) || isNaN(ratioH) || ratioW <= 0 || ratioH <= 0) {
                throw new Error('Invalid aspect ratio format');
            }
            const height = Math.round((width * ratioH) / ratioW);
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.fillStyle = color;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
            canvas.toBlob((blob) => {
                if (blob) {
                    const file = new File([blob], `blank_${aspectRatio.replace(':', 'x')}.png`, { type: 'image/png' });
                    resolve(file);
                } else {
                    reject(new Error('Canvas toBlob returned null'));
                }
            }, 'image/png');
        } catch (error) {
            reject(error);
        }
    });
};

/**
 * Reads a File's data into a new Blob, creating a robust, independent copy.
 * @param file The file to read.
 * @returns A promise that resolves with a new Blob.
 */
const fileToNewBlob = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            // We use readAsArrayBuffer and create a new Blob to make a true copy
            const blob = new Blob([reader.result as ArrayBuffer], { type: file.type });
            resolve(blob);
        };
        reader.onerror = (error) => reject(error);
        reader.readAsArrayBuffer(file);
    });
};

/**
 * Creates a defensive, deep copy of an ImageSlot, creating a new File object
 * from a fresh Blob to prevent stale reference issues.
 * @param slot The ImageSlot to clone.
 * @returns A Promise resolving to a new ImageSlot with a fresh File object, or the original slot if no file exists.
 */
const cloneImageSlotAsync = async (slot: ImageSlot | null): Promise<ImageSlot | null> => {
  if (!slot || !slot.file) {
    return slot;
  }
  // Re-read the file into a new blob to get a stable reference
  const freshBlob = await fileToNewBlob(slot.file);
  const newFile = new File([freshBlob], slot.file.name, {
    type: slot.file.type,
    lastModified: slot.file.lastModified,
  });
  return {
    ...slot,
    file: newFile,
  };
};


const App: React.FC = () => {
  const { language, setLanguage, t } = useLocalization();
  
  const [generationMode, setGenerationMode] = usePersistentState<GenerationMode>('generationMode', GenerationMode.Guided);
  const [persistedLanguage, setPersistedLanguage] = usePersistentState<'en' | 'ru' | 'uk'>('language', 'ru');
  
  const [guidedImages, setGuidedImages] = useState<Record<GuidedSlots, ImageSlot | null>>({ character: null, environment: null, style: null });
  const [freestyleImages, setFreestyleImages] = useState<ImageSlot[]>([]);
  const [prompt, setPrompt] = useState<string>('');
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>(LOADING_MESSAGES[0]);
  const [error, setError] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isPromptVisible, setIsPromptVisible] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'history' | 'agent' | 'presets'>('agent');


  // Agent State
  const [agentMessages, setAgentMessages] = useState<ChatMessage[]>([]);
  const [agentUserInput, setAgentUserInput] = useState('');
  const [isAgentLoading, setIsAgentLoading] = useState(false);
  const [agentError, setAgentError] = useState<string | null>(null);
  const [isAgentInitiatedGeneration, setIsAgentInitiatedGeneration] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [pendingAgentGeneration, setPendingAgentGeneration] = useState<{ call: any } | null>(null);
  const isExecutingAgentGenRef = useRef(false);


  const historyItems = useLiveQuery(() => db.history.orderBy('timestamp').reverse().toArray(), []);
  const presets = useLiveQuery(() => db.presets.orderBy('timestamp').reverse().toArray(), []);
  
  useEffect(() => {
    if (persistedLanguage) {
      setLanguage(persistedLanguage);
    }
  }, [persistedLanguage, setLanguage]);

  useEffect(() => {
    // If the chat is empty OR only contains the initial welcome message,
    // update the welcome message to match the current language.
    if (t('agentWelcome') !== 'agentWelcome' && agentMessages.length <= 1) {
        const newWelcomeMessage: ChatMessage = { 
          role: 'model', 
          parts: [{ text: t('agentWelcome') }],
          text: t('agentWelcome'),
        };
        // If empty, set it. If one message exists, replace it.
        setAgentMessages([newWelcomeMessage]);
    }
  }, [t, language]);
  
  const handleLanguageChange = (lang: 'en' | 'ru' | 'uk') => {
    setPersistedLanguage(lang);
    setLanguage(lang);
  };

  const toggleDrawer = () => setIsDrawerOpen(prev => !prev);
  const toggleHelpModal = () => setIsHelpModalOpen(prev => !prev);

  useEffect(() => {
    // When switching to freestyle, ensure there's at least one slot.
    if (generationMode === GenerationMode.Freestyle && freestyleImages.length === 0) {
      setFreestyleImages([{ id: `fs-${Date.now()}`, file: null, preview: '', mimeType: '', panY: 0 }]);
    }
  }, [generationMode, freestyleImages.length]);

  useEffect(() => {
    let interval: number;
    if (isLoading) {
      interval = window.setInterval(() => {
        setLoadingMessage(prev => {
          const currentIndex = LOADING_MESSAGES.indexOf(prev);
          const nextIndex = (currentIndex + 1) % LOADING_MESSAGES.length;
          return LOADING_MESSAGES[nextIndex];
        });
      }, 2000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isLoading]);

  const reuseImage = useCallback(async (imageData: string, targetSlot: GuidedSlots | number): Promise<ImageSlot> => {
    const file = await dataUrlToFile(imageData, `reuse-${Date.now()}.png`, 'image/png');
    const newImage: ImageSlot = {
      id: `${targetSlot}-${Date.now()}`,
      file,
      preview: URL.createObjectURL(file),
      mimeType: file.type,
      panY: 0,
    };

    if (typeof targetSlot === 'string') {
      setGenerationMode(GenerationMode.Guided);
      setGuidedImages(prev => ({ ...prev, [targetSlot]: newImage }));
    } else {
      setFreestyleImages(prev => {
        const newImages = [...prev];
        if (targetSlot >= newImages.length && newImages.length < 5) {
          newImages.push(newImage);
        } else if (targetSlot < newImages.length) {
          newImages[targetSlot] = newImage;
        }
        return newImages;
      });
    }
    setIsDrawerOpen(false);
    return newImage;
  }, []);

  const handleGuidedImageUpdate = useCallback((slot: GuidedSlots, update: Partial<ImageSlot> | null) => {
    setGuidedImages(prev => {
      const newState = { ...prev };
      const existingSlot = prev[slot];
  
      if (update === null) {
        // Case 1: Clearing the slot
        newState[slot] = null;
      } else if (existingSlot) {
        // Case 2: Updating an existing slot by merging properties
        newState[slot] = { ...existingSlot, ...update };
      } else {
        // Case 3: Creating a new slot from scratch
        newState[slot] = { 
          id: `${slot}-${Date.now()}`, 
          file: null, 
          preview: '', 
          mimeType: '', 
          panY: 0, 
          ...update 
        } as ImageSlot;
      }
      return newState;
    });
  }, []);
  
  const handleFreestyleImageUpdate = useCallback((index: number, update: Partial<ImageSlot> | null) => {
    setFreestyleImages(prev => {
      const newImages = [...prev];
  
      if (update === null) {
        // Case 1: Clearing or removing a slot
        if (newImages.length > 1) {
          newImages.splice(index, 1);
        } else {
          // If it's the last slot, just clear it, don't remove it
          newImages[index] = { ...newImages[index], file: null, preview: '', mimeType: '', panY: 0 };
        }
      } else {
        // Case 2: Updating an existing or new slot
        const existingSlot = newImages[index];
        if (existingSlot) {
          newImages[index] = { ...existingSlot, ...update };
        } else if (index < 5) {
          // Create a new slot if it doesn't exist
          newImages[index] = { 
            id: `fs-${Date.now()}`, 
            file: null, 
            preview: '', 
            mimeType: '', 
            panY: 0, 
            ...update 
          } as ImageSlot;
        }
      }
      return newImages;
    });
  }, []);
  
  const addFreestyleSlot = useCallback(() => {
    if (freestyleImages.length < 5) {
      setFreestyleImages(prev => [...prev, { id: `fs-${Date.now()}`, file: null, preview: '', mimeType: '', panY: 0 }]);
    }
  }, [freestyleImages.length]);

  const isGenerateDisabled = useMemo(() => {
    const images = generationMode === GenerationMode.Guided ? Object.values(guidedImages) : freestyleImages;
    const hasImage = images.some(img => img && img.file);
    const hasPrompt = prompt.trim().length > 0;
    return (!hasImage && !hasPrompt) || isLoading;
  }, [generationMode, guidedImages, freestyleImages, isLoading, prompt]);
  
  const handleSaveUploadToHistory = useCallback(async (file: File) => {
    try {
        const imageData = await fileToDataUrl(file);
        await db.history.add({
            imageData,
            prompt: `User Upload: ${file.name}`,
            timestamp: new Date(),
            type: 'upload',
        });
    } catch (err) {
        console.error("Failed to save upload to history:", err);
    }
  }, []);

  const generateDefaultPrompt = () => {
    if (generationMode === GenerationMode.Guided) {
        const descriptions = [];
        if (guidedImages.character) descriptions.push(`the character from image 1`);
        if (guidedImages.environment) descriptions.push(`the environment from image 2`);
        if (guidedImages.style) descriptions.push(`the style of image 3`);
        
        if (descriptions.length > 1) {
            const last = descriptions.pop();
            return `Fuse ${descriptions.join(', ')} and ${last}.`;
        } else if (descriptions.length === 1) {
            return `Render a high-quality, detailed image of ${descriptions[0]}.`;
        }
    } else {
        const imageCount = freestyleImages.filter(img => img.file).length;
        if (imageCount > 1) {
            return `Creatively fuse the visual elements from all ${imageCount} provided images into a single, coherent picture.`;
        } else if (imageCount === 1) {
            return `Render a high-quality, detailed version of the provided image.`;
        }
    }
    return 'Create a beautiful image.';
  };

  const handleGenerate = async (options: { overridePrompt?: string, signal?: AbortSignal } = {}) => {
    const { overridePrompt, signal } = options;
    
    if (signal?.aborted) {
        setIsLoading(false);
        return;
    }

    setIsLoading(true);
    setError(null);
    // Do not clear the generated image here, to allow for smoother transitions in sequences.
    // setGeneratedImage(null); 

    let finalPrompt: string;
    if (overridePrompt && overridePrompt.trim()) {
      finalPrompt = overridePrompt;
    } else if (prompt && prompt.trim()) {
      finalPrompt = prompt;
    } else {
      finalPrompt = generateDefaultPrompt();
    }
    
    let imagesForGeneration = (
      generationMode === GenerationMode.Guided ? Object.values(guidedImages) : freestyleImages
    ).filter((img): img is ImageSlot => img !== null && img.file !== null);
    
    if (imagesForGeneration.length === 0) {
        if (!finalPrompt.trim()) {
            setError(t('errorNoImageOrPrompt'));
            setIsLoading(false);
            return;
        }

        const blankFile = await createBlankImageFile('1:1', 'white');
        const blankImageSlot: ImageSlot = {
            id: `auto-blank-${Date.now()}`,
            file: blankFile,
            preview: URL.createObjectURL(blankFile),
            mimeType: blankFile.type,
            panY: 0,
        };

        if (generationMode === GenerationMode.Guided) {
            setGuidedImages(prev => ({ ...prev, character: blankImageSlot }));
        } else {
            setFreestyleImages(prev => {
                const newImages = [...prev];
                if (newImages.length === 0) {
                    newImages.push(blankImageSlot);
                } else {
                    newImages[0] = blankImageSlot;
                }
                return newImages;
            });
        }
        imagesForGeneration = [blankImageSlot];
    }
    
    try {
      if (signal?.aborted) throw new Error("Aborted");

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const freshImages = await Promise.all(imagesForGeneration.map(cloneImageSlotAsync));
      const imageParts = await Promise.all(
          freshImages
              .filter((img): img is ImageSlot => !!img)
              .map(img => fileToGenerativePart(img.file as File))
      );

      if (signal?.aborted) throw new Error("Aborted");

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ text: finalPrompt }, ...imageParts] },
        config: { responseModalities: [Modality.IMAGE] },
      });
      
      let resultImage: string | null = null;
      const candidate = response.candidates?.[0];

      if (candidate?.content?.parts) {
          for (const part of candidate.content.parts) {
              if (part.inlineData?.data) {
                  resultImage = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                  break;
              }
          }
      }

      if (resultImage) {
        setGeneratedImage(resultImage); // This will update the view for each generated image in a sequence
        await db.history.add({
          imageData: resultImage,
          prompt: finalPrompt,
          timestamp: new Date(),
          type: 'generated'
        });
        return resultImage; // Return for sequence handling
      } else {
        let errorMessage = t('errorNoImageInResponse');
        if (response.promptFeedback?.blockReason) {
          errorMessage = t('errorGenerationBlocked');
        }
        throw new Error(errorMessage);
      }
    } catch (err) {
      if ((err as Error).message === "Aborted") {
        console.log("Generation was aborted by user.");
        setError(t('agentActionCancelled'));
      } else {
        console.error(err);
        const errorMessage = err instanceof Error ? err.message : t('errorGenerationFailed');
        setError(errorMessage);
      }
      throw err; // Re-throw to be caught by the wrapper
    }
  };
  
  const handleManualGenerate = async () => {
    const controller = new AbortController();
    setAbortController(controller);
    setIsAgentInitiatedGeneration(false);
    try {
        await handleGenerate({ signal: controller.signal });
    } catch (err) {
        // Error is already set within handleGenerate, just log it here if needed
        if ((err as Error).message !== "Aborted") {
          console.error("Manual generation failed:", err);
        }
    } finally {
        setIsLoading(false);
        setAbortController(null);
    }
  };

  const createBlankImageSlot = async (aspectRatio: string = '1:1', color: string = 'white'): Promise<ImageSlot> => {
      const file = await createBlankImageFile(aspectRatio, color);
      return {
          id: `blank-${Date.now()}`,
          file,
          preview: URL.createObjectURL(file),
          mimeType: file.type,
          panY: 0,
      };
  };
  
  const handleAbort = () => {
    if (abortController) {
        abortController.abort();
        setAbortController(null);
        setIsAgentLoading(false);
        setIsAgentInitiatedGeneration(false);
        setPendingAgentGeneration(null);
        if (isLoading) setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAgentInitiatedGeneration && !isLoading) {
       if (!error) {
         const confirmationMessage: ChatMessage = { role: 'model', parts: [{ text: t('agentActionCompleted') }], text: t('agentActionCompleted') };
         setAgentMessages(prev => [...prev, confirmationMessage]);
       }
    }
  }, [isAgentInitiatedGeneration, isLoading, t, error]);
  
  useEffect(() => {
    const executePendingGeneration = async () => {
        if (!pendingAgentGeneration || isExecutingAgentGenRef.current) return;

        isExecutingAgentGenRef.current = true;
        
        const { call } = pendingAgentGeneration;
        const controller = new AbortController();
        setAbortController(controller);
        setIsDrawerOpen(false);
        setIsAgentInitiatedGeneration(true);

        try {
            if (call.name === 'generateSequenceOfImages' && call.args.steps) {
                const sequenceSteps = call.args.steps as { prompt: string, aspectRatio: string }[];
                
                for (const step of sequenceSteps) {
                    if (controller.signal.aborted) break;
                    
                     await new Promise<void>(resolve => {
                       handleGuidedImageUpdate('character', null);
                       handleGuidedImageUpdate('environment', null);
                       handleGuidedImageUpdate('style', null);
                       setFreestyleImages(prev => prev.length > 0 ? [{...prev[0], file: null, preview: ''}] : []);
                       setTimeout(resolve, 150);
                     });

                    const newCanvas = await createBlankImageSlot(step.aspectRatio);
                    await new Promise<void>(resolve => {
                         if (generationMode === GenerationMode.Guided) {
                            setGuidedImages({ character: newCanvas, environment: null, style: null });
                        } else {
                            setFreestyleImages([newCanvas]);
                        }
                        setTimeout(resolve, 150);
                    });

                    await handleGenerate({ overridePrompt: step.prompt, signal: controller.signal });
                    if (!controller.signal.aborted) {
                        await new Promise(resolve => setTimeout(resolve, 500)); // Show image briefly
                    }
                }
            } else {
                const count = Math.min((call.args.count as number) || 1, 5);
                const delay = (call.args.delay as number) || 2;

                for (let i = 0; i < count; i++) {
                    if (controller.signal.aborted) break;
                    await handleGenerate({ signal: controller.signal });
                    if (i < count - 1 && !controller.signal.aborted) {
                        await new Promise(resolve => setTimeout(resolve, delay * 1000));
                    }
                }
            }
        } catch (err) {
             if ((err as Error).message !== "Aborted") {
                console.error("Error during agent generation:", err);
                const errorMessage: ChatMessage = { role: 'model', parts: [{ text: t('agentError') }], text: t('agentError') };
                setAgentMessages(prev => [...prev, errorMessage]);
             }
        } finally {
            isExecutingAgentGenRef.current = false;
            setIsAgentInitiatedGeneration(false);
            setAbortController(null);
            setPendingAgentGeneration(null);
            setIsLoading(false);
        }
    };

    executePendingGeneration();
  }, [pendingAgentGeneration, generationMode]);
  
  const handleAgentSendMessage = async (userInput: string) => {
    const newUserMessage: ChatMessage = { role: 'user', parts: [{ text: userInput }], text: userInput };
    setAgentMessages(prev => [...prev, newUserMessage]);
    setAgentUserInput('');
    setIsAgentLoading(true);
    setAgentError(null);
    
    const controller = new AbortController();
    setAbortController(controller);

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        const hasGuidedUserUploads = Object.values(guidedImages).some(slot => slot?.file && !slot.file.name.startsWith('blank_'));
        const hasFreestyleUserUploads = freestyleImages.some(slot => slot?.file && !slot.file.name.startsWith('blank_'));
        
        let userInputParts: Part[] = [{ text: userInput }];
        
        const visionKeywords = ['see', 'what is', 'what\'s', 'describe', 'this image', 'что это', 'опиши', 'видишь'];
        if (generatedImage && visionKeywords.some(kw => userInput.toLowerCase().includes(kw))) {
            const generatedImagePart = await fileToGenerativePart(generatedImage);
            userInputParts = [generatedImagePart, ...userInputParts];
        }

        const languageName = { en: 'English', ru: 'Russian', uk: 'Ukrainian' }[language];
        const systemInstruction = `You are an expert AI assistant for an image generation app. Your goal is to help users by calling tools. You are friendly, concise, and proactive.

**CRITICAL RULE: The \`clearAllSlots()\` tool is GLOBAL. It erases images from BOTH Structured and Freestyle modes.**

**--- CORE DECISION PROTOCOL ---**

**1. IDENTIFY TASK:** Is it a 'from scratch' generation (which may require clearing slots) or an 'iteration' on the current result?

**2. FOR 'FROM SCRATCH' TASKS:**
   a. **CHECK ALL SLOTS:** Look at BOTH \`Has User Uploads in Structured Mode\` AND \`Has User Uploads in Freestyle Mode\` in the context below.
   b. **IF (EITHER mode has user uploads):** You CANNOT use \`clearAllSlots()\` without permission. You **MUST** ask the user this translated question: "To start this new image, I need to clear all input slots. This will remove your uploaded images from both modes. Is that okay?" Then **STOP** and wait for their answer. Do not call any tools.
   c. **IF (NEITHER mode has user uploads):** You are free to proceed. Execute this sequence in a single turn:
      1. \`clearAllSlots()\`
      2. \`setGenerationMode()\` to the correct mode for the task if needed.
      3. \`createBlankImage()\` with the correct aspect ratio (default to '1:1' if unspecified).
      4. \`updatePrompt()\`
      5. \`startGeneration()\`

**3. FOR 'ITERATION' TASKS (e.g., "change her hair color"):**
   - This means modifying the currently displayed generated image.
   - Do NOT clear slots.
   - Execute this sequence in a single turn: \`reuseGeneratedImage\`, \`updatePrompt\`, \`startGeneration\`.

**--- OTHER MANDATORY BEHAVIORS ---**
*   **DOWNLOADS:** If asked to download all, you MUST use \`downloadAllHistoryImages({ asZip: true })\`.
*   **CLARITY:** If a request is vague, ask for clarification.
*   **LANGUAGE:** Respond in the current application language: ${languageName}.

**--- App Context ---**
*   Current Language: ${languageName}.
*   Current Mode: '${generationMode === 'guided' ? 'Structured' : 'Freestyle'}'.
*   Has User Uploads in Structured Mode: ${hasGuidedUserUploads ? 'YES' : 'NO'}.
*   Has User Uploads in Freestyle Mode: ${hasFreestyleUserUploads ? 'YES' : 'NO'}.
*   History: ${historyItems?.length || 0} images available (prefixed with 'N', e.g., N0 is newest).`;
        
        const contents = [
            ...agentMessages.map(msg => ({ role: msg.role, parts: msg.parts })),
            { role: 'user', parts: userInputParts }
        ];

        const allTools = { functionDeclarations: [
          updatePromptFunctionDeclaration, 
          setGenerationModeFunctionDeclaration, 
          startGenerationFunctionDeclaration,
          startBatchGenerationFunctionDeclaration,
          generateSequenceOfImagesFunctionDeclaration,
          downloadCurrentImageFunctionDeclaration,
          downloadHistoryImageFunctionDeclaration,
          downloadAllHistoryImagesFunctionDeclaration,
          createBlankImageFunctionDeclaration,
          useHistoryImageInSlotFunctionDeclaration,
          reuseGeneratedImageFunctionDeclaration,
          removeImageFromSlotFunctionDeclaration,
          clearAllSlotsFunctionDeclaration,
          setPromptVisibilityFunctionDeclaration,
          setLanguageFunctionDeclaration,
          showHelpModalFunctionDeclaration,
        ] };

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents,
            config: {
                systemInstruction: systemInstruction,
                tools: [allTools]
            },
        });
        
        if (controller.signal.aborted) {
            throw new Error("Aborted");
        }
        
        const functionCalls = response.functionCalls;
        
        if (response.text) {
             const modelTextMessage: ChatMessage = { role: 'model', parts: [{ text: response.text }], text: response.text };
             setAgentMessages(prev => [...prev, modelTextMessage]);
        }
        
        if (functionCalls && functionCalls.length > 0) {
            const toolPriority: { [key: string]: number } = {
                'clearAllSlots': -1,
                'removeImageFromSlot': 0,
                'setGenerationMode': 1,
                'setLanguage': 1,
                'createBlankImage': 2,
                'useHistoryImageInSlot': 2,
                'reuseGeneratedImage': 2,
                'updatePrompt': 3,
                'setPromptVisibility': 3,
                'startGeneration': 4,
                'startBatchGeneration': 4,
                'generateSequenceOfImages': 4,
                'downloadCurrentImage': 5,
                'downloadHistoryImage': 5,
                'downloadAllHistoryImages': 5,
                'showHelpModal': 5,
            };

            const sortedCalls = [...functionCalls].sort((a, b) => {
                const priorityA = toolPriority[a.name] || 99;
                const priorityB = toolPriority[b.name] || 99;
                return priorityA - priorityB;
            });
            
            const modelToolCallMessage: ChatMessage = { role: 'model', parts: functionCalls.map(fc => ({ functionCall: fc })) };
            setAgentMessages(prev => [...prev, modelToolCallMessage]);

            const stateUpdateCalls = sortedCalls.filter(c => !c.name.includes('Generation') && c.name !== 'generateSequenceOfImages');
            const generationCalls = sortedCalls.filter(c => c.name.includes('Generation') || c.name === 'generateSequenceOfImages');
            
            for (const call of stateUpdateCalls) {
                await new Promise<void>(async (resolve) => {
                    if (call.name === 'updatePrompt' && call.args.newPrompt) {
                        setPrompt(call.args.newPrompt as string);
                        setIsPromptVisible(true);
                    } else if (call.name === 'setGenerationMode' && call.args.mode) {
                        const mode = call.args.mode as string;
                        if (mode === 'structured') setGenerationMode(GenerationMode.Guided)
                        if (mode === 'freestyle') setGenerationMode(GenerationMode.Freestyle)
                    } else if (call.name === 'setLanguage' && call.args.lang) {
                        const lang = call.args.lang as 'en' | 'ru' | 'uk';
                         if (['en', 'ru', 'uk'].includes(lang)) {
                            handleLanguageChange(lang);
                        }
                    } else if (call.name === 'showHelpModal') {
                        toggleHelpModal();
                    } else if (call.name === 'downloadCurrentImage') {
                        if (generatedImage) handleDownloadImage(generatedImage);
                    } else if (call.name === 'downloadHistoryImage' && call.args.index !== undefined) {
                        const index = call.args.index as number;
                        if (historyItems && historyItems.length > index && index >= 0) {
                            handleDownloadImage(historyItems[index].imageData);
                        }
                    } else if (call.name === 'downloadAllHistoryImages') {
                         if (historyItems) {
                            const zip = new JSZip();
                            for (let i = 0; i < historyItems.length; i++) {
                                const item = historyItems[i];
                                const base64Data = item.imageData.split(',')[1];
                                zip.file(`nanofusion-${item.id || i}.png`, base64Data, { base64: true });
                            }
                            const blob = await zip.generateAsync({ type: 'blob' });
                            const link = document.createElement('a');
                            link.href = URL.createObjectURL(blob);
                            link.download = `nanofusion_history_${Date.now()}.zip`;
                            link.click();
                            URL.revokeObjectURL(link.href);
                         }
                    } else if (call.name === 'createBlankImage') {
                        const { aspectRatio, color, slot, index } = call.args;
                        let finalAspectRatio = (aspectRatio as string || '1:1').replace(/x/gi, ':');
                        const newImage = await createBlankImageSlot(finalAspectRatio, color as string);

                        if (generationMode === GenerationMode.Guided) {
                            const targetSlot = slot as GuidedSlots | undefined;
                            setGuidedImages(prev => {
                                if (targetSlot && ['character', 'environment', 'style'].includes(targetSlot)) {
                                    return { ...prev, [targetSlot]: newImage };
                                }
                                const slots: GuidedSlots[] = ['character', 'environment', 'style'];
                                const emptySlot = slots.find(s => !prev[s]) || 'character';
                                return { ...prev, [emptySlot]: newImage };
                            });
                        } else { // Freestyle mode
                            const targetIndex = index as number | undefined;
                            // Fix: By explicitly typing `prev` to `ImageSlot[]`, we ensure that `updatedImages`
                            // is also correctly typed, allowing TypeScript to correctly infer the type of `img`
                            // within the `findIndex` callback and resolve the "property 'file' does not exist" error.
                            setFreestyleImages((prev: ImageSlot[]) => {
                                const updatedImages = [...prev];
                                if (targetIndex !== undefined && targetIndex >= 0 && targetIndex < 5) {
                                    while (updatedImages.length <= targetIndex) {
                                        updatedImages.push({ id: `fs-${Date.now()}`, file: null, preview: '', mimeType: '', panY: 0 });
                                    }
                                    updatedImages[targetIndex] = newImage;
                                } else {
                                    const emptyIndex = updatedImages.findIndex((img) => img.file === null);
                                    if (emptyIndex !== -1) {
                                        updatedImages[emptyIndex] = newImage;
                                    } else if (updatedImages.length < 5) {
                                        updatedImages.push(newImage);
                                    } else {
                                        updatedImages[0] = newImage;
                                    }
                                }
                                return updatedImages;
                            });
                        }
                    } else if (call.name === 'useHistoryImageInSlot' && call.args.index !== undefined && call.args.slot) {
                        const index = call.args.index as number;
                        const slot = call.args.slot as GuidedSlots;
                        if (historyItems && historyItems.length > index && index >= 0) {
                            await reuseImage(historyItems[index].imageData, slot);
                        }
                    } else if (call.name === 'reuseGeneratedImage' && call.args.slot) {
                        const slot = call.args.slot as GuidedSlots;
                        if (generatedImage) {
                            await reuseImage(generatedImage, slot);
                        }
                    } else if (call.name === 'removeImageFromSlot') {
                        const { slot, index } = call.args;
                        if (slot && typeof slot === 'string' && ['character', 'environment', 'style'].includes(slot)) {
                            handleGuidedImageUpdate(slot as GuidedSlots, null);
                        } else if (index !== undefined && typeof index === 'number') {
                            handleFreestyleImageUpdate(index, null);
                        }
                    } else if (call.name === 'clearAllSlots') {
                        handleGuidedImageUpdate('character', null);
                        handleGuidedImageUpdate('environment', null);
                        handleGuidedImageUpdate('style', null);
                        setFreestyleImages(prev => prev.length > 0 ? [{...prev[0], file: null, preview: ''}] : []);
                    } else if (call.name === 'setPromptVisibility' && call.args.visible !== undefined) {
                        setIsPromptVisible(call.args.visible as boolean);
                    }
                    setTimeout(resolve, 150);
                });
            }

            if (generationCalls.length > 0) {
                const call = generationCalls[0];
                const count = (call.args.count as number) || 1;
                const message = count > 1 
                    ? t('agentStartingMultipleGenerations').replace('{count}', String(count))
                    : t('agentStartingGeneration');
                setAgentMessages(prev => [...prev, { role: 'model', parts: [{ text: message }], text: message }]);
                
                setPendingAgentGeneration({ call });
            } else if (stateUpdateCalls.length > 0 && !response.text) {
                 const isSetupCallPresent = stateUpdateCalls.some(c =>
                    c.name === 'updatePrompt' ||
                    c.name === 'createBlankImage' ||
                    c.name === 'removeImageFromSlot' ||
                    c.name === 'useHistoryImageInSlot' ||
                    c.name === 'reuseGeneratedImage'
                );
                if (!isSetupCallPresent) {
                    const confirmationMessage: ChatMessage = { role: 'model', parts: [{ text: t('agentActionCompleted') }], text: t('agentActionCompleted') };
                    setAgentMessages(prev => [...prev, confirmationMessage]);
                }
            }

        } else if (!response.text) {
             const modelTextMessage: ChatMessage = { role: 'model', parts: [{ text: "..." }], text: "..." };
             setAgentMessages(prev => [...prev, modelTextMessage]);
        }
    } catch (err) {
      if ((err as Error).message === "Aborted") {
        console.log("Agent action was aborted by user.");
        const cancelMessage: ChatMessage = { role: 'model', parts: [{ text: t('agentActionCancelled') }], text: t('agentActionCancelled') };
        setAgentMessages(prev => [...prev, cancelMessage]);
      } else {
        console.error("Agent error:", err);
        const errorMessage = t('agentError');
        const errorText = err instanceof Error ? err.message : JSON.stringify(err);
        const finalMessage = `${errorMessage}\n\`\`\`\n${errorText}\n\`\`\``;

        setAgentError(finalMessage);
        const errorMessageObject: ChatMessage = { role: 'model', parts: [{ text: finalMessage }], text: finalMessage };
        setAgentMessages(prev => [...prev, errorMessageObject]);
      }
    } finally {
        setIsAgentLoading(false);
        setAbortController(null);
    }
  };

  const deleteHistoryItem = async (id: number) => {
    await db.history.delete(id);
  };
  
  const handleDownloadImage = useCallback((imageData: string) => {
    if (!imageData) return;
    const link = document.createElement('a');
    link.href = imageData;
    link.download = `nanofusion-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  const handleSavePreset = async () => {
      const name = window.prompt(t('savePresetPrompt'));
      if (!name || !name.trim()) return;

      const guidedImageUrls: Record<GuidedSlots, string | null> = { character: null, environment: null, style: null };
      for (const key of Object.keys(guidedImages) as GuidedSlots[]) {
          const slot = guidedImages[key];
          if (slot?.file) {
              guidedImageUrls[key] = await fileToDataUrl(slot.file);
          }
      }

      const freestyleImageUrls = await Promise.all(
          freestyleImages.map(slot => slot.file ? fileToDataUrl(slot.file) : Promise.resolve(null))
      );

      const newPreset: Omit<Preset, 'id'> = {
          name: name.trim(),
          timestamp: new Date(),
          config: {
              generationMode,
              prompt,
              guidedImages: guidedImageUrls,
              freestyleImages: freestyleImageUrls
          }
      };

      await db.presets.add(newPreset as Preset);
  };

  const handleLoadPreset = async (preset: Preset) => {
      const { config } = preset;
      setGenerationMode(config.generationMode);
      setPrompt(config.prompt);
      setIsPromptVisible(!!config.prompt);

      const loadedGuidedImages: Record<GuidedSlots, ImageSlot | null> = { character: null, environment: null, style: null };
      for (const key of Object.keys(config.guidedImages) as GuidedSlots[]) {
          const dataUrl = config.guidedImages[key];
          if (dataUrl) {
              const file = await dataUrlToFile(dataUrl, `preset-${key}.png`, 'image/png');
              loadedGuidedImages[key] = {
                  id: `${key}-${Date.now()}`,
                  file,
                  preview: URL.createObjectURL(file),
                  mimeType: file.type,
                  panY: 0
              };
          }
      }
      setGuidedImages(loadedGuidedImages);

      const loadedFreestyleImages = await Promise.all(
          config.freestyleImages.map(async (dataUrl, i) => {
              if (dataUrl) {
                  const file = await dataUrlToFile(dataUrl, `preset-fs-${i}.png`, 'image/png');
                  return {
                      id: `fs-${Date.now()}-${i}`,
                      file,
                      preview: URL.createObjectURL(file),
                      mimeType: file.type,
                      panY: 0
                  };
              }
              return { id: `fs-empty-${Date.now()}-${i}`, file: null, preview: '', mimeType: '', panY: 0 };
          })
      );
      
      if (config.generationMode === GenerationMode.Freestyle && loadedFreestyleImages.length === 0) {
           loadedFreestyleImages.push({ id: `fs-empty-${Date.now()}-0`, file: null, preview: '', mimeType: '', panY: 0 });
      }
      setFreestyleImages(loadedFreestyleImages);
      
      setIsDrawerOpen(false); // Close drawer on load
  };

  const handleDeletePreset = async (id: number) => {
      await db.presets.delete(id);
  };

  const isAgentActive = isAgentLoading || isAgentInitiatedGeneration;

  useEffect(() => {
    if (isAgentActive) {
      document.body.classList.add('agent-active-glow');
    } else {
      document.body.classList.remove('agent-active-glow');
    }
    return () => document.body.classList.remove('agent-active-glow');
  }, [isAgentActive]);

  const sidePanelProps = {
    historyItems: historyItems || [],
    onDeleteHistoryItem: deleteHistoryItem,
    onReuseImage: reuseImage,
    onDownloadImage: handleDownloadImage,
    generationMode,
    agentMessages,
    onAgentSendMessage: handleAgentSendMessage,
    isAgentLoading,
    agentError,
    activeTab,
    setActiveTab,
    isLoading: isAgentActive,
    onAbort: handleAbort,
    agentUserInput,
    setAgentUserInput,
    presets: presets || [],
    onLoadPreset: handleLoadPreset,
    onDeletePreset: handleDeletePreset,
    t
  };

  return (
    <div className="min-h-screen bg-background text-text-primary font-sans flex flex-col 2xl:flex-row 2xl:p-6 2xl:gap-6">
      <div className="flex flex-col flex-grow min-w-0">
        <div className="sticky top-0 z-30 w-full bg-background/90 backdrop-blur-sm border-b border-border flex-shrink-0 2xl:border-none 2xl:bg-transparent 2xl:backdrop-blur-none">
            <Header
              language={language}
              onLanguageChange={handleLanguageChange}
              onToggleDrawer={toggleDrawer}
              onToggleHelp={toggleHelpModal}
              t={t}
            />
        </div>
        <main className="relative flex-grow min-h-0 grid grid-cols-1 lg:grid-cols-5 gap-6 overflow-y-auto p-6 2xl:p-0">
          <div className="lg:col-span-2 h-full">
            <ControlPanel
              generationMode={generationMode}
              setGenerationMode={setGenerationMode}
              guidedImages={guidedImages}
              freestyleImages={freestyleImages}
              onGuidedImageUpdate={handleGuidedImageUpdate}
              onFreestyleImageUpdate={handleFreestyleImageUpdate}
              onAddFreestyleSlot={addFreestyleSlot}
              onSaveUploadToHistory={handleSaveUploadToHistory}
              prompt={prompt}
              setPrompt={setPrompt}
              onGenerate={handleManualGenerate}
              isGenerateDisabled={isGenerateDisabled}
              isPromptVisible={isPromptVisible}
              setIsPromptVisible={setIsPromptVisible}
              isLoading={isLoading}
              onSavePreset={handleSavePreset}
              t={t}
            />
          </div>
          <div className="lg:col-span-3 h-full">
            <ResultPanel
              isLoading={isLoading}
              isAgentInitiatedGeneration={isAgentInitiatedGeneration}
              loadingMessage={loadingMessage}
              error={error}
              generatedImage={generatedImage}
              onReuseImage={reuseImage}
              onDownloadImage={handleDownloadImage}
              onAbort={handleAbort}
              generationMode={generationMode}
              t={t}
            />
          </div>
        </main>
      </div>

      <div className={`hidden 2xl:flex flex-col flex-shrink-0 bg-surface border-l border-border rounded-xl transition-all duration-300 ease-in-out ${isDrawerOpen ? 'w-[28rem]' : 'w-0'}`}>
        {isDrawerOpen && (
          <div className="flex flex-col h-full p-4 overflow-hidden">
            <div className="flex items-center justify-between pb-4 border-b border-border flex-shrink-0">
              <h2 className="text-lg font-semibold text-text-primary">{t('agentTab')} / {t('historyTab')}</h2>
            </div>
            <div className="flex-grow overflow-hidden pt-4 min-h-0">
              <SidePanel {...sidePanelProps} />
            </div>
          </div>
        )}
      </div>

      <div className="2xl:hidden">
        <SideDrawer
          isOpen={isDrawerOpen}
          onClose={toggleDrawer}
          {...sidePanelProps}
        />
      </div>

      <HelpModal isOpen={isHelpModalOpen} onClose={toggleHelpModal} t={t} />
      <AgentStatusIndicator
        isVisible={isAgentActive}
        onStop={handleAbort}
        t={t}
      />
    </div>
  );
};

export default App;
