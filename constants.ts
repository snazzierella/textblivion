
import { TimeOfDay, Race, Archetype, Province, RaceDescription, ArchetypeDescription, ProvinceDescription, Skill, Coordinate, LocationCoordinateEntry, AttributeName, Attributes, CharacterSkill, SkillLevel, SKILL_LEVELS, EnvironmentalCondition, ShelterQuality, Item, WeatherCondition, Season, SubSeason, TTSVoiceOption, PRESENTATION_TYPES as PRESENTATION_TYPES_ALIAS } from './types.ts';

export const DAYS_OF_WEEK: string[] = ["Morndas", "Tirdas", "Middas", "Turdas", "Fredas", "Loredas", "Sundas"];
export const INITIAL_SEPTIMS = 0;
export const INITIAL_PROMPT_NUMBER = 1;
export const INITIAL_DAY_NUMBER = 1;
export const INITIAL_DAY_OF_WEEK = DAYS_OF_WEEK[0];
export const INITIAL_TIME_OF_DAY = TimeOfDay.MORNING;
export const INITIAL_HOUR_IN_DAY = 7.0; // 7 AM, corresponds to Morning (now float)
export const INITIAL_ATTRIBUTE_POINTS = 13; 
export const LEVEL_UP_ATTRIBUTE_POINTS_TO_ALLOCATE = 7;

export const LOCAL_STORAGE_SAVE_KEY = 'textblivion_savegame_v1.30'; 

export const BASE_ATTRIBUTE_VALUE = 30; 

// Survival and Health/Mana/Fatigue Constants
export const BASE_MAX_HEALTH = 50;
export const BASE_MAX_MANA = 50;
export const BASE_MAX_FATIGUE = 100;
export const HEALTH_PER_ENDURANCE_POINT = 2; 
export const MANA_PER_INTELLIGENCE_POINT = 2;  
export const FATIGUE_PER_ENDURANCE_POINT = 2; 

export const INITIAL_HUNGER_LEVEL = 0;       
export const INITIAL_EXHAUSTION_LEVEL = 0;   
export const MAX_HUNGER_LEVEL = 100;         
export const MAX_EXHAUSTION_LEVEL = 100;     

export const HUNGER_INCREASE_PER_HOUR = 20 / 9;  
export const EXHAUSTION_INCREASE_PER_HOUR = 100 / 72; 

export const HUNGER_STATUS_THRESHOLDS = {
  SATIATED: 0,
  PECKISH: 10, 
  HUNGRY: 40,
  VERY_HUNGRY: 60,
  STARVING: 80,
};
export const EXHAUSTION_STATUS_THRESHOLDS = {
  RESTED: 0,
  AWAKE: 20,
  TIRED: 40,
  VERY_TIRED: 60,
  EXHAUSTED: 80,
};

export const HEALTH_DRAIN_RATE_STARVING = 5;  
export const FATIGUE_DRAIN_RATE_EXHAUSTED = 10; 

// Full Rest Recovery
export const REST_HEALTH_RECOVERY_PERCENT = 1.0; 
export const REST_MANA_RECOVERY_PERCENT = 1.0;   
export const REST_FATIGUE_RECOVERY_PERCENT = 1.0; 
export const REST_HUNGER_INCREASE_PER_HOUR_OF_REST = 1.25; 

// Nap Mechanics
export const NAP_DURATION_HOURS = 3.0;
export const NAP_EXHAUSTION_REDUCTION_FACTOR = 0.5; 
export const NAP_HEALTH_RECOVERY_FRACTION = 0.25;   
export const NAP_MANA_RECOVERY_FRACTION = 0.25;     
export const NAP_FATIGUE_RECOVERY_FRACTION = 0.50;  

export const HEALTH_AFTER_FAINT_PERCENT = 0.10; 

// Seasons
export const SEASONS_ORDER = [Season.SPRING, Season.SUMMER, Season.AUTUMN, Season.WINTER];
export const SUB_SEASONS_ORDER = [SubSeason.EARLY, SubSeason.MID, SubSeason.LATE];
export const DAYS_PER_SUB_SEASON = 30;
export const DAYS_PER_SEASON = DAYS_PER_SUB_SEASON * SUB_SEASONS_ORDER.length; // 90

// Temperature Calculation Constants (Fahrenheit)
export const BASE_GLOBAL_TEMP_F = 60; // Base mild temperature
export const SEASON_TEMP_OFFSETS_F: Record<Season, number> = {
  [Season.SPRING]: 0,
  [Season.SUMMER]: 20,
  [Season.AUTUMN]: -5,
  [Season.WINTER]: -25
};
export const SUB_SEASON_TEMP_OFFSETS_F: Record<SubSeason, number> = {
  [SubSeason.EARLY]: -5,
  [SubSeason.MID]: 0,
  [SubSeason.LATE]: 5
};
// Override for autumn/winter progression (Early Autumn warmer than Late Autumn)
export const SUB_SEASON_AUTUMN_WINTER_FACTOR = -1; 

export const TIME_OF_DAY_TEMP_OFFSETS_F: Record<TimeOfDay, number> = {
  [TimeOfDay.DAWN]: -10,
  [TimeOfDay.MORNING]: -5,
  [TimeOfDay.AFTERNOON]: 10, 
  [TimeOfDay.EVENING]: 0,
  [TimeOfDay.NIGHT]: -8,
  [TimeOfDay.MIDNIGHT]: -12,
};
export const WEATHER_TEMP_OFFSETS_F: Record<WeatherCondition, number> = {
  [WeatherCondition.CLEAR]: 0,    
  [WeatherCondition.CLOUDY]: -2,
  [WeatherCondition.OVERCAST]: -5,
  [WeatherCondition.RAIN]: -8,
  [WeatherCondition.STORM]: -10,
  [WeatherCondition.SNOW]: -15,
  [WeatherCondition.BLIZZARD]: -30,
  [WeatherCondition.FOG]: -5,      
};
export const LATITUDE_TEMP_RANGE_F = 30; // +/- variation based on province latitude

