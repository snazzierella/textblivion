
import React, { useState } from 'react';
import { GamePhase } from '../types.ts'; 

interface PlayerInputProps {
  onSubmit: (input: string) => void;
  disabled: boolean;
  placeholder?: string;
  currentPhase?: GamePhase; 
}

const PlayerInput: React.FC<PlayerInputProps> = ({ onSubmit, disabled, placeholder, currentPhase }) => {
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (input.trim() && !disabled) {
      onSubmit(input.trim());
      setInput('');
    }
  };

  let dynamicPlaceholder = placeholder || "What do you do?";
  if (disabled) {
    dynamicPlaceholder = "Awaiting storyteller...";
  } else if (currentPhase === GamePhase.AWAITING_BEDTIME_INTENT_CONFIRMATION) {
    dynamicPlaceholder = "Confirm bedtime? (yes/no)";
  } else if (currentPhase === GamePhase.AWAITING_BEDTIME_SUMMARY_CONFIRMATION) {
    dynamicPlaceholder = "Confirm EOD summary (yes/no) or suggest corrections...";
  } else if (currentPhase === GamePhase.AWAITING_NEW_GAME_CONFIRMATION) {
    dynamicPlaceholder = "Confirm new game? (yes/no)";
  }


  return (
    <form onSubmit={handleSubmit} className="p-4 border-t border-gray-700 bg-gray-900 shadow- ऊपर">
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        disabled={disabled}
        className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-colors duration-150"
        placeholder={dynamicPlaceholder}
        autoFocus
      />
      <button 
        type="submit" 
        disabled={disabled || !input.trim()}
        className="mt-3 w-full p-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold transition-colors duration-150 disabled:bg-gray-500 disabled:cursor-not-allowed"
      >
        Send
      </button>
    </form>
  );
};

export default PlayerInput;
