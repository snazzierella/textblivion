

import {
  PlayerCharacter, Item, ActiveEffect, Skill, SkillLevel, SKILL_LEVELS, EnvironmentalCondition, ShelterQuality, Province, WeatherCondition, TimeOfDay, Season, SubSeason, NarrativeEntry
} from '../types.ts';
import {
  SKILL_VALUE_MAP, BASE_MAX_COMFORT, COMFORT_PENALTY_THRESHOLD, COMFORT_FATIGUE_DRAIN_RATE_PER_HOUR,
  ENVIRONMENT_COMFORT_BASE, INSULATION_MODIFIERS, SHELTER_COMFORT_MODIFIERS,
  BASE_GLOBAL_TEMP_F, SEASON_TEMP_OFFSETS_F, SUB_SEASON_TEMP_OFFSETS_F, SUB_SEASON_AUTUMN_WINTER_FACTOR,
  TIME_OF_DAY_TEMP_OFFSETS_F, WEATHER_TEMP_OFFSETS_F, LATITUDE_TEMP_RANGE_F, ENV_COND_THRESHOLDS_F,
  PROVINCE_CENTER_COORDINATES, LOCATION_COORDINATES_ON_MAP,
  HUNGER_STATUS_THRESHOLDS, HEALTH_DRAIN_RATE_STARVING, EXHAUSTION_STATUS_THRESHOLDS, FATIGUE_DRAIN_RATE_EXHAUSTED, formatDurationForLog
} from '../constants.ts';


export const findNearestCityOnMap = (city: string | null): string | null => {
  if (!city) return null;

  // 1. Direct exact match first
  if (LOCATION_COORDINATES_ON_MAP[city]) {
    return city;
  }

  // 2. Clean up any prefix/prefix variants (e.g., "Near:", "near", "Near")
  let cleanCity = city;
  if (city.startsWith("Near: ")) {
    cleanCity = city.substring(6).trim();
  } else if (city.toLowerCase().startsWith("near ")) {
    cleanCity = city.substring(5).trim();
  }

  if (LOCATION_COORDINATES_ON_MAP[cleanCity]) {
    return cleanCity;
  }

  // 3. Fallback: search key substrings case-insensitively, sorted by length descending
  const cleanCityLower = cleanCity.toLowerCase();
  const sortedKeys = Object.keys(LOCATION_COORDINATES_ON_MAP).sort((a, b) => b.length - a.length);
  for (const key of sortedKeys) {
    if (cleanCityLower.includes(key.toLowerCase())) {
      return key;
    }
  }

  return null;
};

export const getLatitudeFactor = (province: Province | null, city: string | null): number => {
  let yPercent: number | null = null;
  const actualCityName = findNearestCityOnMap(city);

  if (actualCityName) {
    const cityData = LOCATION_COORDINATES_ON_MAP[actualCityName];
    if (cityData) {
      yPercent = parseFloat(cityData.y);
    }
  }

  if (yPercent === null && province && PROVINCE_CENTER_COORDINATES[province]) {
    yPercent = parseFloat(PROVINCE_CENTER_COORDINATES[province].y);
  }

  if (yPercent !== null) {
    // 0% Y is North (Cold), 100% Y is South (Warm).
    // (yPercent / 100) - 0.5 yields -0.5 for North and +0.5 for South.
    // Multiplying by a positive range scales this correctly to get negative offsets for North and positive offsets for South.
    const normalizedY = (yPercent / 100) - 0.5; 
    return normalizedY * LATITUDE_TEMP_RANGE_F * 2;
  }
  return 0;
};