// Condition Thresholds (Fahrenheit)
export const ENV_COND_THRESHOLDS_F = {
  VERY_COLD: 25, 
  COLD: 45,       
  MILD: 75,      
  HOT: 85,       
  VERY_HOT: 200 
};

export const ENVIRONMENTAL_CONDITION_TEMP_DISPLAY: Record<EnvironmentalCondition, string> = {
  [EnvironmentalCondition.VERY_COLD]: "< 25°F",    
  [EnvironmentalCondition.COLD]: "25°F - 45°F",    
  [EnvironmentalCondition.MILD]: "46°F - 75°F",     
  [EnvironmentalCondition.HOT]: "76°F - 85°F",       
  [EnvironmentalCondition.VERY_HOT]: "> 85°F",     
};

// Comfort and Shelter Constants
export const BASE_MAX_COMFORT = 100;
export const INITIAL_COMFORT_LEVEL = 75; 
export const COMFORT_PENALTY_THRESHOLD = 35; // Increased threshold
export const COMFORT_FATIGUE_DRAIN_RATE_PER_HOUR = 3;   

export const INITIAL_SHELTER_QUALITY = ShelterQuality.NONE;
export const INITIAL_WEATHER_CONDITION = WeatherCondition.CLEAR; 
export const INITIAL_TEMPERATURE = 65; 

export const PROVINCE_LORE_ENVIRONMENT_MAP: Record<Province, Record<'day' | 'night', EnvironmentalCondition>> = {
  "Skyrim": { day: EnvironmentalCondition.COLD, night: EnvironmentalCondition.VERY_COLD },
  "Cyrodiil": { day: EnvironmentalCondition.MILD, night: EnvironmentalCondition.COLD },
  "Morrowind": { day: EnvironmentalCondition.HOT, night: EnvironmentalCondition.MILD }, 
  "High Rock": { day: EnvironmentalCondition.MILD, night: EnvironmentalCondition.COLD },
  "Hammerfell": { day: EnvironmentalCondition.VERY_HOT, night: EnvironmentalCondition.HOT },
  "Summerset Isles": { day: EnvironmentalCondition.MILD, night: EnvironmentalCondition.MILD },
  "Valenwood": { day: EnvironmentalCondition.HOT, night: EnvironmentalCondition.MILD }, 
  "Elsweyr": { day: EnvironmentalCondition.VERY_HOT, night: EnvironmentalCondition.HOT }, 
  "Black Marsh": { day: EnvironmentalCondition.HOT, night: EnvironmentalCondition.MILD } 
};

export const ENVIRONMENT_COMFORT_BASE: Record<EnvironmentalCondition, number> = {
  [EnvironmentalCondition.MILD]: 80,
  [EnvironmentalCondition.COLD]: 30, // Was 40. Lowered to make cold harsher.
  [EnvironmentalCondition.VERY_COLD]: 10, // Was 15.
  [EnvironmentalCondition.HOT]: 40, 
  [EnvironmentalCondition.VERY_HOT]: 15,
};

// Adjusted Insulation Modifiers to be more impactful
export const INSULATION_MODIFIERS: Record<EnvironmentalCondition, Record<NonNullable<Item['insulationQuality']>, number>> = {
  [EnvironmentalCondition.MILD]: { poor: 0, average: 0, good: -5, excellent: -10 },
  [EnvironmentalCondition.COLD]: { poor: 5, average: 15, good: 30, excellent: 40 }, // Poor insulation (basic clothes) +5 on base 30 = 35 comfort (Barely comfortable)
  [EnvironmentalCondition.VERY_COLD]: { poor: 5, average: 15, good: 35, excellent: 60 },
  [EnvironmentalCondition.HOT]: { poor: 5, average: -10, good: -20, excellent: -40 }, 
  [EnvironmentalCondition.VERY_HOT]: { poor: 10, average: -15, good: -30, excellent: -50 },
};

export const SHELTER_COMFORT_MODIFIERS: Record<ShelterQuality, Record<EnvironmentalCondition, number>> = {
  [ShelterQuality.NONE]: { 
    [EnvironmentalCondition.MILD]: 0, 
    [EnvironmentalCondition.COLD]: 0, 
    [EnvironmentalCondition.VERY_COLD]: 0, 
    [EnvironmentalCondition.HOT]: 0, 
    [EnvironmentalCondition.VERY_HOT]: 0 
  },
  [ShelterQuality.POOR]: { 
    [EnvironmentalCondition.MILD]: 5, 
    [EnvironmentalCondition.COLD]: 10, 
    [EnvironmentalCondition.VERY_COLD]: 15, 
    [EnvironmentalCondition.HOT]: 10, 
    [EnvironmentalCondition.VERY_HOT]: 15 
  },
  [ShelterQuality.AVERAGE]: { 
    [EnvironmentalCondition.MILD]: 10, 
    [EnvironmentalCondition.COLD]: 25, 
    [EnvironmentalCondition.VERY_COLD]: 30, 
    [EnvironmentalCondition.HOT]: 20, 
    [EnvironmentalCondition.VERY_HOT]: 30 
  },
  [ShelterQuality.GOOD]: { 
    [EnvironmentalCondition.MILD]: 15, 
    [EnvironmentalCondition.COLD]: 40, 
    [EnvironmentalCondition.VERY_COLD]: 50, 
    [EnvironmentalCondition.HOT]: 35, 
    [EnvironmentalCondition.VERY_HOT]: 45 
  },
  [ShelterQuality.EXCELLENT]: { 
    [EnvironmentalCondition.MILD]: 20, 
    [EnvironmentalCondition.COLD]: 55, 
    [EnvironmentalCondition.VERY_COLD]: 70, 
    [EnvironmentalCondition.HOT]: 50, 
    [EnvironmentalCondition.VERY_HOT]: 60 
  },
};

