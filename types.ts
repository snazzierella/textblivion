

import { AGE_GROUPS } from './constants.ts';

export enum GamePhase {
  LOADING_API_KEY = 'LOADING_API_KEY',
  API_KEY_MISSING = 'API_KEY_MISSING',
  CHARACTER_CREATION = 'CHARACTER_CREATION',
  ADVENTURE_INTRO = 'ADVENTURE_INTRO',
  AWAITING_INPUT = 'AWAITING_INPUT',
  PROCESSING_INPUT = 'PROCESSING_INPUT',
  AWAITING_BEDTIME_INTENT_CONFIRMATION = 'AWAITING_BEDTIME_INTENT_CONFIRMATION', 
  LEVEL_UP_ATTRIBUTE_ALLOCATION = 'LEVEL_UP_ATTRIBUTE_ALLOCATION',
  AWAITING_BEDTIME_SUMMARY_GENERATION = 'AWAITING_BEDTIME_SUMMARY_GENERATION', 
  AWAITING_BEDTIME_SUMMARY_CONFIRMATION = 'AWAITING_BEDTIME_SUMMARY_CONFIRMATION',
  AWAITING_POST_LEVELUP_REST = 'AWAITING_POST_LEVELUP_REST', // New phase for after level up during bedtime
  PLAYER_CORRECTION = 'PLAYER_CORRECTION',
  AWAITING_NEW_GAME_CONFIRMATION = 'AWAITING_NEW_GAME_CONFIRMATION',
  PLAYER_FAINTED = 'PLAYER_FAINTED', 
  PLAYER_FAINTED_RECOVERY = 'PLAYER_FAINTED_RECOVERY',
  TARGET_MINIGAME_ACTIVE = 'TARGET_MINIGAME_ACTIVE',
  AWAITING_AUTOSAVE_LOAD_CONFIRMATION = 'AWAITING_AUTOSAVE_LOAD_CONFIRMATION',
}

export enum TimeOfDay {
  MORNING = 'Morning', // ~6am - 12pm
  AFTERNOON = 'Afternoon', // ~12pm - 6pm
  EVENING = 'Evening',   // ~6pm - 9pm
  NIGHT = 'Night',     // ~9pm - 12am
  MIDNIGHT = 'Midnight',  // ~12am - 3am
  DAWN = 'Dawn',       // ~3am - 6am
}

export enum Season {
  SPRING = "Spring",
  SUMMER = "Summer",
  AUTUMN = "Autumn",
  WINTER = "Winter"
}

export enum SubSeason {
  EARLY = "Early",
  MID = "Mid",
  LATE = "Late"
}

export interface ItemEffect {
  target: 'attribute' | 'skill';
  targetName: AttributeName | Skill;
  modifier: number;
}

export interface Item {
  id: string;
  name: string;
  description: string;
  quantity: number;
  effects?: ItemEffect[]; 
  isPotion?: boolean;
  potionDurationHours?: number;
  isFood?: boolean;        
  hungerReduction?: number; 
  healthRecovery?: number;   
  manaRecovery?: number;     
  fatigueRecovery?: number;  
  comfortBonus?: number; 
  insulationQuality?: 'poor' | 'average' | 'good' | 'excellent';
  
  // Container/Consumable Mechanics
  isRefillable?: boolean;
  maxCharges?: number;
  currentCharges?: number;
  chargeLabel?: string; // e.g., "sips", "doses"

  damage?: number;
  armorRating?: number;
  isWeapon?: boolean;
  isArmor?: boolean;
  isEquippable?: boolean;
  isConsumable?: boolean;
}

export const ATTRIBUTE_NAMES = ["Strength", "Willpower", "Intelligence", "Agility", "Endurance", "Personality", "Luck"] as const;
export type AttributeName = typeof ATTRIBUTE_NAMES[number];

export type Attributes = Record<AttributeName, number>;

export const SKILL_LEVELS = ["Untrained", "Novice", "Apprentice", "Journeyman", "Expert", "Master"] as const;
export type SkillLevel = typeof SKILL_LEVELS[number];

export interface CharacterSkill {
  skill: Skill;
  level: SkillLevel;
  value: number; 
  isMajor: boolean;
  progressToNextLevel?: number; 
}

export type AgeGroup = typeof AGE_GROUPS[number];

export const PRESENTATION_TYPES = ["Feminine", "Masculine", "Androgynous"] as const;
export type Presentation = typeof PRESENTATION_TYPES[number];

