
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { GameState, GeminiRequestPayload, GeminiResponse, NarrativeEntry, TimeOfDay, PlayerCharacter, FaintConsequencesPayload, EnvironmentalCondition, ShelterQuality, Race, Province, WeatherCondition } from '../types.ts';
import { TEXTBLIVION_DM_INSTRUCTIONS, GEMINI_MODEL_NAME, INITIAL_DAY_OF_WEEK, INITIAL_TIME_OF_DAY, INITIAL_SEPTIMS, formatHourMinute } from '../constants.ts';

let ai: GoogleGenAI | null = null;
const GEMINI_NATIVE_AUDIO_MODEL_NAME = "gemini-3.1-flash-tts-preview";
const GEMINI_IMAGE_MODEL_NAME = "gemini-2.5-flash-image";

const TARGET_SAMPLE_RATE = 24000;
const TARGET_NUM_CHANNELS = 1;
const TARGET_BITS_PER_SAMPLE = 16;

// Speaker IDs for multi-speaker TTS
const NARRATOR_SPEAKER_ID = "Narrator";
const PLAYER_SPEAKER_ID = "Player";


export const initializeGeminiService = (apiKey: string): boolean => {
  if (!apiKey) {
    console.error("API Key is missing for Gemini Service.");
    return false;
  }
  try {
    ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
    return true;
  } catch (error) {
    console.error("Failed to initialize Gemini AI:", error);
    return false;
  }
};

export const isGeminiServiceInitialized = (): boolean => !!ai;

type GeminiServiceGameState = Omit<GameState, 'narrativeLog' | 'apiKeyAvailable' | 'phase' | 'isDebugMode' | 'currentSceneImageUrl' | 'currentTargetMinigameConfig' | 'ttsEnabled' | 'lastDmNarrativeForTTS' | 'ttsNarratorVoiceURI' | 'ttsPlayerVoiceURI' | 'availableVoices' | 'levelUpIsFromBedtime'>;

const constructPrompt = (
  currentGameState: GeminiServiceGameState,
  playerInput: string,
  isCorrection: boolean = false,
  isFaintRecoveryPrompt: boolean = false
): string => {
  const characterStateForPrompt = currentGameState.character ? {
    ...currentGameState.character,
    characterImageUrl: undefined, // Defensive strip
    characterImageGenerationFailed: undefined,
    characterImageUrlIsGeneric: undefined,
    currentHealth: currentGameState.character.currentHealth,
    maxHealth: currentGameState.character.maxHealth,
    currentMana: currentGameState.character.currentMana,
    maxMana: currentGameState.character.maxMana,
    currentFatigue: currentGameState.character.currentFatigue,
    maxFatigue: currentGameState.character.maxFatigue,
    hungerLevel: currentGameState.character.hungerLevel,
    exhaustionLevel: currentGameState.character.exhaustionLevel,
    comfortLevel: currentGameState.character.comfortLevel,
    maxComfort: currentGameState.character.maxComfort,
  } : null;

  const stateForPrompt: GeminiServiceGameState = {
    ...currentGameState,
    character: characterStateForPrompt, 
    // @ts-ignore
    prospectiveQuests: currentGameState.prospectiveQuests.filter(q => q.isActive),
    // @ts-ignore 
    majorEventsSummaryForPrompt: currentGameState.majorEvents.slice(-5).map(e => `Day ${e.day}: ${e.description}`), 
    currentEnvironmentalCondition: currentGameState.currentEnvironmentalCondition,
    currentShelter: currentGameState.currentShelter,
    currentWeather: currentGameState.currentWeather,
  };

  const request: GeminiRequestPayload = {
    dmInstructions: TEXTBLIVION_DM_INSTRUCTIONS,
    gameState: stateForPrompt,
    playerInput: playerInput,
    ...(isCorrection && { isCorrection: true }),
    ...(isFaintRecoveryPrompt && { isFaintRecoveryPrompt: true }),
  };
  
  const preamble = `
You are Textblivion, an Elder Scrolls DM. The following is a JSON object representing the current game state and player input/system action.
Your task is to process this and respond with a JSON object as specified in your DM instructions (TEXTBLIVION_DM_INSTRUCTIONS).
Adhere strictly to the output format. Ensure 'narrative' field is always present.
If 'isFaintRecoveryPrompt: true' is present, you MUST provide the 'faintConsequences' object as per Rule 19.
`;

  return preamble + JSON.stringify(request, null, 2);
};

