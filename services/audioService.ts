

let currentAudioElement: HTMLAudioElement | null = null;
let audioEndedCallback: (() => void) | null = null;

const ensureAudioElement = (): HTMLAudioElement => {
  if (!currentAudioElement) {
    currentAudioElement = new Audio();
    currentAudioElement.onended = () => {
      console.log("Audio playback finished.");
      if (audioEndedCallback) {
        audioEndedCallback();
        audioEndedCallback = null; // Clear callback after execution
      }
    };
    currentAudioElement.onerror = (e) => {
      console.error("Error during audio playback:", e, currentAudioElement?.error);
      if (audioEndedCallback) {
        audioEndedCallback(); // Call callback even on error to unblock any waiting logic
        audioEndedCallback = null;
      }
    };
    currentAudioElement.onpause = () => { // Also treat pause as an end for sequential playback logic
      if (currentAudioElement && currentAudioElement.currentTime === currentAudioElement.duration && audioEndedCallback) {
        // This is effectively an 'ended' event
      } else if (audioEndedCallback && currentAudioElement && currentAudioElement.paused && !currentAudioElement.ended) {
        // Explicit pause not at the end
        console.log("Audio playback paused by user or system.");
      }
    };

  }
  return currentAudioElement;
};

export const playAudio = async (audioDataUrl: string): Promise<void> => {
  if (!audioDataUrl.startsWith('data:audio/')) {
    console.error("Invalid audio data URL provided:", audioDataUrl.substring(0,30));
    return;
  }

  const audioElement = ensureAudioElement();

  // Stop any currently playing audio before starting new
  if (!audioElement.paused) {
    audioElement.pause();
    audioElement.currentTime = 0; // Reset time
    console.log("Stopped previous audio to play new one.");
  }
  
  // Create a promise that resolves when the audio ends or errors
  const playbackPromise = new Promise<void>((resolve) => {
    audioEndedCallback = resolve; // Set the callback for onended/onerror
  });

  audioElement.src = audioDataUrl;
  
  try {
    await audioElement.play();
    console.log("Audio playback started for:", audioDataUrl.substring(0, 50) + "...");
  } catch (error) {
    console.error("Error trying to play audio:", error);
    if (audioEndedCallback) {
      audioEndedCallback(); // Resolve promise on error to avoid deadlocks
      audioEndedCallback = null;
    }
    return; // Don't wait for playbackPromise if play() itself failed
  }
  
  await playbackPromise; // Wait for the audio to finish playing or error
};

export const stopCurrentAudio = (): void => {
  if (currentAudioElement && !currentAudioElement.paused) {
    currentAudioElement.pause();
    currentAudioElement.currentTime = 0; // Resetting time is good practice
    console.log("Audio playback explicitly stopped.");
    if (audioEndedCallback) { // If there's a pending callback (e.g., from playAudio promise)
        audioEndedCallback();   // Resolve it, as playback is now considered "finished" by interruption
        audioEndedCallback = null;
    }
  }
};

// No longer need isAudioServiceInitialized or getAvailableVoices for native Gemini audio.
// InitializeAudioService is also not needed for this approach.
