

import React, { useState, useCallback } from 'react';
import { GameState, GamePhase, AttributeName, Attributes } from '../../types.ts';
import { LEVEL_UP_ATTRIBUTE_POINTS_TO_ALLOCATE } from '../../constants.ts';
import { Action } from '../gameReducer.ts';

interface LevelUpAttributePayload {
    updatedAttributes: Partial<Attributes>;
}

interface UseLevelUpHandlerReturn {
  levelUpAttributeAssignments: Partial<Attributes>;
  levelUpPointsToSpend: number;
  handleLevelUpAttributeSubmit: () => void;
  handleAttributeChangeDuringLevelUp: (attribute: AttributeName, change: number) => void;
}

export const useLevelUpHandler = (
  state: GameState,
  dispatch: React.Dispatch<Action>
): UseLevelUpHandlerReturn => {
  const [levelUpAttributeAssignments, setLevelUpAttributeAssignments] = useState<Partial<Attributes>>({});
  
  const pointsActuallyAllocated = Object.values(levelUpAttributeAssignments).reduce((sum: number, val) => sum + Math.max(0, (val as number) || 0), 0) as number;
  const levelUpPointsToSpend = LEVEL_UP_ATTRIBUTE_POINTS_TO_ALLOCATE - pointsActuallyAllocated;


  const handleAttributeChangeDuringLevelUp = useCallback((attribute: AttributeName, change: number) => {
    setLevelUpAttributeAssignments(prevAssignments => {
        const currentDelta = prevAssignments[attribute] || 0;
        const newDelta = currentDelta + change;
        
        const prospectiveAssignments = { ...prevAssignments, [attribute]: newDelta };
        const prospectivePointsAllocated = Object.values(prospectiveAssignments).reduce((sum: number, val) => sum + Math.max(0, (val as number) || 0), 0) as number;

        if (change > 0 && prospectivePointsAllocated > LEVEL_UP_ATTRIBUTE_POINTS_TO_ALLOCATE) {
            return prevAssignments;
        }
        if (change < 0 && newDelta < 0 ) {
            return prevAssignments;
        }
        
        return { ...prevAssignments, [attribute]: newDelta };
    });
  }, []);


  const handleLevelUpAttributeSubmit = useCallback(() => {
    if (state.phase !== GamePhase.LEVEL_UP_ATTRIBUTE_ALLOCATION) return;

    const totalAssigned = Object.values(levelUpAttributeAssignments).reduce((sum: number, val) => sum + ((val as number) || 0), 0) as number;
    
    if (totalAssigned !== LEVEL_UP_ATTRIBUTE_POINTS_TO_ALLOCATE) {
        dispatch({ type: 'ADD_SYSTEM_MESSAGE', payload: `You must assign exactly ${LEVEL_UP_ATTRIBUTE_POINTS_TO_ALLOCATE} points. You have assigned ${totalAssigned}.`});
        return;
    }
    if (!state.character) {
        dispatch({ type: 'ADD_ERROR_MESSAGE', payload: "Cannot level up without a character."});
        return;
    }

    const payload: LevelUpAttributePayload = { updatedAttributes: levelUpAttributeAssignments };
    dispatch({ type: 'CONFIRM_LEVEL_UP_ATTRIBUTES', payload });
    setLevelUpAttributeAssignments({}); 
    
    // Check if this level up was triggered from the bedtime sequence
    // A simple way is to check the last few narrative log entries for bedtime intent/summary confirmation
    // Or, if PREPARE_LEVEL_UP action payload indicated 'fromBedtime'.
    // For now, let's assume if the game was in AWAITING_BEDTIME_SUMMARY_CONFIRMATION or LEVEL_UP_ATTRIBUTE_ALLOCATION (after summary), it's bedtime.
    // The CONFIRM_LEVEL_UP_ATTRIBUTES action in the reducer will now handle dispatching APPLY_REST_AND_START_NEW_DAY.
    // So, this handler doesn't need to dispatch it anymore. The reducer handles the next step.

  }, [state.phase, state.character, levelUpAttributeAssignments, dispatch]);

  return { 
    levelUpAttributeAssignments, 
    levelUpPointsToSpend, 
    handleLevelUpAttributeSubmit, 
    handleAttributeChangeDuringLevelUp 
  };
};
