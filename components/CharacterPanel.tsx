
import React from 'react';
import { PlayerCharacter, Item, AttributeName, ATTRIBUTE_NAMES, CharacterSkill, ActiveEffect, Skill, SkillLevel, SKILLS_LIST, SKILL_LEVELS, EnvironmentalCondition, ShelterQuality } from '../types.ts';
import { 
    RACE_DESCRIPTIONS, ARCHETYPE_DESCRIPTIONS, PROVINCE_DESCRIPTIONS, 
    ATTRIBUTE_DESCRIPTIONS, SKILL_DESCRIPTIONS, SKILL_VALUE_MAP,
    ENVIRONMENT_COMFORT_BASE, INSULATION_MODIFIERS, SHELTER_COMFORT_MODIFIERS,
    getHungerStatus, getExhaustionStatus, getComfortStatus 
} from '../constants.ts';
import LoadingSpinner from './LoadingSpinner.tsx'; 
import { getExpNeededForNextLevel } from '../hooks/gameReducerHelpers.ts'; 

interface CharacterPanelProps {
  character: PlayerCharacter | null;
  activeEffects: ActiveEffect[];
  activeTab: 'character' | 'stats';
  currentShelter?: ShelterQuality; 
  currentShelterName?: string | null;
  currentEnvironment?: EnvironmentalCondition; // This is OUTSIDE environment
  retryCharacterImageGeneration?: () => Promise<void>;
  isRetryingCharacterImage?: boolean;
  currentTemperature?: number; // Specific temp
  permanentSkillUpsSinceLastLevelUp: number;
}

const PanelSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="mb-4 p-3 bg-gray-800 rounded-lg shadow">
    <h3 className="text-lg font-semibold text-amber-400 border-b border-gray-700 pb-1 mb-2">{title}</h3>
    {children}
  </div>
);

const getEffectiveAttributeValue = (baseValue: number, attributeName: AttributeName, activeEffects: ActiveEffect[]): number => {
  return activeEffects
    .filter(effect => effect.target === 'attribute' && effect.targetName === attributeName)
    .reduce((sum, effect) => sum + effect.modifier, baseValue);
};

const getEffectiveSkillValue = (baseValue: number, skillName: Skill, activeEffects: ActiveEffect[]): {value: number, level: SkillLevel} => {
  const modifiedValue = activeEffects
    .filter(effect => effect.target === 'skill' && effect.targetName === skillName)
    .reduce((sum, effect) => sum + effect.modifier, baseValue);
  
  let newLevel: SkillLevel = SKILL_LEVELS[0]; // Default to "Untrained"
    const skillLevelsOrdered = SKILL_LEVELS.slice().reverse(); // Master -> Untrained
    for (const level of skillLevelsOrdered) {
        if (modifiedValue >= SKILL_VALUE_MAP[level].base) {
            newLevel = level;
            break;
        }
    }
  return {value: Math.max(0, Math.min(100, modifiedValue)), level: newLevel}; 
};


const generateComfortTooltip = (
    character: PlayerCharacter, 
    outsideEnvironment?: EnvironmentalCondition, 
    shelterQuality?: ShelterQuality,
    currentTemperature?: number
): string => {
    if (!outsideEnvironment) return `Overall Comfort: ${character.comfortLevel.toFixed(0)}/${character.maxComfort}`;

    const baseEnvComfort = ENVIRONMENT_COMFORT_BASE[outsideEnvironment] || 0;
    let gearDirectBonus = 0;
    let gearInsulationEffect = 0;
    
    character.equippedItems.forEach(item => {
        gearDirectBonus += item.comfortBonus || 0;
        if (item.insulationQuality && INSULATION_MODIFIERS[outsideEnvironment]?.[item.insulationQuality]) {
            gearInsulationEffect += INSULATION_MODIFIERS[outsideEnvironment][item.insulationQuality];
        }
    });

    const shelterEffect = (shelterQuality && SHELTER_COMFORT_MODIFIERS[shelterQuality]?.[outsideEnvironment]) 
        ? SHELTER_COMFORT_MODIFIERS[shelterQuality][outsideEnvironment] 
        : 0;

    const tooltipParts = [
        `Ambient: ${currentTemperature !== undefined ? currentTemperature + '°F' : outsideEnvironment} (Base Comfort: ${baseEnvComfort})`,
        `Gear Direct Bonus: ${gearDirectBonus > 0 ? '+' : ''}${gearDirectBonus}`,
        `Gear Insulation (vs ${outsideEnvironment}): ${gearInsulationEffect > 0 ? '+' : ''}${gearInsulationEffect}`,
        `Shelter (${shelterQuality || ShelterQuality.NONE}): ${shelterEffect > 0 ? '+' : ''}${shelterEffect}`,
        `---`,
        `Total: ${character.comfortLevel.toFixed(0)}/${character.maxComfort}`
    ];
    return tooltipParts.join('\n');
};