const parseGeminiJsonResponse = (responseText: string): GeminiResponse => {
    let jsonStr = responseText.trim();
    
    // 1. Direct standard parse attempt
    try {
        return JSON.parse(jsonStr);
    } catch (e) {
        // Fall through
    }

    // 2. Clear out markdown fences if present
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonStr.match(fenceRegex);
    if (match && match[2]) {
        jsonStr = match[2].trim();
        try {
            return JSON.parse(jsonStr);
        } catch (e) {
            // Fall through
        }
    }

    // Try a second fallback for multi-line code fences that might get clipped or messed up
    let cleaned = jsonStr.replace(/^```[a-zA-Z-]*\s*/gm, '');
    cleaned = cleaned.replace(/```\s*$/gm, '');
    cleaned = cleaned.trim();
    try {
        return JSON.parse(cleaned);
    } catch (e) {
        jsonStr = cleaned;
    }

    // 3. Robust bracket-matching recovery
    // Locate the first '{' and try all matching '}' from right-to-left
    const jsonStart = jsonStr.indexOf('{');
    if (jsonStart !== -1) {
        const closeIndices: number[] = [];
        let idx = jsonStr.lastIndexOf('}');
        while (idx > jsonStart) {
            closeIndices.push(idx);
            idx = jsonStr.lastIndexOf('}', idx - 1);
        }

        for (const endIdx of closeIndices) {
            const candidate = jsonStr.substring(jsonStart, endIdx + 1);
            try {
                return JSON.parse(candidate);
            } catch (err) {
                // Keep searching
            }
        }
    }

    throw new Error(`Failed to extract and parse valid JSON from Gemini response. Raw: ${responseText.substring(0, 300)}...`);
};


export const getGameResponse = async (
  currentGameState: GeminiServiceGameState,
  playerInput: string,
  isCorrection: boolean = false,
  isFaintRecoveryPrompt: boolean = false
): Promise<GeminiResponse> => {
  if (!ai) {
    throw new Error("Gemini AI service not initialized.");
  }

  const prompt = constructPrompt(currentGameState, playerInput, isCorrection, isFaintRecoveryPrompt);

  try {
    console.log("Sending prompt to Gemini (isCorrection=" + isCorrection + ", isFaintRecovery=" + isFaintRecoveryPrompt + "):", prompt.substring(0, 500) + "..."); 
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: GEMINI_MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });
    
    console.log("Raw Gemini response text:", response.text.substring(0, 500) + "..."); 
    const parsedResponse = parseGeminiJsonResponse(response.text);
    console.log("Parsed Gemini response:", parsedResponse); 
    return parsedResponse;

  } catch (error) {
    console.error("Error calling Gemini API or parsing response:", error);
    
    const errMsg = (error as Error).message || "Unknown error";
    const errString = (typeof error === 'object' && error !== null) 
      ? JSON.stringify(error).toLowerCase() + " " + errMsg.toLowerCase()
      : errMsg.toLowerCase();
      
    let narrative = "The mists of Oblivion swirl, and your connection to the threads of fate is temporarily lost. (Error communicating with the storyteller. Please try again.)";
    
    if (errString.includes("429") || errString.includes("quota") || errString.includes("exhausted") || errString.includes("rate limit")) {
      narrative = "The mists of Oblivion swirl, and your connection to the threads of fate is temporarily lost. (Error: Gemini API Quota Limit Exceeded. You have hit the Google AI Studio rate limit. Please wait 15-30 seconds before clicking Retry.)";
    } else if (errString.includes("503") || errString.includes("demand") || errString.includes("busy") || errString.includes("unavailable")) {
      narrative = "The mists of Oblivion swirl, and your connection to the threads of fate is temporarily lost. (Error: Gemini Model is Currently Busy / High Demand. Spikes in demand are temporary. Please try clicking Retry in a moment.)";
    } else if (errString.includes("api key") || errString.includes("key is invalid") || errString.includes("api_key")) {
      narrative = "The mists of Oblivion swirl, and your connection to the threads of fate is temporarily lost. (Error: Invalid or missing API Key. Please verify your environment configurations or Netlify API key setup.)";
    } else {
      narrative = `The mists of Oblivion swirl, and your connection to the threads of fate is temporarily lost. (Error: ${errMsg})`;
    }
    
    return {
      narrative,
      error: errMsg,
    };
  }
};