export const calculateSpecificTemperature = (
    season: Season,
    subSeason: SubSeason,
    weather: WeatherCondition,
    latitudeFactor: number, // Negative for North, Positive for South
    timeOfDay: TimeOfDay
): number => {
    let temp = BASE_GLOBAL_TEMP_F;
    temp += SEASON_TEMP_OFFSETS_F[season];
    
    // Sub-season adjustment (Winter Late is colder than Early, but Autumn Early is warmer than Late)
    let subSeasonOffset = SUB_SEASON_TEMP_OFFSETS_F[subSeason];
    if (season === Season.AUTUMN || season === Season.WINTER) {
       // In Autumn/Winter, later is colder?
       // Current OFFSET: Early -5, Mid 0, Late 5.
       // Winter: Early should be warmer than Late.
       // So for Winter/Autumn, we might invert the subseason logic or define explicit maps.
       // Let's rely on the simplified constant for now, maybe Winter Late is 'deep winter'.
       // Actually, Late Winter leads to Spring, so it might get warmer?
       // Let's keep it simple: Late is usually "deeper" into the trend?
       // No, Standard: Early Spring (Cold) -> Late Spring (Warm).
       // Early Autumn (Warm) -> Late Autumn (Cold).
       // So we need a factor.
       if (season === Season.AUTUMN || season === Season.WINTER) {
           // Invert the standard progression (Cold->Warm) to (Warm->Cold)?
           // Actually Winter: Early (Dec) -> Late (Feb). Usually coldest in mid-late.
           // Let's apply a factor for Autumn/Winter.
           // Standard constants are -5 (Early), 0 (Mid), 5 (Late).
           // If factor is -1: Early (+5), Mid (0), Late (-5).
           // Autumn: Early (+5) = Warmer. Late (-5) = Colder. Correct.
           // Winter: Early (+5) = Warmer. Late (-5) = Colder. Correct.
           subSeasonOffset *= SUB_SEASON_AUTUMN_WINTER_FACTOR;
       }
    }
    temp += subSeasonOffset;

    temp += TIME_OF_DAY_TEMP_OFFSETS_F[timeOfDay];
    temp += WEATHER_TEMP_OFFSETS_F[weather];
    
    // Latitude Factor: 0% Y (North) gave -0.5 * Scalar.
    // If Scalar was Positive, North is Cold.
    // Let's assume latitudeFactor is passed correctly as negative for cold places.
    // But verify the calculation in getLatitudeFactor.
    // (0.19 - 0.5) = -0.31. To make Skyrim cold, we add this negative number.
    // But latitudeFactor was calculated via getLatitudeFactor.
    // We need to ensure getLatitudeFactor returns negative for North.
    // (0.19 - 0.5) = -0.31. So we multiply by POSITIVE range.
    // Correct.
    temp += latitudeFactor; 

    return Math.round(temp);
};

export const getEnvironmentalConditionFromTemp = (tempF: number): EnvironmentalCondition => {
    if (tempF <= ENV_COND_THRESHOLDS_F.VERY_COLD) return EnvironmentalCondition.VERY_COLD;
    if (tempF <= ENV_COND_THRESHOLDS_F.COLD) return EnvironmentalCondition.COLD;
    if (tempF <= ENV_COND_THRESHOLDS_F.MILD) return EnvironmentalCondition.MILD;
    if (tempF <= ENV_COND_THRESHOLDS_F.HOT) return EnvironmentalCondition.HOT;
    return EnvironmentalCondition.VERY_HOT;
};

export const calculateEnvironmentalCondition = (
  weather: WeatherCondition,
  season: Season,
  subSeason: SubSeason,
  latitudeFactor: number,
  timeOfDay: TimeOfDay
): EnvironmentalCondition => {
    const temp = calculateSpecificTemperature(season, subSeason, weather, latitudeFactor, timeOfDay);
    return getEnvironmentalConditionFromTemp(temp);
};

export const getSkillLevel = (value: number): SkillLevel => {
    for (const level of SKILL_LEVELS.slice().reverse()) {
        if (value >= SKILL_VALUE_MAP[level].base) {
            return level;
        }
    }
    return SKILL_LEVELS[0];
};

export const getExpNeededForNextLevel = (currentValue: number): number => {
    if (currentValue >= 100) return 999999;
    return Math.round(15 + Math.pow(currentValue, 1.2) * 1.5);
};