export interface PlayerCharacter {
  name: string;
  race: Race;
  archetype: Archetype;
  startingProvince: Province;
  attributes: Attributes; 
  skills: CharacterSkill[];
  level: number;
  backstory: string;
  equippedItems: Item[];
  currentHealth: number;
  maxHealth: number;
  currentMana: number;
  maxMana: number;
  currentFatigue: number;
  maxFatigue: number;
  hungerLevel: number;      
  exhaustionLevel: number;
  comfortLevel: number;    
  maxComfort: number;
  characterImageUrl?: string | null; 
  characterImageGenerationFailed?: boolean;
  characterImageUrlIsGeneric?: boolean;
  age?: AgeGroup; 
  hairColor?: string; 
  distinguishingFeatures?: string; 
  presentation?: Presentation;
}

export interface Inventory {
  carried: Item[];
  stashed: Item[];
  septims: number;
}

export type QuestType = 'Main' | 'Side' | 'Job' | 'Rumor' | 'Lead';

export interface Quest {
  id: string;
  type?: QuestType;
  title: string;
  description: string;
  isActive: boolean;
  isCompleted: boolean;
  steps?: string[];
}

export interface GameEvent {
  day: number;
  description:string;
}

export interface ActiveEffect {
  id: string;
  sourceName: string; 
  target: 'attribute' | 'skill';
  targetName: AttributeName | Skill;
  modifier: number; 
  durationHours?: number; 
  remainingHours?: number; 
  isEnchantment?: boolean; 
  sourceItemId?: string; 
}

export enum EnvironmentalCondition {
  MILD = "Mild", 
  COLD = "Cold", 
  VERY_COLD = "Very Cold", 
  HOT = "Hot", 
  VERY_HOT = "Very Hot" 
}

export enum ShelterQuality {
  NONE = "None",
  POOR = "Poor",       
  AVERAGE = "Average", 
  GOOD = "Good",       
  EXCELLENT = "Excellent"
}

export enum WeatherCondition {
  CLEAR = "Clear",          
  CLOUDY = "Cloudy",        
  OVERCAST = "Overcast",    
  RAIN = "Rain",            
  STORM = "Storm",          
  SNOW = "Snow",            
  BLIZZARD = "Blizzard",      
  FOG = "Fog",              
}

export interface TargetMinigameTarget {
  id: string;
  label: string;
  isCorrect: boolean;
}

export interface TargetMinigameConfig {
  durationSeconds: number;
  targets: TargetMinigameTarget[];
  promptText: string;
  successFeedback: string;
  failureFeedback: string;
  successNarrativeHint: string;
  failureNarrativeHint: string;
}

export interface TTSVoiceOption {
  name: string;
  voiceURI: string;
  lang: string;
  default?: boolean;
}

export interface GameState {
  phase: GamePhase;
  apiKeyAvailable: boolean | null;
  promptNumber: number;
  currentDayNumber: number;
  currentDayOfWeek: string;
  currentTimeOfDay: TimeOfDay;
  currentHourInDay: number; 
  currentSeason: Season;
  currentSubSeason: SubSeason;
  character: PlayerCharacter | null;
  currentProvince: Province | null;
  currentCity: string | null;
  inventory: Inventory;
  prospectiveQuests: Quest[];
  majorEvents: GameEvent[];
  eventsSinceLastRest: string[];
  narrativeLog: NarrativeEntry[];
  currentChoices: string[];
  currentObjective: string;
  permanentSkillUpsSinceLastLevelUp: number; 
  attributePointsToAllocateForLevelUp: number; 
  levelUpIsFromBedtime: boolean; // New: Tracks if current level up is part of bedtime
  activeEffects: ActiveEffect[]; 
  isDebugMode: boolean; 
  currentEnvironmentalCondition: EnvironmentalCondition; 
  currentTemperature: number; // Specific temp in Fahrenheit
  currentShelter: ShelterQuality;
  currentShelterName: string | null; 
  currentWeather: WeatherCondition;
  currentSceneImageUrl?: string | null;
  currentTargetMinigameConfig?: TargetMinigameConfig | null;
  ttsEnabled: boolean;
  lastDmNarrativeForTTS: string | null;
  lastCallFailed?: boolean;
  lastPlayerInput?: string | null;
  autosaveStateToLoad?: GameState | null;
  fallbackManualSaveStateToLoad?: GameState | null;
  autosaveTimestamp?: number | null;
  ttsNarratorVoiceURI: string | null;
  ttsPlayerVoiceURI: string | null;
  availableVoices: readonly TTSVoiceOption[];
}

export interface NarrativeEntry {
  id: string;
  type: 'dm' | 'player' | 'system' | 'error' | 'status' | 'choices';
  text: string | string[];
  promptNumber?: number;
  timestamp?: string;
}

export interface GeminiRequestPayload {
  dmInstructions: string;
  loreSummary?: string;
  gameState: Omit<GameState, 'narrativeLog' | 'apiKeyAvailable' | 'phase' | 'isDebugMode' | 'currentSceneImageUrl' | 'currentTargetMinigameConfig' | 'ttsEnabled' | 'lastDmNarrativeForTTS' | 'ttsNarratorVoiceURI' | 'ttsPlayerVoiceURI' | 'availableVoices' | 'levelUpIsFromBedtime'>; 
  playerInput: string;
  isCorrection?: boolean; 
  isFaintRecoveryPrompt?: boolean; 
}

