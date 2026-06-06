

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { CharacterCreationData, AttributeName, ATTRIBUTE_NAMES, Attributes, Skill, SKILLS_LIST, AgeGroup, Presentation, PRESENTATION_TYPES } from '../types.ts';
import { RACE_DESCRIPTIONS, ARCHETYPE_DESCRIPTIONS, PROVINCE_DESCRIPTIONS, BASE_ATTRIBUTE_VALUE, RACE_ATTRIBUTE_BONUSES, ARCHETYPE_ATTRIBUTE_BONUSES, AGE_GROUPS } from '../constants.ts';

interface CharacterCreationProps {
  narrativeLog: NarrativeEntry[]; // Imported type implicitly via usage
  currentChoices: string[];
  onSubmit: (input: string, data?: { majorSkills?: Skill[], minorSkills?: Skill[], attributePointsToAssign?: number }) => void;
  ccStep: number;
  characterCreationState: CharacterCreationData;
  onAttributeChange: (attribute: AttributeName, change: number) => void;
  onSetCharacterCreationState: React.Dispatch<React.SetStateAction<CharacterCreationData>>; 
}
// Import NarrativeEntry type locally just for prop definition if needed, or rely on ambient
import { NarrativeEntry, ProvinceDescription } from '../types.ts';

const CharacterCreation: React.FC<CharacterCreationProps> = ({
  narrativeLog,
  currentChoices,
  onSubmit,
  ccStep,
  characterCreationState,
  onAttributeChange,
  onSetCharacterCreationState
}) => {
  const [nameInput, setNameInput] = useState('');
  const [backstoryInput, setBackstoryInput] = useState('');
  const [hairColorInput, setHairColorInput] = useState('');
  const [featuresInput, setFeaturesInput] = useState('');

  const [localSelectedMajorSkills, setLocalSelectedMajorSkills] = useState<Skill[]>([]);
  const [localSelectedMinorSkills, setLocalSelectedMinorSkills] = useState<Skill[]>([]);

  const nameInputRef = useRef<HTMLInputElement>(null);
  const backstoryInputRef = useRef<HTMLTextAreaElement>(null);
  const hairColorInputRef = useRef<HTMLInputElement>(null);
  const featuresInputRef = useRef<HTMLInputElement>(null);

  const lastDmPromptForCC = narrativeLog.filter(e => e.type === 'dm').slice().reverse().find(e => {
    return e.promptNumber !== undefined;
  });

  useEffect(() => {
    if (ccStep === 3) nameInputRef.current?.focus();
    if (ccStep === 4) backstoryInputRef.current?.focus();
    if (ccStep === 6) setLocalSelectedMajorSkills(characterCreationState.selectedMajorSkills || []);
    if (ccStep === 7) setLocalSelectedMinorSkills(characterCreationState.selectedMinorSkills || []);
    if (ccStep === 9) hairColorInputRef.current?.focus();
    if (ccStep === 10) featuresInputRef.current?.focus();
  }, [ccStep, characterCreationState.selectedMajorSkills, characterCreationState.selectedMinorSkills]);

  // Reset inputs if stepping back
  useEffect(() => {
      if (ccStep < 3) setNameInput(characterCreationState.name || '');
      if (ccStep < 4) setBackstoryInput(characterCreationState.backstory || '');
  }, [ccStep, characterCreationState]);

  const handleTextSubmit = (inputType: 'name' | 'backstory' | 'hairColor' | 'distinguishingFeatures') => {
    let valueToSubmit = '';
    switch (inputType) {
        case 'name': 
            valueToSubmit = nameInput.trim();
            if (valueToSubmit) onSetCharacterCreationState(prev => ({...prev, name: valueToSubmit}));
            break;
        case 'backstory': 
            valueToSubmit = backstoryInput.trim();
            if (valueToSubmit) onSetCharacterCreationState(prev => ({...prev, backstory: valueToSubmit}));
            break;
        case 'hairColor':
            valueToSubmit = hairColorInput.trim();
            if (valueToSubmit) onSetCharacterCreationState(prev => ({...prev, hairColor: valueToSubmit}));
            break;
        case 'distinguishingFeatures':
            valueToSubmit = featuresInput.trim(); 
            onSetCharacterCreationState(prev => ({...prev, distinguishingFeatures: valueToSubmit}));
            break;
    }
    if (valueToSubmit || inputType === 'distinguishingFeatures') {
        onSubmit(valueToSubmit);
    }
  };

  const handleChoiceSubmit = (choice: string) => {
    if (choice === "Confirm Attribute Assignments") {
        onSubmit(choice, { attributePointsToAssign: characterCreationState.attributePointsToAssign });
    } else if (choice === "Confirm Major Skills") {
        onSubmit(choice, { majorSkills: localSelectedMajorSkills });
    } else if (choice === "Confirm Minor Skills") {
        onSubmit(choice, { minorSkills: localSelectedMinorSkills });
    } else {
        if (ccStep === 8 && AGE_GROUPS.includes(choice as AgeGroup)) {
             onSetCharacterCreationState(prev => ({...prev, age: choice as AgeGroup}));
        }
        if (ccStep === 11 && PRESENTATION_TYPES.includes(choice as Presentation)) {
             onSetCharacterCreationState(prev => ({...prev, presentation: choice as Presentation}));
        }
        onSubmit(choice);
    }
  };
  
  const handleBack = () => {
      // Sending specific command that useInputHandler logic should interpret as "Back"
      // However, simplified: we can just call onSubmit with a special "Back" command if supported,
      // OR simpler: we rely on a new prop or modify useInputHandler to handle "Back".
      // Let's assume we modify useInputHandler/characterCreationService to handle "Back".
      // But for now, let's use a convention "CC_BACK" and handle it in the service.
      onSubmit("CC_BACK");
  };

  const calculatedAttributes = useMemo(() => {
    const finalAttributes: Attributes = {} as Attributes;
    if (characterCreationState.race && characterCreationState.archetype) {
      ATTRIBUTE_NAMES.forEach(attr => {
        finalAttributes[attr] = BASE_ATTRIBUTE_VALUE +
                                (RACE_ATTRIBUTE_BONUSES[characterCreationState.race!]?.[attr] || 0) +
                                (ARCHETYPE_ATTRIBUTE_BONUSES[characterCreationState.archetype!]?.[attr] || 0) +
                                (characterCreationState.assignedAttributes[attr] || 0);
      });
    } else { 
        ATTRIBUTE_NAMES.forEach(attr => {
            finalAttributes[attr] = BASE_ATTRIBUTE_VALUE + (characterCreationState.assignedAttributes[attr] || 0);
        });
    }
    return finalAttributes;
  }, [characterCreationState.race, characterCreationState.archetype, characterCreationState.assignedAttributes]);

  const handleMajorSkillToggle = (skill: Skill) => {
    setLocalSelectedMajorSkills(prev => {
      if (prev.includes(skill)) {
        return prev.filter(s => s !== skill);
      } else if (prev.length < 4) {
        return [...prev, skill];
      }
      return prev; // Max 4 reached
    });
  };

  const handleMinorSkillToggle = (skill: Skill) => {
    setLocalSelectedMinorSkills(prev => {
      if (prev.includes(skill)) {
        return prev.filter(s => s !== skill);
      } else if (prev.length < 6) {
        return [...prev, skill];
      }
      return prev; // Max 6 reached
    });
  };

  const renderBackButton = () => {
      if (ccStep > 0) {
          return (
              <button 
                onClick={handleBack}
                className="mt-4 px-4 py-2 bg-gray-600 hover:bg-gray-500 text-gray-200 rounded text-sm transition-colors"
              >
                  &larr; Back
              </button>
          );
      }
      return null;
  };

  const renderStepSpecificUI = () => {
    let content = null;
    if (ccStep === 0 || ccStep === 1 || ccStep === 2 || ccStep === 8 || ccStep === 11) { 
      if (currentChoices && currentChoices.length > 0) {
        let descriptions: any[] = [];
        if (ccStep === 0) descriptions = RACE_DESCRIPTIONS;
        else if (ccStep === 1) descriptions = ARCHETYPE_DESCRIPTIONS;
        else if (ccStep === 2) descriptions = PROVINCE_DESCRIPTIONS;

        content = (
          <div className="my-2">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 gap-2">
              {currentChoices.map(choice => {
                const descLookup = descriptions.find(d => d.name === choice);
                let titleText = choice;
                 if (descLookup && ccStep !== 8 && ccStep !== 11) { 
                    if (ccStep === 0) titleText = `${(descLookup as any).traits} - ${descLookup.description}`;
                    else if (ccStep === 1) titleText = `${(descLookup as any).focus} - ${descLookup.description}`;
                    else if (ccStep === 2) titleText = `${(descLookup as ProvinceDescription).climate} - ${descLookup.description}`;
                  }
                return (
                  <button
                    key={choice}
                    onClick={() => handleChoiceSubmit(choice)}
                    title={titleText}
                    className="p-3 bg-gray-700 hover:bg-amber-600 rounded text-sm text-white transition-colors duration-150 text-left min-h-[70px] flex flex-col justify-center"
                    aria-label={`Select ${choice}`}
                  >
                    <span className="font-bold text-lg">{choice}</span>
                    {descLookup && ccStep !== 8 && ccStep !== 11 && <p className="text-xs text-gray-300 mt-1 line-clamp-2">{descLookup.description}</p>}
                  </button>
                );
              })}
            </div>
          </div>
        );
      }
    }
    else if (ccStep === 3) { // Name
      content = (
        <form onSubmit={(e) => {e.preventDefault(); handleTextSubmit('name');}} className="mt-2 space-y-2">
          <input
            ref={nameInputRef} type="text" value={nameInput} onChange={(e) => setNameInput(e.target.value)}
            className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            placeholder="Enter your character's name..." aria-label="Character Name" autoFocus
          />
          <button type="submit" className="w-full p-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold transition-colors duration-150">
            Set Name
          </button>
        </form>
      );
    }
    else if (ccStep === 4) { // Backstory
      content = (
        <form onSubmit={(e) => {e.preventDefault(); handleTextSubmit('backstory');}} className="mt-2 space-y-2">
          <textarea
            ref={backstoryInputRef} value={backstoryInput} onChange={(e) => setBackstoryInput(e.target.value)}
            className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent h-24 resize-none"
            placeholder="Enter a brief backstory (1-2 sentences)..." aria-label="Character Backstory" autoFocus
          />
          <button type="submit" className="w-full p-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold transition-colors duration-150">
            Set Backstory
          </button>
        </form>
      );
    }
    else if (ccStep === 5) { // Attributes
        content = (
            <div className="my-2 space-y-3">
                <p className="text-sm text-gray-400">Assign your <span className="font-bold text-amber-300">{characterCreationState.attributePointsToAssign}</span> remaining attribute points.</p>
                {ATTRIBUTE_NAMES.map(attr => (
                    <div key={attr} className="flex items-center justify-between p-2 bg-gray-700 rounded">
                        <span className="font-semibold text-gray-200">{attr}: {calculatedAttributes[attr]}</span>
                        <div className="space-x-2">
                            <button 
                                onClick={() => onAttributeChange(attr, -1)} 
                                disabled={(characterCreationState.assignedAttributes[attr] || 0) <= 0}
                                className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded disabled:opacity-50"
                                aria-label={`Decrease ${attr}`}>-</button>
                            <button 
                                onClick={() => onAttributeChange(attr, 1)} 
                                disabled={characterCreationState.attributePointsToAssign <= 0}
                                className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded disabled:opacity-50"
                                aria-label={`Increase ${attr}`}>+</button>
                        </div>
                    </div>
                ))}
                <button 
                    onClick={() => handleChoiceSubmit("Confirm Attribute Assignments")}
                    disabled={characterCreationState.attributePointsToAssign > 0}
                    className="mt-3 w-full p-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold transition-colors duration-150 disabled:bg-gray-500"
                >
                    Confirm Attributes
                </button>
            </div>
        );
    }
    else if (ccStep === 6) { // Major Skill Selection
        content = (
            <div className="my-2 space-y-3">
                <p className="text-sm text-gray-400">Select 4 Major Skills ({localSelectedMajorSkills.length}/4 selected). These start at Apprentice level.</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-60 overflow-y-auto custom-scrollbar p-1">
                    {SKILLS_LIST.map(skill => (
                        <button
                            key={skill}
                            onClick={() => handleMajorSkillToggle(skill)}
                            className={`p-2 text-sm rounded transition-colors duration-150 ${
                                localSelectedMajorSkills.includes(skill) 
                                ? 'bg-amber-600 text-white' 
                                : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                            } ${localSelectedMajorSkills.length >= 4 && !localSelectedMajorSkills.includes(skill) ? 'opacity-50 cursor-not-allowed' : ''}`}
                            disabled={localSelectedMajorSkills.length >= 4 && !localSelectedMajorSkills.includes(skill)}
                            aria-pressed={localSelectedMajorSkills.includes(skill)}
                        >
                            {skill}
                        </button>
                    ))}
                </div>
                <button
                    onClick={() => handleChoiceSubmit("Confirm Major Skills")}
                    disabled={localSelectedMajorSkills.length !== 4}
                    className="mt-3 w-full p-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold transition-colors duration-150 disabled:bg-gray-500"
                >
                    Confirm Major Skills
                </button>
            </div>
        );
    }
    else if (ccStep === 7) { // Minor Skill Selection
        const availableMinorSkills = SKILLS_LIST.filter(skill => !characterCreationState.selectedMajorSkills.includes(skill));
        content = (
            <div className="my-2 space-y-3">
                <p className="text-sm text-gray-400">Select 6 Minor Skills ({localSelectedMinorSkills.length}/6 selected). These start at Novice level.</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-60 overflow-y-auto custom-scrollbar p-1">
                    {availableMinorSkills.map(skill => (
                        <button
                            key={skill}
                            onClick={() => handleMinorSkillToggle(skill)}
                            className={`p-2 text-sm rounded transition-colors duration-150 ${
                                localSelectedMinorSkills.includes(skill)
                                ? 'bg-sky-600 text-white'
                                : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                            } ${localSelectedMinorSkills.length >= 6 && !localSelectedMinorSkills.includes(skill) ? 'opacity-50 cursor-not-allowed' : ''}`}
                            disabled={localSelectedMinorSkills.length >= 6 && !localSelectedMinorSkills.includes(skill)}
                            aria-pressed={localSelectedMinorSkills.includes(skill)}
                        >
                            {skill}
                        </button>
                    ))}
                </div>
                <button
                    onClick={() => handleChoiceSubmit("Confirm Minor Skills")}
                    disabled={localSelectedMinorSkills.length !== 6}
                    className="mt-3 w-full p-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold transition-colors duration-150 disabled:bg-gray-500"
                >
                    Confirm Minor Skills
                </button>
            </div>
        );
    }
    else if (ccStep === 9) { // Hair Color
        content = (
            <form onSubmit={(e) => {e.preventDefault(); handleTextSubmit('hairColor');}} className="mt-2 space-y-2">
              <input
                ref={hairColorInputRef} type="text" value={hairColorInput} onChange={(e) => setHairColorInput(e.target.value)}
                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                placeholder="Enter hair color (e.g., Fiery Red, Raven Black)..." aria-label="Character Hair Color" autoFocus
              />
              <button type="submit" className="w-full p-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold transition-colors duration-150">
                Set Hair Color
              </button>
            </form>
          );
    }
    else if (ccStep === 10) { // Distinguishing Features
        content = (
            <form onSubmit={(e) => {e.preventDefault(); handleTextSubmit('distinguishingFeatures');}} className="mt-2 space-y-2">
              <input
                ref={featuresInputRef} type="text" value={featuresInput} onChange={(e) => setFeaturesInput(e.target.value)}
                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                placeholder="Features or vibe (e.g., Scar, Brooding)? (Optional)" aria-label="Distinguishing Features or Vibe" autoFocus
              />
              <button type="submit" className="w-full p-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold transition-colors duration-150">
                Set Features/Vibe
              </button>
            </form>
          );
    }
    else if (ccStep === 12) { 
        content = (
            <div className="my-2 space-y-4 p-3 bg-gray-700 rounded">
                 <p className="text-sm text-gray-400 mt-3">This is a summary of your character based on your choices:</p>
                 <div className="text-xs text-gray-300 bg-gray-800 p-2 rounded space-y-1">
                    <p>Name: {characterCreationState.name}</p>
                    <p>Race: {characterCreationState.race}, Archetype: {characterCreationState.archetype}, Origin: {characterCreationState.startingProvince}</p>
                    <p>Backstory: {characterCreationState.backstory}</p>
                    <p>Age Group: {characterCreationState.age || "Not specified"}</p>
                    <p>Hair Color: {characterCreationState.hairColor || "Not specified"}</p>
                    <p>Features/Vibe: {characterCreationState.distinguishingFeatures || "None specified"}</p>
                    <p>Presentation: {characterCreationState.presentation || "Not specified"}</p>
                    <p>Attributes: {ATTRIBUTE_NAMES.map(attr => `${attr}: ${calculatedAttributes[attr]}`).join(', ')}</p>
                    <div>
                        <p className="font-semibold text-amber-300">Major Skills (Apprentice):</p>
                        <ul className="list-disc list-inside pl-4">
                            {characterCreationState.selectedMajorSkills.map(s => <li key={`summary-major-${s}`}>{s}</li>)}
                        </ul>
                    </div>
                     <div>
                        <p className="font-semibold text-sky-300">Minor Skills (Novice):</p>
                        <ul className="list-disc list-inside pl-4">
                            {characterCreationState.selectedMinorSkills.map(s => <li key={`summary-minor-${s}`}>{s}</li>)}
                        </ul>
                    </div>
                 </div>
                <div className="mt-4 flex space-x-2">
                    <button 
                        onClick={() => handleChoiceSubmit("Confirm Character & Begin Adventure!")}
                        className="flex-1 p-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors duration-150"
                    >
                        Confirm & Begin Adventure!
                    </button>
                    <button 
                        onClick={() => handleChoiceSubmit("Restart Character Creation")}
                        className="flex-1 p-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors duration-150"
                    >
                        Restart Creation
                    </button>
                </div>
            </div>
        );
    }

    return (
        <>
            {content}
            {renderBackButton()}
        </>
    );
  };

  return (
    <div className="p-4 bg-gray-800 border-t border-gray-700">
      {lastDmPromptForCC && (
        <div className="mb-3 text-gray-200 leading-relaxed prompt-text-shadow">
          <span className="font-bold text-amber-400">Prompt {lastDmPromptForCC.promptNumber}:</span>
          <div className="prose prose-sm prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: typeof lastDmPromptForCC.text === 'string' ? lastDmPromptForCC.text.replace(/\n/g, '<br/>') : (lastDmPromptForCC.text as string[]).join('<br/>') }} />
        </div>
      )}
      {renderStepSpecificUI()}
    </div>
  );
};

export default CharacterCreation;