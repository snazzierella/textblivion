import { GameState, NarrativeEntry, Skill, Item, ActiveEffect, TimeOfDay, EnvironmentalCondition, ShelterQuality, WeatherCondition, GamePhase } from '../../types.ts';
import { Action } from '../gameReducer.ts'; // Corrected import path for Action
import {
  SKILLS_LIST, LEVEL_UP_ATTRIBUTE_POINTS_TO_ALLOCATE, DM_DEBUG_HELP_TEXT,
  MAX_HUNGER_LEVEL, MAX_EXHAUSTION_LEVEL, DAYS_OF_WEEK, HUNGER_INCREASE_PER_HOUR,
  EXHAUSTION_INCREASE_PER_HOUR, BASE_MAX_COMFORT,
  formatHourMinute, formatDurationForLog, getHungerStatus, getExhaustionStatus, getComfortStatus, getTimeOfDayFromHour, getHourForTimeOfDay
} from '../../constants.ts';
import {
  getSkillLevel, calculateComfortLevel, calculateEnvironmentalCondition, getLatitudeFactor, calculateSpecificTemperature, applyStatChangesAndPenalties
} from '../gameReducerHelpers.ts'; // Corrected import path for helpers
import { calculateCurrentSeasonAndSubSeason } from '../gameStateInitialization.ts';
import { v4 as uuidv4 } from 'uuid';

