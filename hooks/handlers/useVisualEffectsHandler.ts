
import React, { useState, useCallback } from 'react';
import { GameState } from '../../types.ts';
import { isGeminiServiceInitialized, generateSceneImage, generateCharacterImage } from '../../services/geminiService.ts';
import { GENERIC_RACE_PORTRAITS } from '../../constants.ts';
import { Action } from '../gameReducer.ts';

interface UseVisualEffectsHandlerReturn {
  isGeneratingSceneImage: boolean;
  isRetryingCharacterImage: boolean;
  setIsRetryingCharacterImage: React.Dispatch<React.SetStateAction<boolean>>; // For useCharacterImageGenerationEffect
  generateAndSetSceneImage: () => Promise<void>;
  retryCharacterImageGeneration: () => Promise<void>;
}

export const useVisualEffectsHandler = (
  state: GameState,
  dispatch: React.Dispatch<Action>
): UseVisualEffectsHandlerReturn => {
  const [isGeneratingSceneImage, setIsGeneratingSceneImage] = useState(false);
  const [isRetryingCharacterImage, setIsRetryingCharacterImage] = useState(false);

  const generateAndSetSceneImage = useCallback(async () => {
    if (!state.character || isGeneratingSceneImage || !isGeminiServiceInitialized()) return;
    
    const lastDmNarrativeEntry = state.narrativeLog.filter(e => e.type === 'dm').pop();
    const sceneDescription = lastDmNarrativeEntry && typeof lastDmNarrativeEntry.text === 'string' 
      ? lastDmNarrativeEntry.text 
      : "the current surroundings";

    if (!sceneDescription) {
        dispatch({type: 'ADD_SYSTEM_MESSAGE', payload: "No recent narrative to generate a vision from."});
        return;
    }

    setIsGeneratingSceneImage(true);
    dispatch({type: 'ADD_SYSTEM_MESSAGE', payload: "Conjuring a vision of the scene..."});
    try {
        const imageUrl = await generateSceneImage(
            sceneDescription, 
            state.currentProvince, 
            state.currentCity, 
            state.currentShelter, 
            state.currentTimeOfDay,
            state.currentWeather
        );
        dispatch({type: 'SET_SCENE_IMAGE_URL', payload: imageUrl});
        if (imageUrl) {
            dispatch({type: 'ADD_SYSTEM_MESSAGE', payload: "A vision of the scene appears!"});
        } else {
            dispatch({type: 'ADD_SYSTEM_MESSAGE', payload: "The mists obscure the vision of the scene."});
        }
    } catch (error) {
        dispatch({type: 'ADD_ERROR_MESSAGE', payload: `Error generating scene vision: ${(error as Error).message}`});
    } finally {
        setIsGeneratingSceneImage(false);
    }
  }, [state.character, state.narrativeLog, state.currentProvince, state.currentCity, state.currentShelter, state.currentTimeOfDay, state.currentWeather, isGeneratingSceneImage, dispatch]);

  const retryCharacterImageGeneration = useCallback(async (): Promise<void> => {
    if (!state.character || isRetryingCharacterImage || !isGeminiServiceInitialized()) {
        return Promise.resolve();
    }
    
    setIsRetryingCharacterImage(true);
    dispatch({type: 'ADD_SYSTEM_MESSAGE', payload: "Attempting to re-conjure your adventurer's vision..."});
    try {
      const imageUrl = await generateCharacterImage(state.character);
      if (imageUrl) {
        dispatch({ type: 'SET_CHARACTER_IMAGE_DETAILS', payload: { url: imageUrl, generationFailed: false, isGeneric: false } });
        dispatch({type: 'ADD_SYSTEM_MESSAGE', payload: "A new vision of your adventurer has been conjured!"});
      } else {
        const genericUrl = GENERIC_RACE_PORTRAITS[state.character.race] || null;
        dispatch({ type: 'SET_CHARACTER_IMAGE_DETAILS', payload: { url: genericUrl, generationFailed: true, isGeneric: true } });
        dispatch({type: 'ADD_SYSTEM_MESSAGE', payload: "The mists still obscure a clear vision. A default image remains."});
      }
    } catch (error) {
      console.error("Error retrying character image generation:", error);
      const genericUrl = state.character ? GENERIC_RACE_PORTRAITS[state.character.race] : null;
      dispatch({ type: 'SET_CHARACTER_IMAGE_DETAILS', payload: { url: genericUrl, generationFailed: true, isGeneric: true } });
      dispatch({type: 'ADD_ERROR_MESSAGE', payload: `Error during vision retry: ${(error as Error).message}`});
    } finally {
      setIsRetryingCharacterImage(false);
    }
  }, [state.character, isRetryingCharacterImage, dispatch]);

  return { 
    isGeneratingSceneImage, 
    isRetryingCharacterImage, 
    setIsRetryingCharacterImage,
    generateAndSetSceneImage, 
    retryCharacterImageGeneration 
  };
};
