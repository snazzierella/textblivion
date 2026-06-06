
import React, { useEffect } from 'react';
import { GameState, GamePhase } from '../../types.ts';
import { isGeminiServiceInitialized, getRestSummaryConfirmation } from '../../services/geminiService.ts';
import { getStrippedStateForGemini } from '../utils/stateUtils.ts';
import { Action } from '../gameReducer.ts';

interface UseBedtimeSummaryEffectProps {
  dispatch: React.Dispatch<Action>;
  state: GameState;
}

export const useBedtimeSummaryEffect = ({ dispatch, state }: UseBedtimeSummaryEffectProps): void => {
  useEffect(() => {
    const fetchBedtimeSummaryIfNeeded = async () => {
      if (state.phase === GamePhase.AWAITING_BEDTIME_SUMMARY_GENERATION && isGeminiServiceInitialized()) {
        dispatch({ type: 'SET_LOADING', payload: true });
        try {
          const gameStateForSummary = getStrippedStateForGemini(state);
          const response = await getRestSummaryConfirmation(gameStateForSummary); 
          dispatch({ type: 'PROCESS_GEMINI_RESPONSE', payload: { response, context: 'BEDTIME_SUMMARY_RECEIVED' } });
        } catch (error) {
          dispatch({ type: 'ADD_ERROR_MESSAGE', payload: `Error getting bedtime summary: ${(error as Error).message}` });
           dispatch({ type: 'SET_LOADING', payload: false }); 
        } 
      }
    };
    fetchBedtimeSummaryIfNeeded();
  }, [state.phase, dispatch, state]); 
};