export const debugReducer = (state: GameState, action: Action, addEntryToLog: (type: NarrativeEntry['type'], text: string | string[], promptNum?: number) => void): GameState => {
  if (!action.type.startsWith('DEBUG_') && action.type !== 'TOGGLE_DEBUG_MODE') {
    return state;
  }

  if (!state.isDebugMode && action.type !== 'TOGGLE_DEBUG_MODE') {
      addEntryToLog('error', "Debug mode is not active. Command ignored.");
      return state;
  }

  switch (action.type) {
    case 'TOGGLE_DEBUG_MODE':
      addEntryToLog('system', `Debug Mode ${action.payload ? 'ON' : 'OFF'}.`);
      if (action.payload) addEntryToLog('system', DM_DEBUG_HELP_TEXT.split('\n'));
      return { ...state, isDebugMode: action.payload };

    case 'DEBUG_TRIGGER_LEVEL_UP':
      if (!state.character) {
        addEntryToLog('error', "[DEBUG] Error: Cannot trigger level up without a character.");
        return state;
      }
      addEntryToLog('system', "[DEBUG] Triggering level up attribute allocation.");
      return {
        ...state,
        phase: GamePhase.LEVEL_UP_ATTRIBUTE_ALLOCATION, // Used GamePhase enum
        attributePointsToAllocateForLevelUp: LEVEL_UP_ATTRIBUTE_POINTS_TO_ALLOCATE,
        currentChoices: []
      };

    case 'DEBUG_ADD_SEPTIMS': {
      const newSeptims = (state.inventory.septims || 0) + action.payload;
      addEntryToLog('system', `[DEBUG] Added ${action.payload} Septims. Total: ${newSeptims}.`);
      return { ...state, inventory: { ...state.inventory, septims: newSeptims } };
    }
    case 'DEBUG_INCREASE_SKILL': {
      if (!state.character) return state;
      const { skillName, amount } = action.payload;
      const skillToUpdate = state.character.skills.find(s => s.skill === skillName);
      if (skillToUpdate) {
        skillToUpdate.value = Math.min(100, skillToUpdate.value + amount);
        skillToUpdate.level = getSkillLevel(skillToUpdate.value);
        addEntryToLog('system', `[DEBUG] Skill ${skillName} increased by ${amount} to ${skillToUpdate.value} (${skillToUpdate.level}).`);
        return {
          ...state,
          character: { ...state.character, skills: [...state.character.skills] },
          permanentSkillUpsSinceLastLevelUp: state.permanentSkillUpsSinceLastLevelUp + 1,
        };
      }
      addEntryToLog('error', `[DEBUG] Skill ${skillName} not found.`);
      return state;
    }
    case 'DEBUG_ADD_ITEM': {
      const newItem = { ...action.payload, id: action.payload.id || uuidv4() };
      const newCarried = [...state.inventory.carried];
      const existingItemIndex = newCarried.findIndex(i => i.name === newItem.name);
      if (existingItemIndex > -1) newCarried[existingItemIndex].quantity += newItem.quantity;
      else newCarried.push(newItem);
      addEntryToLog('system', `[DEBUG] Added item: ${newItem.name} (x${newItem.quantity}).`);
      let newActiveEffects = [...state.activeEffects];
      if (newItem.isPotion && newItem.effects && newItem.potionDurationHours) {
        newItem.effects.forEach(effectDef => {
          newActiveEffects.push({
            id: uuidv4(), sourceName: newItem.name, target: effectDef.target, targetName: effectDef.targetName,
            modifier: effectDef.modifier, durationHours: newItem.potionDurationHours, remainingHours: newItem.potionDurationHours, sourceItemId: newItem.id
          });
          addEntryToLog('system', `[DEBUG] Applied effect from ${newItem.name}: ${effectDef.targetName} ${effectDef.modifier > 0 ? '+' : ''}${effectDef.modifier} for ${formatDurationForLog(newItem.potionDurationHours ?? 0)}.`);
        });
      }
      let updatedChar = state.character;
      if (updatedChar && state.character) {
        const newComfort = calculateComfortLevel(updatedChar.equippedItems, state.currentEnvironmentalCondition, state.currentShelter);
        if (updatedChar.comfortLevel !== newComfort) {
            // Pass state.currentTemperature here instead of state.currentEnvironmentalCondition
            addEntryToLog('system', `[DEBUG] Comfort level changed to ${Math.round(newComfort)} (${getComfortStatus(newComfort, state.currentTemperature)}) due to item change.`);
        }
        updatedChar.comfortLevel = newComfort;
      }
      return { ...state, inventory: { ...state.inventory, carried: newCarried }, activeEffects: newActiveEffects, character: updatedChar };
    }
    case 'DEBUG_ADD_EFFECT': {
        const newEffect: ActiveEffect = { ...action.payload, id: uuidv4(), remainingHours: action.payload.durationHours };
        addEntryToLog('system', `[DEBUG] Added effect: ${newEffect.sourceName} (${newEffect.targetName} ${newEffect.modifier > 0 ? '+' : ''}${newEffect.modifier}${newEffect.durationHours ? ` for ${formatDurationForLog(newEffect.durationHours)}` : ''}).`);
        return { ...state, activeEffects: [...state.activeEffects, newEffect] };
    }
    // Cases for DEBUG_PASS_TIME, DEBUG_SET_HOUR, etc. would go here, calling helpers from gameReducerHelpers.ts
     case 'DEBUG_SET_HOUR': {
        const hour = Math.max(0, Math.min(23.99, action.payload));
        const newTod = getTimeOfDayFromHour(hour);
        if (newTod !== state.currentTimeOfDay) addEntryToLog('system', `[DEBUG] Time of Day is now ${newTod}.`);
        addEntryToLog('system', `[DEBUG] Hour set to ${formatHourMinute(hour)}.`);

        const latFactor = getLatitudeFactor(state.currentProvince, state.currentCity);
        const newTemp = calculateSpecificTemperature(state.currentSeason, state.currentSubSeason, state.currentWeather, latFactor, newTod);
        const newOutsideEnv = calculateEnvironmentalCondition(state.currentWeather, state.currentSeason, state.currentSubSeason, latFactor, newTod);
        
        if (newOutsideEnv !== state.currentEnvironmentalCondition) addEntryToLog('system', `[DEBUG] Outside Environment changed to ${newOutsideEnv}.`);

        let charWithRecalculatedComfort = state.character;
        if(charWithRecalculatedComfort && state.character){
            const oldComfort = charWithRecalculatedComfort.comfortLevel;
            charWithRecalculatedComfort.comfortLevel = calculateComfortLevel(state.character.equippedItems, newOutsideEnv, state.currentShelter);
            if (Math.round(charWithRecalculatedComfort.comfortLevel) !== Math.round(oldComfort)) {
                // Pass newTemp here
                addEntryToLog('system', `[DEBUG] Comfort is now ${Math.round(charWithRecalculatedComfort.comfortLevel)} (${getComfortStatus(charWithRecalculatedComfort.comfortLevel, newTemp)}).`);
            }
        }
        return { ...state, currentHourInDay: hour, currentTimeOfDay: newTod, currentEnvironmentalCondition: newOutsideEnv, currentTemperature: newTemp, character: charWithRecalculatedComfort };
    }
    case 'DEBUG_SET_HEALTH':
      if (state.character) {
        const newChar = {...state.character};
        newChar.maxHealth = action.payload.max ?? newChar.maxHealth;
        newChar.currentHealth = Math.max(0, Math.min(action.payload.current, newChar.maxHealth));
        addEntryToLog('system', `[DEBUG] Health set to ${Math.round(newChar.currentHealth)}/${newChar.maxHealth}.`);
        if (newChar.currentHealth <= 0 && state.phase !== GamePhase.PLAYER_FAINTED && state.phase !== GamePhase.PLAYER_FAINTED_RECOVERY) { // Used GamePhase enum
            return { ...state, character: newChar, phase: GamePhase.PLAYER_FAINTED };
        }
        return { ...state, character: newChar };
      } return state;
    case 'DEBUG_PASS_TIME': {
      const hoursPassed = action.payload;
      addEntryToLog('system', `[DEBUG] Passing ${formatDurationForLog(hoursPassed)} of time.`);
      
      let newHour = state.currentHourInDay + hoursPassed;
      let daysPassed = Math.floor(newHour / 24);
      let newDayNumber = state.currentDayNumber + daysPassed;
      let newDayOfWeek = state.currentDayOfWeek;
      if (daysPassed > 0) {
        newDayOfWeek = DAYS_OF_WEEK[(DAYS_OF_WEEK.indexOf(state.currentDayOfWeek) + daysPassed) % DAYS_OF_WEEK.length];
      }
      newHour %= 24;
      const newTod = getTimeOfDayFromHour(newHour);
      const newSeasons = calculateCurrentSeasonAndSubSeason(newDayNumber);

      let activeEffectsAfter = [...state.activeEffects];
      activeEffectsAfter.forEach(effect => {
        if (effect.durationHours && effect.remainingHours !== undefined) {
          effect.remainingHours -= hoursPassed;
          if (effect.remainingHours <= 0) addEntryToLog('system', `[DEBUG] Effect of ${effect.sourceName} wore off.`);
        }
      });
      activeEffectsAfter = activeEffectsAfter.filter(e => !e.durationHours || (e.remainingHours && e.remainingHours > 0));

      const latFactor = getLatitudeFactor(state.currentProvince, state.currentCity);
      const newTemp = calculateSpecificTemperature(newSeasons.season, newSeasons.subSeason, state.currentWeather, latFactor, newTod);
      const newOutsideEnv = calculateEnvironmentalCondition(state.currentWeather, newSeasons.season, newSeasons.subSeason, latFactor, newTod);

      let updatedChar = state.character;
      if (updatedChar) {
        updatedChar = { ...updatedChar };
        updatedChar.hungerLevel = Math.max(0, Math.min(MAX_HUNGER_LEVEL, updatedChar.hungerLevel + (HUNGER_INCREASE_PER_HOUR * hoursPassed)));
        updatedChar.exhaustionLevel = Math.max(0, Math.min(MAX_EXHAUSTION_LEVEL, updatedChar.exhaustionLevel + (EXHAUSTION_INCREASE_PER_HOUR * hoursPassed)));
        updatedChar.comfortLevel = calculateComfortLevel(updatedChar.equippedItems, newOutsideEnv, state.currentShelter);
        updatedChar = applyStatChangesAndPenalties(updatedChar, hoursPassed, addEntryToLog, newOutsideEnv);
      }

      addEntryToLog('system', `[DEBUG] Time is now Day ${newDayNumber}, ${newDayOfWeek}, ${newTod} (${formatHourMinute(newHour)}). Outside Temp: ${newTemp}°F.`);

      return {
        ...state,
        currentHourInDay: newHour,
        currentDayNumber: newDayNumber,
        currentDayOfWeek: newDayOfWeek,
        currentTimeOfDay: newTod,
        currentSeason: newSeasons.season,
        currentSubSeason: newSeasons.subSeason,
        currentEnvironmentalCondition: newOutsideEnv,
        currentTemperature: newTemp,
        activeEffects: activeEffectsAfter,
        character: updatedChar
      };
    }
    case 'DEBUG_SET_TIMEOFDAY': {
      const newTod = action.payload;
      const hour = getHourForTimeOfDay(newTod);
      addEntryToLog('system', `[DEBUG] Time of day set to ${newTod} (${formatHourMinute(hour)}).`);
      
      const latFactor = getLatitudeFactor(state.currentProvince, state.currentCity);
      const newTemp = calculateSpecificTemperature(state.currentSeason, state.currentSubSeason, state.currentWeather, latFactor, newTod);
      const newOutsideEnv = calculateEnvironmentalCondition(state.currentWeather, state.currentSeason, state.currentSubSeason, latFactor, newTod);

      let updatedChar = state.character;
      if (updatedChar) {
        updatedChar = { ...updatedChar };
        updatedChar.comfortLevel = calculateComfortLevel(updatedChar.equippedItems, newOutsideEnv, state.currentShelter);
      }

      return {
        ...state,
        currentTimeOfDay: newTod,
        currentHourInDay: hour,
        currentEnvironmentalCondition: newOutsideEnv,
        currentTemperature: newTemp,
        character: updatedChar
      };
    }
    case 'DEBUG_SET_MANA': {
      if (!state.character) return state;
      const newChar = { ...state.character };
      newChar.maxMana = action.payload.max ?? newChar.maxMana;
      newChar.currentMana = Math.max(0, Math.min(action.payload.current, newChar.maxMana));
      addEntryToLog('system', `[DEBUG] Mana set to ${Math.round(newChar.currentMana)}/${newChar.maxMana}.`);
      return { ...state, character: newChar };
    }
    case 'DEBUG_SET_FATIGUE': {
      if (!state.character) return state;
      const newChar = { ...state.character };
      newChar.maxFatigue = action.payload.max ?? newChar.maxFatigue;
      newChar.currentFatigue = Math.max(0, Math.min(action.payload.current, newChar.maxFatigue));
      addEntryToLog('system', `[DEBUG] Fatigue set to ${Math.round(newChar.currentFatigue)}/${newChar.maxFatigue}.`);
      return { ...state, character: newChar };
    }
    case 'DEBUG_SET_HUNGER': {
      if (!state.character) return state;
      const newChar = { ...state.character };
      newChar.hungerLevel = Math.max(0, Math.min(MAX_HUNGER_LEVEL, action.payload.level));
      addEntryToLog('system', `[DEBUG] Hunger set to ${newChar.hungerLevel} (${getHungerStatus(newChar.hungerLevel)}).`);
      return { ...state, character: newChar };
    }
    case 'DEBUG_SET_EXHAUSTION': {
      if (!state.character) return state;
      const newChar = { ...state.character };
      newChar.exhaustionLevel = Math.max(0, Math.min(MAX_EXHAUSTION_LEVEL, action.payload.level));
      addEntryToLog('system', `[DEBUG] Exhaustion set to ${newChar.exhaustionLevel} (${getExhaustionStatus(newChar.exhaustionLevel)}).`);
      return { ...state, character: newChar };
    }
    case 'DEBUG_SET_COMFORT': {
      if (!state.character) return state;
      const newChar = { ...state.character };
      newChar.comfortLevel = Math.max(0, Math.min(BASE_MAX_COMFORT, action.payload.level));
      addEntryToLog('system', `[DEBUG] Comfort level manually set to ${newChar.comfortLevel} (${getComfortStatus(newChar.comfortLevel, state.currentTemperature)}).`);
      return { ...state, character: newChar };
    }
    case 'DEBUG_SET_ENVIRONMENT': {
      const newEnv = action.payload;
      addEntryToLog('system', `[DEBUG] Outside Environment set to ${newEnv}.`);
      
      let updatedChar = state.character;
      if (updatedChar) {
        updatedChar = { ...updatedChar };
        updatedChar.comfortLevel = calculateComfortLevel(updatedChar.equippedItems, newEnv, state.currentShelter);
      }

      return {
        ...state,
        currentEnvironmentalCondition: newEnv,
        character: updatedChar
      };
    }
    case 'DEBUG_SET_SHELTER': {
      const { quality, name } = action.payload;
      const shelterName = name || `${quality} shelter`;
      addEntryToLog('system', `[DEBUG] Shelter set to ${shelterName} (Quality: ${quality}).`);
      
      let updatedChar = state.character;
      if (updatedChar) {
        updatedChar = { ...updatedChar };
        updatedChar.comfortLevel = calculateComfortLevel(updatedChar.equippedItems, state.currentEnvironmentalCondition, quality);
      }

      return {
        ...state,
        currentShelter: quality,
        currentShelterName: shelterName,
        character: updatedChar
      };
    }
    case 'DEBUG_SET_WEATHER': {
      const newWeather = action.payload;
      addEntryToLog('system', `[DEBUG] Weather set to ${newWeather}.`);
      
      const latFactor = getLatitudeFactor(state.currentProvince, state.currentCity);
      const newTemp = calculateSpecificTemperature(state.currentSeason, state.currentSubSeason, newWeather, latFactor, state.currentTimeOfDay);
      const newOutsideEnv = calculateEnvironmentalCondition(newWeather, state.currentSeason, state.currentSubSeason, latFactor, state.currentTimeOfDay);

      let updatedChar = state.character;
      if (updatedChar) {
        updatedChar = { ...updatedChar };
        updatedChar.comfortLevel = calculateComfortLevel(updatedChar.equippedItems, newOutsideEnv, state.currentShelter);
      }

      return {
        ...state,
        currentWeather: newWeather,
        currentEnvironmentalCondition: newOutsideEnv,
        currentTemperature: newTemp,
        character: updatedChar
      };
    }
    default:
      // This should ideally not be reached if the main reducer calls this only for DEBUG_ actions.
      // However, as a safeguard:
      // addEntryToLog('error', `[DEBUG] Unknown debug action: ${action.type}`);
      return state;
  }
};