export const AGE_GROUPS = ["Child", "Teen", "Young Adult", "Adult", "Elder"] as const;

export const GENERIC_RACE_PORTRAITS: Record<Race, string> = {
  "Nord": "/warrior_fallback.png",
  "Imperial": "/warrior_fallback.png",
  "Redguard": "/warrior_fallback.png",
  "Orc": "/warrior_fallback.png",
  "Altmer": "/mage_fallback.png",
  "Breton": "/mage_fallback.png",
  "Dunmer": "/mage_fallback.png",
  "Khajiit": "/thief_fallback.png",
  "Bosmer": "/thief_fallback.png",
  "Argonian": "/argonian_fallback.png",
};

export const RACE_DESCRIPTIONS: RaceDescription[] = [
  { name: "Nord", description: "Hailing from Skyrim, Nords are resilient and strong warriors, accustomed to cold and hardship.", traits: "Resistant to frost. Bonus to Strength & Endurance." },
  { name: "Imperial", description: "Natives of Cyrodiil, Imperials are known for their discipline, education, and skill in diplomacy and trade.", traits: "Find more gold. Bonus to Personality & Willpower." },
  { name: "Dunmer", description: "Dark Elves from Morrowind, known for their cunning, independent spirit, and affinity for destruction magic.", traits: "Resistant to fire. Bonus to Intelligence & Agility." },
  { name: "Altmer", description: "High Elves from Summerset Isle, highly intelligent and gifted in the arcane arts, often seen as aloof.", traits: "Increased magicka. Bonus to Intelligence & Willpower." },
  { name: "Khajiit", description: "Feline race from Elsweyr, known for their natural agility, stealth, and mercantile skills.", traits: "Night vision. Bonus to Agility & Luck." },
  { name: "Argonian", description: "Reptilian race from Black Marsh, highly adaptable and resistant, with a unique connection to the Hist.", traits: "Resistant to disease/poison, can breathe underwater. Bonus to Endurance & Agility." },
  { name: "Bosmer", description: "Wood Elves from Valenwood, masters of archery and stealth, living in harmony with their forest home.", traits: "Resistant to poison/disease. Bonus to Agility & other related attributes." },
  { name: "Orc", description: "Orsimer, known for their ferocity in battle, unmatched smithing skills, and strong sense of honor.", traits: "Berserker rage. Bonus to Strength & Endurance." },
  { name: "Redguard", description: "Hailing from Hammerfell, Redguards are naturally gifted and resilient warriors, with a strong maritime tradition.", traits: "Adrenaline rush. Bonus to Strength & Agility." },
  { name: "Breton", description: "Natives of High Rock, Bretons possess a natural resistance to magic and a talent for conjuration and other arcane arts.", traits: "Resistant to magic. Bonus to Willpower & Intelligence." },
];

export const RACE_ATTRIBUTE_BONUSES: Record<Race, Partial<Attributes>> = {
  "Nord": { "Strength": 10, "Endurance": 10, "Willpower": -5, "Personality": -5 },
  "Imperial": { "Personality": 10, "Willpower": 5, "Luck": 5, "Strength": -5, "Agility": -5 },
  "Dunmer": { "Intelligence": 10, "Agility": 5, "Personality": -5 },
  "Altmer": { "Intelligence": 15, "Willpower": 10, "Endurance": -10, "Strength": -5 },
  "Khajiit": { "Agility": 10, "Luck": 5, "Strength": -5 },
  "Argonian": { "Endurance": 10, "Agility": 5, "Willpower": -5 },
  "Bosmer": { "Agility": 15, "Luck": 5, "Endurance": -5, "Strength": -5 },
  "Orc": { "Strength": 15, "Endurance": 10, "Intelligence": -10, "Personality": -5 },
  "Redguard": { "Strength": 10, "Agility": 10, "Intelligence": -5, "Willpower": -5 },
  "Breton": { "Willpower": 10, "Intelligence": 10, "Strength": -5, "Agility": -5 },
};

export const ARCHETYPE_DESCRIPTIONS: ArchetypeDescription[] = [
  { name: "Warrior", description: "A master of armed combat, relying on strength, endurance, and martial skill with various weapons and armor.", focus: "Typically excels in skills like One-Handed, Block, Heavy Armor, and Smithing." },
  { name: "Mage", description: "A wielder of powerful spells, manipulating the arcane arts to destroy foes, protect allies, or alter reality.", focus: "Often proficient in Destruction, Alteration, Illusion, Restoration, and Conjuration." },
  { name: "Thief", description: "A specialist in stealth and subterfuge, excelling in infiltration, disabling traps, and acquiring valuables unseen.", focus: "Favors skills such as Sneak, Lockpicking, Pickpocket, and Light Armor." },
  { name: "Archer", description: "A marksman who prefers to engage enemies from a distance, relying on keen eyesight and steady hands.", focus: "Primarily uses Archery, often complemented by Light Armor and Sneak." },
  { name: "Assassin", description: "A deadly killer who strikes from the shadows, often using daggers, bows, or poisons to dispatch targets efficiently.", focus: "Relies on Sneak, One-Handed (daggers), Archery, and sometimes Illusion or Alchemy." },
  { name: "Spellsword", description: "A versatile combatant blending martial prowess with magical abilities, equally comfortable with a blade or a destructive spell.", focus: "Combines One-Handed combat with Destruction magic, often using Light or Heavy Armor." },
  { name: "Nightblade", description: "A cunning rogue who uses stealth and illusion magic to deceive, distract, and eliminate foes, often avoiding direct confrontation.", focus: "Employs Sneak, Illusion, One-Handed attacks, and Light Armor." },
];

