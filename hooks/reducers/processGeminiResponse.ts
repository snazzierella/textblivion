
import {
  GameState, GeminiResponse, NarrativeEntry, Item, ActiveEffect, PlayerCharacter,
  TimeOfDay, WeatherCondition, EnvironmentalCondition, ShelterQuality, ChoiceItemObject,
  AteFoodDetail, Season, SubSeason, GamePhase 
} from '../../types.ts'; 
import {
  getSkillLevel, getExpNeededForNextLevel, calculateComfortLevel, calculateEnvironmentalCondition, getLatitudeFactor, applyStatChangesAndPenalties, calculateSpecificTemperature, getEnvironmentalConditionFromTemp, enrichItemWithStats
} from '../gameReducerHelpers.ts';
import {
  DAYS_OF_WEEK, MAX_HUNGER_LEVEL, MAX_EXHAUSTION_LEVEL,
  HUNGER_INCREASE_PER_HOUR, EXHAUSTION_INCREASE_PER_HOUR, HEALTH_AFTER_FAINT_PERCENT,
  HUNGER_STATUS_THRESHOLDS, INITIAL_DAY_NUMBER,
  getTimeOfDayFromHour, getHourForTimeOfDay, formatHourMinute, formatDurationForLog,
  getHungerStatus, getExhaustionStatus, getComfortStatus,
  LATITUDE_TEMP_RANGE_F // Used for lat factor calc in helper, but maybe needed here if we recalc
} from '../../constants.ts';
import { calculateCurrentSeasonAndSubSeason } from '../gameStateInitialization.ts';
import { GeminiResponseContext } from '../gameReducer.ts'; 
import { v4 as uuidv4 } from 'uuid';


const sanitizeChoices = (choices: (string | ChoiceItemObject)[] | undefined): string[] | undefined => {
  if (!choices || !Array.isArray(choices)) return undefined;

  const NARRATION_CUE_REGEX_CHOICE = /^(NARRATION|NARRATIVE)\s*_?\s*SAYS\s*_?\s*:\s*/i;
  const PLAYER_CUE_REGEX_CHOICE = /^PLAYER\s*_?\s*SAYS\s*_?\s*:\s*/i;

  const stripCuesFromChoiceString = (text: string): string => {
      if (typeof text !== 'string') return '';
      let cleanedText = text.replace(NARRATION_CUE_REGEX_CHOICE, '');
      cleanedText = cleanedText.replace(PLAYER_CUE_REGEX_CHOICE, '');
      return cleanedText.trim();
  };
  
  const extractChoiceTextFromItem = (item: string | ChoiceItemObject): string => {
      if (typeof item === 'string') return item;
      if (typeof item === 'object' && item !== null) {
          const obj = item as ChoiceItemObject;
          if (typeof obj.choice === 'string') return obj.choice;
          if (typeof obj.text === 'string') return obj.text;
          if (typeof obj.choiceText === 'string') return obj.choiceText;
          console.warn("Received a choice object without a 'choice', 'text', or 'choiceText' string property:", item);
          return '';
      }
      console.warn("Unexpected choice format (neither object nor string):", item);
      return '';
  };

  const sanitized = choices
      .map(extractChoiceTextFromItem)
      .filter(choiceText => choiceText.length > 0)
      .map(stripCuesFromChoiceString);
  
  return sanitized.length > 0 ? sanitized : undefined;
};

const normalizedName = (name: string) => name.trim().toLowerCase();
const areNamesEquivalent = (n1: string, n2: string) => {
    const s1 = normalizedName(n1);
    const s2 = normalizedName(n2);
    return s1 === s2 || s1 + 's' === s2 || s1 === s2 + 's';
}