export interface FaintConsequencesPayload {
  narrative: string; 
  itemsLostNames?: string[];
  septimsLost?: number;
  newObjective?: string;
  newLocation?: { province: Province, city: string };
}

export type AteFoodDetail = { itemName: string, quantityConsumed?: number, chargesConsumed?: number };

export interface ChoiceItemObject {
  choice?: string;
  text?: string;
  choiceText?: string;
  description?: string;
  [key: string]: any; 
}

export interface GeminiResponse {
  narrative: string | string[];
  choices?: (string | ChoiceItemObject)[];
  currentChoices?: (string | ChoiceItemObject)[];
  timePassedHours?: number; 
  newTimeOfDay?: TimeOfDay;
  itemsGained?: Item[];
  itemsLostByName?: string[];
  itemsStashed?: Item[]; 
  itemsRemovedFromStashByName?: string[];
  itemUpdates?: Partial<Item>[]; // For updating existing items (e.g., charges, name change)
  septimsChange?: number;
  newQuests?: Quest[];
  updatedQuests?: Partial<Quest>[];
  newObjective?: string;
  currentProvinceName?: Province;
  currentCityName?: string;
  error?: string;
  systemMessage?: string;
  skillIncreases?: { skill: Skill; amount: number; isPermanent: boolean; multiplier?: number }[];
  newActiveEffects?: Omit<ActiveEffect, 'id' | 'remainingHours'>[];
  equippedItemNames?: string[]; 
  unequippedItemNames?: string[];
  healthChange?: number;    
  manaChange?: number;      
  fatigueChange?: number;   
  hungerChange?: number;    
  exhaustionChange?: number;
  ateFoodDetails?: AteFoodDetail | AteFoodDetail[]; 
  playerFainted?: boolean;  
  faintConsequences?: FaintConsequencesPayload; 
  newEnvironmentalCondition?: EnvironmentalCondition; // Explicit override
  newShelterQuality?: ShelterQuality;
  newShelterName?: string; 
  newWeatherCondition?: WeatherCondition;
  newSeason?: Season; 
  newSubSeason?: SubSeason; 
  triggerTargetMinigame?: TargetMinigameConfig;          
}

export const RACES = ["Nord", "Imperial", "Dunmer", "Altmer", "Khajiit", "Argonian", "Bosmer", "Orc", "Redguard", "Breton"] as const;
export type Race = typeof RACES[number];

export const ARCHETYPES = ["Warrior", "Mage", "Thief", "Archer", "Assassin", "Spellsword", "Nightblade"] as const;
export type Archetype = typeof ARCHETYPES[number];

export const PROVINCES = ["Skyrim", "Cyrodiil", "Morrowind", "High Rock", "Hammerfell", "Summerset Isles", "Valenwood", "Elsweyr", "Black Marsh"] as const;
export type Province = typeof PROVINCES[number];

export const SKILLS_LIST = [
    "One-Handed", "Two-Handed", "Archery", "Block", "Heavy Armor", "Light Armor", 
    "Sneak", "Lockpicking", "Pickpocket", "Speech", "Alchemy", "Illusion", 
    "Conjuration", "Destruction", "Restoration", "Alteration", "Enchanting", "Smithing",
] as const;
export type Skill = typeof SKILLS_LIST[number];

export interface CharacterCreationData {
  race: Race | '';
  archetype: Archetype | '';
  startingProvince: Province | '';
  name: string;
  backstory: string;
  assignedAttributes: Partial<Attributes>; 
  attributePointsToAssign: number;
  selectedMajorSkills: Skill[]; 
  selectedMinorSkills: Skill[];
  age?: AgeGroup | ''; 
  hairColor?: string; 
  distinguishingFeatures?: string; 
  presentation?: Presentation | '';
}

export interface RaceDescription {
  name: Race;
  description: string;
  traits: string; 
}

export interface ArchetypeDescription {
  name: Archetype;
  description: string;
  focus: string; 
}

export interface ProvinceDescription {
  name: Province;
  description: string;
  climate: string;
}

export interface Coordinate {
  x: string; 
  y: string; 
}

export interface LocationCoordinateEntry extends Coordinate {
  name: string;
  province: Province;
}

export interface SaveSlotMetadata {
  id: string; // e.g., "slot_1" to "slot_5"
  characterName: string;
  characterRace: string;
  characterArchetype: string;
  characterLevel: number;
  currentDayNumber: number;
  currentTimeOfDay: string;
  currentProvince: string | null;
  currentCity: string | null;
  timestamp: string; // Formatted date string
  unixTimestamp?: number;
}