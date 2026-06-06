
import React, { useEffect } from 'react';
import { GameState, GamePhase } from '../../types.ts';
import { Action } from '../gameReducer.ts';

interface UsePostLevelUpRestEffectProps {
  dispatch: React.Dispatch<Action>;
  state: GameState;
}

export const usePostLevelUpRestEffect = ({ dispatch, state }: UsePostLevelUpRestEffectProps): void => {
  useEffect(() => {
    if (state.phase === GamePhase.AWAITING_POST_LEVELUP_REST) {
      // Dispatch APPLY_REST_AND_START_NEW_DAY to complete the bedtime sequence
      // This will handle stat recovery, time passage, and then trigger Gemini for the waking up narrative.
      dispatch({ type: 'APPLY_REST_AND_START_NEW_DAY' });
    }
  }, [state.phase, dispatch]);
};
