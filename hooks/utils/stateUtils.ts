
import { GameState } from '../../types.ts';

export const getStrippedStateForGemini = (state: GameState):Omit<GameState, 'narrativeLog' | 'apiKeyAvailable' | 'phase' | 'isDebugMode' | 'currentSceneImageUrl' | 'currentTargetMinigameConfig' | 'ttsEnabled' | 'lastDmNarrativeForTTS' | 'ttsNarratorVoiceURI' | 'ttsPlayerVoiceURI' | 'availableVoices' | 'levelUpIsFromBedtime'> => {
    const { 
        narrativeLog, apiKeyAvailable, phase, isDebugMode, currentSceneImageUrl, currentTargetMinigameConfig, 
        ttsEnabled, lastDmNarrativeForTTS,
        ttsNarratorVoiceURI, ttsPlayerVoiceURI, availableVoices,
        ...restOfState 
    } = state;
    
    const characterForState = restOfState.character ? { 
        ...restOfState.character,
        characterImageUrl: undefined,
        characterImageGenerationFailed: undefined,
        characterImageUrlIsGeneric: undefined,
        currentHealth: restOfState.character.currentHealth,
        maxHealth: restOfState.character.maxHealth,
        currentMana: restOfState.character.currentMana,
        maxMana: restOfState.character.maxMana,
        currentFatigue: restOfState.character.currentFatigue,
        maxFatigue: restOfState.character.maxFatigue,
        hungerLevel: restOfState.character.hungerLevel,
        exhaustionLevel: restOfState.character.exhaustionLevel,
        comfortLevel: restOfState.character.comfortLevel,
        maxComfort: restOfState.character.maxComfort,
    } : null;

    return { 
        ...restOfState, 
        character: characterForState,
        currentCity: state.currentCity,
        currentProvince: state.currentProvince,
        activeEffects: state.activeEffects, 
        currentEnvironmentalCondition: state.currentEnvironmentalCondition, 
        currentShelter: state.currentShelter,
        currentShelterName: state.currentShelterName,
        currentWeather: state.currentWeather,
        currentTimeOfDay: state.currentTimeOfDay, 
        currentHourInDay: state.currentHourInDay, 
        currentSeason: state.currentSeason,
        currentSubSeason: state.currentSubSeason,
    };
  };