export const calculateComfortLevel = (
    equippedItems: Item[],
    outsideEnvironment: EnvironmentalCondition,
    shelterQuality: ShelterQuality
  ): number => {
    let baseComfortFromOutside = ENVIRONMENT_COMFORT_BASE[outsideEnvironment] || ENVIRONMENT_COMFORT_BASE[EnvironmentalCondition.MILD];

    let gearComfortModifier = 0;
    equippedItems.forEach(item => {
        gearComfortModifier += item.comfortBonus || 0;
        if (item.insulationQuality && INSULATION_MODIFIERS[outsideEnvironment] && INSULATION_MODIFIERS[outsideEnvironment][item.insulationQuality]) {
            gearComfortModifier += INSULATION_MODIFIERS[outsideEnvironment][item.insulationQuality];
        }
    });

    let shelterModifier = 0;
    if (SHELTER_COMFORT_MODIFIERS[shelterQuality] && SHELTER_COMFORT_MODIFIERS[shelterQuality][outsideEnvironment]) {
        shelterModifier = SHELTER_COMFORT_MODIFIERS[shelterQuality][outsideEnvironment];
    }

    const finalComfort = baseComfortFromOutside + gearComfortModifier + shelterModifier;
    return Math.max(0, Math.min(BASE_MAX_COMFORT, finalComfort));
};

export const applyStatChangesAndPenalties = (
    char: PlayerCharacter,
    hoursPassedSinceLastPenaltyCheck: number,
    addLogEntry: (type: NarrativeEntry['type'], text: string | string[]) => void,
    currentOutsideEnvironmentalCondition: EnvironmentalCondition
  ): PlayerCharacter => {
    const newChar = { ...char };

    if (hoursPassedSinceLastPenaltyCheck > 0) {
        if (newChar.hungerLevel >= HUNGER_STATUS_THRESHOLDS.STARVING) {
            const healthLoss = HEALTH_DRAIN_RATE_STARVING * hoursPassedSinceLastPenaltyCheck;
            if (newChar.currentHealth > 0 && healthLoss > 0) {
                const oldHealth = newChar.currentHealth;
                newChar.currentHealth = Math.max(0, newChar.currentHealth - healthLoss);
                addLogEntry('system', `Starvation drains ${Math.round(oldHealth - newChar.currentHealth)} health over ${formatDurationForLog(hoursPassedSinceLastPenaltyCheck)}. Current health: ${Math.round(newChar.currentHealth)}/${newChar.maxHealth}.`);
            }
        }
        if (newChar.exhaustionLevel >= EXHAUSTION_STATUS_THRESHOLDS.EXHAUSTED) {
            const fatigueLoss = FATIGUE_DRAIN_RATE_EXHAUSTED * hoursPassedSinceLastPenaltyCheck;
            if (newChar.currentFatigue > 0 && fatigueLoss > 0) {
                const oldFatigue = newChar.currentFatigue;
                newChar.currentFatigue = Math.max(0, newChar.currentFatigue - fatigueLoss);
                addLogEntry('system', `Utter exhaustion drains ${Math.round(oldFatigue - newChar.currentFatigue)} fatigue over ${formatDurationForLog(hoursPassedSinceLastPenaltyCheck)}. Current fatigue: ${Math.round(newChar.currentFatigue)}/${newChar.maxFatigue}.`);
            }
        }
        if (newChar.comfortLevel < COMFORT_PENALTY_THRESHOLD) {
            const fatigueLossComfort = COMFORT_FATIGUE_DRAIN_RATE_PER_HOUR * hoursPassedSinceLastPenaltyCheck;
            if (newChar.currentFatigue > 0 && fatigueLossComfort > 0) {
                const oldFatigue = newChar.currentFatigue;
                newChar.currentFatigue = Math.max(0, newChar.currentFatigue - fatigueLossComfort);
                addLogEntry('system', `Discomfort drains ${Math.round(oldFatigue - newChar.currentFatigue)} fatigue over ${formatDurationForLog(hoursPassedSinceLastPenaltyCheck)}. Current fatigue: ${Math.round(newChar.currentFatigue)}/${newChar.maxFatigue}.`);
            }
        }
    }

    newChar.currentHealth = Math.max(0, Math.min(newChar.currentHealth, newChar.maxHealth));
    newChar.currentMana = Math.max(0, Math.min(newChar.currentMana, newChar.maxMana));
    newChar.currentFatigue = Math.max(0, Math.min(newChar.currentFatigue, newChar.maxFatigue));

    return newChar;
};

