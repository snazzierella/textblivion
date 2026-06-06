
import {
  GameState, GamePhase, PlayerCharacter, NarrativeEntry, Item, AttributeName,
  CharacterSkill, SkillLevel, ActiveEffect, FaintConsequencesPayload,
  TimeOfDay, EnvironmentalCondition, ShelterQuality, WeatherCondition,
  TargetMinigameConfig, AteFoodDetail, Season, SubSeason, TTSVoiceOption, Attributes,
  Skill, 
  GeminiResponse 
} from '../types.ts';
import {
  DAYS_OF_WEEK, INITIAL_SEPTIMS, INITIAL_PROMPT_NUMBER, INITIAL_DAY_NUMBER,
  INITIAL_DAY_OF_WEEK, INITIAL_TIME_OF_DAY, INITIAL_HOUR_IN_DAY, MAX_NARRATIVE_LOG_LENGTH,
  BASE_ATTRIBUTE_VALUE, HEALTH_PER_ENDURANCE_POINT, MANA_PER_INTELLIGENCE_POINT, FATIGUE_PER_ENDURANCE_POINT,
  INITIAL_HUNGER_LEVEL, INITIAL_EXHAUSTION_LEVEL, INITIAL_COMFORT_LEVEL, BASE_MAX_HEALTH, BASE_MAX_MANA, BASE_MAX_FATIGUE, BASE_MAX_COMFORT,
  LEVEL_UP_ATTRIBUTE_POINTS_TO_ALLOCATE, LOCAL_STORAGE_SAVE_KEY, SKILLS_LIST,
  REST_HEALTH_RECOVERY_PERCENT, REST_MANA_RECOVERY_PERCENT, REST_FATIGUE_RECOVERY_PERCENT, REST_HUNGER_INCREASE_PER_HOUR_OF_REST,
  NAP_DURATION_HOURS, NAP_EXHAUSTION_REDUCTION_FACTOR, NAP_HEALTH_RECOVERY_FRACTION, NAP_MANA_RECOVERY_FRACTION, NAP_FATIGUE_RECOVERY_FRACTION,
  formatHourMinute, getHungerStatus, getExhaustionStatus, getComfortStatus, SKILL_VALUE_MAP,
  INITIAL_WEATHER_CONDITION, 
  INITIAL_SHELTER_QUALITY, 
  formatDurationForLog, 
  MAX_HUNGER_LEVEL, 
  getTimeOfDayFromHour, 
  getHourForTimeOfDay 
} from '../constants.ts';
import { getInitialState, calculateCurrentSeasonAndSubSeason } from './gameStateInitialization.ts';
import {
  getLatitudeFactor, calculateEnvironmentalCondition, getSkillLevel, calculateComfortLevel, applyStatChangesAndPenalties, enrichItemWithStats
} from './gameReducerHelpers.ts';
import { debugReducer } from './reducers/debugReducer.ts';
import { processGeminiResponse } from './reducers/processGeminiResponse.ts';
import { v4 as uuidv4 } from 'uuid';

// Action type definitions
interface CharacterCreationDataPayload { majorSkills?: Skill[]; minorSkills?: Skill[]; attributePointsToAssign?: number; }
interface LevelUpAttributePayload { updatedAttributes: Partial<Attributes>; }
export type GeminiResponseContext = 'SUMMARY_CORRECTION' | 'FAINT_RECOVERY_DETAILS_RECEIVED' | 'ADVENTURE_INTRO_RECEIVED' | 'BEDTIME_SUMMARY_RECEIVED' | 'STANDARD_TURN';