export const getAdventureIntro = async (character: NonNullable<GameState['character']>, gameState: GeminiServiceGameState): Promise<GeminiResponse> => {
  return getGameResponse(
    { ...gameState, character }, 
    "SYSTEM_ACTION: Start Adventure. Character is now created. Provide an engaging introduction to their first scenario based on their profile and starting province. Specify their starting city via 'currentCityName' and 'currentProvinceName'."
  );
};

export const getRestSummaryConfirmation = async (gameState: GeminiServiceGameState): Promise<GeminiResponse> => {
  return getGameResponse(gameState, "SYSTEM_ACTION: Player is resting, provide End-of-Day summary for confirmation.");
};

export const getPlayerFaintRecoveryDetails = async (gameState: GeminiServiceGameState): Promise<GeminiResponse> => {
  return getGameResponse(
    gameState, 
    "SYSTEM_ACTION: Player has fainted. Provide a narrative for their awakening and the consequences. You MUST use the 'faintConsequences' field in your JSON response as per Rule 19 of your DM instructions.",
    false, // isCorrection
    true   // isFaintRecoveryPrompt
  );
};

export const getWakingUpNarrative = async (gameState: GeminiServiceGameState): Promise<GeminiResponse> => {
    const systemPromptForWakingUp = `SYSTEM_ACTION: Player character has woken up. Day: ${gameState.currentDayNumber}, Time: ${gameState.currentTimeOfDay} (${formatHourMinute(gameState.currentHourInDay)}), Season: ${gameState.currentSubSeason} ${gameState.currentSeason}. Current Objective: ${gameState.currentObjective}. Narrate the morning and what the player experiences. Adhere to Rule 3 (Waking Up Protocol).`;
    return getGameResponse(gameState, systemPromptForWakingUp);
};


const RACE_APPEARANCE_CATEGORIES: Record<Race, string> = {
    "Nord": "human with rounded ears",
    "Imperial": "human with rounded ears",
    "Breton": "human with rounded ears",
    "Redguard": "dark-skinned human with rounded ears",
    "Dunmer": "elven, dark elf, with distinct grey skin tone and pointed ears",
    "Altmer": "elven, high elf, with distinct golden or pale skin tone and pointed ears",
    "Bosmer": "elven, wood elf, often with tribal markings or nature-themed adornments and pointed ears",
    "Orc": "orcish, often with green or grey skin, prominent tusks, and rugged features, ears may be somewhat pointed but distinct from elven",
    "Khajiit": "feline, cat-like humanoid, covered in fur, with feline ears",
    "Argonian": "reptilian, lizard-like humanoid, with scales and horns or frills, ear structure varies or may be absent",
};

