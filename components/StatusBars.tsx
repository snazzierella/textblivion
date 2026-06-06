
import React from 'react';
import { PlayerCharacter } from '../types.ts';

interface StatusBarsProps {
  character: PlayerCharacter | null;
}

const StatusBar: React.FC<{ label: string; currentValue: number; maxValue: number; colorClass: string; srText: string }> = ({
  label,
  currentValue,
  maxValue,
  colorClass,
  srText
}) => {
  const percentage = maxValue > 0 ? (currentValue / maxValue) * 100 : 0;
  const clampedPercentage = Math.max(0, Math.min(percentage, 100));

  return (
    <div className="flex-1 mx-1">
      <span className="text-xs font-medium text-gray-300 sr-only">{label}</span> {/* For screen readers, label is still good */}
      <div 
        className="w-full bg-slate-700 rounded-full h-3.5 shadow-inner" 
        role="progressbar" 
        aria-valuenow={currentValue} 
        aria-valuemin={0} 
        aria-valuemax={maxValue} 
        aria-label={srText}
        title={srText} // Tooltip for mouse users
      >
        <div
          className={`${colorClass} h-3.5 rounded-full transition-all duration-300 ease-out`}
          style={{ width: `${clampedPercentage}%` }}
        />
      </div>
    </div>
  );
};

const StatusBars: React.FC<StatusBarsProps> = ({ character }) => {
  if (!character) {
    return null;
  }

  return (
    <div className="p-2 bg-slate-800 border-b border-slate-700 flex justify-around items-center shadow-md flex-shrink-0">
      <StatusBar
        label="Health"
        currentValue={character.currentHealth}
        maxValue={character.maxHealth}
        colorClass="bg-red-600" // Slightly darker red for better contrast
        srText={`Health: ${character.currentHealth} of ${character.maxHealth}`}
      />
      <StatusBar
        label="Mana"
        currentValue={character.currentMana}
        maxValue={character.maxMana}
        colorClass="bg-blue-600" // Slightly darker blue
        srText={`Mana: ${character.currentMana} of ${character.maxMana}`}
      />
      <StatusBar
        label="Fatigue"
        currentValue={character.currentFatigue}
        maxValue={character.maxFatigue}
        colorClass="bg-green-600" // Slightly darker green
        srText={`Fatigue: ${character.currentFatigue} of ${character.maxFatigue}`}
      />
    </div>
  );
};

export default StatusBars;