
import React, { useReducer, useState, useRef, useCallback } from 'react';
import { 
  GameState, GamePhase, PlayerCharacter, CharacterCreationData, AttributeName, Attributes, SaveSlotMetadata
} from '../types.ts';
import { gameReducer, getInitialState, Action } from './gameReducer.ts'; 
import { getInitialCharacterCreationData } from './characterCreationService.ts';

// Import Effect Hooks
import { useApiKeyInitialization } from './effects/useApiKeyInitialization.ts';
import { useCharacterCreationFlow } from './effects/useCharacterCreationFlow.ts';
import { usePlayerFaintRecovery } from './effects/usePlayerFaintRecovery.ts';
import { useCharacterImageGenerationEffect } from './effects/useCharacterImageGenerationEffect.ts';
import { useAdventureIntroEffect } from './effects/useAdventureIntroEffect.ts';
import { useBedtimeSummaryEffect } from './effects/useBedtimeSummaryEffect.ts';
import { useTTSEffects } from './effects/useTTSEffects.ts';
import { usePostLevelUpRestEffect } from './effects/usePostLevelUpRestEffect.ts';
import { useWakingUpNarrativeEffect } from './effects/useWakingUpNarrativeEffect.ts'; // New effect

// Import Handler Hooks
import { useGameManagement } from './handlers/useGameManagement.ts';
import { useLevelUpHandler } from './handlers/useLevelUpHandler.ts';
import { useVisualEffectsHandler } from './handlers/useVisualEffectsHandler.ts';
import { useAudioHandler } from './handlers/useAudioHandler.ts';
import { useMinigameHandler } from './handlers/useMinigameHandler.ts';
import { useInputHandler } from './handlers/useInputHandler.ts';


interface CharacterCreationDataPayload { 
    majorSkills?: GameState['character']['skills'][0]['skill'][]; 
    minorSkills?: GameState['character']['skills'][0]['skill'][];
    attributePointsToAssign?: number;
}

interface UseGameEngineReturn {
  state: GameState;
  dispatch: React.Dispatch<any>;
  handlePlayerInput: (input: string, data?: CharacterCreationDataPayload) => Promise<void>;
  handleRetry: () => Promise<void>;
  characterCreationState: CharacterCreationData;
  ccStep: number;
  saveGameSlot: (slotId: string) => void;
  loadGameSlot: (slotId: string) => Promise<void>;
  deleteGameSlot: (slotId: string) => void;
  slotsMetadata: SaveSlotMetadata[];
  hasLegacySave: boolean;
  importLegacySave: (slotId: string) => boolean;
  requestNewGame: () => void;
  handleAttributeChange: (attribute: AttributeName, change: number) => void; 
  setCharacterCreationState: React.Dispatch<React.SetStateAction<CharacterCreationData>>;
  levelUpAttributeAssignments: Partial<Attributes>;
  levelUpPointsToSpend: number;
  handleLevelUpAttributeSubmit: () => void;
  generateAndSetSceneImage: () => Promise<void>;
  isGeneratingSceneImage: boolean;
  retryCharacterImageGeneration: () => Promise<void>;
  isRetryingCharacterImage: boolean;
  handleTargetMinigameEnd: (success: boolean) => void;
  toggleTTS: (enabled: boolean) => void;
  setNarratorVoiceURI: (voiceURI: string | null) => void;
  setPlayerVoiceURI: (voiceURI: string | null) => void;
  replayLastAudio: () => void;
  isGeneratingAudio: boolean;
}