export const generateCharacterImage = async (character: PlayerCharacter): Promise<string | null> => {
  if (!ai) {
    console.error("Gemini AI service not initialized for image generation.");
    return null;
  }

  const raceAppearance = RACE_APPEARANCE_CATEGORIES[character.race] || '';

  let promptParts = [
    `Medieval fantasy portrait of ${character.name}, a ${character.race} (${raceAppearance}) ${character.archetype}`
  ];

  if (character.presentation) {
    promptParts.push(`with a ${character.presentation.toLowerCase()} presentation`);
  }

  if (character.age && character.age.trim() !== "") {
    promptParts.push(`, appearing in the ${character.age.trim()} age group`);
  }
  promptParts.push('.'); 

  if (character.hairColor && character.hairColor.trim() !== "") {
    promptParts.push(`Hair color: ${character.hairColor.trim()}.`);
  }
  if (character.distinguishingFeatures && character.distinguishingFeatures.trim() !== "") {
    promptParts.push(`Notable features: ${character.distinguishingFeatures.trim()}.`);
  }
  promptParts.push("Detailed face, high fantasy art style, centered head and shoulders shot, dramatic lighting, intricate details.");
  
  const prompt = promptParts.join(' ');
  
  try {
    console.log("Sending prompt to Gemini Image model for character portrait:", prompt);
    const response = await ai.models.generateContent({
        model: GEMINI_IMAGE_MODEL_NAME, 
        contents: { parts: [{ text: prompt }] },
        // Aspect ratio and other configs are not supported on flash-image in the same way as pro-image-preview yet via this specific SDK method for all endpoints,
        // but passing them is generally safe or ignored. For Flash Image, we generally just send the text prompt.
    });

    // Iterate parts to find the image
    let imageUrl: string | null = null;
    if (response.candidates && response.candidates[0] && response.candidates[0].content && response.candidates[0].content.parts) {
        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData && part.inlineData.data) {
                imageUrl = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
                break;
            }
        }
    }

    if (imageUrl) {
      console.log("Gemini character image generated successfully.");
      return imageUrl;
    } else {
      console.warn("Gemini character response did not contain expected image data:", response);
      return null;
    }
  } catch (error) {
    console.error("Error generating character image with Gemini:", error);
    throw error;
  }
};


export const generateSceneImage = async (
    sceneDescription: string, 
    currentProvince: Province | null, 
    currentCity: string | null, 
    shelter: ShelterQuality, 
    timeOfDay: TimeOfDay,
    weather: WeatherCondition
  ): Promise<string | null> => {
    if (!ai) {
      console.error("Gemini AI service not initialized for scene image generation.");
      return null;
    }
  
    let locationDetails = "an unknown location";
    if (currentCity) {
        locationDetails = `${currentCity}${currentProvince ? `, ${currentProvince}` : ''}`;
    } else if (currentProvince) {
        locationDetails = `the wilds of ${currentProvince}`;
    }

    let shelterDetails = "";
    if (shelter !== ShelterQuality.NONE) {
        shelterDetails = ` The character is currently in/at a ${shelter.toLowerCase()} shelter.`;
    }

    let weatherDetails = `The weather is ${weather.toLowerCase()}.`;
     switch(weather) {
        case WeatherCondition.CLEAR: weatherDetails = "The sky is clear and bright."; break;
        case WeatherCondition.CLOUDY: weatherDetails = "The sky is cloudy."; break;
        case WeatherCondition.OVERCAST: weatherDetails = "The sky is overcast with a thick layer of clouds."; break;
        case WeatherCondition.RAIN: weatherDetails = "It's raining."; break;
        case WeatherCondition.STORM: weatherDetails = "A fierce storm is raging, with heavy rain and strong winds."; break;
        case WeatherCondition.SNOW: weatherDetails = "Snow is falling gently."; break;
        case WeatherCondition.BLIZZARD: weatherDetails = "A blizzard is raging with heavy snow and poor visibility."; break;
        case WeatherCondition.FOG: weatherDetails = "The area is shrouded in thick fog."; break;
    }
  
    const prompt = `A vivid fantasy art depiction of: "${sceneDescription.substring(0, 300)}". The setting is ${locationDetails}.${shelterDetails} The time is ${timeOfDay}. ${weatherDetails} Style: detailed digital painting, atmospheric, immersive, Elder Scrolls universe aesthetic.`;
    
    try {
      console.log("Sending prompt to Gemini Image model for scene:", prompt);
      const response = await ai.models.generateContent({
          model: GEMINI_IMAGE_MODEL_NAME, 
          contents: { parts: [{ text: prompt }] },
      });
  
      let imageUrl: string | null = null;
      if (response.candidates && response.candidates[0] && response.candidates[0].content && response.candidates[0].content.parts) {
          for (const part of response.candidates[0].content.parts) {
              if (part.inlineData && part.inlineData.data) {
                  imageUrl = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
                  break;
              }
          }
      }
  
      if (imageUrl) {
        console.log("Gemini scene image generated successfully.");
        return imageUrl;
      } else {
        console.warn("Gemini scene response did not contain expected image data:", response);
        return null;
      }
    } catch (error) {
      console.error("Error generating scene image with Gemini:", error);
      throw error;
    }
  };