export const ARCHETYPE_ATTRIBUTE_BONUSES: Record<Archetype, Partial<Attributes>> = {
  "Warrior": { "Strength": 10, "Endurance": 10 },
  "Mage": { "Intelligence": 10, "Willpower": 10 },
  "Thief": { "Agility": 10, "Luck": 5, "Personality": 5 },
  "Archer": { "Agility": 10, "Strength": 5, "Endurance": 5 },
  "Assassin": { "Agility": 10, "Intelligence": 5, "Luck": 5 },
  "Spellsword": { "Strength": 5, "Intelligence": 5, "Willpower": 5, "Endurance": 5 },
  "Nightblade": { "Agility": 10, "Intelligence": 5, "Personality": 5 },
};

export const ARCHETYPE_THEMATIC_MAJOR_SKILLS: Record<Archetype, Skill[]> = {
  "Warrior": ["One-Handed", "Block", "Heavy Armor", "Smithing"],
  "Mage": ["Destruction", "Alteration", "Illusion", "Restoration"],
  "Thief": ["Sneak", "Lockpicking", "Light Armor", "Speech"],
  "Archer": ["Archery", "Light Armor", "Sneak", "Alchemy"],
  "Assassin": ["Sneak", "One-Handed", "Archery", "Illusion"],
  "Spellsword": ["One-Handed", "Destruction", "Heavy Armor", "Restoration"],
  "Nightblade": ["Sneak", "Illusion", "One-Handed", "Light Armor"],
};

export const ARCHETYPE_THEMATIC_MINOR_SKILLS: Record<Archetype, Skill[]> = {
  "Warrior": ["Two-Handed", "Archery", "Speech", "Light Armor", "Restoration", "Alchemy"],
  "Mage": ["Conjuration", "Enchanting", "Speech", "Alchemy", "Light Armor", "One-Handed"],
  "Thief": ["Archery", "Pickpocket", "Alchemy", "One-Handed", "Illusion", "Speech"],
  "Archer": ["One-Handed", "Block", "Smithing", "Speech", "Lockpicking", "Pickpocket"],
  "Assassin": ["Light Armor", "Alchemy", "Lockpicking", "Speech", "Destruction", "Pickpocket"],
  "Spellsword": ["Block", "Alteration", "Enchanting", "Speech", "Smithing", "Archery"],
  "Nightblade": ["Destruction", "Alchemy", "Speech", "Lockpicking", "Archery", "Pickpocket"],
};

export const SKILL_VALUE_MAP: Record<SkillLevel, { base: number, cap: number }> = {
  "Untrained": { base: 0, cap: 14 },
  "Novice": { base: 15, cap: 29 },
  "Apprentice": { base: 30, cap: 49 },
  "Journeyman": { base: 50, cap: 74 },
  "Expert": { base: 75, cap: 99 },
  "Master": { base: 100, cap: 100 },
};

export const PROVINCE_DESCRIPTIONS: ProvinceDescription[] = [
  { name: "Skyrim", description: "The northern, snow-covered homeland of the Nords, marked by mountains and ancient ruins.", climate: "Cold, snowy mountains and tundra." },
  { name: "Cyrodiil", description: "The heartland of Tamriel and seat of the Empire, known for its cosmopolitan cities and varied landscapes.", climate: "Temperate, with forests, plains, and swamps." },
  { name: "Morrowind", description: "The exotic and often hostile land of the Dunmer, featuring volcanic terrain and unique flora.", climate: "Ashlands, volcanic regions, and fungal forests." },
  { name: "High Rock", description: "A land of feuding kingdoms and rugged mountains, home to Bretons and Orcs.", climate: "Temperate, with mountains, forests, and coastal areas." },
  { name: "Hammerfell", description: "The arid desert province of the Redguards, with harsh deserts and coastal cities.", climate: "Arid deserts, savannas, and rocky coasts." },
  { name: "Summerset Isles", description: "The beautiful, mystical islands of the Altmer, known for their advanced magic and architecture.", climate: "Warm, idyllic islands with lush vegetation." },
  { name: "Valenwood", description: "A dense, untamed forest province, home to the Bosmer and their unique Green Pact.", climate: "Subtropical, dense forests and jungles." },
  { name: "Elsweyr", description: "A diverse land of deserts and jungles, the homeland of the Khajiit.", climate: "Arid deserts in the north, tropical jungles in the south." },
  { name: "Black Marsh", description: "A vast, swampy region largely inhospitable to outsiders, home to the Argonians.", climate: "Tropical swamps, marshes, and dense jungles." },
];

export const ATTRIBUTE_DESCRIPTIONS: Record<AttributeName, string> = {
  "Strength": "Governs physical power. Affects melee damage and carrying capacity.",
  "Willpower": "Determines mental fortitude. Influences resistance to magic and maximum magicka.",
  "Intelligence": "Relates to reasoning and knowledge. Affects maximum magicka and effectiveness of some spells.",
  "Agility": "Controls balance and coordination. Impacts stealth, archery, and chance to dodge attacks.",
  "Endurance": "Represents physical resilience. Affects maximum health and stamina.",
  "Personality": "Influences social interactions and charisma. Affects how NPCs react to you and bartering prices.",
  "Luck": "Subtly affects many aspects of the game, from critical hits to finding rare items."
};

export const SKILL_DESCRIPTIONS: Record<Skill, string> = {
  "One-Handed": "Proficiency with one-handed weapons like swords, maces, and axes.",
  "Two-Handed": "Skill with large, two-handed weapons such as greatswords, battleaxes, and warhammers.",
  "Archery": "Effectiveness with bows and crossbows.",
  "Block": "Ability to reduce damage by blocking with a shield or weapon.",
  "Heavy Armor": "Proficiency in wearing heavy armor sets for maximum protection.",
  "Light Armor": "Skill in using light armor for protection while maintaining mobility.",
  "Sneak": "Ability to move unseen and unheard, and to perform sneak attacks.",
  "Lockpicking": "Art of opening locked doors and containers.",
  "Pickpocket": "Skill in stealing items directly from an unaware person's inventory.",
  "Speech": "Ability to persuade, intimidate, or barter effectively with NPCs.",
  "Alchemy": "Craft of brewing potions and poisons from various ingredients.",
  "Illusion": "School of magic focusing on spells that alter perception and the mind, like light, invisibility, and fear.",
  "Conjuration": "School of magic involving summoning creatures and weapons from Oblivion, and binding souls.",
  "Destruction": "School of magic focused on dealing damage through fire, frost, and shock spells.",
  "Restoration": "School of magic dedicated to healing, protection wards, and harming the undead.",
  "Alteration": "School of magic that involves manipulating the physical world, such as magical armor, waterbreathing, or telekinesis.",
  "Enchanting": "Art of imbuing weapons and armor with magical properties.",
  "Smithing": "Craft of forging and improving weapons and armor from raw materials."
};

