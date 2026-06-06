

import React, { useEffect, useRef, useState } from 'react';
import { TTSVoiceOption } from '../types.ts';
import { generateNativeAudio } from '../services/geminiService.ts';
import { playAudio, stopCurrentAudio } from '../services/audioService.ts';

interface SoundSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  ttsEnabled: boolean;
  onToggleTTS: (enabled: boolean) => void;
  narratorVoice: string;
  onSetNarratorVoice: (voiceURI: string | null) => void;
  playerVoice: string; 
  onSetPlayerVoice: (voiceURI: string | null) => void;
  onReplayLastAudio: () => void;
  voiceOptions: readonly TTSVoiceOption[];
}

const MODAL_ID = "sound-settings-modal";
const MODAL_TITLE_ID = "sound-settings-title";

const SoundSettingsModal: React.FC<SoundSettingsModalProps> = ({
  isOpen,
  onClose,
  ttsEnabled,
  onToggleTTS,
  narratorVoice,
  onSetNarratorVoice,
  playerVoice,
  onSetPlayerVoice,
  onReplayLastAudio,
  voiceOptions,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);

  const [testingVoice, setTestingVoice] = useState<'narrator' | 'player' | null>(null);

  const handleTestVoice = async (role: 'narrator' | 'player', voiceURI: string) => {
    if (!voiceURI) return;
    setTestingVoice(role);
    stopCurrentAudio();
    try {
      const sampleText = role === 'narrator' 
        ? "Testing narrator voice. May the Nine Divines watch over your path."
        : "Testing character voice. By Azura, my adventure begins!";
      
      const audioUrl = await generateNativeAudio(
        sampleText,
        role === 'narrator' ? voiceURI : null,
        role === 'player' ? voiceURI : null
      );
      
      if (audioUrl) {
        await playAudio(audioUrl);
      } else {
        console.warn("Failed to generate test audio for voice:", voiceURI);
      }
    } catch (err) {
      console.error("Error testing voice:", err);
    } finally {
      setTestingVoice(null);
    }
  };

  useEffect(() => {
    if (isOpen) {
      previouslyFocusedElementRef.current = document.activeElement as HTMLElement;
      closeButtonRef.current?.focus();

      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          onClose();
        }
        // Basic tab trapping
        if (event.key === 'Tab' && modalRef.current) {
          const focusableElements = Array.from(
            modalRef.current.querySelectorAll<HTMLElement>(
              'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            )
          ).filter(el => (el as HTMLElement).offsetParent !== null) as HTMLElement[]; // only visible, focusable elements

          if (focusableElements.length === 0) return;

          const firstElement = focusableElements[0];
          const lastElement = focusableElements[focusableElements.length - 1];

          if (event.shiftKey) {
            if (document.activeElement === firstElement) {
              lastElement.focus();
              event.preventDefault();
            }
          } else {
            if (document.activeElement === lastElement) {
              firstElement.focus();
              event.preventDefault();
            }
          }
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        previouslyFocusedElementRef.current?.focus();
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
      onClick={onClose} // Close on overlay click
      role="dialog"
      aria-modal="true"
      aria-labelledby={MODAL_TITLE_ID}
    >
      <div
        ref={modalRef}
        id={MODAL_ID}
        className="bg-gray-800 p-6 rounded-lg shadow-2xl max-w-md w-full text-gray-200"
        onClick={(e) => e.stopPropagation()} // Prevent close on inner content click
      >
        <div className="flex justify-between items-center mb-6">
          <h2 id={MODAL_TITLE_ID} className="text-xl font-bold text-amber-400">
            Sound Settings
          </h2>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white bg-gray-700 hover:bg-red-600 rounded-full transition-colors"
            aria-label="Close sound settings"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          {/* TTS Enabled Toggle */}
          <div className="flex items-center justify-between p-3 bg-gray-700 rounded-md">
            <label htmlFor="tts-enabled-toggle" className="text-sm font-medium text-gray-300">
              Enable Text-to-Speech
            </label>
            <button
              id="tts-enabled-toggle"
              onClick={() => onToggleTTS(!ttsEnabled)}
              className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-700 focus:ring-amber-500 ${
                ttsEnabled ? 'bg-green-500' : 'bg-gray-600'
              }`}
              role="switch"
              aria-checked={ttsEnabled}
            >
              <span className="sr-only">Enable Text-to-Speech</span>
              <span
                className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${
                  ttsEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Narrator Voice Select */}
          <div className="p-3 bg-gray-700 rounded-md">
            <label htmlFor="narrator-voice-select" className="block text-sm font-medium text-gray-300 mb-1">
              Narrator Voice
            </label>
            <div className="flex gap-2">
              <select
                id="narrator-voice-select"
                value={narratorVoice || ''}
                onChange={(e) => onSetNarratorVoice(e.target.value)}
                disabled={!ttsEnabled || voiceOptions.length === 0}
                className="flex-1 p-2 bg-gray-600 border border-gray-500 rounded-md text-gray-200 focus:ring-amber-500 focus:border-amber-500 disabled:opacity-50 text-sm"
              >
                {voiceOptions.length === 0 && <option value="">No voices available</option>}
                {voiceOptions.map((option) => (
                  <option key={option.voiceURI} value={option.voiceURI}>
                    {option.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                id="test-narrator-voice-btn"
                disabled={!ttsEnabled || voiceOptions.length === 0 || testingVoice !== null}
                onClick={() => handleTestVoice('narrator', narratorVoice)}
                className="px-3 bg-amber-600 hover:bg-amber-500 disabled:bg-gray-600 disabled:opacity-50 disabled:text-gray-400 text-gray-900 rounded-md font-bold text-xs transition-colors hover:text-black whitespace-nowrap min-w-[85px]"
              >
                {testingVoice === 'narrator' ? 'Playing...' : 'Test Voice'}
              </button>
            </div>
          </div>

          {/* Player Character Voice Select */}
          <div className="p-3 bg-gray-700 rounded-md">
            <label htmlFor="player-voice-select" className="block text-sm font-medium text-gray-300 mb-1">
              Player Character Voice
            </label>
            <div className="flex gap-2">
              <select
                id="player-voice-select"
                value={playerVoice || ''}
                onChange={(e) => onSetPlayerVoice(e.target.value)}
                disabled={!ttsEnabled || voiceOptions.length === 0}
                className="flex-1 p-2 bg-gray-600 border border-gray-500 rounded-md text-gray-200 focus:ring-amber-500 focus:border-amber-500 disabled:opacity-50 text-sm"
              >
                {voiceOptions.length === 0 && <option value="">No voices available</option>}
                {voiceOptions.map((option) => (
                  <option key={option.voiceURI} value={option.voiceURI}>
                    {option.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                id="test-player-voice-btn"
                disabled={!ttsEnabled || voiceOptions.length === 0 || testingVoice !== null}
                onClick={() => handleTestVoice('player', playerVoice)}
                className="px-3 bg-amber-600 hover:bg-amber-500 disabled:bg-gray-600 disabled:opacity-50 disabled:text-gray-400 text-gray-900 rounded-md font-bold text-xs transition-colors hover:text-black whitespace-nowrap min-w-[85px]"
              >
                {testingVoice === 'player' ? 'Playing...' : 'Test Voice'}
              </button>
            </div>
          </div>
          
          {/* Replay Last Audio Button */}
          <button
            onClick={onReplayLastAudio}
            disabled={!ttsEnabled}
            className="w-full mt-4 p-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-md font-semibold transition-colors duration-150 disabled:bg-gray-500 disabled:opacity-50"
          >
            Replay Last Narrative
          </button>
        </div>
      </div>
    </div>
  );
};

export default SoundSettingsModal;