// Helper function to write a string to a DataView
function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

// Helper function to convert base64 string to ArrayBuffer
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

// Helper function to convert ArrayBuffer to base64 string
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Encodes raw PCM samples (Int16Array) into a WAV ArrayBuffer
function encodePCMToWAV(
    samples: Int16Array, 
    sampleRate: number, 
    numChannels: number, 
    bitsPerSample: number
  ): ArrayBuffer {
  const bytesPerSample = bitsPerSample / 8;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = samples.length * bytesPerSample;

  const buffer = new ArrayBuffer(44 + dataSize); // 44 bytes for WAV header
  const view = new DataView(buffer);

  // RIFF chunk descriptor
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true); // chunkSize
  writeString(view, 8, 'WAVE');

  // FMT sub-chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);  // subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true);   // audioFormat (1 for PCM)
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);

  // DATA sub-chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // Write PCM samples
  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += bytesPerSample) {
    if (bitsPerSample === 16) {
      view.setInt16(offset, samples[i], true);
    } else if (bitsPerSample === 8) {
      view.setUint8(offset, samples[i]); 
    }
  }
  return buffer;
}

const NARRATION_CUE_REGEX = /(NARRATION|NARRATIVE)\s*_?\s*SAYS\s*_?\s*:\s*/gi;
const PLAYER_CUE_REGEX = /PLAYER\s*_?\s*SAYS\s*_?\s*:\s*/gi;

const processTextForTTS = (
    text: string, 
    mode: 'multi-speaker' | 'single-speaker',
    narratorSpeakerId: string, 
    playerSpeakerId: string    
): string => {
    let processedText = text;

    if (mode === 'multi-speaker') {
        processedText = processedText.replace(NARRATION_CUE_REGEX, `${narratorSpeakerId}: `);
        processedText = processedText.replace(PLAYER_CUE_REGEX, `${playerSpeakerId}: `);
    } else { 
        processedText = processedText.replace(NARRATION_CUE_REGEX, '');
        processedText = processedText.replace(PLAYER_CUE_REGEX, '');
        
        const narratorInternalCue = new RegExp(`${narratorSpeakerId}\\s*:\\s*`, 'gi');
        const playerInternalCue = new RegExp(`${playerSpeakerId}\\s*:\\s*`, 'gi');
        
        processedText = processedText.replace(narratorInternalCue, '');
        processedText = processedText.replace(playerInternalCue, '');
    }

    return processedText
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .join('\n');
};


