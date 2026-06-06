
import React, { useEffect } from 'react';
import { GameState, GamePhase } from '../../types.ts';
import { isGeminiServiceInitialized, getAdventureIntro } from '../../services/geminiService.ts';
import { getStrippedStateForGemini } from '../utils/stateUtils.ts';
import { Action } from '../gameReducer.ts';

interface UseAdventureIntroEffectProps {
  dispatch: React.Dispatch<Action>;
  state: GameState;
}

export const useAdventureIntroEffect = ({ dispatch, state }: UseAdventureIntroEffectProps): void => {
  useEffect(() => {
    const fetchIntro = async () => {
      if (state.phase === GamePhase.ADVENTURE_INTRO) {
        if (state.character && isGeminiServiceInitialized()) {
          dispatch({ type: 'SET_LOADING', payload: true });
          try {
            const introPromptGameState = getStrippedStateForGemini(state);
            const response = await getAdventureIntro(state.character, introPromptGameState);
            dispatch({ type: 'PROCESS_GEMINI_RESPONSE', payload: { response, context: 'ADVENTURE_INTRO_RECEIVED' } });
          } catch (error) {
            dispatch({ type: 'ADD_ERROR_MESSAGE', payload: `Error starting adventure: ${(error as Error).message}` });
          } 
        } else if (!state.character) {
          dispatch({ type: 'ADD_ERROR_MESSAGE', payload: 'Critical error: Adventure intro without a character.' });
          dispatch({ type: 'START_NEW_GAME_AFTER_LOAD_FAIL' });
        } else if (!isGeminiServiceInitialized()) {
             dispatch({ type: 'ADD_ERROR_MESSAGE', payload: 'Storyteller API not ready.' });
        }
      }
    };
    fetchIntro();
  }, [state.phase, state.character, dispatch, state]); 
};