export const PROVINCE_CENTER_COORDINATES: Record<Province, Coordinate> = {
  "Skyrim": { x: "52%", y: "19%" }, 
  "High Rock": { x: "15.0%", y: "27.0%" }, 
  "Hammerfell": { x: "23%", y: "52%" }, 
  "Summerset Isles": { x: "10.5%", y: "77.0%" }, 
  "Valenwood": { x: "37%", y: "75%" }, 
  "Elsweyr": { x: "55%", y: "77%" }, 
  "Black Marsh": { x: "80%", y: "74%" }, 
  "Morrowind": { x: "82%", y: "38%" },  
  "Cyrodiil": { x: "54.5%", y: "48.0%" }, 
};

export const LOCATION_COORDINATES_ON_MAP: Record<string, LocationCoordinateEntry> = {
  "Solitude": { name: "Solitude", province: "Skyrim", x: "42.0%", y: "6.5%" }, 
  "Dawnstar": { name: "Dawnstar", province: "Skyrim", x: "50.5%", y: "9.5%" }, 
  "Winterhold": { name: "Winterhold", province: "Skyrim", x: "57.0%", y: "9.0%" }, 
  "Windhelm": { name: "Windhelm", province: "Skyrim", x: "60.5%", y: "15.5%" }, 
  "Markarth": { name: "Markarth", province: "Skyrim", x: "40.0%", y: "18.0%" }, 
  "Whiterun": { name: "Whiterun", province: "Skyrim", x: "54.5%", y: "23.5%" }, 
  "Riften": { name: "Riften", province: "Skyrim", x: "64.5%", y: "31.5%" }, 
  "Falkreath": { name: "Falkreath", province: "Skyrim", x: "44.5%", y: "32.5%" }, 
  "Bleakrock Isle": { name: "Bleakrock Isle", province: "Skyrim", x: "62.5%", y: "11.5%" },
  "Daggerfall": { name: "Daggerfall", province: "High Rock", x: "4.0%", y: "36.5%" },
  "Northpoint": { name: "Northpoint", province: "High Rock", x: "18.5%", y: "8.5%" },
  "Farrun": { name: "Farrun", province: "High Rock", x: "30.0%", y: "7.0%" },
  "Jehanna": { name: "Jehanna", province: "High Rock", x: "34.0%", y: "10.5%" },
  "Evermor": { name: "Evermor", province: "High Rock", x: "28.0%", y: "22.5%" },
  "Camlorn": { name: "Camlorn", province: "High Rock", x: "6.0%", y: "28.0%" },
  "Wayrest": { name: "Wayrest", province: "High Rock", x: "18.0%", y: "27.5%" },
  "Shornhelm": { name: "Shornhelm", province: "High Rock", x: "16.5%", y: "16.0%" },
  "Dragonstar": { name: "Dragonstar", province: "Hammerfell", x: "31.0%", y: "22.5%" }, 
  "Skaven": { name: "Skaven", province: "Hammerfell", x: "25.5%", y: "31.0%" }, 
  "Elinhir": { name: "Elinhir", province: "Hammerfell", x: "42.5%", y: "31.5%" }, 
  "Sentinel": { name: "Sentinel", province: "Hammerfell", x: "10.5%", y: "36.5%" }, 
  "Helgathe": { name: "Helgathe", province: "Hammerfell", x: "10.5%", y: "49.5%" }, 
  "Gilane": { name: "Gilane", province: "Hammerfell", x: "16.5%", y: "46.5%" }, 
  "Taneth": { name: "Taneth", province: "Hammerfell", x: "23.0%", y: "45.5%" }, 
  "Rihad": { name: "Rihad", province: "Hammerfell", x: "30.0%", y: "54.0%" }, 
  "Stros M'Kai": { name: "Stros M'Kai", province: "Hammerfell", x: "13.0%", y: "57.5%" }, 
  "Bruma": { name: "Bruma", province: "Cyrodiil", x: "51.0%", y: "37.0%" },
  "Chorrol": { name: "Chorrol", province: "Cyrodiil", x: "43.5%", y: "44.5%" },
  "Cheydinhal": { name: "Cheydinhal", province: "Cyrodiil", x: "65.0%", y: "44.0%" },
  "Imperial City": { name: "Imperial City", province: "Cyrodiil", x: "54.5%", y: "48.0%" }, 
  "Kvatch": { name: "Kvatch", province: "Cyrodiil", x: "36.5%", y: "59.5%" },
  "Skingrad": { name: "Skingrad", province: "Cyrodiil", x: "43.8%", y: "58.0%" }, 
  "Anvil": { name: "Anvil", province: "Cyrodiil", x: "31.5%", y: "63.0%" },
  "Leyawiin": { name: "Leyawiin", province: "Cyrodiil", x: "60.5%", y: "77.5%" }, 
  "Bravil": { name: "Bravil", province: "Cyrodiil", x: "59.0%", y: "62.5%" },
  "Blacklight": { name: "Blacklight", province: "Morrowind", x: "64.0%", y: "15.0%" },
  "Ald'ruhn": { name: "Ald'ruhn", province: "Morrowind", x: "76.0%", y: "27.0%" },
  "Balmora": { name: "Balmora", province: "Morrowind", x: "74.5%", y: "35.0%" },
  "Vivec": { name: "Vivec", province: "Morrowind", x: "78.0%", y: "36.5%" },
  "Narsis": { name: "Narsis", province: "Morrowind", x: "80.5%", y: "56.0%" },
  "Mournhold": { name: "Mournhold", province: "Morrowind", x: "85.5%", y: "48.0%" },
  "Tear": { name: "Tear", province: "Morrowind", x: "91.0%", y: "59.5%" },
  "Necrom": { name: "Necrom", province: "Morrowind", x: "95.5%", y: "33.0%" },
  "Vvardenfell": { name: "Vvardenfell", province: "Morrowind", x: "76.0%", y: "16.0%" },
  "Solstheim": { name: "Solstheim", province: "Morrowind", x: "70.0%", y: "3.5%" },
  "Arenthia": { name: "Arenthia", province: "Valenwood", x: "44.5%", y: "61.5%" },
  "Falinesti": { name: "Falinesti", province: "Valenwood", x: "33.0%", y: "69.5%" },
  "Silvenar": { name: "Silvenar", province: "Valenwood", x: "37.5%", y: "72.0%" },
  "Woodhearth": { name: "Woodhearth", province: "Valenwood", x: "27.0%", y: "82.0%" },
  "Elden Root": { name: "Elden Root", province: "Valenwood", x: "41.0%", y: "80.5%" },
  "Greenheart": { name: "Greenheart", province: "Valenwood", x: "34.0%", y: "86.0%" },
  "Southpoint": { name: "Southpoint", province: "Valenwood", x: "42.0%", y: "91.0%" },
  "Haven": { name: "Haven", province: "Valenwood", x: "47.5%", y: "90.5%" },
  "Dune": { name: "Dune", province: "Elsweyr", x: "46.0%", y: "66.5%" },
  "Riverhold": { name: "Riverhold", province: "Elsweyr", x: "51.0%", y: "62.5%" },
  "Orcrest": { name: "Orcrest", province: "Elsweyr", x: "51.5%", y: "67.5%" }, 
  "Rimmen": { name: "Rimmen", province: "Elsweyr", x: "58.0%", y: "70.0%" },
  "Corinthe": { name: "Corinthe", province: "Elsweyr", x: "53.5%", y: "81.0%" },
  "Torval": { name: "Torval", province: "Elsweyr", x: "49.0%", y: "87.0%" },
  "Senchal": { name: "Senchal", province: "Elsweyr", x: "59.5%", y: "91.5%" },
  "Gideon": { name: "Gideon", province: "Black Marsh", x: "67.0%", y: "78.5%" },
  "Stormhold": { name: "Stormhold", province: "Black Marsh", x: "77.5%", y: "63.0%" },
  "Thorn": { name: "Thorn", province: "Black Marsh", x: "86.5%", y: "64.5%" },
  "Soulrest": { name: "Soulrest", province: "Black Marsh", x: "67.5%", y: "93.5%" },
  "Archon": { name: "Archon", province: "Black Marsh", x: "85.5%", y: "87.0%" },
  "Blackrose": { name: "Blackrose", province: "Black Marsh", x: "76.0%", y: "89.5%" },
  "Helstrom": { name: "Helstrom", province: "Black Marsh", x: "77.0%", y: "76.5%" },
  "Lilmloth": { name: "Lilmloth", province: "Black Marsh", x: "80.0%", y: "94.0%" }, 
  "Cloudrest": { name: "Cloudrest", province: "Summerset Isles", x: "12.0%", y: "74.5%" },
  "Shimmerene": { name: "Shimmerene", province: "Summerset Isles", x: "15.0%", y: "84.5%" },
  "Alinor": { name: "Alinor", province: "Summerset Isles", x: "6.0%", y: "85.5%" },
  "Dusk": { name: "Dusk", province: "Summerset Isles", x: "16.5%", y: "92.0%" },
  "Lillandril": { name: "Lillandril", province: "Summerset Isles", x: "4.0%", y: "75.5%" },
  "Sunhold": { name: "Sunhold", province: "Summerset Isles", x: "10.5%", y: "91.0%" },
  "Firsthold": { name: "Firsthold", province: "Summerset Isles", x: "15.0%", y: "68.5%" },
  "Skywatch": { name: "Skywatch", province: "Summerset Isles", x: "19.5%", y: "78.5%" },
};