export const generateNativeAudio = async (
    textToSpeak: string, 
    narratorVoiceName?: string | null,
    playerVoiceName?: string | null
): Promise<string | null> => {
  if (!ai) {
    console.error("Gemini AI service not initialized for audio generation.");
    return null;
  }
  if (!textToSpeak.trim()) {
    console.warn("Attempted to generate audio for empty text.");
    return null;
  }

  let apiContents: any;
  let apiConfig: any = { responseModalities: ['AUDIO'] };
  let processedTextForTTS: string;

  if (narratorVoiceName && playerVoiceName) {
    console.log(`Attempting multi-speaker TTS. Narrator: ${narratorVoiceName}, Player: ${playerVoiceName}`);
    processedTextForTTS = processTextForTTS(textToSpeak, 'multi-speaker', NARRATOR_SPEAKER_ID, PLAYER_SPEAKER_ID);
    
    const promptForApi = `TTS the following. Use the voice assigned to '${NARRATOR_SPEAKER_ID}' for lines starting with '${NARRATOR_SPEAKER_ID}:' and the voice assigned to '${PLAYER_SPEAKER_ID}' for lines starting with '${PLAYER_SPEAKER_ID}:'.\n\n${processedTextForTTS}`;
    
    apiContents = [{ parts: [{ text: promptForApi }] }];
    apiConfig.speechConfig = {
      multiSpeakerVoiceConfig: {
        speakerVoiceConfigs: [
          {
            speaker: NARRATOR_SPEAKER_ID,
            voiceConfig: { prebuiltVoiceConfig: { voiceName: narratorVoiceName } }
          },
          {
            speaker: PLAYER_SPEAKER_ID,
            voiceConfig: { prebuiltVoiceConfig: { voiceName: playerVoiceName } }
          }
        ]
      }
    };
  } else {
    const voiceToUse = narratorVoiceName || "Zephyr"; 
    console.log(`Attempting single-speaker TTS with voice: ${voiceToUse}`);
    processedTextForTTS = processTextForTTS(textToSpeak, 'single-speaker', NARRATOR_SPEAKER_ID, PLAYER_SPEAKER_ID);
    apiContents = [{ parts: [{ text: processedTextForTTS }] }]; 
    apiConfig.speechConfig = {
      voiceConfig: {
        prebuiltVoiceConfig: { voiceName: voiceToUse }
      }
    };
  }

  if (!processedTextForTTS.trim()) {
    console.warn("Text became empty after processing cues. Skipping audio generation.");
    return null;
  }

  try {
    console.log(`Sending prompt to Gemini for native audio:`, typeof apiContents === 'string' ? apiContents.substring(0,100) + "..." : JSON.stringify(apiContents).substring(0,100) + "...");
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: GEMINI_NATIVE_AUDIO_MODEL_NAME,
      contents: apiContents,
      config: apiConfig
    });

    console.log("Raw Gemini native audio response object:", JSON.stringify(response, null, 2));

    const candidate = response.candidates?.[0];
    let base64AudioData: string | undefined = candidate?.content?.parts?.[0]?.inlineData?.data;
    const originalMimeType = candidate?.content?.parts?.[0]?.inlineData?.mimeType;

    if (!base64AudioData && typeof response.text === 'string' && response.text.length > 100) {
        try {
            atob(response.text.substring(0, 20)); 
            base64AudioData = response.text;
            console.log("Using response.text as base64 audio data due to missing inlineData.data.");
        } catch (e) {
            console.warn("response.text was not valid base64 encoded data, and inlineData.data missing.");
        }
    }
    
    if (base64AudioData) {
      console.log(`Received base64 audio data. Original API MimeType: ${originalMimeType || 'N/A'}. Assuming PCM 16-bit, 24kHz, mono.`);
      
      const pcmArrayBuffer = base64ToArrayBuffer(base64AudioData);
      const pcmInt16Samples = new Int16Array(pcmArrayBuffer);

      const wavArrayBuffer = encodePCMToWAV(
        pcmInt16Samples,
        TARGET_SAMPLE_RATE,
        TARGET_NUM_CHANNELS,
        TARGET_BITS_PER_SAMPLE
      );

      const wavBase64String = arrayBufferToBase64(wavArrayBuffer);
      const audioDataUrl = `data:audio/wav;base64,${wavBase64String}`;
      
      console.log(`Native audio generated and converted to WAV successfully.`);
      return audioDataUrl;

    } else {
      console.warn("Gemini native audio response did not contain expected audio data structure.", response);
      return null;
    }
  } catch (error) {
    console.error("Error generating native audio with Gemini or converting to WAV:", error);
    return null;
  }
};
