

import {
  GameState, GamePhase, TimeOfDay, EnvironmentalCondition, ShelterQuality, WeatherCondition, Season, SubSeason, TTSVoiceOption
} from '../types.ts';
import {
  INITIAL_SEPTIMS, INITIAL_PROMPT_NUMBER, INITIAL_DAY_NUMBER,
  INITIAL_DAY_OF_WEEK, INITIAL_TIME_OF_DAY, INITIAL_HOUR_IN_DAY,
  INITIAL_SHELTER_QUALITY, INITIAL_WEATHER_CONDITION, INITIAL_TEMPERATURE,
  PARSED_TTS_VOICES,
  DAYS_PER_SUB_SEASON, DAYS_PER_SEASON, SEASONS_ORDER, SUB_SEASONS_ORDER
} from '../constants.ts';

export const calculateCurrentSeasonAndSubSeason = (dayNumber: number): { season: Season, subSeason: SubSeason } => {
  const dayInYearCycle = (dayNumber - 1) % (DAYS_PER_SEASON * SEASONS_ORDER.length);
  const seasonIndex = Math.floor(dayInYearCycle / DAYS_PER_SEASON);
  const dayInSeasonCycle = dayInYearCycle % DAYS_PER_SEASON;
  const subSeasonIndex = Math.floor(dayInSeasonCycle / DAYS_PER_SUB_SEASON);

  return {
    season: SEASONS_ORDER[seasonIndex % SEASONS_ORDER.length],
    subSeason: SUB_SEASONS_ORDER[subSeasonIndex % SUB_SEASONS_ORDER.length],
  };
};


export const getInitialState = (): GameState => {
  const initialSeasons = calculateCurrentSeasonAndSubSeason(INITIAL_DAY_NUMBER);
  return {
    phase: GamePhase.LOADING_API_KEY,
    apiKeyAvailable: null,
    promptNumber: INITIAL_PROMPT_NUMBER,
    currentDayNumber: INITIAL_DAY_NUMBER,
    currentDayOfWeek: INITIAL_DAY_OF_WEEK,
    currentTimeOfDay: INITIAL_TIME_OF_DAY,
    currentHourInDay: INITIAL_HOUR_IN_DAY,
    currentSeason: initialSeasons.season,
    currentSubSeason: initialSeasons.subSeason,
    character: null,
    currentProvince: null,
    currentCity: null,
    inventory: { carried: [], stashed: [], septims: INITIAL_SEPTIMS },
    prospectiveQuests: [],
    majorEvents: [],
    eventsSinceLastRest: [],
    narrativeLog: [],
    currentChoices: [],
    currentObjective: "Initialize game",
    permanentSkillUpsSinceLastLevelUp: 0,
    attributePointsToAllocateForLevelUp: 0,
    levelUpIsFromBedtime: false, 
    activeEffects: [],
    isDebugMode: false,
    currentEnvironmentalCondition: EnvironmentalCondition.MILD,
    currentTemperature: INITIAL_TEMPERATURE, // Initialize specific temp
    currentShelter: INITIAL_SHELTER_QUALITY,
    currentShelterName: null,
    currentWeather: INITIAL_WEATHER_CONDITION,
    currentSceneImageUrl: null,
    currentTargetMinigameConfig: null,
    ttsEnabled: false,
    lastDmNarrativeForTTS: null,
    lastCallFailed: false,
    lastPlayerInput: null,
    autosaveStateToLoad: null,
    fallbackManualSaveStateToLoad: null,
    autosaveTimestamp: null,
    ttsNarratorVoiceURI: "Gacrux", 
    ttsPlayerVoiceURI: "Leda",   
    availableVoices: PARSED_TTS_VOICES as readonly TTSVoiceOption[], 
  };
};