export type Action =
  | { type: 'INITIALIZE_GAME_STATE'; payload: GameState }
  | { type: 'SET_API_KEY_STATUS'; payload: { available: boolean; phase: GamePhase } }
  | { type: 'ATTEMPT_INITIAL_LOAD' }
  | { type: 'LOAD_GAME_SUCCESS'; payload: GameState }
  | { type: 'MANUAL_LOAD_FAILURE'; payload: { message: string } }
  | { type: 'START_NEW_GAME_AFTER_LOAD_FAIL' }
  | { type: 'SAVE_GAME_SUCCESS' }
  | { type: 'SAVE_GAME_FAILURE'; payload: { message: string } }
  | { type: 'REQUEST_NEW_GAME' }
  | { type: 'CONFIRM_NEW_GAME' }
  | { type: 'CANCEL_NEW_GAME' }
  | { type: 'START_CHARACTER_CREATION' }
  | { type: 'SET_CHARACTER_CREATION_NARRATIVE'; payload: { narrative: string; choices?: string[], ccStep?: number } }
  | { type: 'CREATE_CHARACTER'; payload: Omit<PlayerCharacter, 'currentHealth' | 'maxHealth' | 'currentMana' | 'maxMana' | 'currentFatigue' | 'maxFatigue' | 'hungerLevel' | 'exhaustionLevel' | 'comfortLevel' | 'maxComfort' | 'characterImageUrl' | 'characterImageGenerationFailed' | 'characterImageUrlIsGeneric' | 'level'> }
  | { type: 'SET_CHARACTER_IMAGE_DETAILS'; payload: { url: string | null; generationFailed: boolean; isGeneric: boolean } }
  | { type: 'SET_SCENE_IMAGE_URL'; payload: string | null }
  | { type: 'START_ADVENTURE_INTRO' }
  | { type: 'PROCESS_GEMINI_RESPONSE'; payload: { response: GeminiResponse; context: GeminiResponseContext } }
  | { type: 'ADD_PLAYER_INPUT_TO_LOG'; payload: string }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'REQUEST_BEDTIME_INTENT_CONFIRMATION' }
  | { type: 'CANCEL_BEDTIME_INTENT' }
  | { type: 'EXECUTE_NAP' }
  | { type: 'PREPARE_LEVEL_UP'; payload?: { fromBedtime?: boolean } } 
  | { type: 'CONFIRM_LEVEL_UP_ATTRIBUTES'; payload: LevelUpAttributePayload }
  | { type: 'PROCEED_TO_BEDTIME_SUMMARY' } 
  | { type: 'CONFIRM_BEDTIME_SUMMARY_ACCEPTANCE' } 
  | { type: 'APPLY_REST_AND_START_NEW_DAY' } 
  | { type: 'PLAYER_FAINTED_EVENT' }
  | { type: 'PROCESS_FAINT_RECOVERY'; payload: FaintConsequencesPayload } 
  | { type: 'APPLY_PLAYER_CORRECTION'; payload: Partial<GameState> }
  | { type: 'ADD_SYSTEM_MESSAGE'; payload: string | string[] }
  | { type: 'ADD_ERROR_MESSAGE'; payload: string }
  | { type: 'START_TARGET_MINIGAME'; payload: TargetMinigameConfig }
  | { type: 'PROCESS_TARGET_MINIGAME_RESULT'; payload: { success: boolean } }
  | { type: 'TOGGLE_TTS'; payload: boolean }
  | { type: 'SET_LAST_DM_NARRATIVE_FOR_TTS'; payload: string | null }
  | { type: 'SET_NARRATOR_VOICE'; payload: string | null }
  | { type: 'SET_PLAYER_VOICE'; payload: string | null }
  | { type: 'SET_AVAILABLE_VOICES'; payload: readonly TTSVoiceOption[] }
  | { type: 'TOGGLE_DEBUG_MODE'; payload: boolean }
  | { type: 'DEBUG_TRIGGER_LEVEL_UP' }
  | { type: 'DEBUG_ADD_SEPTIMS'; payload: number }
  | { type: 'DEBUG_INCREASE_SKILL'; payload: { skillName: Skill; amount: number } }
  | { type: 'DEBUG_ADD_ITEM'; payload: Item }
  | { type: 'DEBUG_ADD_EFFECT'; payload: Omit<ActiveEffect, 'id' | 'remainingHours'> }
  | { type: 'DEBUG_PASS_TIME'; payload: number }
  | { type: 'DEBUG_SET_HOUR'; payload: number }
  | { type: 'DEBUG_SET_TIMEOFDAY'; payload: TimeOfDay }
  | { type: 'DEBUG_SET_HEALTH'; payload: { current: number; max?: number } }
  | { type: 'DEBUG_SET_MANA'; payload: { current: number; max?: number } }
  | { type: 'DEBUG_SET_FATIGUE'; payload: { current: number; max?: number } }
  | { type: 'DEBUG_SET_HUNGER'; payload: { level: number } }
  | { type: 'DEBUG_SET_EXHAUSTION'; payload: { level: number } }
  | { type: 'DEBUG_SET_COMFORT'; payload: { level: number } }
  | { type: 'DEBUG_SET_ENVIRONMENT'; payload: EnvironmentalCondition }
  | { type: 'DEBUG_SET_SHELTER'; payload: { quality: ShelterQuality; name?: string } }
  | { type: 'DEBUG_SET_WEATHER'; payload: WeatherCondition }
  | { type: 'EQUIP_INVENTORY_ITEM'; payload: { itemId: string } }
  | { type: 'UNEQUIP_INVENTORY_ITEM'; payload: { itemId: string } }
  | { type: 'CONSUME_INVENTORY_ITEM'; payload: { itemId: string } };


export { getInitialState }; 

