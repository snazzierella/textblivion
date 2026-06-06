import React, { useEffect, useRef, useState } from 'react';
import { SaveSlotMetadata } from '../types.ts';
import { GENERIC_RACE_PORTRAITS } from '../constants.ts';

interface SaveLoadModalProps {
  isOpen: boolean;
  onClose: () => void;
  canSaveGame: boolean;
  slotsMetadata: SaveSlotMetadata[];
  hasLegacySave: boolean;
  onSaveSlot: (slotId: string) => void;
  onLoadSlot: (slotId: string) => Promise<void>;
  onDeleteSlot: (slotId: string) => void;
  onImportLegacy: (slotId: string) => boolean;
}

const SLOTS = ['slot_1', 'slot_2', 'slot_3', 'slot_4', 'slot_5'];

export const SaveLoadModal: React.FC<SaveLoadModalProps> = ({
  isOpen,
  onClose,
  canSaveGame,
  slotsMetadata,
  hasLegacySave,
  onSaveSlot,
  onLoadSlot,
  onDeleteSlot,
  onImportLegacy,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);

  // States for confirmation
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmOverwrite, setConfirmOverwrite] = useState<string | null>(null);
  const [justImported, setJustImported] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      previouslyFocusedElementRef.current = document.activeElement as HTMLElement;
      // Reset confirmation states on open
      setConfirmDelete(null);
      setConfirmOverwrite(null);
      setJustImported(null);

      // Simple keyboard trapping
      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          onClose();
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
        previouslyFocusedElementRef.current?.focus();
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="save-load-modal-title"
    >
      <div
        ref={modalRef}
        className="bg-slate-900 border border-amber-600/30 p-6 rounded-lg shadow-2xl max-w-2xl w-full text-slate-100 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-3">
          <h2 id="save-load-modal-title" className="text-2xl font-bold text-amber-500 font-serif tracking-wide">
            Save / Load Game
          </h2>
          <button
            onClick={onClose}
            id="close-save-load-modal-btn"
            className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-red-800 rounded-full transition-colors duration-200"
            aria-label="Close save load panel"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Info Bar */}
        <div className="mb-4 text-xs text-slate-400 bg-slate-950 p-2 rounded border border-slate-800">
          {!canSaveGame ? (
            <span className="text-amber-600/80">⚠️ Saving is not available right now. Complete character creation or wait for bedtime to save your progress.</span>
          ) : (
            <span className="text-emerald-500">✓ Ready to save. Choose a slot to record your current adventure.</span>
          )}
        </div>

        {/* Slots Container */}
        <div className="space-y-4 overflow-y-auto pr-1 flex-1 custom-scrollbar">
          {SLOTS.map((slotId, index) => {
            const metadata = slotsMetadata.find((m) => m.id === slotId);
            const slotNumber = index + 1;

            // Delete Confirmation Overlay State
            if (confirmDelete === slotId) {
              return (
                <div
                  key={slotId}
                  className="bg-slate-950 border-2 border-red-900 rounded-lg p-4 flex flex-col md:flex-row items-center justify-between gap-4"
                >
                  <div>
                    <h4 className="text-sm font-semibold text-red-400 font-serif">⚠️ DELETE SAVE SLOT {slotNumber}?</h4>
                    <p className="text-xs text-slate-400 mt-1">This will permanently delete "{metadata?.characterName || 'Unnamed character'}"'s progress. This cannot be undone.</p>
                  </div>
                  <div className="flex gap-2 w-full md:w-auto">
                    <button
                      onClick={() => {
                        onDeleteSlot(slotId);
                        setConfirmDelete(null);
                      }}
                      id={`confirm-delete-btn-${slotId}`}
                      className="flex-1 md:flex-initial px-4 py-2 bg-red-900 border border-red-700 text-white font-serif text-sm rounded shadow hover:bg-red-800 transition-all duration-200"
                    >
                      Confirm Delete
                    </button>
                    <button
                      onClick={() => setConfirmDelete(null)}
                      className="flex-1 md:flex-initial px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-serif text-sm rounded transition-all duration-200"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              );
            }

            // Overwrite Confirmation Overlay State
            if (confirmOverwrite === slotId) {
              return (
                <div
                  key={slotId}
                  className="bg-slate-950 border-2 border-amber-700 rounded-lg p-4 flex flex-col md:flex-row items-center justify-between gap-4"
                >
                  <div>
                    <h4 className="text-sm font-semibold text-amber-400 font-serif">⚠️ OVERWRITE SAVE SLOT {slotNumber}?</h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Are you sure you want to replace "{metadata?.characterName}" (Lvl {metadata?.characterLevel}) with your current character?
                    </p>
                  </div>
                  <div className="flex gap-2 w-full md:w-auto">
                    <button
                      onClick={() => {
                        onSaveSlot(slotId);
                        setConfirmOverwrite(null);
                      }}
                      id={`confirm-save-btn-${slotId}`}
                      className="flex-1 md:flex-initial px-4 py-2 bg-amber-900 border border-amber-600 text-white font-serif text-sm rounded shadow hover:bg-amber-850 transition-all duration-200"
                    >
                      Confirm Overwrite
                    </button>
                    <button
                      onClick={() => setConfirmOverwrite(null)}
                      className="flex-1 md:flex-initial px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-serif text-sm rounded transition-all duration-200"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              );
            }

            if (metadata) {
              // Occupied Slot
              const portrait = GENERIC_RACE_PORTRAITS[metadata.characterRace as any] || '/warrior_fallback.png';

              return (
                <div
                  key={slotId}
                  className="group bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-amber-600/40 rounded-lg p-3 flex flex-col md:flex-row items-center justify-between gap-4 transition-all duration-200"
                >
                  <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="relative w-16 h-16 rounded border border-amber-600/20 overflow-hidden bg-slate-900 shrink-0">
                      <img src={portrait} alt={metadata.characterRace} className="w-full h-full object-cover" />
                      <div className="absolute bottom-0 inset-x-0 bg-slate-950/70 text-[9px] text-center text-amber-500 font-mono">
                        Slot {slotNumber}
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="font-serif font-bold text-amber-400 truncate text-base">
                          {metadata.characterName}
                        </span>
                        <span className="text-xs text-slate-400 font-serif">
                          Level {metadata.characterLevel} {metadata.characterRace} {metadata.characterArchetype}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mt-1 flex flex-col gap-0.5 font-serif">
                        <div>
                          📅 Day {metadata.currentDayNumber} ({metadata.currentTimeOfDay})
                        </div>
                        <div>
                          📍 {metadata.currentProvince ? metadata.currentProvince : 'Unknown Province'}
                          {metadata.currentCity ? `, ${metadata.currentCity}` : ''}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          Saved: {metadata.timestamp}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 w-full md:w-auto shrink-0">
                    <button
                      onClick={() => onLoadSlot(slotId)}
                      id={`load-btn-${slotId}`}
                      className="flex-1 md:flex-initial px-3 py-1.5 bg-sky-950 hover:bg-sky-800 border border-sky-700 hover:border-sky-500 text-sky-200 hover:text-white text-xs font-serif rounded transition-all duration-200"
                    >
                      Load
                    </button>
                    <button
                      onClick={() => {
                        if (canSaveGame) {
                          setConfirmOverwrite(slotId);
                        }
                      }}
                      disabled={!canSaveGame}
                      id={`save-btn-${slotId}`}
                      className="flex-1 md:flex-initial px-3 py-1.5 bg-amber-950 hover:bg-amber-800 border border-amber-700 hover:border-amber-500 text-amber-200 hover:text-white text-xs font-serif rounded disabled:opacity-30 disabled:pointer-events-none transition-all duration-200"
                    >
                      Overwrite
                    </button>
                    <button
                      onClick={() => setConfirmDelete(slotId)}
                      id={`delete-btn-${slotId}`}
                      className="px-2 py-1.5 bg-red-950/40 hover:bg-red-900 border border-red-900 hover:border-red-600 text-red-400 hover:text-white text-xs font-serif rounded transition-all duration-200"
                      aria-label="Delete save"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            } else {
              // Empty Slot
              return (
                <div
                  key={slotId}
                  className="bg-slate-950/40 border border-dashed border-slate-800 hover:border-slate-700 rounded-lg p-3 flex flex-col md:flex-row items-center justify-between gap-4 transition-all duration-200"
                >
                  <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="w-16 h-16 rounded border border-dashed border-slate-800 overflow-hidden bg-slate-900/60 shrink-0 flex items-center justify-center relative opacity-20">
                      <img src="/warrior_fallback.png" alt="Empty Slot" className="w-full h-full object-cover grayscale" />
                      <div className="absolute bottom-0 inset-x-0 bg-slate-950/70 text-[9px] text-center text-slate-500 font-mono">
                        Slot {slotNumber}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-serif font-bold text-slate-500">Empty Slot</h4>
                      <p className="text-xs text-slate-400 font-serif mt-1">No adventure recorded here.</p>
                    </div>
                  </div>

                  <div className="flex gap-2 w-full md:w-auto">
                    {hasLegacySave && (
                      <button
                        onClick={() => {
                          const success = onImportLegacy(slotId);
                          if (success) {
                            setJustImported(slotId);
                            setTimeout(() => setJustImported(null), 3000);
                          }
                        }}
                        className="flex-1 md:flex-initial px-3 py-1.5 bg-emerald-950 hover:bg-emerald-800 border border-emerald-800 text-emerald-200 hover:text-white text-xs font-serif rounded transition-all duration-200"
                      >
                        {justImported === slotId ? 'Imported!' : 'Import Legacy Save'}
                      </button>
                    )}
                    <button
                      onClick={() => onSaveSlot(slotId)}
                      disabled={!canSaveGame}
                      id={`save-btn-${slotId}`}
                      className="flex-grow md:flex-initial px-4 py-1.5 bg-amber-950 hover:bg-amber-800 border border-amber-700/60 hover:border-amber-500 text-amber-200 hover:text-white text-xs font-serif rounded disabled:opacity-30 disabled:pointer-events-none transition-all duration-200"
                    >
                      Save Here
                    </button>
                  </div>
                </div>
              );
            }
          })}
        </div>
      </div>
    </div>
  );
};
