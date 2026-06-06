
import React, { useEffect, useRef } from 'react';
import { GameState, GamePhase } from '../../types.ts';
import { isGeminiServiceInitialized, getWakingUpNarrative } from '../../services/geminiService.ts';
import { getStrippedStateForGemini } from '../utils/stateUtils.ts';
import { Action } from '../gameReducer.ts';

interface UseWakingUpNarrativeEffectProps {
  dispatch: React.Dispatch<Action>;
  state: GameState;
}

export const useWakingUpNarrativeEffect = ({ dispatch, state }: UseWakingUpNarrativeEffectProps): void => {
  const hasFetchedWakingNarrativeRef = useRef(false);

  useEffect(() => {
    // Reset the flag if the phase is no longer PROCESSING_INPUT or if the character is not set (e.g., new game)
    if (state.phase !== GamePhase.PROCESSING_INPUT || !state.character) {
      hasFetchedWakingNarrativeRef.current = false;
    }

    const fetchWakingNarrative = async () => {
      const lastEntry = state.narrativeLog.length > 0 ? state.narrativeLog[state.narrativeLog.length - 1] : null;
      const justFinishedResting = lastEntry?.type === 'system' && 
                                  typeof lastEntry.text === 'string' && 
                                  lastEntry.text.startsWith("You rest for");

      if (
        state.phase === GamePhase.PROCESSING_INPUT &&
        state.character &&
        isGeminiServiceInitialized() &&
        justFinishedResting &&
        !hasFetchedWakingNarrativeRef.current // Ensure it only runs once per waking event
      ) {
        hasFetchedWakingNarrativeRef.current = true; // Set flag to prevent re-fetching
        dispatch({ type: 'ADD_SYSTEM_MESSAGE', payload: "Fetching morning narrative..." });
        
        try {
          const strippedState = getStrippedStateForGemini(state);
          // The getWakingUpNarrative function will construct the specific prompt
          const response = await getWakingUpNarrative(strippedState);
          dispatch({ type: 'PROCESS_GEMINI_RESPONSE', payload: { response, context: 'STANDARD_TURN' } });
        } catch (error) {
          console.error("Error fetching waking up narrative:", error);
          dispatch({ type: 'ADD_ERROR_MESSAGE', payload: `Error getting waking up narrative: ${(error as Error).message}` });
          // Transition to AWAITING_INPUT even on error so the player isn't stuck in PROCESSING_INPUT
          dispatch({ type: 'SET_LOADING', payload: false }); 
        }
      }
    };

    fetchWakingNarrative();
  }, [state.phase, state.character, state.narrativeLog, dispatch, state]); // Add full state to dependencies
};
