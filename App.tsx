

import React, { useState } from 'react';
import { useGameEngine } from './hooks/useGameEngine.ts';
import GameDisplay from './components/GameDisplay.tsx';
import PlayerInput from './components/PlayerInput.tsx';
import CharacterCreation from './components/CharacterCreation.tsx';
import LoadingSpinner from './components/LoadingSpinner.tsx';
import { CharacterPanel } from './components/CharacterPanel.tsx';
import InventoryPanel from './components/InventoryPanel.tsx';
import QuestLogPanel from './components/QuestLogPanel.tsx';
import MapPanel from './components/MapPanel.tsx';
import MapModal from './components/MapModal.tsx'; 
import LevelUpPanel from './components/LevelUpPanel.tsx'; 
import StatusBars from './components/StatusBars.tsx'; 
import SceneVisionPanel from './components/SceneVisionPanel.tsx';
import TargetMinigame from './components/TargetMinigame.tsx';
import SoundSettingsModal from './components/SoundSettingsModal.tsx'; 
import { SaveLoadModal } from './components/SaveLoadModal.tsx';
import { GamePhase } from './types.ts';
import { DM_COMMAND_PREFIX } from './constants.ts'; 

const App: React.FC = () => {
  const { 
    state, 
    dispatch,
    handlePlayerInput, 
    handleRetry,
    characterCreationState, 
    ccStep, 
    saveGameSlot, 
    loadGameSlot, 
    deleteGameSlot, 
    slotsMetadata, 
    hasLegacySave, 
    importLegacySave, 
    requestNewGame, 
    handleAttributeChange, 
    setCharacterCreationState,
    levelUpAttributeAssignments, 
    levelUpPointsToSpend,       
    handleLevelUpAttributeSubmit,
    generateAndSetSceneImage,
    isGeneratingSceneImage,
    retryCharacterImageGeneration,
    isRetryingCharacterImage,
    handleTargetMinigameEnd,
    toggleTTS,
    setNarratorVoiceURI,
    setPlayerVoiceURI,
    replayLastAudio
  } = useGameEngine();

  const [activeRightTab, setActiveRightTab] = React.useState<'inventory' | 'quests' | 'map' | 'vision'>('inventory');
  const [activeLeftTab, setActiveLeftTab] = React.useState<'character' | 'stats'>('character');
  const [isMapModalOpen, setIsMapModalOpen] = React.useState(false); 
  const [isSoundSettingsModalOpen, setIsSoundSettingsModalOpen] = React.useState(false);
  const [isSaveLoadModalOpen, setIsSaveLoadModalOpen] = React.useState(false);
  const [showMobileSidebars, setShowMobileSidebars] = useState(false);

  // Autosave game state on updates
  React.useEffect(() => {
    if (state.character && state.phase !== GamePhase.CHARACTER_CREATION && state.phase !== GamePhase.AWAITING_AUTOSAVE_LOAD_CONFIRMATION) {
      try {
        localStorage.setItem('textblivion_autosave', JSON.stringify(state));
        localStorage.setItem('textblivion_autosave_timestamp', Date.now().toString());
      } catch (e) {
        console.error('Failed to autosave game state:', e);
      }
    }
  }, [state]);

  const calculatedShowSidePanels = state.character &&
    state.phase !== GamePhase.CHARACTER_CREATION &&
    state.phase !== GamePhase.LEVEL_UP_ATTRIBUTE_ALLOCATION && 
    state.phase !== GamePhase.LOADING_API_KEY &&
    state.phase !== GamePhase.API_KEY_MISSING &&
    state.phase !== GamePhase.AWAITING_NEW_GAME_CONFIRMATION &&
    state.phase !== GamePhase.PLAYER_FAINTED &&
    state.phase !== GamePhase.TARGET_MINIGAME_ACTIVE &&
    state.phase !== GamePhase.AWAITING_POST_LEVELUP_REST &&
    state.phase !== GamePhase.PLAYER_FAINTED_RECOVERY; 
  
  const showSidePanels = calculatedShowSidePanels;
  const showStatusBars = calculatedShowSidePanels;

  const openMapModal = () => setIsMapModalOpen(true);
  const closeMapModal = () => setIsMapModalOpen(false);
  const openSoundSettingsModal = () => setIsSoundSettingsModalOpen(true); 
  const closeSoundSettingsModal = () => setIsSoundSettingsModalOpen(false); 

  const renderGamePhaseContent = () => {
    switch (state.phase) {
      case GamePhase.LOADING_API_KEY:
        return <div className="p-8 text-center"><LoadingSpinner /><p className="mt-4 text-lg text-gray-400">Checking scrolls of power (API Key)...</p></div>;
      case GamePhase.API_KEY_MISSING:
        return (
          <div className="p-8 text-center text-red-400 bg-red-900 border border-red-700 rounded-lg">
            <h2 className="text-2xl font-bold mb-4">API Key Error</h2>
            <p className="mb-2">The ancient scrolls require a valid API Key to be deciphered.</p>
            <p>Please ensure <code className="bg-red-700 px-1 rounded text-red-200">process.env.API_KEY</code> is correctly set in your environment.</p>
            <p className="mt-4 text-sm">This application cannot proceed without it.</p>
          </div>
        );
      case GamePhase.CHARACTER_CREATION:
        return (
          <>
            <GameDisplay gameState={state} onChoiceSelect={() => {}} />
            <CharacterCreation
              narrativeLog={state.narrativeLog} 
              currentChoices={state.currentChoices} 
              onSubmit={handlePlayerInput} 
              ccStep={ccStep}
              characterCreationState={characterCreationState}
              onAttributeChange={handleAttributeChange}
              onSetCharacterCreationState={setCharacterCreationState}
            />
          </>
        );
      case GamePhase.LEVEL_UP_ATTRIBUTE_ALLOCATION:
        return (
            <>
                <GameDisplay gameState={state} onChoiceSelect={() => {}} />
                <LevelUpPanel
                    character={state.character}
                    attributePointsToSpend={levelUpPointsToSpend}
                    currentAssignments={levelUpAttributeAssignments}
                    onAttributeChange={handleAttributeChange}
                    onConfirm={handleLevelUpAttributeSubmit}
                />
            </>
        );
      case GamePhase.PLAYER_FAINTED: 
        return (
            <>
              <GameDisplay gameState={state} onChoiceSelect={() => {}} />
              <div className="p-4 text-center text-red-500">
                <LoadingSpinner />
                <p className="mt-2">Darkness overcomes you...</p>
              </div>
            </>
          );
      case GamePhase.PLAYER_FAINTED_RECOVERY: 
        return (
            <>
              <GameDisplay gameState={state} onChoiceSelect={() => {}} />
              <div className="p-4 text-center text-yellow-400">
                 <LoadingSpinner />
                 <p className="mt-2">Regaining consciousness...</p>
              </div>
            </>
          );
      case GamePhase.TARGET_MINIGAME_ACTIVE:
        if (state.currentTargetMinigameConfig) {
            return (
                <>
                    <GameDisplay gameState={state} onChoiceSelect={() => {}} /> 
                    <TargetMinigame 
                        config={state.currentTargetMinigameConfig} 
                        onEnd={handleTargetMinigameEnd} 
                        characterLevel={state.character?.level || 1}
                    />
                </>
            );
        }
        return <GameDisplay gameState={state} onChoiceSelect={handlePlayerInput} />;

      case GamePhase.AWAITING_POST_LEVELUP_REST:
      case GamePhase.PROCESSING_INPUT: 
      case GamePhase.AWAITING_BEDTIME_SUMMARY_GENERATION: 
      case GamePhase.ADVENTURE_INTRO: 
         if(state.phase === GamePhase.PROCESSING_INPUT || 
           state.phase === GamePhase.AWAITING_BEDTIME_SUMMARY_GENERATION ||
           state.phase === GamePhase.AWAITING_POST_LEVELUP_REST ||
           (state.phase === GamePhase.ADVENTURE_INTRO && !state.narrativeLog.some(e=>e.type ==='dm'))) {
          return (
            <>
              <GameDisplay gameState={state} onChoiceSelect={handlePlayerInput} />
              <LoadingSpinner />
            </>
          );
        }
        // Fall through for other cases if not loading specifically
      case GamePhase.AWAITING_INPUT:
      case GamePhase.AWAITING_BEDTIME_SUMMARY_CONFIRMATION:
      case GamePhase.AWAITING_BEDTIME_INTENT_CONFIRMATION: 
      case GamePhase.AWAITING_NEW_GAME_CONFIRMATION: 
        return <GameDisplay gameState={state} onChoiceSelect={handlePlayerInput} />;
      default:
        if (state.narrativeLog && state.narrativeLog.length > 0) {
            return <GameDisplay gameState={state} onChoiceSelect={handlePlayerInput} />;
        }
        return <div className="p-8 text-center text-gray-400">The path is unclear. Current phase: {state.phase}</div>;
    }
  };

  const renderPlayerInputArea = () => {
    if (
      state.phase === GamePhase.AWAITING_INPUT ||
      state.phase === GamePhase.AWAITING_BEDTIME_SUMMARY_CONFIRMATION ||
      state.phase === GamePhase.AWAITING_BEDTIME_INTENT_CONFIRMATION ||
      state.phase === GamePhase.AWAITING_NEW_GAME_CONFIRMATION
    ) {
      return (
        <PlayerInput
          onSubmit={handlePlayerInput}
          disabled={false}
          currentPhase={state.phase} 
          lastCallFailed={state.lastCallFailed}
          onRetry={handleRetry}
        />
      );
    }
    return null;
  };
  
  const canSaveGame = state.character && 
                      state.phase !== GamePhase.CHARACTER_CREATION &&
                      state.phase !== GamePhase.LEVEL_UP_ATTRIBUTE_ALLOCATION &&
                      state.phase !== GamePhase.LOADING_API_KEY &&
                      state.phase !== GamePhase.API_KEY_MISSING &&
                      state.phase !== GamePhase.AWAITING_NEW_GAME_CONFIRMATION &&
                      state.phase !== GamePhase.PLAYER_FAINTED &&
                      state.phase !== GamePhase.TARGET_MINIGAME_ACTIVE &&
                      state.phase !== GamePhase.AWAITING_POST_LEVELUP_REST &&
                      state.phase !== GamePhase.PLAYER_FAINTED_RECOVERY;

  const renderRightSidebarContent = () => {
    if (!state.character) return null;

    let content = null;
    switch (activeRightTab) {
      case 'inventory':
        content = (
          <>
            <InventoryPanel 
              title="Carried" 
              items={state.inventory.carried} 
              septims={state.inventory.septims} 
              dispatch={dispatch} 
              equippedItems={state.character?.equippedItems || []} 
            />
            <InventoryPanel 
              title="Stashed" 
              items={state.inventory.stashed} 
              dispatch={dispatch} 
              equippedItems={state.character?.equippedItems || []} 
              isStashed={true}
            />
          </>
        );
        break;
      case 'quests':
        content = <QuestLogPanel quests={state.prospectiveQuests} currentObjective={state.currentObjective} />;
        break;
      case 'map':
        content = <MapPanel 
                    currentProvince={state.currentProvince} 
                    currentCity={state.currentCity} 
                    currentWeather={state.currentWeather} 
                    currentEnvironmentalCondition={state.currentEnvironmentalCondition}
                    onMapClick={openMapModal} 
                    currentTemperature={state.currentTemperature}
                  />;
        break;
      case 'vision':
        content = <SceneVisionPanel 
                    imageUrl={state.currentSceneImageUrl || null} 
                    onGenerate={generateAndSetSceneImage} 
                    isLoading={isGeneratingSceneImage} 
                    characterName={state.character?.name}
                  />;
        break;
    }
    return <div className="p-3">{content}</div>;
  };

  const renderAutosaveModal = () => {
    if (state.phase !== GamePhase.AWAITING_AUTOSAVE_LOAD_CONFIRMATION) return null;

    const autosaveTime = state.autosaveTimestamp 
      ? new Date(state.autosaveTimestamp).toLocaleString() 
      : 'Unknown Time';

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
        <div className="w-full max-w-md bg-slate-900/90 border border-amber-500/30 rounded-xl p-6 shadow-2xl backdrop-blur-md relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 animate-pulse"></div>
          
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500">
              <svg className="w-6 h-6 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-amber-100 font-serif font-semibold">Autosave Detected</h3>
          </div>

          <p className="text-sm text-slate-300 leading-relaxed mb-6">
            An unsaved game session from <span className="text-amber-400 font-semibold">{autosaveTime}</span> was found. 
            This autosave is newer than your manual save. Would you like to restore it to continue playing?
          </p>

          <div className="flex flex-col gap-2">
            <button
              onClick={() => dispatch({ type: 'CONFIRM_AUTOSAVE_LOAD' })}
              className="w-full p-3 bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-slate-950 font-bold rounded-lg transition-all duration-150 shadow-md flex items-center justify-center gap-2 hover:scale-[1.01]"
            >
              Restore Unsaved Progress
            </button>
            <button
              onClick={() => dispatch({ type: 'REJECT_AUTOSAVE_LOAD' })}
              className="w-full p-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-semibold transition-colors duration-150"
            >
              {state.fallbackManualSaveStateToLoad ? "Load Most Recent Manual Save" : "Start New Game"}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`h-screen w-screen flex flex-col ${showSidePanels ? 'max-w-7xl' : 'max-w-3xl'} mx-auto bg-gray-900 shadow-2xl relative`}>
      <header className="p-4 bg-gradient-to-r from-gray-900 via-black to-gray-900 text-center border-b-2 border-amber-600 shadow-lg flex-shrink-0 flex justify-between items-center relative z-20">
        <h1 className="text-xl md:text-3xl font-bold text-amber-400 tracking-wider flex-grow text-center" style={{ fontFamily: "'Cinzel Decorative', cursive, serif", textShadow: "2px 2px 4px #000" }}>
          Textblivion
        </h1>
        {/* Mobile Sidebar Toggle */}
        {showSidePanels && (
             <button 
             onClick={() => setShowMobileSidebars(!showMobileSidebars)}
             className="md:hidden p-2 text-amber-400 border border-amber-600 rounded bg-gray-800"
             aria-label="Toggle Sidebars"
           >
             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
             </svg>
           </button>
        )}
      </header>

      {showStatusBars && state.character && <StatusBars character={state.character} />}

      <main className="flex-grow flex overflow-hidden bg-gray-800 relative">
        {/* Left Sidebar (Desktop) */}
        {showSidePanels && state.character && (
          <aside className={`hidden md:flex w-1/4 md:w-1/5 lg:w-1/4 xl:w-1/5 bg-gray-700 flex-col overflow-hidden border-r border-gray-600 flex-shrink-0 min-w-[200px]`}>
            <div className="flex border-b border-gray-600 flex-shrink-0">
               <button 
                onClick={() => setActiveLeftTab('character')} 
                className={`flex-1 p-2 text-center text-sm font-medium transition-colors duration-150 ${activeLeftTab === 'character' ? 'bg-amber-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-600 hover:text-gray-200'}`}
                aria-pressed={activeLeftTab === 'character'}
              >
                Char
              </button>
              <button 
                onClick={() => setActiveLeftTab('stats')} 
                className={`flex-1 p-2 text-center text-sm font-medium transition-colors duration-150 ${activeLeftTab === 'stats' ? 'bg-amber-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-600 hover:text-gray-200'}`}
                aria-pressed={activeLeftTab === 'stats'}
              >
                Stats
              </button>
            </div>
            <div className="flex-grow overflow-y-auto custom-scrollbar p-3">
              <CharacterPanel 
                character={state.character} 
                activeEffects={state.activeEffects} 
                activeTab={activeLeftTab} 
                currentShelter={state.currentShelter}
                currentShelterName={state.currentShelterName}
                currentEnvironment={state.currentEnvironmentalCondition}
                currentTemperature={state.currentTemperature}
                retryCharacterImageGeneration={retryCharacterImageGeneration}
                isRetryingCharacterImage={isRetryingCharacterImage}
                permanentSkillUpsSinceLastLevelUp={state.permanentSkillUpsSinceLastLevelUp}
              />
            </div>
          </aside>
        )}
        
        {/* Main Content Area */}
        <section className="flex-grow flex flex-col overflow-hidden relative z-0">
          <div className="flex-grow overflow-y-auto custom-scrollbar">
            {renderGamePhaseContent()}
          </div>
          {renderPlayerInputArea()}
        </section>

        {/* Right Sidebar (Desktop) */}
        {showSidePanels && state.character && (
          <aside className={`hidden md:flex w-1/4 md:w-1/5 lg:w-1/4 xl:w-1/5 bg-gray-700 flex-col overflow-hidden border-l border-gray-600 flex-shrink-0 min-w-[200px]`}>
            <div className="flex border-b border-gray-600 flex-shrink-0">
              { (['inventory', 'quests', 'map', 'vision'] as const).map(tabName => (
                  <button
                    key={tabName}
                    onClick={() => setActiveRightTab(tabName)}
                    className={`flex-1 p-2 text-center text-xs sm:text-sm font-medium transition-colors duration-150 capitalize ${activeRightTab === tabName ? 'bg-amber-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-600 hover:text-gray-200'}`}
                    aria-pressed={activeRightTab === tabName}
                  >
                    {tabName.slice(0, 4)}
                  </button>
              ))}
            </div>
            <div className="flex-grow overflow-y-auto custom-scrollbar">
              {renderRightSidebarContent()}
            </div>
          </aside>
        )}

        {/* Mobile Overlay Sidebars */}
        {showSidePanels && showMobileSidebars && (
          <div className="absolute inset-0 bg-gray-900 z-10 flex flex-col md:hidden overflow-y-auto p-4 space-y-4">
             {/* Combine relevant parts of Left and Right sidebars for mobile view */}
             <div className="flex justify-between mb-4">
               <h2 className="text-xl font-bold text-amber-400">Journal & Stats</h2>
               <button onClick={() => setShowMobileSidebars(false)} className="text-gray-400">Close</button>
             </div>
             
             {/* Character/Stats Tabs */}
             <div className="flex border-b border-gray-600">
                <button onClick={() => setActiveLeftTab('character')} className={`flex-1 p-2 ${activeLeftTab === 'character' ? 'bg-amber-600' : 'bg-gray-700'}`}>Char</button>
                <button onClick={() => setActiveLeftTab('stats')} className={`flex-1 p-2 ${activeLeftTab === 'stats' ? 'bg-amber-600' : 'bg-gray-700'}`}>Stats</button>
             </div>
             <div className="bg-gray-800 p-2 rounded max-h-60 overflow-y-auto">
                <CharacterPanel 
                  character={state.character} 
                  activeEffects={state.activeEffects} 
                  activeTab={activeLeftTab} 
                  currentShelter={state.currentShelter}
                  currentShelterName={state.currentShelterName}
                  currentEnvironment={state.currentEnvironmentalCondition}
                  currentTemperature={state.currentTemperature}
                  retryCharacterImageGeneration={retryCharacterImageGeneration}
                  isRetryingCharacterImage={isRetryingCharacterImage}
                  permanentSkillUpsSinceLastLevelUp={state.permanentSkillUpsSinceLastLevelUp}
                />
             </div>

             {/* Right Sidebar Tabs */}
             <div className="flex border-b border-gray-600 mt-4">
               { (['inventory', 'quests', 'map', 'vision'] as const).map(tabName => (
                  <button key={tabName} onClick={() => setActiveRightTab(tabName)} className={`flex-1 p-2 capitalize ${activeRightTab === tabName ? 'bg-amber-600' : 'bg-gray-700'}`}>{tabName}</button>
               ))}
             </div>
             <div className="bg-gray-800 p-2 rounded flex-grow overflow-y-auto">
                {renderRightSidebarContent()}
             </div>
          </div>
        )}

      </main>
      <footer className="p-2 bg-black text-xs text-gray-500 border-t border-gray-700 flex-shrink-0 flex justify-between items-center z-20">
        <span className="px-2 hidden sm:inline">
          Powered by Gemini. Use 'bedtime' to end day. Type '{DM_COMMAND_PREFIX} help'.
          {state.isDebugMode && <span className="ml-2 font-bold text-yellow-300">[Debug]</span>}
        </span>
        <span className="px-2 sm:hidden">
            'Bedtime' to end day.
        </span>
        <div className="space-x-2 px-2 flex">
          <button
            onClick={openSoundSettingsModal} 
            className="px-2 py-1 bg-teal-600 hover:bg-teal-500 text-white text-xs rounded transition-colors"
            aria-label="Open sound settings"
          >
            Sounds
          </button>
          <button
            onClick={requestNewGame}
            className="px-2 py-1 bg-red-700 hover:bg-red-600 text-white text-xs rounded transition-colors disabled:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Start a new game"
            disabled={state.phase === GamePhase.LOADING_API_KEY || state.phase === GamePhase.API_KEY_MISSING}
          >
            New Game
          </button>
          <button 
            onClick={() => setIsSaveLoadModalOpen(true)} 
            className="px-2 py-1 bg-amber-700 hover:bg-amber-600 text-white text-xs rounded transition-colors"
            aria-label="Open save load manager"
            disabled={state.phase === GamePhase.LOADING_API_KEY || state.phase === GamePhase.API_KEY_MISSING}
          >
            Saves
          </button>
        </div>
      </footer>
      
      <MapModal 
        isOpen={isMapModalOpen} 
        onClose={closeMapModal} 
        currentProvince={state.currentProvince} 
        currentCity={state.currentCity} 
        currentWeather={state.currentWeather}
        currentTemperature={state.currentTemperature}
      />
      <SoundSettingsModal 
        isOpen={isSoundSettingsModalOpen}
        onClose={closeSoundSettingsModal}
        ttsEnabled={state.ttsEnabled}
        onToggleTTS={toggleTTS}
        narratorVoice={state.ttsNarratorVoiceURI || ''}
        onSetNarratorVoice={setNarratorVoiceURI}
        playerVoice={state.ttsPlayerVoiceURI || ''}
        onSetPlayerVoice={setPlayerVoiceURI}
        onReplayLastAudio={replayLastAudio}
        voiceOptions={state.availableVoices}
      />
      <SaveLoadModal
        isOpen={isSaveLoadModalOpen}
        onClose={() => setIsSaveLoadModalOpen(false)}
        canSaveGame={canSaveGame}
        slotsMetadata={slotsMetadata}
        hasLegacySave={hasLegacySave}
        onSaveSlot={saveGameSlot}
        onLoadSlot={async (slotId) => {
          await loadGameSlot(slotId);
          setIsSaveLoadModalOpen(false);
        }}
        onDeleteSlot={deleteGameSlot}
        onImportLegacy={importLegacySave}
      />
      {renderAutosaveModal()}
    </div>
  );
};

export default App;