export const useGameEngine = (): UseGameEngineReturn => {
  const [state, dispatch] = useReducer(gameReducer, getInitialState());
  const [characterCreationState, setCharacterCreationState] = useState<CharacterCreationData>(getInitialCharacterCreationData());
  const [ccStep, setCcStep] = useState(0); 
  
  // Visual Effects Handler (provides its own state setters)
  const { 
    isGeneratingSceneImage, 
    isRetryingCharacterImage, 
    setIsRetryingCharacterImage, 
    generateAndSetSceneImage, 
    retryCharacterImageGeneration 
  } = useVisualEffectsHandler(state, dispatch);

  // Audio Handler (provides its own state setters and ref)
  const { 
    isGeneratingAudio,
    setIsGeneratingAudio, 
    toggleTTS, 
    setNarratorVoiceURI, 
    setPlayerVoiceURI, 
    replayLastAudio,
    lastPlayedDmTextRef
  } = useAudioHandler(state, dispatch);

  // Level Up Handler
  const { 
    levelUpAttributeAssignments, 
    levelUpPointsToSpend, 
    handleLevelUpAttributeSubmit, 
    handleAttributeChangeDuringLevelUp 
  } = useLevelUpHandler(state, dispatch);


  // --- Effect Hooks ---
  useApiKeyInitialization({ dispatch, phase: state.phase });
  useCharacterCreationFlow({ dispatch, phase: state.phase, narrativeLog: state.narrativeLog, character: state.character, ccStep, setCharacterCreationState });
  usePlayerFaintRecovery({ dispatch, state });
  useCharacterImageGenerationEffect({ dispatch, state, setIsRetryingCharacterImage });
  useAdventureIntroEffect({ dispatch, state });
  useBedtimeSummaryEffect({ dispatch, state });
  useTTSEffects({ dispatch, state, setIsGeneratingAudio, lastPlayedDmTextRef });
  usePostLevelUpRestEffect({ dispatch, state }); 
  useWakingUpNarrativeEffect({ dispatch, state }); // New effect usage

  // --- Handler Hooks ---
  const { 
    saveGameSlot, 
    loadGameSlot, 
    deleteGameSlot, 
    slotsMetadata, 
    hasLegacySave, 
    importLegacySave, 
    requestNewGame 
  } = useGameManagement(state, dispatch);

  const handleAttributeChangeInCC = useCallback((attribute: AttributeName, change: number) => {
    setCharacterCreationState(prev => {
        const currentAssigned = prev.assignedAttributes[attribute] || 0;
        const newAssignedVal = currentAssigned + change;
        let newPointsToAssign = prev.attributePointsToAssign - change;
        if (newPointsToAssign < 0 && change > 0) return prev; 
        if (newAssignedVal < 0 && change < 0) return prev; 
        return { ...prev, assignedAttributes: { ...prev.assignedAttributes, [attribute]: newAssignedVal }, attributePointsToAssign: newPointsToAssign };
    });
  }, [setCharacterCreationState]);

  const { handlePlayerInput, handleRetry } = useInputHandler({
    state,
    dispatch,
    characterCreationState,
    setCharacterCreationState,
    ccStep,
    setCcStep,
    handleAttributeChangeInCC
  });
  
  const { handleTargetMinigameEnd } = useMinigameHandler(state, dispatch, handlePlayerInput);

  // Combined handleAttributeChange for props
  const handleAttributeChange = useCallback((attribute: AttributeName, change: number) => {
    if (state.phase === GamePhase.CHARACTER_CREATION) {
      handleAttributeChangeInCC(attribute, change);
    } else if (state.phase === GamePhase.LEVEL_UP_ATTRIBUTE_ALLOCATION) {
      handleAttributeChangeDuringLevelUp(attribute, change);
    }
  }, [state.phase, handleAttributeChangeInCC, handleAttributeChangeDuringLevelUp]);


  return { 
    state, 
    dispatch,
    handlePlayerInput, 
    handleRetry,
    characterCreationState, 
    ccStep, 
    saveGameSlot, 
    loadGameSlot, 
    deleteGameSlot, 
    slotsMetadata, 
    hasLegacySave, 
    importLegacySave, 
    requestNewGame, 
    handleAttributeChange, 
    setCharacterCreationState,
    levelUpAttributeAssignments,
    levelUpPointsToSpend,
    handleLevelUpAttributeSubmit,
    generateAndSetSceneImage,
    isGeneratingSceneImage,
    retryCharacterImageGeneration,
    isRetryingCharacterImage,
    handleTargetMinigameEnd,
    toggleTTS,
    setNarratorVoiceURI,
    setPlayerVoiceURI,
    replayLastAudio,
    isGeneratingAudio, 
  };
};
