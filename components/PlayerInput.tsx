
import React, { useState } from 'react';
import { GamePhase } from '../types.ts'; 

interface PlayerInputProps {
  onSubmit: (input: string) => void;
  disabled: boolean;
  placeholder?: string;
  currentPhase?: GamePhase; 
  lastCallFailed?: boolean;
  onRetry?: () => void;
}

const PlayerInput: React.FC<PlayerInputProps> = ({ onSubmit, disabled, placeholder, currentPhase, lastCallFailed, onRetry }) => {
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
    <form onSubmit={handleSubmit} className="p-4 border-t border-gray-700 bg-gray-900 shadow-lg">
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        disabled={disabled}
        className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-colors duration-150"
        placeholder={dynamicPlaceholder}
        autoFocus
      />
      <div className="flex flex-col sm:flex-row gap-2 mt-3">
        <button 
          type="submit" 
          disabled={disabled || !input.trim()}
          className="flex-1 p-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold transition-colors duration-150 disabled:bg-gray-500 disabled:cursor-not-allowed"
        >
          Send
        </button>
        {lastCallFailed && onRetry && (
          <button 
            type="button" 
            onClick={onRetry}
            className="flex-1 p-3 bg-gradient-to-r from-red-800 to-rose-950 hover:from-red-700 hover:to-rose-900 text-amber-100 rounded-lg font-semibold transition-all duration-150 shadow-md flex items-center justify-center gap-2 border border-red-500/30 hover:scale-[1.01]"
          >
            <svg className="w-5 h-5 animate-pulse text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11l3 3L22 4" />
            </svg>
            Retry Storyteller
          </button>
        )}
      </div>
    </form>
  );
};

export default PlayerInput;
