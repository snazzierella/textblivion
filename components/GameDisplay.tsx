

import React, { useEffect, useRef } from 'react';
import { GameState, NarrativeEntry, TimeOfDay, GamePhase, Season, SubSeason } from '../types.ts';
import { DAYS_OF_WEEK, formatHourMinute } from '../constants.ts';

interface GameDisplayProps {
  gameState: GameState;
  onChoiceSelect: (choice: string) => void;
}

const formatMarkdownLite = (text: string): string => {
  if (typeof text !== 'string') return '';
  let html = text;
  html = html.replace(/\n/g, '<br />');
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\_(.*?)\_/g, '<em>$1</em>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  return html;
};

const NARRATION_CUE_REGEX_DISPLAY = /(NARRATION|NARRATIVE)\s*_?\s*SAYS\s*_?\s*:\s*/gi;
const PLAYER_CUE_REGEX_DISPLAY = /PLAYER\s*_?\s*SAYS\s*_?\s*:\s*/gi;

const stripSpeakerCuesForDisplay = (text: string): string => {
    if (typeof text !== 'string') return '';
    let cleanedText = text;
    cleanedText = cleanedText.replace(NARRATION_CUE_REGEX_DISPLAY, '');
    cleanedText = cleanedText.replace(PLAYER_CUE_REGEX_DISPLAY, '');
    
    // Clean up lines: trim whitespace from each line and remove any lines that became empty
    return cleanedText
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .join('\n');
};


const GameDisplay: React.FC<GameDisplayProps> = ({ gameState, onChoiceSelect }) => {
  const logEndRef = useRef<HTMLDivElement>(null);
  const scrollableContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const lastEntry = gameState.narrativeLog[gameState.narrativeLog.length - 1];
    if (gameState.phase === GamePhase.CHARACTER_CREATION && lastEntry && lastEntry.type === 'dm') {
      scrollableContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [gameState.narrativeLog, gameState.phase]);

  const formatTimeHeader = (
    day: number, 
    dayOfWeek: string, 
    timeOfDay: TimeOfDay, 
    hourInDay: number, // float
    season: Season, 
    subSeason: SubSeason
  ): string => {
    const timeString = formatHourMinute(hourInDay);
    return `Day ${day}, ${dayOfWeek}, ${timeOfDay} (${timeString}) - ${subSeason} ${season}`;
  };

  const renderNarrativeEntry = (entry: NarrativeEntry) => {
    switch (entry.type) {
      case 'dm':
        const textForDisplay = stripSpeakerCuesForDisplay(entry.text as string);
        const formattedText = formatMarkdownLite(textForDisplay);
        return (
            <p className="mb-2 text-gray-200 leading-relaxed prompt-text-shadow">
                <span className="font-bold text-amber-400">Prompt {entry.promptNumber}:</span>
                <span dangerouslySetInnerHTML={{ __html: ' ' + formattedText }} />
            </p>
        );
      case 'player':
        return <p className="mb-2 text-blue-400 italic text-right">&gt; {entry.text}</p>;
      case 'system':
        return <p className="mb-2 text-xs text-gray-500 italic">{entry.text}</p>;
      case 'error':
        return <p className="mb-2 text-red-400 font-semibold">{entry.text}</p>;
      case 'status':
         return <p className="my-3 py-2 px-3 bg-gray-700 border-l-4 border-amber-500 text-amber-300 text-sm rounded-r-md shadow-md">{entry.text}</p>;
      case 'choices':
        if (Array.isArray(entry.text)) {
          return (
            <div className="my-3 p-3 bg-gray-700 rounded-lg shadow">
              <p className="text-amber-400 mb-2 font-semibold">Your options:</p>
              <ul className="list-none pl-0">
                {entry.text.map((choice, index) => (
                  <li key={index} className="mb-1">
                    <button
                      onClick={() => onChoiceSelect(choice)}
                      className="w-full text-left p-2 bg-gray-600 hover:bg-amber-600 rounded text-gray-200 hover:text-white transition-colors duration-150"
                    >
                      {choice}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          );
        }
        return null;
      default:
        return <p className="mb-2 text-gray-400">{entry.text}</p>;
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 bg-gray-900 text-sm text-gray-400 border-b border-gray-700 shadow-md">
        <div className="flex justify-between items-center">
          <span>{formatTimeHeader(gameState.currentDayNumber, gameState.currentDayOfWeek, gameState.currentTimeOfDay, gameState.currentHourInDay, gameState.currentSeason, gameState.currentSubSeason)}</span>
          <span>Septims: <span className="font-bold text-yellow-400">{gameState.inventory.septims}</span></span>
        </div>
        {gameState.character && (
          <div className="mt-1">
            <span>{gameState.character.name} ({gameState.character.race} {gameState.character.archetype})</span>
          </div>
        )}
         <div className="mt-1 text-xs text-amber-300">Objective: {gameState.currentObjective || "Explore Tamriel"}</div>
      </div>

      <div ref={scrollableContainerRef} className="flex-grow overflow-y-auto p-4 bg-gray-800 custom-scrollbar">
        {gameState.narrativeLog.map(entry => (
          <div key={entry.id}>
            {renderNarrativeEntry(entry)}
          </div>
        ))}
        <div ref={logEndRef} />
      </div>
    </div>
  );
};

export default GameDisplay;