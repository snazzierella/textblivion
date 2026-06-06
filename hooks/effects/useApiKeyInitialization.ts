
import React, { useEffect } from 'react';
import { GamePhase } from '../../types.ts';
import { initializeGeminiService } from '../../services/geminiService.ts';
import { Action } from '../gameReducer.ts';

interface UseApiKeyInitializationProps {
  dispatch: React.Dispatch<Action>;
  phase: GamePhase;
}

export const useApiKeyInitialization = ({ dispatch, phase }: UseApiKeyInitializationProps): void => {
  useEffect(() => {
    if (phase === GamePhase.LOADING_API_KEY) {
      const apiKey = process.env.API_KEY;
      if (apiKey && apiKey.trim() !== "") {
        const geminiInitialized = initializeGeminiService(apiKey);
        if(geminiInitialized) {
          dispatch({ type: 'ATTEMPT_INITIAL_LOAD' });
        } else {
          dispatch({ type: 'SET_API_KEY_STATUS', payload: { available: false, phase: GamePhase.API_KEY_MISSING } });
          dispatch({ type: 'ADD_ERROR_MESSAGE', payload: 'Failed to initialize Storyteller AI service even with API Key.' });
        }
      } else {
        dispatch({ type: 'SET_API_KEY_STATUS', payload: { available: false, phase: GamePhase.API_KEY_MISSING } });
      }
    }
  }, [phase, dispatch]);
};
