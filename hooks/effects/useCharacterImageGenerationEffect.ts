
import React, { useEffect } from 'react';
import { GameState, GamePhase } from '../../types.ts';
import { isGeminiServiceInitialized, generateCharacterImage } from '../../services/geminiService.ts';
import { GENERIC_RACE_PORTRAITS } from '../../constants.ts';
import { Action } from '../gameReducer.ts';

interface UseCharacterImageGenerationEffectProps {
  dispatch: React.Dispatch<Action>;
  state: GameState;
  setIsRetryingCharacterImage: React.Dispatch<React.SetStateAction<boolean>>;
}

export const useCharacterImageGenerationEffect = ({
  dispatch,
  state,
  setIsRetryingCharacterImage,
}: UseCharacterImageGenerationEffectProps): void => {
  useEffect(() => {
    const generateInitialCharacterImage = async () => {
      if (
        state.phase === GamePhase.ADVENTURE_INTRO &&
        state.character &&
        !state.character.characterImageUrl && 
        isGeminiServiceInitialized()
      ) {
        dispatch({ type: 'ADD_SYSTEM_MESSAGE', payload: "Summoning a vision of your adventurer..." });
        setIsRetryingCharacterImage(true); 
        try {
          const imageUrl = await generateCharacterImage(state.character);
          if (imageUrl) {
            dispatch({ type: 'SET_CHARACTER_IMAGE_DETAILS', payload: { url: imageUrl, generationFailed: false, isGeneric: false } });
            dispatch({ type: 'ADD_SYSTEM_MESSAGE', payload: "A vision of your adventurer has appeared!" });
          } else {
            const genericUrl = state.character ? GENERIC_RACE_PORTRAITS[state.character.race] : null;
            dispatch({ type: 'SET_CHARACTER_IMAGE_DETAILS', payload: { url: genericUrl, generationFailed: true, isGeneric: true } });
            dispatch({ type: 'ADD_SYSTEM_MESSAGE', payload: "The mists obscure the vision; a default image is being used. You can try to generate one later." });
          }
        } catch (error) {
          console.error("Error in image generation useEffect:", error);
          const genericUrl = state.character ? GENERIC_RACE_PORTRAITS[state.character.race] : null;
          dispatch({ type: 'SET_CHARACTER_IMAGE_DETAILS', payload: { url: genericUrl, generationFailed: true, isGeneric: true } });
          dispatch({ type: 'ADD_SYSTEM_MESSAGE', payload: `An error occurred while conjuring your image: ${(error as Error).message}. A default image will be used.` });
        } finally {
          setIsRetryingCharacterImage(false);
        }
      } else if ( 
        (state.phase === GamePhase.ADVENTURE_INTRO || state.phase === GamePhase.AWAITING_INPUT) &&
        state.character &&
        state.character.characterImageGenerationFailed &&
        (!state.character.characterImageUrl || !state.character.characterImageUrlIsGeneric)
      ) {
         const genericUrl = GENERIC_RACE_PORTRAITS[state.character.race] || null;
         if (state.character.characterImageUrl !== genericUrl || !state.character.characterImageUrlIsGeneric) {
            dispatch({ type: 'SET_CHARACTER_IMAGE_DETAILS', payload: { url: genericUrl, generationFailed: true, isGeneric: true } });
         }
      }
    };
    generateInitialCharacterImage();
  }, [state.phase, state.character, dispatch, setIsRetryingCharacterImage, state]); // Added full state
};
