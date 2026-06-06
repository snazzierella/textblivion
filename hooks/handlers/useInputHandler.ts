
import React, { useCallback } from 'react';
import { 
  GameState, GamePhase, CharacterCreationData, AttributeName, TimeOfDay, Skill, EnvironmentalCondition, ShelterQuality, WeatherCondition, Season, SubSeason
} from '../../types.ts';
import { 
  DM_COMMAND_PREFIX, DM_HELP_TEXT, DM_DEBUG_HELP_TEXT, SKILLS_LIST, 
  DAYS_OF_WEEK, LEVEL_UP_ATTRIBUTE_POINTS_TO_ALLOCATE,
  getTimeOfDayFromHour, getHourForTimeOfDay, formatHourMinute, formatDurationForLog
} from '../../constants.ts';
import { processCharacterCreationInput, CharacterCreationInputHandlerParams } from '../characterCreationService.ts';
import { getGameResponse } from '../../services/geminiService.ts';
import { getStrippedStateForGemini } from '../utils/stateUtils.ts';
import { Action, GeminiResponseContext } from '../gameReducer.ts';
import { getInitialState, calculateCurrentSeasonAndSubSeason } from '../gameStateInitialization.ts';


interface CharacterCreationDataPayload { 
    majorSkills?: Skill[];
    minorSkills?: Skill[];
    attributePointsToAssign?: number;
}

interface UseInputHandlerProps {
  state: GameState;
  dispatch: React.Dispatch<Action>;
  characterCreationState: CharacterCreationData;
  setCharacterCreationState: React.Dispatch<React.SetStateAction<CharacterCreationData>>;
  ccStep: number;
  setCcStep: React.Dispatch<React.SetStateAction<number>>;
  handleAttributeChangeInCC: (attribute: AttributeName, change: number) => void; 
}

interface UseInputHandlerReturn {
  handlePlayerInput: (input: string, data?: CharacterCreationDataPayload) => Promise<void>;
}


