

import React from 'react';
import { 
  CharacterCreationData, Race, Archetype, Province, Skill, Attributes, AttributeName, AgeGroup, Presentation,
  GamePhase, PlayerCharacter, CharacterSkill, NarrativeEntry, TTSVoiceOption 
} from '../types.ts';
import { 
  RACES, ARCHETYPES, PROVINCES, SKILLS_LIST, ATTRIBUTE_NAMES, AGE_GROUPS, PRESENTATION_TYPES,
  RACE_DESCRIPTIONS, ARCHETYPE_DESCRIPTIONS, PROVINCE_DESCRIPTIONS, 
  BASE_ATTRIBUTE_VALUE, RACE_ATTRIBUTE_BONUSES, ARCHETYPE_ATTRIBUTE_BONUSES, 
  INITIAL_ATTRIBUTE_POINTS, SKILL_VALUE_MAP 
} from '../constants.ts';
import { Action } from './gameReducer.ts'; 

export interface CharacterCreationInputHandlerParams {
  dispatch: React.Dispatch<Action>;
  ccStep: number;
  setCcStep: React.Dispatch<React.SetStateAction<number>>;
  characterCreationState: CharacterCreationData;
  setCharacterCreationState: React.Dispatch<React.SetStateAction<CharacterCreationData>>;
  data?: CharacterCreationDataPayload; 
}

interface CharacterCreationDataPayload { 
    majorSkills?: Skill[];
    minorSkills?: Skill[];
    attributePointsToAssign?: number;
}


export const getInitialCharacterCreationData = (): CharacterCreationData => ({
  race: '', archetype: '', startingProvince: '', name: '', backstory: '',
  assignedAttributes: {},
  attributePointsToAssign: INITIAL_ATTRIBUTE_POINTS,
  selectedMajorSkills: [],
  selectedMinorSkills: [],
  age: '',
  hairColor: '',
  distinguishingFeatures: '',
  presentation: '',
});

