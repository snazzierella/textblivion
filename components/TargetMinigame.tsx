
import React, { useState, useEffect, useRef } from 'react';
import { TargetMinigameConfig, TargetMinigameTarget } from '../types';

interface TargetMinigameProps {
  config: TargetMinigameConfig;
  onEnd: (success: boolean) => void;
  characterLevel?: number;
}

const TargetMinigame: React.FC<TargetMinigameProps> = ({ config, onEnd, characterLevel = 1 }) => {
  const levelBonus = Math.max(0, characterLevel - 1);
  const totalDuration = config.durationSeconds + levelBonus;
  const [timeLeft, setTimeLeft] = useState(totalDuration);
  const timerRef = useRef<number | null>(null);
  const [hasClicked, setHasClicked] = useState(false);

  useEffect(() => {
    setTimeLeft(totalDuration); // Reset time on new config
    setHasClicked(false); // Reset clicked state

    timerRef.current = window.setInterval(() => { // Use window.setInterval for clarity in browser environment
      setTimeLeft(prevTime => {
        if (prevTime <= 1) {
          clearInterval(timerRef.current!);
          if (!hasClicked) { // Only trigger failure if no click has been processed
            onEnd(false);
          }
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [totalDuration, onEnd, hasClicked]); // Add hasClicked and totalDuration to dependency array

  const handleTargetClick = (target: TargetMinigameTarget) => {
    if (hasClicked) return; // Prevent multiple clicks from processing
    setHasClicked(true);

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    onEnd(target.isCorrect);
  };
  
  // Simple positioning for targets; can be improved with dynamic layout
  const targetPositions = [
    { top: '20%', left: '50%', transform: 'translateX(-50%)' },
    { top: '40%', left: '30%', transform: 'translateX(-50%)' },
    { top: '40%', left: '70%', transform: 'translateX(-50%)' },
    { top: '60%', left: '40%', transform: 'translateX(-50%)' },
    { top: '60%', left: '60%', transform: 'translateX(-50%)' },
  ];


  return (
    <div 
        className="fixed inset-0 bg-black bg-opacity-80 flex flex-col items-center justify-center z-50 p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="minigame-prompt"
    >
      <div className="bg-slate-800 p-6 rounded-xl shadow-2xl border-2 border-amber-500 text-center max-w-lg w-full">
        <h2 id="minigame-prompt" className="text-2xl font-bold text-amber-300 mb-3 prompt-text-shadow">
          {config.promptText}
        </h2>
        
        <div className="my-4 text-6xl font-mono text-red-500 animate-pulse relative inline-block mx-auto" aria-live="assertive" aria-atomic="true">
          {timeLeft}
          {characterLevel > 1 && (
            <div className="text-[10px] uppercase font-bold tracking-wider text-amber-400 mt-1">
              ✨ +{characterLevel - 1}s Level Bonus
            </div>
          )}
        </div>

        <div className="relative h-48 w-full my-4"> {/* Container for targets */}
          {config.targets.map((target, index) => (
            <button
              key={target.id}
              onClick={() => handleTargetClick(target)}
              disabled={hasClicked}
              className={`absolute px-4 py-2 text-sm font-semibold text-white bg-slate-600 rounded-lg shadow-md
                          hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-opacity-75
                          transition-all duration-150 ease-in-out transform hover:scale-105
                          disabled:opacity-60 disabled:cursor-not-allowed`}
              style={targetPositions[index % targetPositions.length]} // Cycle through predefined positions
              aria-label={`Target: ${target.label}`}
            >
              {target.label}
            </button>
          ))}
        </div>
        
        <p className="text-xs text-gray-400 mt-4">
          Click the correct target before time runs out!
        </p>
      </div>
    </div>
  );
};

export default TargetMinigame;