export const processGeminiResponse = (
  currentState: GameState,
  geminiActualResponse: GeminiResponse,
  context: GeminiResponseContext,
  addEntryToLog: (type: NarrativeEntry['type'], text: string | string[], promptNum?: number) => void
): Partial<GameState> => {
  const { character: currentChar, inventory: currentInventory, activeEffects: currentActiveEffects } = currentState;
  let updatedState: Partial<GameState> = {};

  if (!currentChar) {
    addEntryToLog('error', "Critical Error: Character data missing during Gemini response processing.");
    updatedState.phase = GamePhase.API_KEY_MISSING; 
    return updatedState;
  }

  if (geminiActualResponse.error) {
    let narrativeString: string;
    if (typeof geminiActualResponse.narrative === 'string') {
        narrativeString = geminiActualResponse.narrative;
    } else if (Array.isArray(geminiActualResponse.narrative) && geminiActualResponse.narrative.every(item => typeof item === 'string')) {
        narrativeString = (geminiActualResponse.narrative as string[]).join('\n');
    } else {
        narrativeString = "The mists of Oblivion swirl, and your connection to the threads of fate is temporarily lost. (Error communicating with the storyteller. Please try again.)";
    }
    
    addEntryToLog('dm', narrativeString, currentState.promptNumber);
    updatedState.lastDmNarrativeForTTS = narrativeString;
    updatedState.lastCallFailed = true;
    
    if (context === 'SUMMARY_CORRECTION' || context === 'BEDTIME_SUMMARY_RECEIVED') {
        updatedState.phase = GamePhase.AWAITING_BEDTIME_SUMMARY_CONFIRMATION;
    } else if (context === 'FAINT_RECOVERY_DETAILS_RECEIVED') {
        let modifiableCharacter = { ...currentChar };
        modifiableCharacter.currentHealth = Math.max(1, Math.floor(modifiableCharacter.maxHealth * HEALTH_AFTER_FAINT_PERCENT));
        updatedState.character = modifiableCharacter;
        updatedState.phase = GamePhase.AWAITING_INPUT;
    } else {
        updatedState.phase = GamePhase.AWAITING_INPUT;
    }
    
    return updatedState;
  }
  
  let modifiableCharacter = { ...currentChar };
  let updatedInventory = { ...currentInventory, carried: [...currentInventory.carried], stashed: [...currentInventory.stashed] };
  let updatedActiveEffects = [...currentActiveEffects];
  let updatedPermanentSkillUps = currentState.permanentSkillUpsSinceLastLevelUp;
  updatedState.lastCallFailed = false;

  // 1. Narrative and Choices
  let narrativeString: string;
  if (typeof geminiActualResponse.narrative === 'string') {
      narrativeString = geminiActualResponse.narrative;
  } else if (Array.isArray(geminiActualResponse.narrative) && geminiActualResponse.narrative.every(item => typeof item === 'string')) {
      narrativeString = (geminiActualResponse.narrative as string[]).join('\n');
  } else {
      narrativeString = "NARRATION_SAYS: The storyteller seems to have lost their train of thought. (Invalid narrative format received)";
      console.error("Gemini response 'narrative' was not a string or array of strings:", geminiActualResponse.narrative);
  }
  
  // Logic to prevent double narrative during Bedtime/Waking flow
  if (context === 'BEDTIME_SUMMARY_RECEIVED') {
      // For summary, we might want to display it as a system message or a distinct block, 
      // but typically it comes as 'narrative'. We'll log it as DM.
      // We do NOT want to suppress it, as it's the Summary.
      addEntryToLog('dm', narrativeString, currentState.promptNumber);
      updatedState.lastDmNarrativeForTTS = narrativeString;
  } else if (context === 'ADVENTURE_INTRO_RECEIVED' || context === 'STANDARD_TURN' || context === 'SUMMARY_CORRECTION' || context === 'FAINT_RECOVERY_DETAILS_RECEIVED') {
      addEntryToLog('dm', narrativeString, currentState.promptNumber);
      updatedState.lastDmNarrativeForTTS = narrativeString;
  }
  
  updatedState.promptNumber = currentState.promptNumber + 1;

  let finalChoices = sanitizeChoices(geminiActualResponse.choices) || sanitizeChoices(geminiActualResponse.currentChoices);
  
  // Inject or override choices based on context or initial summary generation
  if (context === 'SUMMARY_CORRECTION' || currentState.phase === GamePhase.AWAITING_BEDTIME_SUMMARY_GENERATION && context === 'BEDTIME_SUMMARY_RECEIVED') {
      const summaryConfirmationChoices = ["Yes, summary is correct.", "No, I need to make a correction."];
      finalChoices = summaryConfirmationChoices;
  }

  if (finalChoices && finalChoices.length > 0) {
    const lastLogEntry = currentState.narrativeLog[currentState.narrativeLog.length -1];
    let choicesAlreadyLoggedAndIdentical = false;
    if (lastLogEntry && lastLogEntry.type === 'choices' && Array.isArray(lastLogEntry.text)) {
        if (lastLogEntry.text.length === finalChoices.length && lastLogEntry.text.every((val, index) => val === finalChoices![index])) {
            choicesAlreadyLoggedAndIdentical = true;
        }
    }
    if (!choicesAlreadyLoggedAndIdentical) {
        addEntryToLog('choices', finalChoices);
    }
  }
  updatedState.currentChoices = finalChoices || [];


  // 2. Inventory and Septims
  const oldSeptims = updatedInventory.septims;
  if (geminiActualResponse.septimsChange) {
      updatedInventory.septims = Math.max(0, updatedInventory.septims + geminiActualResponse.septimsChange);
      if (updatedInventory.septims !== oldSeptims) {
          addEntryToLog('system', `Septims ${geminiActualResponse.septimsChange > 0 ? 'gained' : 'lost'}: ${Math.abs(geminiActualResponse.septimsChange)}. Total: ${updatedInventory.septims}.`);
      }
  }

  // Handle Item Updates (e.g., refilling waterskins)
  if (geminiActualResponse.itemUpdates) {
    geminiActualResponse.itemUpdates.forEach(update => {
      if (update.id) {
        const carriedIndex = updatedInventory.carried.findIndex(i => i.id === update.id);
        if (carriedIndex > -1) {
          updatedInventory.carried[carriedIndex] = { ...updatedInventory.carried[carriedIndex], ...update };
          addEntryToLog('system', `${updatedInventory.carried[carriedIndex].name} updated.`);
        }
      }
    });
  }

  if (geminiActualResponse.itemsGained) {
    geminiActualResponse.itemsGained.forEach(newItemRaw => {
      let newItem = enrichItemWithStats(newItemRaw);
      // INTERCEPT CURRENCY ITEMS (Broad Match)
      if (['gold', 'septim', 'coin'].some(currencyTerm => newItem.name.toLowerCase().includes(currencyTerm))) {
          const quantity = newItem.quantity || 1;
          updatedInventory.septims += quantity;
          addEntryToLog('system', `You obtained ${quantity} Septims.`);
          return; 
      }

      // Check if it's a specific item override (same ID)
      const existingIdIndex = newItem.id ? updatedInventory.carried.findIndex(i => i.id === newItem.id) : -1;
      
      if (existingIdIndex > -1) {
         // Update existing item logic (e.g. refilled waterskin passed as gain)
         updatedInventory.carried[existingIdIndex] = enrichItemWithStats({ ...updatedInventory.carried[existingIdIndex], ...newItem });
         addEntryToLog('system', `Updated ${newItem.name}.`);
      } else {
         // Check for stacking
         const existingStackIndex = updatedInventory.carried.findIndex(i => i.name === newItem.name && !i.isRefillable); // Don't stack refillables by default unless identical?
         if (existingStackIndex > -1) {
            updatedInventory.carried[existingStackIndex].quantity += newItem.quantity;
            updatedInventory.carried[existingStackIndex] = enrichItemWithStats(updatedInventory.carried[existingStackIndex]);
         } else {
             // For refillable items (Waterskins), default charges if not set
             if (newItem.isRefillable && newItem.maxCharges && newItem.currentCharges === undefined) {
                 newItem.currentCharges = newItem.maxCharges;
             }
             // For waterskins, default 8/8 sips if not specified but name implies it? 
             if (newItem.name.toLowerCase().includes("waterskin") && !newItem.maxCharges) {
                 newItem.isRefillable = true;
                 newItem.maxCharges = 8;
                 newItem.currentCharges = 8;
                 newItem.chargeLabel = "sips";
                 newItem.isFood = true; // drinkable
                 newItem.fatigueRecovery = 15; // default
                 newItem = enrichItemWithStats(newItem);
             }

            updatedInventory.carried.push(enrichItemWithStats({ ...newItem, id: newItem.id || uuidv4() }));
         }
         addEntryToLog('system', `You obtained ${newItem.quantity}x ${newItem.name}.`);
      }
    });
  }

  if (geminiActualResponse.itemsLostByName) {
      const lostMessages: string[] = [];
      // Use case-insensitive matching logic
      const lostNames = geminiActualResponse.itemsLostByName;
      
      updatedInventory.carried = updatedInventory.carried.filter(item => {
          // Check if this item is in the list of lost items
          const isLost = lostNames.some(lostName => areNamesEquivalent(lostName, item.name));

          if (isLost) {
              lostMessages.push(`You lost your ${item.name}.`);
              // Check and remove from equipped items if necessary
              if (modifiableCharacter.equippedItems.some(eq => eq.id === item.id)) {
                  modifiableCharacter.equippedItems = modifiableCharacter.equippedItems.filter(eq => eq.id !== item.id);
                  updatedActiveEffects = updatedActiveEffects.filter(eff => !(eff.isEnchantment && eff.sourceItemId === item.id));
                   lostMessages.push(`Your equipped ${item.name} was lost and unequipped.`);
              }
              return false; // Remove from inventory
          }
          return true; // Keep in inventory
      });
      if (lostMessages.length > 0) addEntryToLog('system', lostMessages);
  }

  // Stashing Logic (Simplified for brevity, similar to existing)
   if (geminiActualResponse.itemsStashed) {
    geminiActualResponse.itemsStashed.forEach(itemFoundOrBeingStashed => {
      const existingStashedItemIndex = updatedInventory.stashed.findIndex(i => i.name === itemFoundOrBeingStashed.name);
      if (existingStashedItemIndex > -1) {
        updatedInventory.stashed[existingStashedItemIndex].quantity += itemFoundOrBeingStashed.quantity;
      } else {
        updatedInventory.stashed.push({ ...itemFoundOrBeingStashed, id: itemFoundOrBeingStashed.id || uuidv4() });
      }
      const existingCarriedItemIndex = updatedInventory.carried.findIndex(i => i.name === itemFoundOrBeingStashed.name);
      if (existingCarriedItemIndex > -1) { 
        addEntryToLog('system', `You stashed ${itemFoundOrBeingStashed.quantity}x ${itemFoundOrBeingStashed.name}.`);
        if (updatedInventory.carried[existingCarriedItemIndex].quantity <= itemFoundOrBeingStashed.quantity) {
          updatedInventory.carried.splice(existingCarriedItemIndex, 1); 
        } else {
          updatedInventory.carried[existingCarriedItemIndex].quantity -= itemFoundOrBeingStashed.quantity;
        }
      } else { 
        addEntryToLog('system', `${itemFoundOrBeingStashed.name} (x${itemFoundOrBeingStashed.quantity}) found in your stash is noted.`);
      }
    });
  }
  if (geminiActualResponse.itemsRemovedFromStashByName) {
    const removeNames = geminiActualResponse.itemsRemovedFromStashByName;
    updatedInventory.stashed = updatedInventory.stashed.filter(item => {
      if (removeNames.some(rName => areNamesEquivalent(rName, item.name))) {
          addEntryToLog('system', `${item.name} removed from stash.`);
          return false;
      }
      return true;
    });
  }

  // Equipping Logic
  if (geminiActualResponse.equippedItemNames) {
    geminiActualResponse.equippedItemNames.forEach(itemName => {
        const itemToEquip = updatedInventory.carried.find(item => areNamesEquivalent(item.name, itemName));
        if (itemToEquip && !modifiableCharacter.equippedItems.some(eq => eq.id === itemToEquip.id)) {
            modifiableCharacter.equippedItems.push({...itemToEquip});
            addEntryToLog('system', `You equip the ${itemToEquip.name}.`);
            if (itemToEquip.effects) {
                itemToEquip.effects.forEach(effectDef => {
                    updatedActiveEffects.push({
                        id: uuidv4(), sourceName: itemToEquip.name, target: effectDef.target,
                        targetName: effectDef.targetName, modifier: effectDef.modifier,
                        isEnchantment: true, sourceItemId: itemToEquip.id
                    });
                });
            }
        }
    });
  }
  if (geminiActualResponse.unequippedItemNames) {
      geminiActualResponse.unequippedItemNames.forEach(itemName => {
          const itemToUnequip = modifiableCharacter.equippedItems.find(item => areNamesEquivalent(item.name, itemName));
          if (itemToUnequip) {
              modifiableCharacter.equippedItems = modifiableCharacter.equippedItems.filter(item => item.id !== itemToUnequip.id);
              updatedActiveEffects = updatedActiveEffects.filter(effect => !(effect.isEnchantment && effect.sourceItemId === itemToUnequip.id));
              addEntryToLog('system', `You unequip the ${itemToUnequip.name}.`);
          }
      });
  }
  updatedState.inventory = updatedInventory;

  // 3. Time, Date, Season, Environment
  let updatedDayNumber = currentState.currentDayNumber;
  let updatedDayOfWeek = currentState.currentDayOfWeek;
  let updatedHourInDay = currentState.currentHourInDay;
  let updatedSeason = currentState.currentSeason;
  let updatedSubSeason = currentState.currentSubSeason;
  let timeActuallyPassedInResponse = false;
  let hoursDeltaForEffectsAndStats = 0.0;

  let rawTimePassed = geminiActualResponse.timePassedHours;
  if (rawTimePassed === undefined || rawTimePassed <= 0) {
      if (context === 'STANDARD_TURN') {
          rawTimePassed = 0.5; // default to 30 mins
      } else if (context === 'BEDTIME_SUMMARY_RECEIVED') {
          rawTimePassed = 8.0; // rest
      } else if (context === 'FAINT_RECOVERY_DETAILS_RECEIVED') {
          rawTimePassed = 4.0; // recovery time
      } else {
          rawTimePassed = 0.25; // standard fallback
      }
  }

  if (rawTimePassed && rawTimePassed > 0) {
      timeActuallyPassedInResponse = true;
      hoursDeltaForEffectsAndStats = rawTimePassed;
      updatedHourInDay += hoursDeltaForEffectsAndStats;

      const daysPassedDelta = Math.floor(updatedHourInDay / 24);
      if (daysPassedDelta > 0) {
          updatedDayNumber += daysPassedDelta;
          updatedDayOfWeek = DAYS_OF_WEEK[(DAYS_OF_WEEK.indexOf(updatedDayOfWeek) + daysPassedDelta) % DAYS_OF_WEEK.length];
          const newSeasonsAfterTime = calculateCurrentSeasonAndSubSeason(updatedDayNumber);
          if (newSeasonsAfterTime.season !== updatedSeason || newSeasonsAfterTime.subSeason !== updatedSubSeason) {
              addEntryToLog('system', `The season changes. It is now ${newSeasonsAfterTime.subSeason} ${newSeasonsAfterTime.season}.`);
          }
          updatedSeason = newSeasonsAfterTime.season;
          updatedSubSeason = newSeasonsAfterTime.subSeason;
          addEntryToLog('system', `A new day dawns: Day ${updatedDayNumber}, ${updatedDayOfWeek}.`);
      }
      updatedHourInDay %= 24;
  }
  
  if (geminiActualResponse.newSeason && geminiActualResponse.newSeason !== updatedSeason) {
      updatedSeason = geminiActualResponse.newSeason;
      addEntryToLog('system', `The season is now ${updatedSeason}.`);
  }
  if (geminiActualResponse.newSubSeason && geminiActualResponse.newSubSeason !== updatedSubSeason) {
      updatedSubSeason = geminiActualResponse.newSubSeason;
      addEntryToLog('system', `It is now ${updatedSubSeason} ${updatedSeason}.`);
  }

  let finalTimeOfDay: TimeOfDay;
  let finalHourInDay: number = updatedHourInDay;

  if (geminiActualResponse.newTimeOfDay && Object.values(TimeOfDay).includes(geminiActualResponse.newTimeOfDay)) {
      timeActuallyPassedInResponse = true;
      finalTimeOfDay = geminiActualResponse.newTimeOfDay;
      finalHourInDay = getHourForTimeOfDay(geminiActualResponse.newTimeOfDay);
      if (finalHourInDay !== updatedHourInDay) updatedHourInDay = finalHourInDay;
  } else {
      finalTimeOfDay = getTimeOfDayFromHour(finalHourInDay);
  }
  if (finalTimeOfDay !== currentState.currentTimeOfDay) {
      addEntryToLog('system', `It is now ${finalTimeOfDay} (${formatHourMinute(finalHourInDay)}).`);
  } else if (timeActuallyPassedInResponse && hoursDeltaForEffectsAndStats > 0) {
      addEntryToLog('system', `${formatDurationForLog(hoursDeltaForEffectsAndStats)} pass. Current time: ${formatHourMinute(finalHourInDay)}.`);
  }

  updatedState.currentDayNumber = Math.max(INITIAL_DAY_NUMBER, updatedDayNumber);
  updatedState.currentDayOfWeek = updatedDayOfWeek;
  updatedState.currentTimeOfDay = finalTimeOfDay;
  updatedState.currentHourInDay = finalHourInDay;
  updatedState.currentSeason = updatedSeason;
  updatedState.currentSubSeason = updatedSubSeason;

  if (hoursDeltaForEffectsAndStats > 0) {
      const stillActiveEffects: ActiveEffect[] = [];
      updatedActiveEffects.forEach(effect => {
          if (effect.durationHours && effect.remainingHours !== undefined) {
              effect.remainingHours -= hoursDeltaForEffectsAndStats;
              if (effect.remainingHours > 0) stillActiveEffects.push(effect);
              else addEntryToLog('system', `The effect of ${effect.sourceName} has worn off.`);
          } else {
              stillActiveEffects.push(effect);
          }
      });
      updatedActiveEffects = stillActiveEffects;
  }
  if (geminiActualResponse.newActiveEffects) {
    geminiActualResponse.newActiveEffects.forEach(effect => {
        updatedActiveEffects.push({ ...effect, id: uuidv4(), remainingHours: effect.durationHours });
        addEntryToLog('system', `Active Effect: ${effect.sourceName} (${effect.targetName} ${effect.modifier > 0 ? '+' : ''}${effect.modifier}).`);
    });
  }
  updatedState.activeEffects = updatedActiveEffects;

  let finalCurrentProvince = geminiActualResponse.currentProvinceName || currentState.currentProvince;
  let finalCurrentCity = geminiActualResponse.currentCityName !== undefined ? (geminiActualResponse.currentCityName || null) : currentState.currentCity;
  
  if (finalCurrentProvince !== currentState.currentProvince) updatedState.currentProvince = finalCurrentProvince;
  if (finalCurrentCity !== currentState.currentCity) updatedState.currentCity = finalCurrentCity;

  let newCurrentWeather = currentState.currentWeather;
  if (geminiActualResponse.newWeatherCondition && geminiActualResponse.newWeatherCondition !== currentState.currentWeather) {
      newCurrentWeather = geminiActualResponse.newWeatherCondition;
      addEntryToLog('system', `The weather changes to: ${newCurrentWeather}.`);
  }
  updatedState.currentWeather = newCurrentWeather;

  // New Temperature Calculation
  const latFactor = getLatitudeFactor(finalCurrentProvince, finalCurrentCity);
  // Calculate specific temp
  const calculatedSpecificTemp = calculateSpecificTemperature(
      updatedSeason, 
      updatedSubSeason, 
      newCurrentWeather, 
      latFactor, 
      finalTimeOfDay
  );
  updatedState.currentTemperature = calculatedSpecificTemp;

  // Derive condition from temp
  let finalOutsideEnvironmentalCondition = getEnvironmentalConditionFromTemp(calculatedSpecificTemp);
  
  if (geminiActualResponse.newEnvironmentalCondition) {
      finalOutsideEnvironmentalCondition = geminiActualResponse.newEnvironmentalCondition;
  }
  
  if (finalOutsideEnvironmentalCondition !== currentState.currentEnvironmentalCondition) {
      // Log generic condition change? Maybe redundant if we show temp.
      // addEntryToLog('system', `Environment: ${finalOutsideEnvironmentalCondition}.`);
  }
  updatedState.currentEnvironmentalCondition = finalOutsideEnvironmentalCondition;

  let finalShelterQuality = geminiActualResponse.newShelterQuality || currentState.currentShelter;
  let finalShelterName = geminiActualResponse.newShelterName !== undefined ? (geminiActualResponse.newShelterName || null) : currentState.currentShelterName;

  if ((finalCurrentCity !== currentState.currentCity || finalCurrentProvince !== currentState.currentProvince) && !geminiActualResponse.newShelterQuality && !geminiActualResponse.newShelterName) {
      if (finalCurrentCity || (finalCurrentCity === null && finalCurrentProvince !== currentState.currentProvince)) {
          if (finalShelterQuality !== ShelterQuality.NONE || finalShelterName !== null) {
              finalShelterQuality = ShelterQuality.NONE;
              finalShelterName = null;
          }
      }
  } 
  updatedState.currentShelter = finalShelterQuality;
  updatedState.currentShelterName = finalShelterName;

  // 4. Character Stats
  const oldComfort = modifiableCharacter.comfortLevel;
  modifiableCharacter.comfortLevel = calculateComfortLevel(modifiableCharacter.equippedItems, finalOutsideEnvironmentalCondition, finalShelterQuality);
  
  const detectSkillMultiplier = (narrativeText: string, actionText: string, skillName: string): { multiplier: number; reason: string } => {
    const combined = (narrativeText + " " + actionText).toLowerCase();
    
    if (combined.includes("sneak attack") || combined.includes("backstab")) {
      if (skillName === "Sneak" || skillName === "One-Handed" || skillName === "Archery" || skillName === "Two-Handed" || skillName === "Light Armor") {
        return { multiplier: 3, reason: " (3x Sneak Attack Critical!)" };
      }
    }
    
    if (combined.includes("impossible") || combined.includes("legendary") || combined.includes("colossal") || combined.includes("miraculous")) {
      return { multiplier: 5, reason: " (5x Legendary Accomplishment!)" };
    }
    
    if (combined.includes("exceptional") || combined.includes("monumental") || combined.includes("masterfully") || combined.includes("flawlessly") || combined.includes("expertly") || combined.includes("deftly")) {
      return { multiplier: 4, reason: " (4x Exceptional Feat!)" };
    }
    
    if (combined.includes("critical strike") || combined.includes("critical hit") || combined.includes("perfect block") || combined.includes("perfect parry") || combined.includes("perfect dodge") || combined.includes("parried perfectly")) {
      return { multiplier: 3, reason: " (3x Critical/Perfect Execution!)" };
    }
    
    if (combined.includes("challenging") || combined.includes("difficult") || combined.includes("severe") || combined.includes("hard")) {
      return { multiplier: 2, reason: " (2x Challenging Task!)" };
    }
    
    return { multiplier: 1, reason: "" };
  };

  if (geminiActualResponse.skillIncreases) {
      let skillsIncreasedThisTurn = 0;
      
      const lastPlayerEntry = [...currentState.narrativeLog].reverse().find(entry => entry.type === 'player');
      const actionText = lastPlayerEntry ? (Array.isArray(lastPlayerEntry.text) ? lastPlayerEntry.text.join(" ") : lastPlayerEntry.text) : "";
      const narrativeText = Array.isArray(geminiActualResponse.narrative)
          ? geminiActualResponse.narrative.join(" ")
          : (geminiActualResponse.narrative || "");

      geminiActualResponse.skillIncreases.forEach(increase => {
          if (increase.isPermanent) {
              const skillToUpdate = modifiableCharacter.skills.find(s => s.skill === increase.skill);
              if (skillToUpdate) {
                  const oldSkillVal = skillToUpdate.value;
                  
                  // Detect or read multiplier
                  const { multiplier: detectedMult, reason: multReason } = detectSkillMultiplier(narrativeText, actionText, increase.skill);
                  const multiplier = increase.multiplier || detectedMult || 1;
                  const reasonText = increase.multiplier ? ` (${increase.multiplier}x EXP multiplier!)` : multReason;
                  
                  // Award EXP
                  const baseActionExp = increase.amount * 12;
                  const expAwarded = baseActionExp * multiplier;
                  
                  const currentProgress = skillToUpdate.progressToNextLevel || 0;
                  const newProgress = currentProgress + expAwarded;
                  
                  let currentVal = oldSkillVal;
                  let runningProgress = newProgress;
                  let levelsGained = 0;
                  
                  while (currentVal < 100) {
                      const needed = getExpNeededForNextLevel(currentVal);
                      if (runningProgress >= needed) {
                          runningProgress -= needed;
                          currentVal++;
                          levelsGained++;
                      } else {
                          break;
                      }
                  }
                  
                  skillToUpdate.value = currentVal;
                  skillToUpdate.progressToNextLevel = runningProgress;
                  const newLevel = getSkillLevel(currentVal);
                  skillToUpdate.level = newLevel;
                  
                  if (levelsGained > 0) {
                      const isMajorText = skillToUpdate.isMajor ? " (Contributes to character level up!)" : " (Minor skill)";
                      addEntryToLog('system', `Your ${skillToUpdate.skill} skill increased to ${currentVal}${getSkillLevel(oldSkillVal) !== newLevel ? ` (${newLevel})` : ''}! (Gained ${levelsGained} level${levelsGained > 1 ? 's' : ''}!${reasonText}${isMajorText})`);
                      if (skillToUpdate.isMajor) {
                          skillsIncreasedThisTurn += levelsGained;
                      }
                  } else if (expAwarded > 0) {
                      const needed = getExpNeededForNextLevel(currentVal);
                      addEntryToLog('system', `${skillToUpdate.skill} skill gained +${expAwarded} EXP${reasonText} (${runningProgress}/${needed} XP to next level).`);
                  }
              }
          }
      });
      updatedPermanentSkillUps += skillsIncreasedThisTurn;
  }
  updatedState.permanentSkillUpsSinceLastLevelUp = updatedPermanentSkillUps;

  // Consumption Logic with Charges
  if (geminiActualResponse.ateFoodDetails) {
    const foodItemsToProcess: AteFoodDetail[] = Array.isArray(geminiActualResponse.ateFoodDetails) ? geminiActualResponse.ateFoodDetails : [geminiActualResponse.ateFoodDetails];
    foodItemsToProcess.forEach(foodDetail => {
        if (foodDetail && typeof foodDetail.itemName === 'string') {
            const itemNameFromDM = foodDetail.itemName.trim();
            const quantityToConsumeFromDM = foodDetail.quantityConsumed || 1;
            // Fuzzy match
            const foodItemIndex = updatedInventory.carried.findIndex(i => areNamesEquivalent(i.name, itemNameFromDM) && (i.isFood || i.isRefillable));

            if (foodItemIndex > -1) {
                const foodItem = { ...updatedInventory.carried[foodItemIndex] };
                let consumedSomething = false;

                // Charge-based consumption
                if (foodItem.isRefillable && foodItem.currentCharges !== undefined && foodItem.currentCharges > 0) {
                     const chargesToUse = foodDetail.chargesConsumed || 1;
                     const chargesUsed = Math.min(foodItem.currentCharges, chargesToUse);
                     foodItem.currentCharges -= chargesUsed;
                     consumedSomething = true;
                     // Log update
                     // addEntryToLog('system', `Used ${chargesUsed} ${foodItem.chargeLabel || 'charges'} from ${foodItem.name}.`);
                } 
                // Quantity-based consumption
                else if (!foodItem.isRefillable) {
                    const quantityActuallyConsumed = Math.min(foodItem.quantity, quantityToConsumeFromDM);
                    if (quantityActuallyConsumed > 0) {
                        foodItem.quantity -= quantityActuallyConsumed;
                        consumedSomething = true;
                    }
                }

                if (consumedSomething) {
                    if (foodItem.hungerReduction) modifiableCharacter.hungerLevel = Math.max(0, modifiableCharacter.hungerLevel - (foodItem.hungerReduction));
                    if (foodItem.healthRecovery) modifiableCharacter.currentHealth = Math.min(modifiableCharacter.maxHealth, modifiableCharacter.currentHealth + (foodItem.healthRecovery));
                    if (foodItem.manaRecovery) modifiableCharacter.currentMana = Math.min(modifiableCharacter.maxMana, modifiableCharacter.currentMana + (foodItem.manaRecovery));
                    if (foodItem.fatigueRecovery) modifiableCharacter.currentFatigue = Math.min(modifiableCharacter.maxFatigue, modifiableCharacter.currentFatigue + (foodItem.fatigueRecovery));
                    
                    let mainMsg = `You consume ${foodItem.name}.`;
                    if (foodItem.isRefillable) {
                         mainMsg = `You drink from ${foodItem.name}. (${foodItem.currentCharges}/${foodItem.maxCharges} left).`;
                    }
                    addEntryToLog('system', mainMsg);

                    // Remove if empty and not refillable
                    if (!foodItem.isRefillable && foodItem.quantity <= 0) {
                        updatedInventory.carried.splice(foodItemIndex, 1);
                    } else {
                        updatedInventory.carried[foodItemIndex] = foodItem;
                    }
                } else {
                    if (foodItem.isRefillable && foodItem.currentCharges === 0) {
                        addEntryToLog('system', `The ${foodItem.name} is empty.`);
                    }
                }
            } else addEntryToLog('system', `You tried to consume "${foodDetail.itemName}", but you don't have it.`);
        }
    });
  }

  const oldHealth = modifiableCharacter.currentHealth;
  const oldMana = modifiableCharacter.currentMana;
  const oldFatigue = modifiableCharacter.currentFatigue;
  const oldHunger = modifiableCharacter.hungerLevel;

  if (geminiActualResponse.healthChange) modifiableCharacter.currentHealth += geminiActualResponse.healthChange;
  if (geminiActualResponse.manaChange) modifiableCharacter.currentMana += geminiActualResponse.manaChange;
  if (geminiActualResponse.fatigueChange) modifiableCharacter.currentFatigue += geminiActualResponse.fatigueChange;
  if (geminiActualResponse.hungerChange !== undefined) {
      modifiableCharacter.hungerLevel = Math.max(0, Math.min(MAX_HUNGER_LEVEL, modifiableCharacter.hungerLevel + geminiActualResponse.hungerChange));
  } else if (hoursDeltaForEffectsAndStats > 0 && !geminiActualResponse.ateFoodDetails) {
      modifiableCharacter.hungerLevel = Math.max(0, Math.min(MAX_HUNGER_LEVEL, modifiableCharacter.hungerLevel + (HUNGER_INCREASE_PER_HOUR * hoursDeltaForEffectsAndStats)));
  }
  if (geminiActualResponse.exhaustionChange !== undefined) {
      modifiableCharacter.exhaustionLevel = Math.max(0, Math.min(MAX_EXHAUSTION_LEVEL, modifiableCharacter.exhaustionLevel + geminiActualResponse.exhaustionChange));
  } else if (hoursDeltaForEffectsAndStats > 0) {
      modifiableCharacter.exhaustionLevel = Math.max(0, Math.min(MAX_EXHAUSTION_LEVEL, modifiableCharacter.exhaustionLevel + (EXHAUSTION_INCREASE_PER_HOUR * hoursDeltaForEffectsAndStats)));
  }

  const consumedViaAteDetails = (checkProperty: keyof Item) => { return false; }; 
  if (Math.round(modifiableCharacter.currentHealth) !== Math.round(oldHealth)) addEntryToLog('system', `Health: ${Math.round(modifiableCharacter.currentHealth)}/${modifiableCharacter.maxHealth}.`);
  
  modifiableCharacter = applyStatChangesAndPenalties(modifiableCharacter, hoursDeltaForEffectsAndStats, addEntryToLog, finalOutsideEnvironmentalCondition);
  modifiableCharacter.currentHealth = Math.max(0, Math.min(modifiableCharacter.currentHealth, modifiableCharacter.maxHealth));
  modifiableCharacter.currentMana = Math.max(0, Math.min(modifiableCharacter.currentMana, modifiableCharacter.maxMana));
  modifiableCharacter.currentFatigue = Math.max(0, Math.min(modifiableCharacter.currentFatigue, modifiableCharacter.maxFatigue));


  // 5. Quests and Objective
  let finalCurrentObjective = currentState.currentObjective;
  if (geminiActualResponse.newObjective && geminiActualResponse.newObjective !== currentState.currentObjective) {
      finalCurrentObjective = geminiActualResponse.newObjective;
      addEntryToLog('system', `New Objective: ${finalCurrentObjective}`);
  }
  updatedState.currentObjective = finalCurrentObjective;

  let newProspectiveQuests = [...currentState.prospectiveQuests];
  
  if (geminiActualResponse.newQuests) {
      geminiActualResponse.newQuests.forEach(q => {
          const title = q.title || "Unidentified Task";
          // Prevent duplicates: Check if a quest with the same ID or Title already exists
          // Use trimmed lowercase title check to avoid duplicates from slight model variations
          const existingIndex = newProspectiveQuests.findIndex(p => 
              (q.id && p.id === q.id) || 
              normalizedName(p.title) === normalizedName(title)
          );
          
          if (existingIndex !== -1) {
              // If it exists (even if completed), do NOT add it again as a "New" quest.
              // This handles the issue of quests reappearing.
          } else {
              const newQ = {isActive: true, isCompleted: false, ...q, title, id: q.id || uuidv4()};
              newProspectiveQuests.push(newQ);
              addEntryToLog('system', `New ${q.type || 'Quest'} added: "${title}".`);
          }
      });
  }
  if (geminiActualResponse.updatedQuests) {
      newProspectiveQuests = newProspectiveQuests.map(q => {
          // Try to find update by ID first, then by Title if ID fails (Gemini sometimes forgets IDs)
          // Enhanced fuzzy matching for updates
          const updated = geminiActualResponse.updatedQuests!.find(uq => 
              (uq.id && uq.id === q.id) || 
              (uq.title && normalizedName(uq.title) === normalizedName(q.title))
          );
          
          if (updated) {
              addEntryToLog('system', `Quest "${q.title}" updated.`);
              if (updated.isCompleted && !q.isCompleted) addEntryToLog('system', `Quest "${q.title}" completed!`);
              return { ...q, ...updated };
          }
          return q;
      });
  }
  updatedState.prospectiveQuests = newProspectiveQuests;

  let newEventsSinceLastRest = [...currentState.eventsSinceLastRest];
  if (narrativeString && context !== 'BEDTIME_SUMMARY_RECEIVED' && context !== 'SUMMARY_CORRECTION') {
      newEventsSinceLastRest.push(narrativeString.split('\n')[0]);
  }
  updatedState.eventsSinceLastRest = newEventsSinceLastRest;

  let newMajorEvents = [...currentState.majorEvents];
  if (narrativeString && (geminiActualResponse.newQuests || geminiActualResponse.updatedQuests) && context !== 'BEDTIME_SUMMARY_RECEIVED' && context !== 'SUMMARY_CORRECTION') {
      newMajorEvents.push({day: Math.max(INITIAL_DAY_NUMBER, updatedDayNumber), description: `[Objective Update] ${geminiActualResponse.newObjective || narrativeString.substring(0,50)}`});
  }
  updatedState.majorEvents = newMajorEvents;


  // 6. Special Game States
  updatedState.character = modifiableCharacter;
  
  if (geminiActualResponse.faintConsequences) {
      // ... existing faint logic ...
      updatedState.phase = GamePhase.AWAITING_INPUT;
  } else if (geminiActualResponse.playerFainted || modifiableCharacter.currentHealth <= 0) {
      if (currentState.phase !== GamePhase.PLAYER_FAINTED && currentState.phase !== GamePhase.PLAYER_FAINTED_RECOVERY) {
          modifiableCharacter.currentHealth = 0;
          updatedState.phase = GamePhase.PLAYER_FAINTED; 
      }
  }

  if (geminiActualResponse.triggerTargetMinigame) {
      addEntryToLog('system', "An opening appears! Focus your strike!");
      updatedState.phase = GamePhase.TARGET_MINIGAME_ACTIVE;
      updatedState.currentTargetMinigameConfig = geminiActualResponse.triggerTargetMinigame;
  }
  
  // Phase setting
  if (context === 'SUMMARY_CORRECTION') {
      updatedState.phase = GamePhase.AWAITING_BEDTIME_SUMMARY_CONFIRMATION;
  } else if (context === 'BEDTIME_SUMMARY_RECEIVED') {
      updatedState.phase = GamePhase.AWAITING_BEDTIME_SUMMARY_CONFIRMATION;
  } else if (context === 'FAINT_RECOVERY_DETAILS_RECEIVED') {
      updatedState.phase = GamePhase.AWAITING_INPUT;
  } else if (updatedState.phase) {
      // Phase already set
  } else { 
      if (currentState.phase === GamePhase.PLAYER_FAINTED_RECOVERY && !geminiActualResponse.faintConsequences) {
          updatedState.phase = GamePhase.AWAITING_INPUT;
      } else if (currentState.phase === GamePhase.TARGET_MINIGAME_ACTIVE) {
          updatedState.phase = GamePhase.AWAITING_INPUT;
      } else if (currentState.phase === GamePhase.ADVENTURE_INTRO && context === 'ADVENTURE_INTRO_RECEIVED'){
          updatedState.phase = GamePhase.AWAITING_INPUT;
      }
      else {
          updatedState.phase = GamePhase.AWAITING_INPUT;
      }
  }

  return updatedState;
};