export const CharacterPanel: React.FC<CharacterPanelProps> = ({ 
    character, 
    activeEffects, 
    activeTab, 
    currentShelter, 
    currentShelterName,
    currentEnvironment, // This is OUTSIDE environment
    retryCharacterImageGeneration,
    isRetryingCharacterImage,
    currentTemperature,
    permanentSkillUpsSinceLastLevelUp
}) => {
  if (!character) {
    return (
      <div className="p-4 text-gray-400 italic">Character details will appear here once created.</div>
    );
  }

  const raceInfo = RACE_DESCRIPTIONS.find(r => r.name === character.race);
  const archetypeInfo = ARCHETYPE_DESCRIPTIONS.find(a => a.name === character.archetype);
  const provinceInfo = PROVINCE_DESCRIPTIONS.find(p => p.name === character.startingProvince);

  const comfortTooltipText = generateComfortTooltip(character, currentEnvironment, currentShelter, currentTemperature);
  
  const showRetryButton = character.characterImageGenerationFailed || character.characterImageUrlIsGeneric;

  const sortedSkills = [...character.skills].sort((a, b) => {
    if (a.isMajor && !b.isMajor) return -1;
    if (!a.isMajor && b.isMajor) return 1;
    if (!a.isMajor && !b.isMajor) {
        if (a.level === "Untrained" && b.level !== "Untrained") return 1;
        if (a.level !== "Untrained" && b.level === "Untrained") return -1;
    }
    return a.skill.localeCompare(b.skill);
  });

  const renderActiveEffects = () => (
    <PanelSection title="Active Effects">
        {activeEffects.length > 0 ? (
          <ul className="list-none pl-0 space-y-1 text-xs">
            {activeEffects.map(effect => (
              <li key={effect.id} className="text-purple-300 flex justify-between">
                <span>{effect.sourceName}</span>
                <span className="text-gray-400">
                    {effect.targetName} {effect.modifier > 0 ? '+' : ''}{effect.modifier}
                    {effect.remainingHours !== undefined && <span className="text-gray-500 ml-1">({effect.remainingHours.toFixed(1)}h)</span>}
                </span>
              </li>
            ))}
          </ul>
        ) : (
            <p className="text-xs italic text-gray-500">No active temporary effects.</p>
        )}
    </PanelSection>
  );


  return (
    <div className="h-full text-gray-300 text-sm">
      {activeTab === 'character' && (
        <>
          <div className="mb-3 flex flex-col items-center">
            {isRetryingCharacterImage && !character.characterImageUrl && (
                <div className="w-full max-w-[150px] h-[200px] flex items-center justify-center bg-gray-700 rounded-md border-2 border-amber-600 shadow-lg">
                    <LoadingSpinner />
                </div>
            )}
            {character.characterImageUrl && (
              <img 
                src={character.characterImageUrl} 
                alt={`Portrait of ${character.name}`} 
                className="w-full max-w-[150px] h-auto min-h-[100px] object-cover rounded-md border-2 border-amber-600 shadow-lg" 
              />
            )}
            {showRetryButton && retryCharacterImageGeneration && (
              <button
                onClick={retryCharacterImageGeneration}
                disabled={isRetryingCharacterImage}
                className="mt-2 px-3 py-1 bg-sky-600 hover:bg-sky-700 text-white text-xs rounded-md shadow transition-colors duration-150 disabled:opacity-50 disabled:cursor-wait flex items-center justify-center"
                aria-label={isRetryingCharacterImage ? "Retrying image generation..." : "Retry character image generation"}
              >
                 {isRetryingCharacterImage ? 'Retrying...' : 'Retry Vision'}
              </button>
            )}
          </div>
          <PanelSection title="Identity">
            <p><strong className="text-gray-400">Name:</strong> {character.name}</p>
            <p title={raceInfo?.description}><strong className="text-gray-400">Race:</strong> {character.race} <em className="text-xs text-gray-500">({raceInfo?.traits})</em></p>
            <p title={archetypeInfo?.description}><strong className="text-gray-400">Archetype:</strong> {character.archetype} <em className="text-xs text-gray-500">({archetypeInfo?.focus})</em></p>
            <p title={provinceInfo?.description}><strong className="text-gray-400">Origin:</strong> {character.startingProvince} <em className="text-xs text-gray-500">({provinceInfo?.climate})</em></p>
          </PanelSection>

          {renderActiveEffects()}

          <PanelSection title="Appearance & Backstory">
            {character.age && <p><strong className="text-gray-400">Age Group:</strong> {character.age}</p>}
            {character.hairColor && <p><strong className="text-gray-400">Hair:</strong> {character.hairColor}</p>}
            {character.distinguishingFeatures && <p><strong className="text-gray-400">Features:</strong> {character.distinguishingFeatures}</p>}
            {character.presentation && <p><strong className="text-gray-400">Presentation:</strong> {character.presentation}</p>}
            {character.age || character.hairColor || character.distinguishingFeatures || character.presentation ? <hr className="my-2 border-gray-700"/> : null}
            <p className="text-xs leading-relaxed">{character.backstory}</p>
          </PanelSection>

          <PanelSection title="Equipped Items">
            {character.equippedItems.length > 0 ? (
              <ul className="list-disc list-inside pl-1 space-y-0.5">
                {character.equippedItems.map(item => (
                  <li key={item.id} title={item.description} className="text-xs">
                    <span className="font-semibold text-gray-100">{item.name}</span>
                    {item.damage !== undefined && <span className="text-red-400 text-xxs ml-1 font-mono">(DMG: {item.damage})</span>}
                    {item.armorRating !== undefined && <span className="text-sky-400 text-xxs ml-1 font-mono">(AR: {item.armorRating})</span>}
                    {item.insulationQuality && <span className="text-sky-400 text-xxs ml-1">({item.insulationQuality} insul.)</span>}
                    {item.comfortBonus && <span className="text-green-400 text-xxs ml-1">({item.comfortBonus > 0 ? '+' : ''}{item.comfortBonus} cmfrt)</span>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs italic">Nothing equipped.</p>
            )}
          </PanelSection>
        </>
      )}

      {activeTab === 'stats' && (
        <>
          {/* Character Level and Level-Up Progress */}
          <div className="mb-4 p-3 bg-gradient-to-r from-gray-800 to-gray-850 rounded-lg shadow border border-amber-500/10">
            <div className="flex justify-between items-end mb-1">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-amber-500/80 font-bold">Character Status</span>
                <h3 className="text-xl font-serif text-amber-300 font-bold leading-none">Level {character.level || 1}</h3>
              </div>
              <div className="text-right">
                <span className="text-[9px] text-gray-400 font-mono">Major Skill Ups</span>
                <p className="text-xs font-bold text-amber-400/90 font-mono">{permanentSkillUpsSinceLastLevelUp} / 5</p>
              </div>
            </div>
            
            <div className="w-full h-2 bg-gray-950 rounded-full overflow-hidden relative">
              <div 
                className={`h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-full transition-all duration-500 ${permanentSkillUpsSinceLastLevelUp >= 5 ? 'animate-pulse' : ''}`}
                style={{ width: `${Math.min(100, Math.floor((permanentSkillUpsSinceLastLevelUp / 5) * 100))}%` }}
              />
            </div>
            
            {permanentSkillUpsSinceLastLevelUp >= 5 && (
              <p className="text-[10px] text-amber-300 font-medium mt-1.5 animate-pulse flex items-center gap-1">
                <span>✦</span> Ready to level up! Sleep in a bed to distribute attributes.
              </p>
            )}
          </div>

          <PanelSection title="Vitals & Status">
             <div className="space-y-1 text-xs">
                <p title={`Health: ${character.currentHealth.toFixed(0)}/${character.maxHealth.toFixed(0)}`}>
                    <strong className="text-gray-400 w-20 inline-block">Health:</strong> 
                    <span className={`font-bold ${character.currentHealth < character.maxHealth * 0.3 ? 'text-red-400' : 'text-green-400'}`}>
                        {character.currentHealth.toFixed(0)} / {character.maxHealth.toFixed(0)}
                    </span>
                </p>
                <p title={`Mana: ${character.currentMana.toFixed(0)}/${character.maxMana.toFixed(0)}`}>
                    <strong className="text-gray-400 w-20 inline-block">Mana:</strong> 
                    <span className="font-bold text-blue-400">{character.currentMana.toFixed(0)} / {character.maxMana.toFixed(0)}</span>
                </p>
                <p title={`Fatigue: ${character.currentFatigue.toFixed(0)}/${character.maxFatigue.toFixed(0)}`}>
                    <strong className="text-gray-400 w-20 inline-block">Fatigue:</strong> 
                    <span className={`font-bold ${character.currentFatigue < character.maxFatigue * 0.3 ? 'text-yellow-400' : 'text-teal-400'}`}>
                        {character.currentFatigue.toFixed(0)} / {character.maxFatigue.toFixed(0)}
                    </span>
                </p>
                <p title={`Hunger Level: ${character.hungerLevel.toFixed(0)}/100. Status: ${getHungerStatus(character.hungerLevel)}`}>
                    <strong className="text-gray-400 w-20 inline-block">Hunger:</strong> 
                    <span className={`font-semibold ${character.hungerLevel > 70 ? 'text-orange-400' : 'text-lime-400'}`}>{getHungerStatus(character.hungerLevel)}</span>
                </p>
                <p title={`Exhaustion Level: ${character.exhaustionLevel.toFixed(0)}/100. Status: ${getExhaustionStatus(character.exhaustionLevel)}`}>
                    <strong className="text-gray-400 w-20 inline-block">Exhaustion:</strong> 
                     <span className={`font-semibold ${character.exhaustionLevel > 70 ? 'text-purple-400' : 'text-cyan-400'}`}>{getExhaustionStatus(character.exhaustionLevel)}</span>
                </p>
                <p title={comfortTooltipText}>
                    <strong className="text-gray-400 w-20 inline-block">Comfort:</strong> 
                    <span className={`font-semibold ${character.comfortLevel < 30 ? 'text-red-400' : (character.comfortLevel < 50 ? 'text-yellow-400' : 'text-green-400')}`}>
                        {character.comfortLevel.toFixed(0)} <span className="text-xs">({getComfortStatus(character.comfortLevel, currentTemperature !== undefined ? currentTemperature : 70)})</span>
                    </span>
                </p>
                 <p>
                    <strong className="text-gray-400 w-20 inline-block">Temp:</strong>
                    <span className="font-semibold text-gray-300">
                        {currentTemperature !== undefined ? `${currentTemperature}°F` : 'Unknown'} 
                        <span className="text-gray-500 text-xs ml-1">({currentEnvironment || 'Unknown'})</span>
                    </span>
                </p>
                <p title={currentShelterName || 'No Specific Shelter Name'}>
                    <strong className="text-gray-400 w-20 inline-block">Shelter:</strong>
                    <span className="font-semibold text-gray-300">
                        {currentShelter || ShelterQuality.NONE}
                    </span>
                </p>
            </div>
          </PanelSection>
          
           {renderActiveEffects()}

          <PanelSection title="Attributes">
            <ul className="list-none pl-0 space-y-0.5 text-xs">
              {ATTRIBUTE_NAMES.map(attrName => {
                const baseValue = character.attributes[attrName];
                const effectiveValue = getEffectiveAttributeValue(baseValue, attrName, activeEffects);
                return (
                  <li key={attrName} title={ATTRIBUTE_DESCRIPTIONS[attrName]}>
                    <strong className="text-gray-400 w-24 inline-block">{attrName}:</strong> 
                    <span className={`font-bold ${effectiveValue > baseValue ? 'text-green-400' : (effectiveValue < baseValue ? 'text-red-400' : 'text-amber-300')}`}>
                      {effectiveValue}
                    </span>
                    {effectiveValue !== baseValue && <span className="text-xs text-gray-500 ml-1">({baseValue})</span>}
                  </li>
                );
              })}
            </ul>
          </PanelSection>

          <PanelSection title="Skills">
             <div className="grid grid-cols-1 gap-y-1.5 text-xs">
                {sortedSkills.map(skillData => {
                    const baseValue = skillData.value;
                    const isMajor = skillData.isMajor;

                    const {value: effectiveValue, level: effectiveLevel} = getEffectiveSkillValue(baseValue, skillData.skill, activeEffects);
                    const isUntrained = effectiveLevel === "Untrained";
                    
                    let skillNameColor = isMajor ? 'text-amber-200/95 font-semibold' : 'text-sky-200/90 font-medium';
                    let skillValueColor = isMajor ? 'text-amber-300 font-mono font-bold' : 'text-sky-300 font-mono font-bold';
                    let skillLevelColor = isMajor ? 'text-amber-400/80' : 'text-sky-400/80';

                    if (isUntrained) {
                        skillNameColor = 'text-gray-500';
                        skillValueColor = 'text-gray-400 font-mono';
                        skillLevelColor = 'text-gray-500';
                    }

                    if (effectiveValue > baseValue && !isUntrained) skillValueColor = 'text-green-400 font-mono';
                    else if (effectiveValue < baseValue && !isUntrained) skillValueColor = 'text-red-400 font-mono';
                    
                    const needed = getExpNeededForNextLevel(baseValue);
                    const currentProgress = skillData.progressToNextLevel || 0;
                    const progressPercent = baseValue >= 100 ? 100 : Math.min(100, Math.floor((currentProgress / needed) * 100));

                    return (
                        <div 
                            key={skillData.skill} 
                            className="bg-gray-850/40 hover:bg-gray-800/30 p-2 rounded border border-gray-800/50 hover:border-gray-750 transition-all flex flex-col gap-1 select-none"
                            title={`${SKILL_DESCRIPTIONS[skillData.skill]}\nXP: ${currentProgress}/${needed}`}
                        >
                            <div className="flex justify-between items-center min-w-0">
                                <span className="truncate flex-1 min-w-0">
                                    <strong className={`${skillNameColor}`}>{skillData.skill}</strong> 
                                    <span className={`text-[10px] ml-1.5 ${skillLevelColor}`}>({effectiveLevel})</span>
                                </span>
                                <span className={`font-bold ml-2 ${skillValueColor}`}>
                                    {effectiveValue}
                                </span>
                            </div>
                            <div className="w-full h-1 bg-gray-900 rounded-full overflow-hidden">
                                <div 
                                    className={`h-full rounded-full transition-all duration-300 ${isMajor ? 'bg-amber-500/80 shadow-sm shadow-amber-500/20' : 'bg-sky-500/85 shadow-sm shadow-sky-500/20'}`}
                                    style={{ width: `${progressPercent}%` }}
                                />
                            </div>
                        </div>
                    );
                })}
             </div>
          </PanelSection>
        </>
      )}
    </div>
  );
};
