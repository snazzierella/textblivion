
import React, { useEffect } from 'react';
import { GameState, GamePhase, NarrativeEntry, CharacterCreationData } from '../../types.ts';
import { RACE_DESCRIPTIONS } from '../../constants.ts';
import { Action } from '../gameReducer.ts';
import { getInitialCharacterCreationData } from '../characterCreationService.ts';


interface UseCharacterCreationFlowProps {
  dispatch: React.Dispatch<Action>;
  phase: GamePhase;
  narrativeLog: NarrativeEntry[];
  character: GameState['character'];
  ccStep: number;
  setCharacterCreationState: React.Dispatch<React.SetStateAction<CharacterCreationData>>;
}

export const useCharacterCreationFlow = ({
  dispatch,
  phase,
  narrativeLog,
  character,
  ccStep,
  setCharacterCreationState,
}: UseCharacterCreationFlowProps): void => {
  useEffect(() => {
    if (phase === GamePhase.CHARACTER_CREATION && 
        ccStep === 0 &&
        narrativeLog.filter(e => e.type === 'dm' && e.text && typeof e.text === 'string' && e.text.startsWith("Welcome, traveler")).length === 0 &&
        !character
      ) {
      setCharacterCreationState(getInitialCharacterCreationData());
      // setCcStep(0); // ccStep is already 0, managed by useGameEngine
      const welcomeNarrative = "Welcome, traveler, to the lands of Tamriel! Before we begin your grand adventure, tell me about yourself. What race are you?";
      dispatch({ 
        type: 'SET_CHARACTER_CREATION_NARRATIVE', 
        payload: { 
          narrative: welcomeNarrative,
          choices: RACE_DESCRIPTIONS.map(r => r.name),
          ccStep: 0 
        } 
      });
    }
  }, [phase, narrativeLog, character, ccStep, dispatch, setCharacterCreationState]);
};