export const enrichItemWithStats = (item: Item): Item => {
  const lowercaseName = item.name.toLowerCase();
  const lowercaseDesc = (item.description || '').toLowerCase();
  
  // Weapon check
  let inferredDamage = item.damage;
  let isWeapon = item.isWeapon;
  
  // High fidelity weapon name matches (includes Chillrend!)
  const isWeaponName = lowercaseName.includes('sword') || lowercaseName.includes('dagger') || 
                       lowercaseName.includes('blade') || lowercaseName.includes('axe') || 
                       lowercaseName.includes('mace') || lowercaseName.includes('hammer') || 
                       lowercaseName.includes('bow') || lowercaseName.includes('chillrend') || 
                       lowercaseName.includes('katana') || lowercaseName.includes('claymore') || 
                       lowercaseName.includes('cutlass') || lowercaseName.includes('scimitar') || 
                       lowercaseName.includes('dirk') || lowercaseName.includes('knife') || 
                       lowercaseName.includes('club') || lowercaseName.includes('trident') || 
                       lowercaseName.includes('cleaver') || lowercaseName.includes('warhammer') || 
                       lowercaseName.includes('battleaxe') || lowercaseName.includes('morningstar') || 
                       lowercaseName.includes('crossbow') || lowercaseName.includes('staff') || 
                       lowercaseName.includes('spear') || lowercaseName.includes('halberd') || 
                       lowercaseName.includes('rapier') || lowercaseName.includes('saber') || 
                       lowercaseName.includes('broadsword') || lowercaseName.includes('wakizashi') || 
                       lowercaseName.includes('shiv');

  const isWeaponDesc = lowercaseDesc.includes('weapon') || lowercaseDesc.includes('deals damage') || 
                       lowercaseDesc.includes('strikes') || lowercaseDesc.includes('attack') || 
                       lowercaseDesc.includes('slashes') || lowercaseDesc.includes('forces') || 
                       lowercaseDesc.includes('crafted blade');

  if (isWeapon === undefined) {
    if (isWeaponName || isWeaponDesc) {
      isWeapon = true;
    }
  }

  if (isWeapon && inferredDamage === undefined) {
    if (lowercaseName.includes('dagger') || lowercaseName.includes('dirk') || lowercaseName.includes('knife') || lowercaseName.includes('shiv')) {
      inferredDamage = 4;
    } else if (lowercaseName.includes('shortsword') || lowercaseName.includes('cutlass') || lowercaseName.includes('scimitar') || lowercaseName.includes('machete')) {
      inferredDamage = 8;
    } else if (lowercaseName.includes('longsword') || lowercaseName.includes('broadsword') || lowercaseName.includes('saber') || lowercaseName.includes('rapier') || lowercaseName.includes('sword') || lowercaseName.includes('chillrend')) {
      inferredDamage = 12;
      if (lowercaseName.includes('chillrend')) {
        inferredDamage = 18; // Legendary artifact
      }
    } else if (lowercaseName.includes('claymore') || lowercaseName.includes('greatsword') || lowercaseName.includes('daedric') || lowercaseName.includes('ebony sword')) {
      inferredDamage = 22;
    } else if (lowercaseName.includes('battleaxe') || lowercaseName.includes('warhammer') || lowercaseName.includes('mace') || lowercaseName.includes('morningstar')) {
      inferredDamage = 18;
    } else if (lowercaseName.includes('bow') || lowercaseName.includes('crossbow')) {
      inferredDamage = 10;
    } else if (lowercaseName.includes('staff') || lowercaseName.includes('wand')) {
      inferredDamage = 6;
    } else {
      inferredDamage = 5; // Default weapon dmg
    }
  }

  // Armor check
  let inferredArmor = item.armorRating;
  let isArmor = item.isArmor;
  const isArmorName = lowercaseName.includes('shield') || lowercaseName.includes('buckler') || 
                      lowercaseName.includes('cuirass') || lowercaseName.includes('mail') || 
                      lowercaseName.includes('plate') || lowercaseName.includes('armor') || 
                      lowercaseName.includes('greaves') || lowercaseName.includes('leggings') || 
                      lowercaseName.includes('helmet') || lowercaseName.includes('cowl') || 
                      lowercaseName.includes('coif') || lowercaseName.includes('gauntlets') || 
                      lowercaseName.includes('gloves') || lowercaseName.includes('boots') || 
                      lowercaseName.includes('gaiters') || lowercaseName.includes('girdle') || 
                      lowercaseName.includes('bracers') || lowercaseName.includes('tunic') || 
                      lowercaseName.includes('robe') || lowercaseName.includes('clothes') || 
                      lowercaseName.includes('clothing') || lowercaseName.includes('pant') || 
                      lowercaseName.includes('shirt') || lowercaseName.includes('vest') ||
                      lowercaseName.includes('leather') || lowercaseName.includes('steel armor') ||
                      lowercaseName.includes('iron armor');

  const isArmorDesc = lowercaseDesc.includes('armor rating') || lowercaseDesc.includes('protective') || 
                      lowercaseDesc.includes('defense') || lowercaseDesc.includes('worn') || 
                      lowercaseDesc.includes('wearable') || lowercaseDesc.includes('equipped');

  if (isArmor === undefined) {
    if (isArmorName || isArmorDesc) {
      isArmor = true;
    }
  }
  
  if (isArmor && inferredArmor === undefined) {
    if (lowercaseName.includes('shield') || lowercaseName.includes('buckler')) {
      inferredArmor = 8;
    } else if (lowercaseName.includes('cuirass') || lowercaseName.includes('mail') || lowercaseName.includes('plate') || lowercaseName.includes('armor')) {
      inferredArmor = 20;
    } else if (lowercaseName.includes('greaves') || lowercaseName.includes('leggings')) {
      inferredArmor = 10;
    } else if (lowercaseName.includes('helmet') || lowercaseName.includes('cowl') || lowercaseName.includes('coif')) {
      inferredArmor = 6;
    } else if (lowercaseName.includes('gauntlets') || lowercaseName.includes('gloves') || lowercaseName.includes('bracers')) {
      inferredArmor = 4;
    } else if (lowercaseName.includes('boots') || lowercaseName.includes('gaiters')) {
      inferredArmor = 5;
    } else {
      inferredArmor = 2; // general clothes/robes
    }
  }

  // Food and Drink consumable check (Waterskin is drinkable!)
  let isFood = item.isFood;
  let isPotion = item.isPotion;
  let hungerReduction = item.hungerReduction;

  const isDrinkable = lowercaseName.includes('waterskin') || lowercaseName.includes('water') || 
                      lowercaseName.includes('flask') || lowercaseName.includes('canteen') || 
                      lowercaseName.includes('wine') || lowercaseName.includes('beer') || 
                      lowercaseName.includes('ale') || lowercaseName.includes('mead') || 
                      lowercaseName.includes('potion') || lowercaseName.includes('elixir') || 
                      lowercaseName.includes('drink') || lowercaseName.includes('sip') ||
                      lowercaseName.includes('bottle') || lowercaseName.includes('soup') || 
                      lowercaseName.includes('broth') || lowercaseName.includes('vial') || 
                      lowercaseName.includes('draught') || lowercaseName.includes('phial') || 
                      lowercaseName.includes('tonic');

  const isEdible = lowercaseName.includes('bread') || lowercaseName.includes('apple') || 
                    lowercaseName.includes('cheese') || lowercaseName.includes('stew') || 
                    lowercaseName.includes('meat') || lowercaseName.includes('venison') || 
                    lowercaseName.includes('pie') || lowercaseName.includes('sweetroll') || 
                    lowercaseName.includes('potato') || lowercaseName.includes('carrot') || 
                    lowercaseName.includes('mutton') || lowercaseName.includes('ham') || 
                    lowercaseName.includes('pear') || lowercaseName.includes('cabbage') || 
                    lowercaseName.includes('onion') || lowercaseName.includes('biscuit') || 
                    lowercaseName.includes('food') || lowercaseName.includes('meal') ||
                    lowercaseName.includes('ingredient') || lowercaseName.includes('herb') || 
                    lowercaseName.includes('mushroom') || lowercaseName.includes('berry') ||
                    lowercaseName.includes('ration') || lowercaseName.includes('jerky') ||
                    lowercaseName.includes('pastry') || lowercaseName.includes('sweet');

  const isConsumableDesc = lowercaseDesc.includes('consume') || lowercaseDesc.includes('eat') || 
                           lowercaseDesc.includes('drink') || lowercaseDesc.includes('restore') || 
                           lowercaseDesc.includes('potable') || lowercaseDesc.includes('quenches') || 
                           lowercaseDesc.includes('tasty') || lowercaseDesc.includes('sip') ||
                           lowercaseDesc.includes('ingest');

  if (isFood === undefined && isPotion === undefined) {
    if (isDrinkable || isEdible || isConsumableDesc) {
      if (lowercaseName.includes('potion') || lowercaseName.includes('elixir') || lowercaseName.includes('vial') || lowercaseName.includes('draught') || lowercaseName.includes('phial') || lowercaseName.includes('tonic')) {
        isPotion = true;
      } else {
        isFood = true;
      }
    }
  }

  if ((isFood || isPotion || isDrinkable) && hungerReduction === undefined) {
    if (lowercaseName.includes('waterskin') || lowercaseName.includes('water') || lowercaseName.includes('flask') || lowercaseName.includes('canteen')) {
      hungerReduction = 5; // drinking is mostly for hydration/minor satiety
    } else if (isPotion) {
       hungerReduction = 0;
    } else {
      hungerReduction = 20; // default food value
    }
  }

  // Torch / Light check
  const isTorch = lowercaseName.includes('torch') || lowercaseName.includes('lantern') || 
                  lowercaseName.includes('candle') || lowercaseDesc.includes('light source') || 
                  lowercaseDesc.includes('emit light') || lowercaseDesc.includes('light up') ||
                  lowercaseDesc.includes('darkness');

  // Any wearable, held tool, torch, or jewel is equippable
  const isEquippable = isWeapon || isArmor || isTorch || 
                       item.insulationQuality !== undefined || item.comfortBonus !== undefined ||
                       lowercaseName.includes('ring') || lowercaseName.includes('amulet') || 
                       lowercaseName.includes('necklace') || lowercaseName.includes('talisman') || 
                       lowercaseName.includes('circlet') || lowercaseName.includes('crown') || 
                       lowercaseName.includes('spyglass') || lowercaseName.includes('compass') || 
                       lowercaseName.includes('tool');

  return {
    ...item,
    damage: inferredDamage,
    armorRating: inferredArmor,
    isWeapon: isWeapon || (inferredDamage !== undefined),
    isArmor: isArmor || (inferredArmor !== undefined),
    isFood: isFood,
    isPotion: isPotion,
    hungerReduction: hungerReduction,
    isEquippable: isEquippable,
    isConsumable: !!(isFood || isPotion || isDrinkable || isEdible)
  };
};