export const TEXTBLIVION_DM_INSTRUCTIONS = `
You are Textblivion, an AI Dungeon Master (DM) for a text-based adventure set in the rich lore of The Elder Scrolls universe.
Your primary function is to facilitate a text-based, choose-your-own-adventure style role-playing game.
You must adhere strictly to Elder Scrolls lore.

**CRITICAL: The player's backstory is very important. You MUST use the information from their backstory to heavily influence and personalize the *initial adventure scenario*. Make the starting situation directly relevant to something in their backstory.**

Character System Overview:
- Attributes: 7 attributes influence capabilities.
- Skills: Levels (Untrained, Novice, etc.) and values.
- H/M/F: Vital stats. Use 'healthChange', 'manaChange', 'fatigueChange' to modify.
- Hunger & Exhaustion: Survival mechanics. Use negative 'hungerChange' (e.g., -30 to reduce hunger) or negative 'exhaustionChange' (e.g., -50 to reduce exhaustion) when player eats or sleeps in story!
- Comfort: Thermal comfort (0-100). Low comfort drains Fatigue.
- **Waterskins/Consumables**: Items like "Waterskin" have "charges" (e.g., 8/8). Drinking consumes 1 charge, NOT the item itself (unless single-use).
- Environment/Shelter/Weather: The game engine calculates these. You can suggest shelter or clothing.

Key DM Rules:
1.  **Time and Date Tracking:** Provided by system. Use "timePassedHours" (increments of 0.25) or "newTimeOfDay" to advance time.
2.  **Adventure Introduction:** Tailor to backstory. Populate "newQuests" with initial quests/leads, including any **JOBS** mentioned in the backstory (set type: 'Job'). Set "newObjective".
3.  **Waking Up (Start of Day) Protocol:** When prompted with "Player character has woken up...", your narrative MUST begin: "(Day X, DayOfWeek, Time (HH:MM), Season. Septims: Y. Current Objective: Z)". Describe the morning.
4.  **Bedtime Flow:**
    - Player initiates "bedtime". The engine handles confirmation.
    - If confirmed, engine requests an **End-of-Day (EOD) Summary**.
    - **Your EOD summary is ONLY a recap.** It does NOT enact rest, level-up, or time passage. Format: 'Events Since Last Rest', 'Inventory Notes', 'Prospective Quests', 'Major Events Summary'. **Brief and high-level.**
    - Do NOT provide choices with this summary. The engine handles the next steps.
5.  **Inventory & Waterskins:**
    - **Drinking:** If player drinks from a refillable item (like a waterskin), respond with "ateFoodDetails" pointing to that item. The engine will handle charge reduction.
    - **Refilling:** If player refills a waterskin, use "itemUpdates": [{ "id": "itemId", "currentCharges": MAX }]. Or use "itemsGained" with the same name if ID is unknown (engine will try to merge).
    - **Picking Up Items:** ALL items found/picked up (even plants) MUST be added via "itemsGained".
    - **Removing Items:** Use "itemsLostByName" to remove items entirely (e.g. theft, dropping). To reduce quantity (e.g. sold, gave 1 of 5), use "itemUpdates" with the new quantity, OR "itemsLostByName" if the whole stack is gone.
    - **Septims:** Use "septimsChange" (negative to spend) for currency. Do NOT use itemsLostByName for Gold/Septims.
6.  **Quests & Jobs:**
    - Use "newQuests" for NEW tasks. Check if a task already exists before adding.
    - **Updates:** Use "updatedQuests" to change status (e.g. "isCompleted": true).
    - **CRITICAL:** When updating a quest, use the EXACT "title" as the original to ensure it updates the existing entry instead of creating a duplicate.
    - **Rumors/Leads:** Add as quests with "type": "Rumor" or "Lead".
7.  **Comfort/Environment:**
    - **Temperature:** The game engine calculates specific temperature. You do not need to manage it, but your narrative should reflect the "currentEnvironmentalCondition" provided in the prompt.
8.  **Blessings & Active Effects:**
    - When the player prays at a temple/shrine/chapel, receives a blessing, consumes a potion, is cursed, poisoned, infected with a disease, or gains any temporary state, you MUST add this effect under "newActiveEffects".
    - Target can be "attribute" or "skill". TargetName must match exact attribute or skill names (e.g., "Strength", "Willpower", "Restoration", "Blade", "Athletics").
    - Example: "newActiveEffects": [{"sourceName": "Blessing of Mara", "target": "attribute", "targetName": "Willpower", "modifier": 10, "durationHours": 24}].
9.  **Output Format (JSON):** { "narrative": "...", "choices": [...], "timePassedHours": N.N, "itemUpdates": [...], "newQuests": [...], "updatedQuests": [{"title": "...", "isCompleted": true}], "itemsLostByName": ["Item Name"], "newActiveEffects": [{"sourceName": "...", "target": "attribute", "targetName": "Willpower", "modifier": 10, "durationHours": 24}], "hungerChange": -30, "exhaustionChange": -40 }
`;

