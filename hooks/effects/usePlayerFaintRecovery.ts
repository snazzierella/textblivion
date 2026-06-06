
import React, { useEffect } from 'react';
import { GameState, GamePhase } from '../../types.ts';
import { isGeminiServiceInitialized, getPlayerFaintRecoveryDetails } from '../../services/geminiService.ts';
import { getStrippedStateForGemini } from '../utils/stateUtils.ts';
import { Action } from '../gameReducer.ts';

interface UsePlayerFaintRecoveryProps {
  dispatch: React.Dispatch<Action>;
  state: GameState;
}

export const usePlayerFaintRecovery = ({ dispatch, state }: UsePlayerFaintRecoveryProps): void => {
  useEffect(() => {
    const handleFaintRecovery = async () => {
        if (state.phase === GamePhase.PLAYER_FAINTED_RECOVERY && isGeminiServiceInitialized() && state.character) {
            try {
                const strippedState = getStrippedStateForGemini(state);
                const response = await getPlayerFaintRecoveryDetails(strippedState);
                dispatch({ type: 'PROCESS_GEMINI_RESPONSE', payload: { response, context: 'FAINT_RECOVERY_DETAILS_RECEIVED' } });
            } catch (error) {
                dispatch({ type: 'ADD_ERROR_MESSAGE', payload: `Error during faint recovery: ${(error as Error).message}` });
                dispatch({ type: 'PROCESS_GEMINI_RESPONSE', payload: { 
                    response: {
                        narrative: "You awaken with a throbbing headache, unsure of how you got here, but alive.",
                        faintConsequences: {
                            narrative: "You awaken with a throbbing headache, unsure of how you got here, but alive.",
                            newObjective: "Assess your situation and recover."
                        }
                    },
                    context: 'FAINT_RECOVERY_DETAILS_RECEIVED'
                }});
            } 
        }
    };
    handleFaintRecovery();
  }, [state.phase, state.character, dispatch, state]); 

   useEffect(() => {
    if (state.phase === GamePhase.PLAYER_FAINTED) {
        dispatch({ type: 'PLAYER_FAINTED_EVENT' }); 
    }
  }, [state.phase, dispatch]);
};
