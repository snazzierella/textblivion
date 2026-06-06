
import React, { useState, useCallback, useRef } from 'react';
import { GameState } from '../../types.ts';
import { generateNativeAudio } from '../../services/geminiService.ts'; // Corrected import path
import { playAudio, stopCurrentAudio } from '../../services/audioService.ts';
import { Action } from '../gameReducer.ts';

interface UseAudioHandlerReturn {
  isGeneratingAudio: boolean;
  setIsGeneratingAudio: React.Dispatch<React.SetStateAction<boolean>>; // Added setter
  toggleTTS: (enabled: boolean) => void;
  setNarratorVoiceURI: (voiceURI: string | null) => void;
  setPlayerVoiceURI: (voiceURI: string | null) => void;
  replayLastAudio: () => void;
  lastPlayedDmTextRef: React.MutableRefObject<string | null>; // Export for useTTSEffects
}

export const useAudioHandler = (
  state: GameState,
  dispatch: React.Dispatch<Action>
): UseAudioHandlerReturn => {
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const lastPlayedDmTextRef = useRef<string | null>(null);

  const toggleTTS = useCallback((enabled: boolean) => {
    dispatch({ type: 'TOGGLE_TTS', payload: enabled });
    if (!enabled) stopCurrentAudio(); 
  }, [dispatch]);

  const setNarratorVoiceURI = useCallback((voiceURI: string | null) => {
      dispatch({ type: 'SET_NARRATOR_VOICE', payload: voiceURI });
  }, [dispatch]);

  const setPlayerVoiceURI = useCallback((voiceURI: string | null) => {
      dispatch({ type: 'SET_PLAYER_VOICE', payload: voiceURI });
  }, [dispatch]);

  const replayLastAudio = useCallback(async () => {
    if (state.ttsEnabled && state.lastDmNarrativeForTTS) {
        setIsGeneratingAudio(true);
        stopCurrentAudio();
        try {
            const audioDataUrl = await generateNativeAudio(
                state.lastDmNarrativeForTTS,
                state.ttsNarratorVoiceURI,
                state.ttsPlayerVoiceURI
            );
            if (audioDataUrl) {
                await playAudio(audioDataUrl);
                lastPlayedDmTextRef.current = state.lastDmNarrativeForTTS; 
            } else {
                 console.warn("TTS audio replay returned null for:", state.lastDmNarrativeForTTS?.substring(0,50));
            }
        } catch (error) {
            console.error("Error replaying TTS audio:", error);
            dispatch({ type: 'ADD_ERROR_MESSAGE', payload: "Error replaying audio narration." });
        } finally {
            setIsGeneratingAudio(false);
        }
    } else if (!state.ttsEnabled) {
        dispatch({ type: 'ADD_SYSTEM_MESSAGE', payload: "TTS is currently disabled." });
    } else if (!state.lastDmNarrativeForTTS) {
        dispatch({ type: 'ADD_SYSTEM_MESSAGE', payload: "No recent narrative to replay." });
    }
  }, [state.ttsEnabled, state.lastDmNarrativeForTTS, state.ttsNarratorVoiceURI, state.ttsPlayerVoiceURI, dispatch]);

  return {
    isGeneratingAudio,
    setIsGeneratingAudio, // Return the setter
    toggleTTS,
    setNarratorVoiceURI,
    setPlayerVoiceURI,
    replayLastAudio,
    lastPlayedDmTextRef,
  };
};