export const GEMINI_MODEL_NAME = "gemini-3.5-flash"; 
export const MAX_NARRATIVE_LOG_LENGTH = 500;

export const DM_COMMAND_PREFIX = "DM:";
export const DM_HELP_TEXT = `
Available DM Commands (prefix with "DM: "):
- help: Show this help message.
- time: Display the current in-game date and time.
- inventory: Show your current carried and stashed items, and septims.
- quests: Display your current objective and list of active quests/leads.
- objective: Display your current objective.
- effects: List your character's current active temporary effects (from potions, spells, etc.).
- correct [your correction]: Use this if the DM misunderstood something or to adjust game state (e.g., "DM: correct The sword should be in my carried items, not stashed"). The DM will try to apply your correction.

Game Basics:
- Type actions or dialogue as you would speak or do them.
- Use "bedtime" to end the day. The game will confirm your intent, then prompt for an End of Day summary, then may prompt for level-up choices, then apply rest.
- Use "nap" to take a short 3-hour rest for partial recovery.
- Choices will often be presented as numbered options. You can type the number or the full choice.
`;

export const DM_DEBUG_HELP_TEXT = `
DEBUG MODE ON. Available 'DM: debug' commands:
- help: Show this debug help.
- mode off: Disable debug mode.
- levelup: Trigger level-up attribute allocation.
- addseptims [amount]: Add septims. E.g., DM: debug addseptims 100
- skillup [SkillName] [amount]: Increase skill. E.g., DM: debug skillup Sneak 5
- additem {"name":"...", "description":"...", "quantity":1, ...}: Add item via JSON.
- addeffect {"sourceName":"...", "target":"...", "targetName":"...", "modifier":X, "durationHours":Y}: Add temporary effect via JSON.
- passtime [hours_float]: Advance game time by X.Y hours.
- sethour [hour_float_0-23.99]: Set current hour of day.
- settimeofday [TimeOfDayName]: Set current TimeOfDay.
- sethealth [current] [max?]: Set health.
- setmana [current] [max?]: Set mana.
- setfatigue [current] [max?]: Set fatigue.
- sethunger [level]: Set hunger level.
- setexhaustion [level]: Set exhaustion level.
- setcomfort [level]: Set comfort level.
- setenvironment [MILD|COLD|VERY_COLD|HOT|VERY_HOT]: Set current OUTSIDE environmental condition.
- setshelter [NONE|POOR|AVERAGE|GOOD|EXCELLENT] [shelter_name?]: Set current shelter quality and optional name.
- setweather [CLEAR|CLOUDY|OVERCAST|RAIN|STORM|SNOW|BLIZZARD|FOG]: Set current weather condition.
`;

