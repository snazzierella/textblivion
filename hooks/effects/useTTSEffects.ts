
import React, { useEffect, useRef } from 'react';
import { GameState } from '../../types.ts';
import { PARSED_TTS_VOICES } from '../../constants.ts';
import { generateNativeAudio } from '../../services/geminiService.ts'; // Corrected import path
import { playAudio, stopCurrentAudio } from '../../services/audioService.ts';
import { Action } from '../gameReducer.ts';

interface UseTTSEffectsProps {
  dispatch: React.Dispatch<Action>;
  state: GameState;
  setIsGeneratingAudio: React.Dispatch<React.SetStateAction<boolean>>;
  lastPlayedDmTextRef: React.MutableRefObject<string | null>;
}

export const useTTSEffects = ({
  dispatch,
  state,
  setIsGeneratingAudio,
  lastPlayedDmTextRef,
}: UseTTSEffectsProps): void => {
  useEffect(() => {
    dispatch({ type: 'SET_AVAILABLE_VOICES', payload: PARSED_TTS_VOICES });
    const defaultNarratorVoice = PARSED_TTS_VOICES.find(v => v.voiceURI === state.ttsNarratorVoiceURI) || 
                               PARSED_TTS_VOICES.find(v => v.default) || 
                               (PARSED_TTS_VOICES.length > 0 ? PARSED_TTS_VOICES[0] : null);
    if (defaultNarratorVoice && !state.ttsNarratorVoiceURI) {
        dispatch({ type: 'SET_NARRATOR_VOICE', payload: defaultNarratorVoice.voiceURI });
    }
    
    const defaultPlayerVoice = PARSED_TTS_VOICES.find(v => v.voiceURI === state.ttsPlayerVoiceURI) || 
                               PARSED_TTS_VOICES.find(v => v.voiceURI === "Leda") || // Specific default for player
                               (PARSED_TTS_VOICES.length > 0 ? PARSED_TTS_VOICES[0] : null);
    if (defaultPlayerVoice && !state.ttsPlayerVoiceURI) {
        dispatch({ type: 'SET_PLAYER_VOICE', payload: defaultPlayerVoice.voiceURI });
    }
  }, [dispatch, state.ttsNarratorVoiceURI, state.ttsPlayerVoiceURI]); // Removed PARSED_TTS_VOICES from deps as it's constant

  useEffect(() => {
    if (state.ttsEnabled && state.lastDmNarrativeForTTS && state.lastDmNarrativeForTTS !== lastPlayedDmTextRef.current) {
        const playNarration = async () => {
            setIsGeneratingAudio(true);
            stopCurrentAudio(); 
            try {
                const audioDataUrl = await generateNativeAudio(
                    state.lastDmNarrativeForTTS!,
                    state.ttsNarratorVoiceURI,
                    state.ttsPlayerVoiceURI
                );
                if (audioDataUrl) {
                    await playAudio(audioDataUrl);
                    lastPlayedDmTextRef.current = state.lastDmNarrativeForTTS;
                } else {
                    console.warn("TTS audio generation returned null for:", state.lastDmNarrativeForTTS?.substring(0,50));
                }
            } catch (error) {
                console.error("Error playing TTS audio:", error);
                dispatch({ type: 'ADD_ERROR_MESSAGE', payload: "Error with audio narration." });
            } finally {
                setIsGeneratingAudio(false);
            }
        };
        playNarration();
    }
  }, [state.ttsEnabled, state.lastDmNarrativeForTTS, state.ttsNarratorVoiceURI, state.ttsPlayerVoiceURI, dispatch, setIsGeneratingAudio, lastPlayedDmTextRef]);
};