export const gameReducer = (state: GameState, action: Action): GameState => {
  let newNarrativeLog = [...state.narrativeLog];

  const addEntryToLog = (type: NarrativeEntry['type'], text: string | string[], promptNum?: number) => {
    const newEntry: NarrativeEntry = { id: uuidv4(), type, text, promptNumber: promptNum, timestamp: new Date().toLocaleTimeString() };
    newNarrativeLog.push(newEntry);
    if (newNarrativeLog.length > MAX_NARRATIVE_LOG_LENGTH) {
      newNarrativeLog.shift();
    }
  };

  if (action.type.startsWith('DEBUG_') || action.type === 'TOGGLE_DEBUG_MODE') {
      const debugState = debugReducer(state, action, addEntryToLog);
      return { ...debugState, narrativeLog: newNarrativeLog };
  }

  switch (action.type) {
    case 'INITIALIZE_GAME_STATE':
      return action.payload; 
    case 'SET_API_KEY_STATUS':
      return { ...state, apiKeyAvailable: action.payload.available, phase: action.payload.phase };

    case 'ATTEMPT_INITIAL_LOAD':
      try {
        const savedData = localStorage.getItem(LOCAL_STORAGE_SAVE_KEY);
        if (savedData) {
          const loadedState = JSON.parse(savedData) as GameState;
          
          // Restore saved narrative history and append the loading success message.
          newNarrativeLog = [...(loadedState.narrativeLog || [])];
          addEntryToLog('system', 'Welcome back! Loaded your saved game.');
          
          // Repeat the last DM prompt so the player can see it and get back into context.
          const lastDm = [...newNarrativeLog].reverse().find(entry => entry.type === 'dm');
          if (lastDm) {
            addEntryToLog('dm', lastDm.text, lastDm.promptNumber);
          }
          if (loadedState.currentChoices && loadedState.currentChoices.length > 0) {
            addEntryToLog('choices', loadedState.currentChoices);
          }
          
          const charWithDefaults = loadedState.character ? {
            ...loadedState.character,
            currentHealth: loadedState.character.currentHealth ?? BASE_MAX_HEALTH, maxHealth: loadedState.character.maxHealth ?? BASE_MAX_HEALTH,
            currentMana: loadedState.character.currentMana ?? BASE_MAX_MANA, maxMana: loadedState.character.maxMana ?? BASE_MAX_MANA,
            currentFatigue: loadedState.character.currentFatigue ?? BASE_MAX_FATIGUE, maxFatigue: loadedState.character.maxFatigue ?? BASE_MAX_FATIGUE,
            hungerLevel: loadedState.character.hungerLevel ?? INITIAL_HUNGER_LEVEL, exhaustionLevel: loadedState.character.exhaustionLevel ?? INITIAL_EXHAUSTION_LEVEL,
            comfortLevel: loadedState.character.comfortLevel ?? INITIAL_COMFORT_LEVEL, maxComfort: loadedState.character.maxComfort ?? BASE_MAX_COMFORT,
            skills: loadedState.character.skills || [],
          } : null;
           if (charWithDefaults) {
            const existingSkillNames = charWithDefaults.skills.map(s => s.skill);
            SKILLS_LIST.forEach(skillName => {
                if (!existingSkillNames.includes(skillName)) {
                    charWithDefaults.skills.push({ skill: skillName, value: 5, level: getSkillLevel(5), isMajor: false });
                } else { const skillToUpdate = charWithDefaults.skills.find(s => s.skill === skillName); if (skillToUpdate) skillToUpdate.level = getSkillLevel(skillToUpdate.value); }
            });
          }

          const loadedSeasons = calculateCurrentSeasonAndSubSeason(loadedState.currentDayNumber || INITIAL_DAY_NUMBER);
          const loadedLatFactor = getLatitudeFactor(loadedState.currentProvince || charWithDefaults?.startingProvince || null, loadedState.currentCity || null);
          const loadedEnv = calculateEnvironmentalCondition(loadedState.currentWeather || INITIAL_WEATHER_CONDITION, loadedSeasons.season, loadedSeasons.subSeason, loadedLatFactor, loadedState.currentTimeOfDay || INITIAL_TIME_OF_DAY);
          if (charWithDefaults) charWithDefaults.comfortLevel = calculateComfortLevel(charWithDefaults.equippedItems, loadedEnv, loadedState.currentShelter || INITIAL_SHELTER_QUALITY);

          const ttsText = lastDm ? (typeof lastDm.text === 'string' ? lastDm.text : (Array.isArray(lastDm.text) ? lastDm.text.join('\n') : null)) : (loadedState.lastDmNarrativeForTTS || null);

          return {
            ...getInitialState(), ...loadedState, character: charWithDefaults, apiKeyAvailable: true,
            phase: (loadedState.phase === GamePhase.PLAYER_FAINTED || loadedState.phase === GamePhase.PLAYER_FAINTED_RECOVERY || loadedState.phase === GamePhase.TARGET_MINIGAME_ACTIVE || loadedState.phase === GamePhase.AWAITING_POST_LEVELUP_REST) ? GamePhase.AWAITING_INPUT : (loadedState.phase || GamePhase.AWAITING_INPUT),
            narrativeLog: newNarrativeLog, currentSeason: loadedSeasons.season, currentSubSeason: loadedSeasons.subSeason,
            currentEnvironmentalCondition: loadedEnv, currentTargetMinigameConfig: null, 
            levelUpIsFromBedtime: loadedState.levelUpIsFromBedtime || false,
            lastDmNarrativeForTTS: ttsText,
          };
        } else {
          addEntryToLog('system', 'No saved game found. Starting a new adventure!');
          return { ...getInitialState(), apiKeyAvailable: true, phase: GamePhase.CHARACTER_CREATION, narrativeLog: newNarrativeLog };
        }
      } catch (e) {
        addEntryToLog('error', `Error loading saved game: ${(e as Error).message}. Starting a new adventure.`);
        localStorage.removeItem(LOCAL_STORAGE_SAVE_KEY);
        return { ...getInitialState(), apiKeyAvailable: true, phase: GamePhase.CHARACTER_CREATION, narrativeLog: newNarrativeLog };
      }

    case 'LOAD_GAME_SUCCESS': {
        const loadedState = action.payload;
        
        // Restore saved narrative history and append loading confirmation.
        newNarrativeLog = [...(loadedState.narrativeLog || [])];
        addEntryToLog('system', 'Game Loaded Successfully.');
        
        // Repeat the last DM prompt so the player can see it and get back into context.
        const lastDm = [...newNarrativeLog].reverse().find(entry => entry.type === 'dm');
        if (lastDm) {
          addEntryToLog('dm', lastDm.text, lastDm.promptNumber);
        }
        if (loadedState.currentChoices && loadedState.currentChoices.length > 0) {
          addEntryToLog('choices', loadedState.currentChoices);
        }

        const charDefaults = loadedState.character ? {
            ...loadedState.character, skills: loadedState.character.skills || [] 
        } : null;
         if (charDefaults) {
            const existingSkillNames = charDefaults.skills.map(s => s.skill);
            SKILLS_LIST.forEach(skillName => {
                if (!existingSkillNames.includes(skillName)) {
                    charDefaults.skills.push({ skill: skillName, value: 5, level: getSkillLevel(5), isMajor: false });
                } else { const skillToUpdate = charDefaults.skills.find(s => s.skill === skillName); if (skillToUpdate) skillToUpdate.level = getSkillLevel(skillToUpdate.value); }
            });
          }
        
        const ttsText = lastDm ? (typeof lastDm.text === 'string' ? lastDm.text : (Array.isArray(lastDm.text) ? lastDm.text.join('\n') : null)) : (loadedState.lastDmNarrativeForTTS || null);

        return { 
          ...getInitialState(), 
          ...loadedState, 
          character: charDefaults, 
          narrativeLog: newNarrativeLog, 
          apiKeyAvailable: true, 
          currentTargetMinigameConfig: null, 
          levelUpIsFromBedtime: loadedState.levelUpIsFromBedtime || false,
          lastDmNarrativeForTTS: ttsText
        };
    }

    case 'MANUAL_LOAD_FAILURE':
      addEntryToLog('error', action.payload.message);
      return { ...state, narrativeLog: newNarrativeLog };

    case 'START_NEW_GAME_AFTER_LOAD_FAIL':
      addEntryToLog('system', 'Starting a new adventure.');
      return { ...getInitialState(), apiKeyAvailable: state.apiKeyAvailable, phase: GamePhase.CHARACTER_CREATION, narrativeLog: newNarrativeLog };

    case 'SAVE_GAME_SUCCESS':
      addEntryToLog('system', 'Game Saved Successfully.');
      return { ...state, narrativeLog: newNarrativeLog };
    case 'SAVE_GAME_FAILURE':
      addEntryToLog('error', `Failed to save game: ${action.payload.message}`);
      return { ...state, narrativeLog: newNarrativeLog };

    case 'REQUEST_NEW_GAME':
      addEntryToLog('system', "Are you sure you want to start a new game? Your current progress will be lost if not saved. (Type 'yes' to confirm, 'no' to cancel)");
      return { ...state, phase: GamePhase.AWAITING_NEW_GAME_CONFIRMATION, narrativeLog: newNarrativeLog, currentChoices: [] };
    case 'CONFIRM_NEW_GAME':
      addEntryToLog('system', "Starting a new adventure... Character creation will begin.");
      return { ...getInitialState(), apiKeyAvailable: state.apiKeyAvailable, phase: GamePhase.CHARACTER_CREATION, narrativeLog: newNarrativeLog };
    case 'CANCEL_NEW_GAME':
      addEntryToLog('system', "New game cancelled. Continuing your current adventure.");
      return { ...state, phase: GamePhase.AWAITING_INPUT, narrativeLog: newNarrativeLog };

    case 'START_CHARACTER_CREATION':
      return { ...getInitialState(), apiKeyAvailable: state.apiKeyAvailable, narrativeLog: state.narrativeLog, phase: GamePhase.CHARACTER_CREATION, currentChoices: [], currentObjective: "Create your character" };
    case 'SET_CHARACTER_CREATION_NARRATIVE':
      addEntryToLog('dm', action.payload.narrative, state.promptNumber);
      return { ...state, phase: GamePhase.CHARACTER_CREATION, narrativeLog: newNarrativeLog, currentChoices: action.payload.choices || [], promptNumber: state.promptNumber + 1, lastDmNarrativeForTTS: typeof action.payload.narrative === 'string' ? action.payload.narrative : null };

    case 'CREATE_CHARACTER': {
      const pcBase = action.payload;
      let calculatedMaxHealth = BASE_MAX_HEALTH; let calculatedMaxMana = BASE_MAX_MANA; let calculatedMaxFatigue = BASE_MAX_FATIGUE;
      if (pcBase.attributes.Endurance > BASE_ATTRIBUTE_VALUE) { calculatedMaxHealth += (pcBase.attributes.Endurance - BASE_ATTRIBUTE_VALUE) * HEALTH_PER_ENDURANCE_POINT; calculatedMaxFatigue += (pcBase.attributes.Endurance - BASE_ATTRIBUTE_VALUE) * FATIGUE_PER_ENDURANCE_POINT; }
      if (pcBase.attributes.Intelligence > BASE_ATTRIBUTE_VALUE) { calculatedMaxMana += (pcBase.attributes.Intelligence - BASE_ATTRIBUTE_VALUE) * MANA_PER_INTELLIGENCE_POINT; }

      const allCharacterSkills: CharacterSkill[] = SKILLS_LIST.map(skillName => {
        const foundSkill = pcBase.skills.find(s => s.skill === skillName);
        if (foundSkill) return { ...foundSkill, value: foundSkill.value, level: getSkillLevel(foundSkill.value) };
        return { skill: skillName, value: 5, level: getSkillLevel(5), isMajor: false };
      });

      const initialSeasons = calculateCurrentSeasonAndSubSeason(INITIAL_DAY_NUMBER);
      const initialLatFactor = getLatitudeFactor(pcBase.startingProvince, null);
      const initialEnv = calculateEnvironmentalCondition(INITIAL_WEATHER_CONDITION, initialSeasons.season, initialSeasons.subSeason, initialLatFactor, INITIAL_TIME_OF_DAY);

      const finalizedCharacter: PlayerCharacter = {
        ...pcBase, skills: allCharacterSkills,
        level: 1,
        maxHealth: Math.max(10, calculatedMaxHealth), currentHealth: Math.max(10, calculatedMaxHealth),
        maxMana: Math.max(10, calculatedMaxMana), currentMana: Math.max(10, calculatedMaxMana),
        maxFatigue: Math.max(20, calculatedMaxFatigue), currentFatigue: Math.max(20, calculatedMaxFatigue),
        hungerLevel: INITIAL_HUNGER_LEVEL, exhaustionLevel: INITIAL_EXHAUSTION_LEVEL,
        maxComfort: BASE_MAX_COMFORT, comfortLevel: INITIAL_COMFORT_LEVEL,
        characterImageUrl: null, characterImageGenerationFailed: false, characterImageUrlIsGeneric: false,
      };
      finalizedCharacter.comfortLevel = calculateComfortLevel(finalizedCharacter.equippedItems, initialEnv, INITIAL_SHELTER_QUALITY);
      addEntryToLog('system', `Character ${finalizedCharacter.name} created. Starting province: ${finalizedCharacter.startingProvince}.`);
      return {
        ...state, character: finalizedCharacter, currentProvince: finalizedCharacter.startingProvince, currentCity: null,
        currentEnvironmentalCondition: initialEnv, currentShelter: INITIAL_SHELTER_QUALITY, currentShelterName: null,
        currentTimeOfDay: INITIAL_TIME_OF_DAY, currentHourInDay: INITIAL_HOUR_IN_DAY,
        currentSeason: initialSeasons.season, currentSubSeason: initialSeasons.subSeason,
        phase: GamePhase.ADVENTURE_INTRO, narrativeLog: newNarrativeLog,
        inventory: { carried: finalizedCharacter.equippedItems, stashed: [], septims: INITIAL_SEPTIMS },
        permanentSkillUpsSinceLastLevelUp: 0, attributePointsToAllocateForLevelUp: 0, activeEffects: [], levelUpIsFromBedtime: false,
      };
    }
    case 'SET_CHARACTER_IMAGE_DETAILS':
        if (state.character) return { ...state, character: { ...state.character, characterImageUrl: action.payload.url, characterImageGenerationFailed: action.payload.generationFailed, characterImageUrlIsGeneric: action.payload.isGeneric }};
        return state;
    case 'SET_SCENE_IMAGE_URL':
        return { ...state, currentSceneImageUrl: action.payload };

    case 'START_ADVENTURE_INTRO':
      return { ...state, phase: GamePhase.PROCESSING_INPUT };

    case 'PROCESS_GEMINI_RESPONSE':
      const updatesFromGemini = processGeminiResponse(state, action.payload.response, action.payload.context, addEntryToLog);
      return { ...state, ...updatesFromGemini, narrativeLog: newNarrativeLog };

    case 'ADD_PLAYER_INPUT_TO_LOG':
      addEntryToLog('player', action.payload);
      return { ...state, narrativeLog: newNarrativeLog, currentChoices: [] };
    case 'SET_LOADING':
      return { ...state, phase: action.payload ? GamePhase.PROCESSING_INPUT : GamePhase.AWAITING_INPUT };

    case 'REQUEST_BEDTIME_INTENT_CONFIRMATION':
      addEntryToLog('system', "Are you sure you want to end the day and go to bed? (Type 'yes' to confirm, 'no' to cancel)");
      return { ...state, phase: GamePhase.AWAITING_BEDTIME_INTENT_CONFIRMATION, narrativeLog: newNarrativeLog, currentChoices: ["Yes, I'm ready for bed.", "No, not yet."] };
    case 'CANCEL_BEDTIME_INTENT':
      addEntryToLog('system', "Bedtime cancelled. What will you do next?");
      return { ...state, phase: GamePhase.AWAITING_INPUT, narrativeLog: newNarrativeLog };

    case 'EXECUTE_NAP': {
        if (!state.character) return state;
        addEntryToLog('system', `You decide to take a short nap for about ${formatDurationForLog(NAP_DURATION_HOURS)}.`);
        let restedCharacter = { ...state.character }; const hoursPassed = NAP_DURATION_HOURS;
        restedCharacter.exhaustionLevel = Math.max(INITIAL_EXHAUSTION_LEVEL, restedCharacter.exhaustionLevel - (restedCharacter.exhaustionLevel * NAP_EXHAUSTION_REDUCTION_FACTOR));
        restedCharacter.currentHealth = Math.min(restedCharacter.maxHealth, Math.floor(restedCharacter.currentHealth + restedCharacter.maxHealth * NAP_HEALTH_RECOVERY_FRACTION));
        restedCharacter.currentMana = Math.min(restedCharacter.maxMana, Math.floor(restedCharacter.currentMana + restedCharacter.maxMana * NAP_MANA_RECOVERY_FRACTION));
        restedCharacter.currentFatigue = Math.min(restedCharacter.maxFatigue, Math.floor(restedCharacter.currentFatigue + restedCharacter.maxFatigue * NAP_FATIGUE_RECOVERY_FRACTION));
        restedCharacter.hungerLevel = Math.min(MAX_HUNGER_LEVEL, restedCharacter.hungerLevel + (REST_HUNGER_INCREASE_PER_HOUR_OF_REST * hoursPassed)); 
        addEntryToLog('system', `Exhaustion: ${getExhaustionStatus(restedCharacter.exhaustionLevel)}, Health: ${Math.round(restedCharacter.currentHealth)}/${restedCharacter.maxHealth}, Mana: ${Math.round(restedCharacter.currentMana)}/${restedCharacter.maxMana}, Fatigue: ${Math.round(restedCharacter.currentFatigue)}/${restedCharacter.maxFatigue}, Hunger: ${getHungerStatus(restedCharacter.hungerLevel)}.`);
        
        let newHourNap = state.currentHourInDay + hoursPassed; let daysPassedNap = Math.floor(newHourNap / 24);
        let newDayNumberNap = state.currentDayNumber + daysPassedNap; let newDayOfWeekNap = state.currentDayOfWeek;
        if (daysPassedNap > 0) newDayOfWeekNap = DAYS_OF_WEEK[(DAYS_OF_WEEK.indexOf(state.currentDayOfWeek) + daysPassedNap) % DAYS_OF_WEEK.length];
        newHourNap %= 24; const newTimeOfDayNap = getTimeOfDayFromHour(newHourNap);
        const newSeasonsNap = calculateCurrentSeasonAndSubSeason(newDayNumberNap);
        let activeEffectsAfterNap = [...state.activeEffects];
        activeEffectsAfterNap.forEach(effect => { if (effect.durationHours && effect.remainingHours !== undefined) { effect.remainingHours -= hoursPassed; if (effect.remainingHours <= 0) addEntryToLog('system', `Effect of ${effect.sourceName} wore off.`); }});
        activeEffectsAfterNap = activeEffectsAfterNap.filter(e => !e.durationHours || (e.remainingHours && e.remainingHours > 0));
        const napLatFactor = getLatitudeFactor(state.currentProvince, state.currentCity);
        const napOutsideEnv = calculateEnvironmentalCondition(state.currentWeather, newSeasonsNap.season, newSeasonsNap.subSeason, napLatFactor, newTimeOfDayNap);
        restedCharacter.comfortLevel = calculateComfortLevel(restedCharacter.equippedItems, napOutsideEnv, state.currentShelter);
        restedCharacter = applyStatChangesAndPenalties(restedCharacter, hoursPassed, addEntryToLog, napOutsideEnv);
        addEntryToLog('system', "You wake up after your nap.");
        let finalStateNap = { ...state, phase: GamePhase.AWAITING_INPUT, character: restedCharacter, activeEffects: activeEffectsAfterNap, currentDayNumber: newDayNumberNap, currentDayOfWeek: newDayOfWeekNap, currentTimeOfDay: newTimeOfDayNap, currentHourInDay: newHourNap, currentSeason: newSeasonsNap.season, currentSubSeason: newSeasonsNap.subSeason, currentEnvironmentalCondition: napOutsideEnv, narrativeLog: newNarrativeLog };
        if (restedCharacter.currentHealth <= 0) { addEntryToLog('system', "Player health reached 0 during nap."); finalStateNap.phase = GamePhase.PLAYER_FAINTED; finalStateNap.character!.currentHealth = 0; }
        return finalStateNap;
    }

    case 'PREPARE_LEVEL_UP':
      if (!state.character) return state;
      addEntryToLog('system', ["You feel more experienced! You can now increase your attributes.", `Please allocate your ${LEVEL_UP_ATTRIBUTE_POINTS_TO_ALLOCATE} points.`]);
      return { 
          ...state, 
          phase: GamePhase.LEVEL_UP_ATTRIBUTE_ALLOCATION, 
          attributePointsToAllocateForLevelUp: LEVEL_UP_ATTRIBUTE_POINTS_TO_ALLOCATE, 
          permanentSkillUpsSinceLastLevelUp: state.permanentSkillUpsSinceLastLevelUp % 5, 
          levelUpIsFromBedtime: action.payload?.fromBedtime || false, // Store if this level up is from bedtime
          narrativeLog: newNarrativeLog, 
          currentChoices: [] 
        };
    case 'CONFIRM_LEVEL_UP_ATTRIBUTES': {
      if (!state.character) return state;
      const updatedAttrs = { ...state.character.attributes }; let pointsSpent = 0;
      for (const attrName in action.payload.updatedAttributes) { const key = attrName as AttributeName; const increase = (action.payload.updatedAttributes[key] || 0); updatedAttrs[key] = (updatedAttrs[key] || BASE_ATTRIBUTE_VALUE) + increase; pointsSpent += increase; }
      if (pointsSpent > LEVEL_UP_ATTRIBUTE_POINTS_TO_ALLOCATE) { addEntryToLog('error', "Error: Too many attribute points allocated."); return state; }
      const nextLevel = (state.character.level || 1) + 1;
      addEntryToLog('system', `Attributes increased! You have reached Level ${nextLevel}!`);
      let modCharacter = { ...state.character, attributes: updatedAttrs, level: nextLevel };
      let newMaxHealth = BASE_MAX_HEALTH; let newMaxMana = BASE_MAX_MANA; let newMaxFatigue = BASE_MAX_FATIGUE;
      if (modCharacter.attributes.Endurance > BASE_ATTRIBUTE_VALUE) { newMaxHealth += (modCharacter.attributes.Endurance - BASE_ATTRIBUTE_VALUE) * HEALTH_PER_ENDURANCE_POINT; newMaxFatigue += (modCharacter.attributes.Endurance - BASE_ATTRIBUTE_VALUE) * FATIGUE_PER_ENDURANCE_POINT;}
      if (modCharacter.attributes.Intelligence > BASE_ATTRIBUTE_VALUE) { newMaxMana += (modCharacter.attributes.Intelligence - BASE_ATTRIBUTE_VALUE) * MANA_PER_INTELLIGENCE_POINT;}
      modCharacter.maxHealth = Math.max(10, newMaxHealth); modCharacter.maxMana = Math.max(10, newMaxMana); modCharacter.maxFatigue = Math.max(20, newMaxFatigue);
      
      const shouldProceedToRest = state.levelUpIsFromBedtime;
      const nextPhase = shouldProceedToRest ? GamePhase.AWAITING_POST_LEVELUP_REST : GamePhase.AWAITING_INPUT;
      
      return { 
          ...state, 
          character: modCharacter, 
          attributePointsToAllocateForLevelUp: 0, 
          narrativeLog: newNarrativeLog, 
          phase: nextPhase,
          levelUpIsFromBedtime: false // Reset the flag
      };
    }
    case 'PROCEED_TO_BEDTIME_SUMMARY': 
        addEntryToLog('system', "You decide to end the day. Let's summarize what happened.");
        return { ...state, phase: GamePhase.AWAITING_BEDTIME_SUMMARY_GENERATION, narrativeLog: newNarrativeLog, currentChoices: [] };
    
    case 'CONFIRM_BEDTIME_SUMMARY_ACCEPTANCE': { 
      addEntryToLog('system', "End of Day summary confirmed.");
      return { ...state, narrativeLog: newNarrativeLog };
    }

    case 'APPLY_REST_AND_START_NEW_DAY': {
      if (!state.character) return state;

      let hoursToRest = 8.0; 
      const currentHour = state.currentHourInDay; 
      const targetWakeHour = getHourForTimeOfDay(TimeOfDay.MORNING); 
      if (currentHour >= targetWakeHour ) hoursToRest = (24.0 - currentHour) + targetWakeHour;
      else hoursToRest = targetWakeHour - currentHour;
      hoursToRest = Math.max(1.0, hoursToRest); 

      let newDayNumber = state.currentDayNumber;
      let newDayOfWeek = state.currentDayOfWeek;
      let newHourAfterRest = state.currentHourInDay + hoursToRest; 
      const daysPassedDuringRest = Math.floor(newHourAfterRest / 24);
      if (daysPassedDuringRest > 0) {
          newDayNumber += daysPassedDuringRest;
          newDayOfWeek = DAYS_OF_WEEK[(DAYS_OF_WEEK.indexOf(state.currentDayOfWeek) + daysPassedDuringRest) % DAYS_OF_WEEK.length];
      }
      newHourAfterRest %= 24; 
      const newTimeOfDayAfterRest = getTimeOfDayFromHour(newHourAfterRest);
      const { season: newSeasonAfterRest, subSeason: newSubSeasonAfterRest } = calculateCurrentSeasonAndSubSeason(newDayNumber);

      let restedCharacter = { ...state.character };
      restedCharacter.exhaustionLevel = INITIAL_EXHAUSTION_LEVEL;
      restedCharacter.currentHealth = Math.min(restedCharacter.maxHealth, Math.floor(restedCharacter.currentHealth + restedCharacter.maxHealth * REST_HEALTH_RECOVERY_PERCENT));
      restedCharacter.currentMana = Math.min(restedCharacter.maxMana, Math.floor(restedCharacter.currentMana + restedCharacter.maxMana * REST_MANA_RECOVERY_PERCENT));
      restedCharacter.currentFatigue = Math.min(restedCharacter.maxFatigue, Math.floor(restedCharacter.currentFatigue + restedCharacter.maxFatigue * REST_FATIGUE_RECOVERY_PERCENT));
      restedCharacter.hungerLevel = Math.min(MAX_HUNGER_LEVEL, restedCharacter.hungerLevel + (REST_HUNGER_INCREASE_PER_HOUR_OF_REST * hoursToRest));
      addEntryToLog('system', `Stats after rest: H:${Math.round(restedCharacter.currentHealth)} M:${Math.round(restedCharacter.currentMana)} F:${Math.round(restedCharacter.currentFatigue)} Hunger:${getHungerStatus(restedCharacter.hungerLevel)} Exh:${getExhaustionStatus(restedCharacter.exhaustionLevel)}.`);
      
      let shelterQualityForRest = state.currentShelter; 
      let shelterNameForRest = state.currentShelterName;
      if (shelterQualityForRest === ShelterQuality.NONE || shelterQualityForRest === ShelterQuality.POOR) { 
          shelterQualityForRest = ShelterQuality.AVERAGE; 
          shelterNameForRest = shelterNameForRest || "a relatively safe place"; 
          addEntryToLog('system', `Found ${shelterNameForRest} (Average Shelter for rest).`);
      }
      
      let weatherAfterRest = state.currentWeather; 
      if (weatherAfterRest === WeatherCondition.STORM) weatherAfterRest = WeatherCondition.RAIN; 
      else if (weatherAfterRest === WeatherCondition.BLIZZARD) weatherAfterRest = WeatherCondition.SNOW;
      
      const newOutsideEnvOnRest = calculateEnvironmentalCondition(weatherAfterRest, newSeasonAfterRest, newSubSeasonAfterRest, getLatitudeFactor(state.currentProvince, state.currentCity), newTimeOfDayAfterRest);
      restedCharacter.comfortLevel = calculateComfortLevel(restedCharacter.equippedItems, newOutsideEnvOnRest, shelterQualityForRest);
      restedCharacter = applyStatChangesAndPenalties(restedCharacter, 0, addEntryToLog, newOutsideEnvOnRest); 
      
      let activeEffectsAfterRest = [...state.activeEffects];
      activeEffectsAfterRest.forEach(effect => { 
          if (effect.durationHours && effect.remainingHours !== undefined) { 
              effect.remainingHours -= hoursToRest; 
              if (effect.remainingHours <= 0) addEntryToLog('system', `Effect of ${effect.sourceName} wore off during rest.`); 
          }
      });
      activeEffectsAfterRest = activeEffectsAfterRest.filter(e => !e.durationHours || (e.remainingHours && e.remainingHours > 0));
      
      addEntryToLog('system', `You rest for ${formatDurationForLog(hoursToRest)}...`);
      
      const updatedMajorEvents = [...state.majorEvents, {day: state.currentDayNumber, description: `Rested on Day ${state.currentDayNumber}.`}];

      let finalRestState = { 
        ...state, 
        phase: GamePhase.PROCESSING_INPUT, 
        character: restedCharacter, 
        activeEffects: activeEffectsAfterRest, 
        currentDayNumber: newDayNumber, 
        currentDayOfWeek: newDayOfWeek, 
        currentTimeOfDay: newTimeOfDayAfterRest, 
        currentHourInDay: newHourAfterRest, 
        currentSeason: newSeasonAfterRest, 
        currentSubSeason: newSubSeasonAfterRest, 
        currentEnvironmentalCondition: newOutsideEnvOnRest, 
        currentShelter: shelterQualityForRest, 
        currentShelterName: shelterNameForRest, 
        currentWeather: weatherAfterRest, 
        eventsSinceLastRest: [], 
        narrativeLog: newNarrativeLog, 
        currentObjective: state.currentObjective, 
        majorEvents: updatedMajorEvents,
        currentChoices: [], 
        levelUpIsFromBedtime: false, // Reset this flag after rest is applied
      };

      if (restedCharacter.currentHealth <= 0) { 
        addEntryToLog('system', "Player died in their sleep."); 
        finalRestState.phase = GamePhase.PLAYER_FAINTED; 
        finalRestState.character!.currentHealth = 0;
      }
      return finalRestState;
    }


    case 'PLAYER_FAINTED_EVENT':
        if (state.character) { addEntryToLog('system', "Darkness overcomes you... You have fainted."); return { ...state, phase: GamePhase.PLAYER_FAINTED_RECOVERY, character: { ...state.character, currentHealth: 0 }, narrativeLog: newNarrativeLog }; }
        return state;
    case 'PROCESS_FAINT_RECOVERY': 
        return { ...state, phase: GamePhase.AWAITING_INPUT, narrativeLog: newNarrativeLog };

    case 'APPLY_PLAYER_CORRECTION':
      addEntryToLog('system', "Applying player correction...");
      return { ...state, ...action.payload, narrativeLog: newNarrativeLog, phase: GamePhase.AWAITING_INPUT };
    case 'ADD_SYSTEM_MESSAGE':
      (Array.isArray(action.payload) ? action.payload : [action.payload]).forEach(msg => addEntryToLog('system', msg));
      return { ...state, narrativeLog: newNarrativeLog };
    case 'ADD_ERROR_MESSAGE':
      addEntryToLog('error', action.payload);
      return { ...state, narrativeLog: newNarrativeLog, phase: GamePhase.AWAITING_INPUT };

    case 'START_TARGET_MINIGAME':
      return { ...state, phase: GamePhase.TARGET_MINIGAME_ACTIVE, currentTargetMinigameConfig: action.payload, narrativeLog: newNarrativeLog, currentChoices: [] };
    case 'PROCESS_TARGET_MINIGAME_RESULT': {
      const { success } = action.payload; const config = state.currentTargetMinigameConfig;
      if (!config) { addEntryToLog('error', "Minigame config missing."); return { ...state, phase: GamePhase.AWAITING_INPUT, narrativeLog: newNarrativeLog }; }
      addEntryToLog('system', `Targeting outcome: ${success ? config.successFeedback : config.failureFeedback}`);
      return { ...state, phase: GamePhase.PROCESSING_INPUT, currentTargetMinigameConfig: null, narrativeLog: newNarrativeLog };
    }

    case 'TOGGLE_TTS': addEntryToLog('system', `Native TTS ${action.payload ? 'enabled' : 'disabled'}.`); return { ...state, ttsEnabled: action.payload, narrativeLog: newNarrativeLog };
    case 'SET_LAST_DM_NARRATIVE_FOR_TTS': return { ...state, lastDmNarrativeForTTS: action.payload };
    case 'SET_NARRATOR_VOICE': return { ...state, ttsNarratorVoiceURI: action.payload };
    case 'SET_PLAYER_VOICE': return { ...state, ttsPlayerVoiceURI: action.payload };
    case 'SET_AVAILABLE_VOICES': return { ...state, availableVoices: action.payload };

    case 'EQUIP_INVENTORY_ITEM': {
      if (!state.character) return state;
      const { itemId } = action.payload;
      const itemToEquip = state.inventory.carried.find(i => i.id === itemId);
      if (!itemToEquip) {
        addEntryToLog('error', "Item not found in inventory.");
        return state;
      }
      
      const enrichedItem = enrichItemWithStats(itemToEquip);
      
      // If already equipped, do nothing
      if (state.character.equippedItems.some(eq => eq.id === itemId)) {
        return state;
      }
      
      const newEquipped = [...state.character.equippedItems, enrichedItem];
      
      // Recalculate comfortLevel based on new equipped gear
      const newComfort = calculateComfortLevel(newEquipped, state.currentEnvironmentalCondition, state.currentShelter);
      
      addEntryToLog('system', `You equipped the ${enrichedItem.name}.`);
      
      return {
        ...state,
        character: {
          ...state.character,
          equippedItems: newEquipped,
          comfortLevel: newComfort
        },
        narrativeLog: newNarrativeLog
      };
    }

    case 'UNEQUIP_INVENTORY_ITEM': {
      if (!state.character) return state;
      const { itemId } = action.payload;
      const itemToUnequip = state.character.equippedItems.find(i => i.id === itemId);
      if (!itemToUnequip) {
        return state;
      }
      
      const newEquipped = state.character.equippedItems.filter(eq => eq.id !== itemId);
      const newComfort = calculateComfortLevel(newEquipped, state.currentEnvironmentalCondition, state.currentShelter);
      
      addEntryToLog('system', `You unequipped the ${itemToUnequip.name}.`);
      
      return {
        ...state,
        character: {
          ...state.character,
          equippedItems: newEquipped,
          comfortLevel: newComfort
        },
        narrativeLog: newNarrativeLog
      };
    }

    case 'CONSUME_INVENTORY_ITEM': {
      if (!state.character) return state;
      const { itemId } = action.payload;
      const itemIndex = state.inventory.carried.findIndex(i => i.id === itemId);
      if (itemIndex === -1) {
        addEntryToLog('error', "Item not found in inventory.");
        return state;
      }
      
      const item = enrichItemWithStats(state.inventory.carried[itemIndex]);
      
      if (!item.isFood && !item.isPotion && !item.name.toLowerCase().includes('potion') && !item.name.toLowerCase().includes('elixir') && !item.name.toLowerCase().includes('drink') && !item.name.toLowerCase().includes('bread') && !item.name.toLowerCase().includes('apple') && !item.name.toLowerCase().includes('stew') && !item.name.toLowerCase().includes('cheese')) {
        addEntryToLog('system', `You cannot eat or drink the ${item.name}.`);
        return state;
      }
      
      // Update inventory list
      let newCarried = [...state.inventory.carried];
      let consumedSomething = false;

      if (item.isRefillable && item.currentCharges !== undefined && item.currentCharges > 0) {
        newCarried[itemIndex] = {
          ...item,
          currentCharges: item.currentCharges - 1
        };
        consumedSomething = true;
      } else if (!item.isRefillable) {
        if (item.quantity > 1) {
          newCarried[itemIndex] = {
            ...item,
            quantity: item.quantity - 1
          };
        } else {
          newCarried.splice(itemIndex, 1);
        }
        consumedSomething = true;
      }
      
      if (consumedSomething) {
        const hungerRed = item.hungerReduction ?? 20;
        const newHunger = Math.max(0, state.character.hungerLevel - hungerRed);
        
        let newHealth = state.character.currentHealth;
        if (item.healthRecovery) {
          newHealth = Math.min(state.character.maxHealth, newHealth + item.healthRecovery);
        } else if (item.name.toLowerCase().includes('health')) {
          newHealth = Math.min(state.character.maxHealth, newHealth + 25); // default potion heal
        }
        
        let newMana = state.character.currentMana;
        if (item.manaRecovery) {
          newMana = Math.min(state.character.maxMana, newMana + item.manaRecovery);
        } else if (item.name.toLowerCase().includes('magicka')) {
          newMana = Math.min(state.character.maxMana, newMana + 25);
        }
        
        let newFatigue = state.character.currentFatigue;
        if (item.fatigueRecovery) {
          newFatigue = Math.min(state.character.maxFatigue, newFatigue + item.fatigueRecovery);
        } else if (item.name.toLowerCase().includes('fatigue')) {
          newFatigue = Math.min(state.character.maxFatigue, newFatigue + 40);
        }
        
        addEntryToLog('system', `You consumed ${item.name}. Hunger: ${newHunger.toFixed(0)}% (-${hungerRed.toFixed(0)}%).`);
        
        return {
          ...state,
          character: {
            ...state.character,
            hungerLevel: newHunger,
            currentHealth: newHealth,
            currentMana: newMana,
            currentFatigue: newFatigue
          },
          inventory: {
            ...state.inventory,
            carried: newCarried
          },
          narrativeLog: newNarrativeLog
        };
      }
      return state;
    }

    default:
      return state;
  }
};
