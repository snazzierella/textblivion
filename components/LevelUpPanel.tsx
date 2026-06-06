import React from 'react';
import { PlayerCharacter, AttributeName, ATTRIBUTE_NAMES, Attributes } from '../types.ts';
import { ATTRIBUTE_DESCRIPTIONS, BASE_ATTRIBUTE_VALUE, LEVEL_UP_ATTRIBUTE_POINTS_TO_ALLOCATE } from '../constants.ts'; // Assuming LEVEL_UP_POINTS is defined

interface LevelUpPanelProps {
  character: PlayerCharacter | null;
  attributePointsToSpend: number;
  currentAssignments: Partial<Attributes>; // Deltas being assigned in this session
  onAttributeChange: (attribute: AttributeName, change: number) => void;
  onConfirm: () => void;
}

const LevelUpPanel: React.FC<LevelUpPanelProps> = ({
  character,
  attributePointsToSpend,
  currentAssignments,
  onAttributeChange,
  onConfirm,
}) => {
  if (!character) return null;

  const getDisplayedAttributeValue = (attrName: AttributeName): number => {
    return (character.attributes[attrName] || BASE_ATTRIBUTE_VALUE) + (currentAssignments[attrName] || 0);
  };

  const pointsActuallyAssigned = Object.values(currentAssignments).reduce((sum: number, val) => sum + ((val as number) || 0), 0) as number;
  const remainingPointsToAssign = LEVEL_UP_ATTRIBUTE_POINTS_TO_ALLOCATE - pointsActuallyAssigned;


  return (
    <div className="p-4 bg-gray-800 border-t border-gray-700">
      <h2 className="text-xl font-bold text-amber-400 mb-3 text-center">Level Up!</h2>
      <p className="text-center text-gray-300 mb-1">
        You have <strong className="text-amber-300">{remainingPointsToAssign}</strong> attribute points to assign.
      </p>
      <p className="text-xs text-center text-gray-400 mb-4">
        Your attributes will be permanently increased.
      </p>

      <div className="space-y-3 max-w-md mx-auto">
        {ATTRIBUTE_NAMES.map(attr => (
          <div key={attr} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg shadow">
            <div>
                <span className="font-semibold text-gray-100">{attr}: </span>
                <span className="text-amber-300 font-bold">{getDisplayedAttributeValue(attr)}</span>
                <p className="text-xs text-gray-400 mt-1">{ATTRIBUTE_DESCRIPTIONS[attr]}</p>
            </div>
            <div className="space-x-2 flex items-center">
              <button
                onClick={() => onAttributeChange(attr, -1)}
                disabled={(currentAssignments[attr] || 0) <= 0}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-md text-lg font-bold disabled:opacity-50 transition-colors"
                aria-label={`Decrease ${attr}`}
              >
                -
              </button>
              <span className="w-6 text-center text-gray-200">{(currentAssignments[attr] || 0) > 0 ? `+${currentAssignments[attr]}` : '0'}</span>
              <button
                onClick={() => onAttributeChange(attr, 1)}
                disabled={remainingPointsToAssign <= 0}
                className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-md text-lg font-bold disabled:opacity-50 transition-colors"
                aria-label={`Increase ${attr}`}
              >
                +
              </button>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={onConfirm}
        disabled={remainingPointsToAssign !== 0}
        className="mt-6 w-full max-w-md mx-auto block p-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold transition-colors duration-150 disabled:bg-gray-500 disabled:cursor-not-allowed"
      >
        Confirm Attribute Increases
      </button>
    </div>
  );
};

export default LevelUpPanel;