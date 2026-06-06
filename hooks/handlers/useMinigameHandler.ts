
import React, { useCallback } from 'react';
import { GameState } from '../../types.ts';
import { Action } from '../gameReducer.ts';

interface UseMinigameHandlerReturn {
  handleTargetMinigameEnd: (success: boolean) => void;
}

export const useMinigameHandler = (
  state: GameState,
  dispatch: React.Dispatch<Action>,
  handlePlayerInput: (input: string) => Promise<void> // Dependency from useInputHandler
): UseMinigameHandlerReturn => {
  const handleTargetMinigameEnd = useCallback((success: boolean) => {
    const config = state.currentTargetMinigameConfig;
    if (!config) {
        dispatch({type: 'ADD_ERROR_MESSAGE', payload: "Minigame ended but configuration was missing."});
        dispatch({type: 'SET_LOADING', payload: false }); 
        return;
    }
    const systemMessage = success ? config.successNarrativeHint : config.failureNarrativeHint;
    dispatch({ type: 'PROCESS_TARGET_MINIGAME_RESULT', payload: { success }});
    handlePlayerInput(`SYSTEM_ACTION: TARGET_MINIGAME_OUTCOME: ${success ? 'SUCCESS' : 'FAILURE'}. ${systemMessage}`);
  }, [state.currentTargetMinigameConfig, dispatch, handlePlayerInput]);

  return { handleTargetMinigameEnd };
};