export const processCharacterCreationInput = async (
  input: string,
  params: CharacterCreationInputHandlerParams
): Promise<void> => {
  const { 
    dispatch, ccStep, setCcStep, 
    characterCreationState, setCharacterCreationState, data 
  } = params;

  // Handle "Back" Command
  if (input === "CC_BACK" && ccStep > 0) {
      let prevStep = ccStep - 1;
      // Skip steps if needed? No, purely sequential is safer for now.
      // Reset data for current step if backing out? 
      // Maybe not necessary, state is persistent.
      
      let narrativeForPrev = "";
      let choicesForPrev: string[] | undefined = undefined;

      switch(prevStep) {
          case 0: narrativeForPrev = "What race are you?"; choicesForPrev = RACE_DESCRIPTIONS.map(r => r.name); break;
          case 1: narrativeForPrev = `A ${characterCreationState.race}, excellent. Now, choose your archetype.`; choicesForPrev = ARCHETYPE_DESCRIPTIONS.map(a => a.name); break;
          case 2: narrativeForPrev = `From which province of Tamriel do you hail?`; choicesForPrev = PROVINCE_DESCRIPTIONS.map(p => p.name); break;
          case 3: narrativeForPrev = `And what is your name, traveler?`; break;
          case 4: narrativeForPrev = `Tell me a brief backstory (1-2 sentences).`; break;
          case 5: narrativeForPrev = `Assign your attribute points.`; choicesForPrev = ["Confirm Attribute Assignments"]; break;
          case 6: narrativeForPrev = `Choose your 4 Major skills.`; choicesForPrev = ["Confirm Major Skills"]; break;
          case 7: narrativeForPrev = `Select 6 Minor skills.`; choicesForPrev = ["Confirm Minor Skills"]; break;
          case 8: narrativeForPrev = `What age group best describes your character?`; choicesForPrev = [...AGE_GROUPS]; break;
          case 9: narrativeForPrev = `What is their hair color?`; break;
          case 10: narrativeForPrev = `Describe any distinguishing features.`; break;
          case 11: narrativeForPrev = `How does your character generally present themselves?`; choicesForPrev = [...PRESENTATION_TYPES]; break;
      }

      setCcStep(prevStep);
      dispatch({ 
        type: 'SET_CHARACTER_CREATION_NARRATIVE', 
        payload: { 
          narrative: narrativeForPrev, 
          choices: choicesForPrev, 
          ccStep: prevStep 
        } 
      });
      return;
  }

  // Handle Resets or Mismatches
  if (characterCreationState.race && ccStep === 0 && input !== "Restart Character Creation" && input !== "CC_BACK") {
     if (input !== "Restart Character Creation") {
        console.warn("Character creation state mismatch. Resetting CC state.");
        setCharacterCreationState(getInitialCharacterCreationData());
     }
  }


  let nextStep = ccStep;
  let creationDataUpdate = { ...characterCreationState };
  let narrativeForNextStep = "";
  let choicesForNextStep: string[] | readonly string[] | undefined = undefined;
  let isFinalStep = false;

  try {
    switch (ccStep) {
      case 0: // Race Selection
        if (RACES.includes(input as Race)) {
          creationDataUpdate.race = input as Race;
          narrativeForNextStep = `A ${input}, excellent. Now, choose your archetype.`;
          choicesForNextStep = ARCHETYPE_DESCRIPTIONS.map(a => a.name);
          nextStep = 1;
        } else {
          narrativeForNextStep = "That's not a recognized race. Please choose from the provided options.";
          choicesForNextStep = RACE_DESCRIPTIONS.map(r => r.name);
        }
        break;
      case 1: // Archetype Selection
        if (ARCHETYPES.includes(input as Archetype)) {
          creationDataUpdate.archetype = input as Archetype;
          narrativeForNextStep = `A ${creationDataUpdate.race} ${input}. From which province of Tamriel do you hail? This will be your starting point.`;
          choicesForNextStep = PROVINCE_DESCRIPTIONS.map(p => p.name);
          nextStep = 2;
        } else {
          narrativeForNextStep = "That's not a recognized archetype. Please choose from the provided options.";
          choicesForNextStep = ARCHETYPE_DESCRIPTIONS.map(a => a.name);
        }
        break;
      case 2: // Province Selection
        if (PROVINCES.includes(input as Province)) {
          creationDataUpdate.startingProvince = input as Province;
          narrativeForNextStep = `From ${input}, I see. And what is your name, traveler?`;
          nextStep = 3;
        } else {
          narrativeForNextStep = "That's not a recognized province. Please choose from the provided options.";
          choicesForNextStep = PROVINCE_DESCRIPTIONS.map(p => p.name);
        }
        break;
      case 3: // Name Input
        creationDataUpdate.name = input.trim();
        if (creationDataUpdate.name.length > 0 && creationDataUpdate.name.length < 30) {
          narrativeForNextStep = `"${creationDataUpdate.name}", a fine name. Now, tell me a brief backstory for your character (1-2 sentences). This backstory WILL shape your initial adventure.`;
          nextStep = 4;
        } else {
          narrativeForNextStep = "Please enter a valid name (1-29 characters).";
        }
        break;
      case 4: // Backstory Input
        creationDataUpdate.backstory = input.trim();
        if (creationDataUpdate.backstory.length > 0 && creationDataUpdate.backstory.length < 300) {
          narrativeForNextStep = `An intriguing past. Now, assign your ${INITIAL_ATTRIBUTE_POINTS} bonus attribute points. Your base attributes have been set by your race and archetype.`;
          choicesForNextStep = ["Confirm Attribute Assignments"];
          nextStep = 5;
        } else {
          narrativeForNextStep = "Please provide a backstory (1-299 characters).";
        }
        break;
      case 5: // Attribute Assignment Confirmation
        if (input === "Confirm Attribute Assignments" && data?.attributePointsToAssign !== undefined) {
          creationDataUpdate.attributePointsToAssign = data.attributePointsToAssign;
          if (data.attributePointsToAssign === 0) {
            narrativeForNextStep = `Attributes set. Now, choose your 4 Major skills. These will start at Apprentice level.`;
            choicesForNextStep = ["Confirm Major Skills"]; 
            nextStep = 6;
          } else {
            narrativeForNextStep = `You still have ${data.attributePointsToAssign} attribute points to assign. Please assign all points.`;
            choicesForNextStep = ["Confirm Attribute Assignments"];
          }
        } else {
          narrativeForNextStep = "Please use the interface to assign attribute points and then confirm.";
          choicesForNextStep = ["Confirm Attribute Assignments"];
        }
        break;
      case 6: // Major Skill Selection Confirmation
        if (input === "Confirm Major Skills" && data?.majorSkills) {
          if (data.majorSkills.length === 4) {
            creationDataUpdate.selectedMajorSkills = data.majorSkills;
            narrativeForNextStep = `Major skills chosen: ${data.majorSkills.join(', ')}. Now, select 6 Minor skills from the remaining options. These will start at Novice level.`;
            choicesForNextStep = ["Confirm Minor Skills"]; 
            nextStep = 7;
          } else {
            narrativeForNextStep = `Please select exactly 4 Major skills. You have selected ${data.majorSkills.length}.`;
            choicesForNextStep = ["Confirm Major Skills"];
          }
        } else {
          narrativeForNextStep = "An error occurred with Major Skill selection. Please try again or ensure skills are passed correctly.";
          choicesForNextStep = ["Confirm Major Skills"];
        }
        break;
      case 7: // Minor Skill Selection Confirmation
        if (input === "Confirm Minor Skills" && data?.minorSkills) {
          if (data.minorSkills.length === 6) {
            creationDataUpdate.selectedMinorSkills = data.minorSkills;
            narrativeForNextStep = `Minor skills chosen. What age group best describes your character?`;
            choicesForNextStep = [...AGE_GROUPS];
            nextStep = 8;
          } else {
            narrativeForNextStep = `Please select exactly 6 Minor skills. You have selected ${data.minorSkills.length}.`;
            choicesForNextStep = ["Confirm Minor Skills"];
          }
        } else {
          narrativeForNextStep = "An error occurred with Minor Skill selection. Please try again or ensure skills are passed correctly.";
          choicesForNextStep = ["Confirm Minor Skills"];
        }
        break;
      case 8: // Age Group Selection
        if (AGE_GROUPS.includes(input as AgeGroup)) {
          creationDataUpdate.age = input as AgeGroup;
          narrativeForNextStep = "What is their hair color?";
          choicesForNextStep = undefined;
          nextStep = 9;
        } else {
          narrativeForNextStep = "That's not a recognized age group. Please choose from the provided options.";
          choicesForNextStep = [...AGE_GROUPS];
        }
        break;
      case 9: // Hair Color Input
        creationDataUpdate.hairColor = input.trim();
        if (creationDataUpdate.hairColor.length > 0 && creationDataUpdate.hairColor.length < 50) {
          narrativeForNextStep = "Describe any distinguishing features (e.g., a prominent scar, unusual eye color, tattoos) OR a general adjective describing their vibe (e.g., 'brooding', 'jovial', 'mysterious'). Max 99 chars.";
          nextStep = 10;
        } else {
          narrativeForNextStep = "Please describe their hair color. Max 49 chars.";
        }
        break;
      case 10: // Distinguishing Features Input
        creationDataUpdate.distinguishingFeatures = input.trim();
        if (creationDataUpdate.distinguishingFeatures.length < 100) { 
          narrativeForNextStep = `Features noted. How does your character generally present themselves?`;
          choicesForNextStep = [...PRESENTATION_TYPES];
          nextStep = 11;
        } else {
          narrativeForNextStep = "Please keep distinguishing features brief (max 99 characters), or leave blank if none.";
        }
        break;
      case 11: // Presentation Selection
        if (PRESENTATION_TYPES.includes(input as Presentation)) {
          creationDataUpdate.presentation = input as Presentation;
          narrativeForNextStep = `Presentation noted. Review your character summary and confirm to begin your adventure!`;
          choicesForNextStep = ["Confirm Character & Begin Adventure!", "Restart Character Creation"];
          nextStep = 12;
        } else {
          narrativeForNextStep = "That's not a recognized presentation. Please choose from the options.";
          choicesForNextStep = [...PRESENTATION_TYPES];
        }
        break;
      case 12: // Final Confirmation
        if (input === "Confirm Character & Begin Adventure!") {
          if (creationDataUpdate.race && creationDataUpdate.archetype && creationDataUpdate.startingProvince && creationDataUpdate.selectedMajorSkills.length === 4 && creationDataUpdate.selectedMinorSkills.length === 6 && creationDataUpdate.presentation) {
            const finalAttributes: Attributes = {} as Attributes;
            ATTRIBUTE_NAMES.forEach(attr => {
              finalAttributes[attr] = BASE_ATTRIBUTE_VALUE +
                                      (RACE_ATTRIBUTE_BONUSES[creationDataUpdate.race!]?.[attr] || 0) +
                                      (ARCHETYPE_ATTRIBUTE_BONUSES[creationDataUpdate.archetype!]?.[attr] || 0) +
                                      (creationDataUpdate.assignedAttributes[attr] || 0);
            });
            
            const chosenSkills: CharacterSkill[] = [];
            creationDataUpdate.selectedMajorSkills.forEach(skillName => {
              chosenSkills.push({ skill: skillName, level: "Apprentice", value: SKILL_VALUE_MAP["Apprentice"].base, isMajor: true });
            });
            creationDataUpdate.selectedMinorSkills.forEach(skillName => {
              chosenSkills.push({ skill: skillName, level: "Novice", value: SKILL_VALUE_MAP["Novice"].base, isMajor: false });
            });
            
            const newCharacterBase: Omit<PlayerCharacter, 'currentHealth' | 'maxHealth' | 'currentMana' | 'maxMana' | 'currentFatigue' | 'maxFatigue' | 'hungerLevel' | 'exhaustionLevel' | 'comfortLevel' | 'maxComfort'| 'characterImageUrl'| 'characterImageGenerationFailed' | 'characterImageUrlIsGeneric' | 'level'> = {
                name: creationDataUpdate.name, race: creationDataUpdate.race!, archetype: creationDataUpdate.archetype!,
                startingProvince: creationDataUpdate.startingProvince!, attributes: finalAttributes, 
                skills: chosenSkills, 
                backstory: creationDataUpdate.backstory, 
                equippedItems: [{ id: 'default_clothes', name: "Basic Clothes", description: "Simple traveler's attire.", quantity: 1, insulationQuality: 'poor', comfortBonus: 0 }], 
                age: creationDataUpdate.age || undefined, 
                hairColor: creationDataUpdate.hairColor,
                distinguishingFeatures: creationDataUpdate.distinguishingFeatures,
                presentation: creationDataUpdate.presentation || undefined,
            };
            dispatch({ type: 'CREATE_CHARACTER', payload: newCharacterBase }); 
            isFinalStep = true;
          } else {
            dispatch({ type: 'ADD_ERROR_MESSAGE', payload: 'Critical error during character finalization. Restarting.' });
            narrativeForNextStep = "A problem occurred. Let's restart. What race are you?";
            choicesForNextStep = RACE_DESCRIPTIONS.map(r => r.name);
            nextStep = 0;
            creationDataUpdate = getInitialCharacterCreationData();
          }
        } else if (input === "Restart Character Creation") { 
          narrativeForNextStep = "Alright, let's start over. What race are you?";
          choicesForNextStep = RACE_DESCRIPTIONS.map(r => r.name);
          nextStep = 0;
          creationDataUpdate = getInitialCharacterCreationData();
        } else { 
          narrativeForNextStep = "Please confirm or restart.";
          choicesForNextStep = ["Confirm Character & Begin Adventure!", "Restart Character Creation"];
        }
        break;
      default:
        // This case should ideally not be reached if ccStep is managed correctly.
        dispatch({ type: 'ADD_ERROR_MESSAGE', payload: `Unknown character creation step: ${ccStep}. Resetting.` });
        narrativeForNextStep = "Something went wrong with character creation. Let's try again. What race are you?";
        choicesForNextStep = RACE_DESCRIPTIONS.map(r => r.name);
        nextStep = 0;
        creationDataUpdate = getInitialCharacterCreationData();
        break;
    }

    setCharacterCreationState(creationDataUpdate); 
    if (!isFinalStep) {
      setCcStep(nextStep);
      dispatch({ 
        type: 'SET_CHARACTER_CREATION_NARRATIVE', 
        payload: { 
          narrative: narrativeForNextStep, 
          choices: choicesForNextStep as string[] | undefined, 
          ccStep: nextStep 
        } 
      });
    }
  } catch (error) {
    console.error("Error in processCharacterCreationInput:", error);
    dispatch({ type: 'ADD_ERROR_MESSAGE', payload: `Error during character creation: ${(error as Error).message}. Restarting.` });
    setCcStep(0);
    setCharacterCreationState(getInitialCharacterCreationData());
    dispatch({ 
        type: 'SET_CHARACTER_CREATION_NARRATIVE', 
        payload: { 
            narrative: "An unexpected error occurred. Let's start over. What race are you?", 
            choices: RACE_DESCRIPTIONS.map(r => r.name),
            ccStep: 0 
        } 
    });
  }
};