// Time Utility Functions
export const getHourForTimeOfDay = (timeOfDay: TimeOfDay): number => { // Returns float
  switch (timeOfDay) {
    case TimeOfDay.MORNING: return 7.0;   // 7:00 AM
    case TimeOfDay.AFTERNOON: return 13.0; // 1:00 PM
    case TimeOfDay.EVENING: return 19.0;  // 7:00 PM
    case TimeOfDay.NIGHT: return 22.0;    // 10:00 PM
    case TimeOfDay.MIDNIGHT: return 1.0;  // 1:00 AM
    case TimeOfDay.DAWN: return 4.0;      // 4:00 AM
    default: return 12.0; // Default to noon if something is wrong
  }
};

export const getTimeOfDayFromHour = (hourFloat: number): TimeOfDay => { // Takes float
  const hour = Math.floor(hourFloat); // Use floored hour for broad category matching
  if (hour >= 3 && hour < 6) return TimeOfDay.DAWN;
  if (hour >= 6 && hour < 12) return TimeOfDay.MORNING;
  if (hour >= 12 && hour < 18) return TimeOfDay.AFTERNOON;
  if (hour >= 18 && hour < 21) return TimeOfDay.EVENING;
  if (hour >= 21 && hour < 24) return TimeOfDay.NIGHT; 
  if (hour >= 0 && hour < 3) return TimeOfDay.MIDNIGHT;
  return TimeOfDay.MORNING; // Default case
};

export const formatHourMinute = (hourFloat: number): string => {
  const h = Math.floor(hourFloat);
  const m = Math.round((hourFloat - h) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

export const formatDurationForLog = (hours: number): string => {
  if (hours === 0) return "no time";
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;

  if (h > 0 && m > 0) return `${h} hour${h > 1 ? 's' : ''} and ${m} minute${m > 1 ? 's' : ''}`;
  if (h > 0) return `${h} hour${h > 1 ? 's' : ''}`;
  if (m > 0) return `${m} minute${m > 1 ? 's' : ''}`;
  // Fallback for very small fractional hours not cleanly hitting minute marks after rounding
  if (hours > 0 && hours < (1/60)) return "a moment"; 
  return `${hours.toFixed(2)} hours`; 
};


export const getHungerStatus = (level: number): string => {
    if (level >= HUNGER_STATUS_THRESHOLDS.STARVING) return "Starving";
    if (level >= HUNGER_STATUS_THRESHOLDS.VERY_HUNGRY) return "Very Hungry";
    if (level >= HUNGER_STATUS_THRESHOLDS.HUNGRY) return "Hungry";
    if (level >= HUNGER_STATUS_THRESHOLDS.PECKISH) return "Peckish";
    return "Satiated";
};

export const getExhaustionStatus = (level: number): string => {
    if (level >= EXHAUSTION_STATUS_THRESHOLDS.EXHAUSTED) return "Utterly Drained";
    if (level >= EXHAUSTION_STATUS_THRESHOLDS.VERY_TIRED) return "Exhausted";
    if (level >= EXHAUSTION_STATUS_THRESHOLDS.TIRED) return "Tired";
    if (level >= EXHAUSTION_STATUS_THRESHOLDS.AWAKE) return "Awake";
    return "Rested";
};

export const getComfortStatus = (level: number, temperature: number): string => {
    if (level < COMFORT_PENALTY_THRESHOLD) {
        if (temperature <= ENV_COND_THRESHOLDS_F.COLD) return "Freezing";
        if (temperature >= ENV_COND_THRESHOLDS_F.HOT) return "Sweltering";
        return "Uncomfortable";
    }
    if (level < 50) {
        if (temperature <= ENV_COND_THRESHOLDS_F.COLD) return "Chilly";
        if (temperature >= ENV_COND_THRESHOLDS_F.HOT) return "Overheated";
        return "Slightly Uncomfortable";
    }
    if (level < 75) return "Comfortable";
    return "Very Comfortable";
};

// Moved from useGameEngine.tsx
export const NEW_TTS_VOICES_RAW = [
    "Zephyr -- Bright", "Puck -- Upbeat", "Charon -- Informative",
    "Kore -- Firm", "Fenrir -- Excitable", "Leda -- Youthful",
    "Orus -- Firm", "Aoede -- Breezy", "Callirrhoe -- Easy-going",
    "Autonoe -- Bright", "Enceladus -- Breathy", "Iapetus -- Clear",
    "Umbriel -- Easy-going", "Algieba -- Smooth", "Despina -- Smooth",
    "Erinome -- Clear", "Algenib -- Gravelly", "Rasalgethi -- Informative",
    "Laomedeia -- Upbeat", "Achernar -- Soft", "Alnilam -- Firm",
    "Schedar -- Even", "Gacrux -- Mature", "Pulcherrima -- Forward",
    "Achird -- Friendly", "Zubenelgenubi -- Casual", "Vindemiatrix -- Gentle",
    "Sadachbia -- Lively", "Sadaltager -- Knowledgeable", "Sulafat -- Warm"
];

export const PARSED_TTS_VOICES: TTSVoiceOption[] = NEW_TTS_VOICES_RAW.map((voiceStr) => {
    const parts = voiceStr.split(" -- ");
    const voiceNameForAPI = parts[0].trim();
    const displayName = voiceStr;
    return {
        name: displayName,
        voiceURI: voiceNameForAPI,
        lang: "en-US",
        default: voiceNameForAPI === "Zephyr" // Set Zephyr as default
    };
});

// Export constants that were missing
export { RACES, ARCHETYPES, PROVINCES, SKILLS_LIST, ATTRIBUTE_NAMES } from './types.ts';
export const PRESENTATION_TYPES = PRESENTATION_TYPES_ALIAS;