export const useInputHandler = ({
  state,
  dispatch,
  characterCreationState,
  setCharacterCreationState,
  ccStep,
  setCcStep,
  handleAttributeChangeInCC
}: UseInputHandlerProps): UseInputHandlerReturn => {

  const handlePlayerInput = useCallback(async (input: string, data?: CharacterCreationDataPayload) => {
    const trimmedInput = input.trim();
    if (!trimmedInput) return;

    // The waking up logic that was here has been moved to useWakingUpNarrativeEffect.ts

    if (state.phase === GamePhase.CHARACTER_CREATION) {
      dispatch({ type: 'ADD_PLAYER_INPUT_TO_LOG', payload: trimmedInput });
      const ccParams: CharacterCreationInputHandlerParams = {
        dispatch, 
        ccStep, 
        setCcStep,
        characterCreationState,
        setCharacterCreationState,
        data 
      };
      await processCharacterCreationInput(trimmedInput, ccParams);
      return;
    }
    
    dispatch({ type: 'ADD_PLAYER_INPUT_TO_LOG', payload: trimmedInput });

    if (trimmedInput.toLowerCase().startsWith(DM_COMMAND_PREFIX.toLowerCase())) {
        const rawContent = trimmedInput.substring(DM_COMMAND_PREFIX.length).trim();
        const commandParts = rawContent.split(" ");
        const command = commandParts[0].toLowerCase();
        const args = commandParts.slice(1);
        const argsLower = args.map(a => a.toLowerCase());

        switch (command) {
            case "help":
                dispatch({ type: 'ADD_SYSTEM_MESSAGE', payload: DM_HELP_TEXT.split('\n') });
                if (state.isDebugMode) dispatch({ type: 'ADD_SYSTEM_MESSAGE', payload: DM_DEBUG_HELP_TEXT.split('\n') });
                return;
            case "time":
                dispatch({ type: 'ADD_SYSTEM_MESSAGE', payload: `Current time: Day ${state.currentDayNumber}, ${state.currentDayOfWeek}, ${state.currentTimeOfDay} (${formatHourMinute(state.currentHourInDay)}), ${state.currentSubSeason} ${state.currentSeason}.` });
                return;
            case "inventory":
                 dispatch({ type: 'ADD_SYSTEM_MESSAGE', payload: [
                    `Carried Items: ${state.inventory.carried.length > 0 ? state.inventory.carried.map(i => `${i.name} (x${i.quantity})`).join(', ') : 'None'}`,
                    `Stashed Items: ${state.inventory.stashed.length > 0 ? state.inventory.stashed.map(i => `${i.name} (x${i.quantity})`).join(', ') : 'None'}`,
                    `Septims: ${state.inventory.septims}`
                 ]});
                return;
            case "quests":
                const activeQuests = state.prospectiveQuests.filter(q => q.isActive && !q.isCompleted);
                dispatch({ type: 'ADD_SYSTEM_MESSAGE', payload: [
                    `Current Objective: ${state.currentObjective || "None."}`,
                    `Active Quests/Leads: ${activeQuests.length > 0 ? activeQuests.map(q => `"${q.title}"`).join('; ') : 'None.'}`
                ]});
                return;
            case "objective":
                 dispatch({ type: 'ADD_SYSTEM_MESSAGE', payload: `Current Objective: ${state.currentObjective || "None."}` });
                return;
            case "effects":
                if (state.activeEffects.length > 0) {
                    const effectMessages = state.activeEffects.map(e => `${e.sourceName}: ${e.targetName} ${e.modifier > 0 ? '+' : ''}${e.modifier}${e.remainingHours !== undefined ? ` (${e.remainingHours.toFixed(1)}h left)`: ''}`);
                    dispatch({ type: 'ADD_SYSTEM_MESSAGE', payload: ["Active Effects:", ...effectMessages] });
                } else {
                    dispatch({ type: 'ADD_SYSTEM_MESSAGE', payload: "No active temporary effects." });
                }
                return;
            case "debug":
                if (argsLower[0] === "mode" && argsLower[1] === "on") {
                    dispatch({ type: 'TOGGLE_DEBUG_MODE', payload: true });
                } else if (argsLower[0] === "mode" && argsLower[1] === "off") {
                    dispatch({ type: 'TOGGLE_DEBUG_MODE', payload: false });
                } else if (state.isDebugMode) {
                    const debugSubCommand = argsLower[0];
                    switch (debugSubCommand) {
                        case "help": dispatch({ type: 'ADD_SYSTEM_MESSAGE', payload: DM_DEBUG_HELP_TEXT.split('\n') }); return;
                        case "levelup": dispatch({ type: 'DEBUG_TRIGGER_LEVEL_UP' }); return;
                        case "addseptims": if (args[1]) dispatch({ type: 'DEBUG_ADD_SEPTIMS', payload: parseInt(args[1], 10) || 0 }); return;
                        case "skillup": {
                            if (args[1] && args[2]) {
                                const matchedSkill = SKILLS_LIST.find(s => s.toLowerCase() === args[1].toLowerCase());
                                if (matchedSkill) {
                                    dispatch({ type: 'DEBUG_INCREASE_SKILL', payload: { skillName: matchedSkill, amount: parseInt(args[2], 10) || 0 } });
                                } else {
                                    dispatch({ type: 'ADD_ERROR_MESSAGE', payload: `[DEBUG] Unknown skill: ${args[1]}` });
                                }
                            }
                            return;
                        }
                        case "additem": {
                            const jsonStr = args.slice(1).join(" ");
                            try {
                                const item = JSON.parse(jsonStr);
                                dispatch({ type: 'DEBUG_ADD_ITEM', payload: item });
                            } catch (e) {
                                dispatch({ type: 'ADD_ERROR_MESSAGE', payload: `[DEBUG] Invalid item JSON: ${(e as Error).message}`});
                            }
                            return;
                        }
                        case "addeffect": {
                            const jsonStr = args.slice(1).join(" ");
                            try {
                                const effect = JSON.parse(jsonStr);
                                dispatch({ type: 'DEBUG_ADD_EFFECT', payload: effect });
                            } catch (e) {
                                dispatch({ type: 'ADD_ERROR_MESSAGE', payload: `[DEBUG] Invalid effect JSON: ${(e as Error).message}`});
                            }
                            return;
                        }
                        case "passtime": if (args[1]) dispatch({ type: 'DEBUG_PASS_TIME', payload: parseFloat(args[1]) || 0 }); return;
                        case "sethour": if (args[1]) dispatch({ type: 'DEBUG_SET_HOUR', payload: parseFloat(args[1]) }); return;
                        case "settimeofday": {
                            if (args[1]) {
                                const matchedTod = Object.values(TimeOfDay).find(t => t.toLowerCase() === args[1].toLowerCase());
                                if (matchedTod) dispatch({ type: 'DEBUG_SET_TIMEOFDAY', payload: matchedTod });
                                else dispatch({ type: 'ADD_ERROR_MESSAGE', payload: `[DEBUG] Unknown TimeOfDay: ${args[1]}` });
                            }
                            return;
                        }
                        case "sethealth": if (args[1]) dispatch({ type: 'DEBUG_SET_HEALTH', payload: { current: parseInt(args[1]), max: args[2] ? parseInt(args[2]) : undefined } }); return;
                        case "setmana": if (args[1]) dispatch({ type: 'DEBUG_SET_MANA', payload: { current: parseInt(args[1]), max: args[2] ? parseInt(args[2]) : undefined } }); return;
                        case "setfatigue": if (args[1]) dispatch({ type: 'DEBUG_SET_FATIGUE', payload: { current: parseInt(args[1]), max: args[2] ? parseInt(args[2]) : undefined } }); return;
                        case "sethunger": if (args[1]) dispatch({ type: 'DEBUG_SET_HUNGER', payload: { level: parseInt(args[1]) } }); return;
                        case "setexhaustion": if (args[1]) dispatch({ type: 'DEBUG_SET_EXHAUSTION', payload: { level: parseInt(args[1]) } }); return;
                        case "setcomfort": if (args[1]) dispatch({ type: 'DEBUG_SET_COMFORT', payload: { level: parseInt(args[1]) } }); return;
                        case "setenvironment": {
                            if (args[1]) {
                                const matchedEnv = Object.values(EnvironmentalCondition).find(e => e.toLowerCase() === args[1].toLowerCase());
                                if (matchedEnv) dispatch({ type: 'DEBUG_SET_ENVIRONMENT', payload: matchedEnv });
                                else dispatch({ type: 'ADD_ERROR_MESSAGE', payload: `[DEBUG] Unknown EnvironmentalCondition: ${args[1]}` });
                            }
                            return;
                        }
                        case "setshelter": {
                            if (args[1]) {
                                const matchedShelter = Object.values(ShelterQuality).find(s => s.toLowerCase() === args[1].toLowerCase());
                                if (matchedShelter) dispatch({ type: 'DEBUG_SET_SHELTER', payload: { quality: matchedShelter, name: args.slice(2).join(" ") || undefined } });
                                else dispatch({ type: 'ADD_ERROR_MESSAGE', payload: `[DEBUG] Unknown ShelterQuality: ${args[1]}` });
                            }
                            return;
                        }
                        case "setweather": {
                            if (args[1]) {
                                const matchedWeather = Object.values(WeatherCondition).find(w => w.toLowerCase() === args[1].toLowerCase());
                                if (matchedWeather) dispatch({ type: 'DEBUG_SET_WEATHER', payload: matchedWeather });
                                else dispatch({ type: 'ADD_ERROR_MESSAGE', payload: `[DEBUG] Unknown WeatherCondition: ${args[1]}` });
                            }
                            return;
                        }
                        default: dispatch({ type: 'ADD_ERROR_MESSAGE', payload: `[DEBUG] Unknown debug command: ${argsLower[0]}`});
                    }
                } else {
                     dispatch({ type: 'ADD_ERROR_MESSAGE', payload: `Unknown DM command: ${command}. Type "DM: help". Or "DM: debug mode on" for debug commands.`});
                }
                return;
            case "correct":
                dispatch({ type: 'SET_LOADING', payload: true });
                try {
                  const strippedState = getStrippedStateForGemini(state);
                  const response = await getGameResponse(strippedState, trimmedInput, true); 
                  // Determine context based on current game phase for corrections
                  let correctionContext: GeminiResponseContext = 'STANDARD_TURN';
                  if (state.phase === GamePhase.AWAITING_BEDTIME_SUMMARY_CONFIRMATION) {
                      correctionContext = 'SUMMARY_CORRECTION';
                  }
                  dispatch({ type: 'PROCESS_GEMINI_RESPONSE', payload: {response, context: correctionContext } });
                } catch (error) {
                  dispatch({ type: 'ADD_ERROR_MESSAGE', payload: `Error processing correction: ${(error as Error).message}` });
                  dispatch({type: 'SET_LOADING', payload: false}); 
                } 
                return;
            default:
                 dispatch({ type: 'ADD_ERROR_MESSAGE', payload: `Unknown DM command: ${command}. Type "DM: help".`});
                return;
        }
    }

    // Flexible bedtime initiation: if input contains "bedtime" (case-insensitive)
    // and we are in a state where the player can typically choose actions.
    if (state.phase === GamePhase.AWAITING_INPUT && trimmedInput.toLowerCase().includes('bedtime')) {
        dispatch({ type: 'REQUEST_BEDTIME_INTENT_CONFIRMATION' });
        return;
    }

    if (trimmedInput.toLowerCase() === 'nap') {
        dispatch({type: 'EXECUTE_NAP'});
        return;
    }

    if (state.phase === GamePhase.AWAITING_BEDTIME_INTENT_CONFIRMATION) {
        if (trimmedInput.toLowerCase() === 'yes' || trimmedInput.toLowerCase() === "yes, i'm ready for bed.") {
             dispatch({ type: 'PROCEED_TO_BEDTIME_SUMMARY' }); 
        } else { 
            dispatch({ type: 'CANCEL_BEDTIME_INTENT' });
        }
        return;
    }
    
    if (state.phase === GamePhase.AWAITING_BEDTIME_SUMMARY_CONFIRMATION) {
        if (trimmedInput.toLowerCase() === 'yes' || trimmedInput.toLowerCase() === "yes, this summary is correct." || trimmedInput.toLowerCase() === "yes, summary is correct.") {
            dispatch({ type: 'CONFIRM_BEDTIME_SUMMARY_ACCEPTANCE' }); 
            if (state.permanentSkillUpsSinceLastLevelUp >= 5 && state.character) {
                dispatch({ type: 'PREPARE_LEVEL_UP', payload: { fromBedtime: true } }); 
            } else {
                dispatch({ type: 'APPLY_REST_AND_START_NEW_DAY' });
            }
        } else { 
            dispatch({ type: 'SET_LOADING', payload: true });
            try {
                const strippedState = getStrippedStateForGemini(state);
                const response = await getGameResponse(strippedState, trimmedInput, true); 
                dispatch({ type: 'PROCESS_GEMINI_RESPONSE', payload: { response, context: 'SUMMARY_CORRECTION' } });
            } catch (error) {
                dispatch({ type: 'ADD_ERROR_MESSAGE', payload: `Error processing input: ${(error as Error).message}` });
                dispatch({type: 'SET_LOADING', payload: false}); 
            }
        }
        return; 
    }
    
    if (state.phase === GamePhase.AWAITING_NEW_GAME_CONFIRMATION) {
      if (trimmedInput.toLowerCase() === 'yes') {
        dispatch({ type: 'CONFIRM_NEW_GAME' });
      } else {
        dispatch({ type: 'CANCEL_NEW_GAME' });
      }
      return;
    }

    dispatch({ type: 'SET_LOADING', payload: true });
    try {
        const strippedState = getStrippedStateForGemini(state);
        const response = await getGameResponse(strippedState, trimmedInput);
        dispatch({ type: 'PROCESS_GEMINI_RESPONSE', payload: { response, context: 'STANDARD_TURN' } });
    } catch (error) {
        dispatch({ type: 'ADD_ERROR_MESSAGE', payload: `Error processing input: ${(error as Error).message}` });
        dispatch({type: 'SET_LOADING', payload: false}); 
    }
  }, [
      state, 
      dispatch, 
      ccStep, 
      setCcStep, 
      characterCreationState, 
      setCharacterCreationState, 
    ]); 

  return { handlePlayerInput };
};
