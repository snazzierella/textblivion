
import React, { useState, useEffect, useCallback } from 'react';
import { GameState, SaveSlotMetadata } from '../../types.ts';
import { LOCAL_STORAGE_SAVE_KEY } from '../../constants.ts';
import { Action } from '../gameReducer.ts';

interface UseGameManagementReturn {
  saveGameSlot: (slotId: string) => void;
  loadGameSlot: (slotId: string) => Promise<void>;
  deleteGameSlot: (slotId: string) => void;
  slotsMetadata: SaveSlotMetadata[];
  hasLegacySave: boolean;
  importLegacySave: (slotId: string) => boolean;
  requestNewGame: () => void;
}

const METADATA_KEY = 'textblivion_save_slots';

export const useGameManagement = (
  state: GameState,
  dispatch: React.Dispatch<Action>
): UseGameManagementReturn => {
  const [slotsMetadata, setSlotsMetadata] = useState<SaveSlotMetadata[]>([]);
  const [hasLegacySave, setHasLegacySave] = useState<boolean>(false);

  // Load metadata and check legacy save on mount
  const loadMetadataAndLegacyStatus = useCallback(() => {
    try {
      const stored = localStorage.getItem(METADATA_KEY);
      if (stored) {
        setSlotsMetadata(JSON.parse(stored));
      } else {
        setSlotsMetadata([]);
      }
    } catch (e) {
      setSlotsMetadata([]);
    }

    try {
      const legacy = localStorage.getItem(LOCAL_STORAGE_SAVE_KEY);
      setHasLegacySave(legacy !== null);
    } catch (e) {
      setHasLegacySave(false);
    }
  }, []);

  useEffect(() => {
    loadMetadataAndLegacyStatus();
  }, [loadMetadataAndLegacyStatus]);

  const saveGameSlot = useCallback((slotId: string) => {
    try {
      localStorage.setItem(`textblivion_save_slot_${slotId}`, JSON.stringify(state));

      const newMeta: SaveSlotMetadata = {
        id: slotId,
        characterName: state.character?.name || 'Unnamed Prisoner',
        characterRace: state.character?.race || 'Unknown',
        characterArchetype: state.character?.archetype || 'Unknown',
        characterLevel: state.character?.level || 1,
        currentDayNumber: state.currentDayNumber,
        currentTimeOfDay: state.currentTimeOfDay,
        currentProvince: state.currentProvince,
        currentCity: state.currentCity,
        timestamp: new Date().toLocaleString(),
        unixTimestamp: Date.now(),
      };

      const stored = localStorage.getItem(METADATA_KEY);
      let list: SaveSlotMetadata[] = stored ? JSON.parse(stored) : [];
      list = list.filter(m => m.id !== slotId);
      list.push(newMeta);
      list.sort((a, b) => a.id.localeCompare(b.id));

      localStorage.setItem(METADATA_KEY, JSON.stringify(list));
      setSlotsMetadata(list);

      dispatch({ type: 'SAVE_GAME_SUCCESS' });
    } catch (e) {
      dispatch({ type: 'SAVE_GAME_FAILURE', payload: { message: (e as Error).message } });
    }
  }, [state, dispatch]);

  const loadGameSlot = useCallback(async (slotId: string) => {
    try {
      const savedData = localStorage.getItem(`textblivion_save_slot_${slotId}`);
      if (savedData) {
        const loadedState = JSON.parse(savedData) as GameState;
        dispatch({ type: 'LOAD_GAME_SUCCESS', payload: loadedState });
      } else {
        dispatch({ type: 'MANUAL_LOAD_FAILURE', payload: { message: `No saved game found in Slot ${slotId.replace('slot_', '')}.` } });
      }
    } catch (e) {
      dispatch({ type: 'MANUAL_LOAD_FAILURE', payload: { message: `Error parsing saved data: ${(e as Error).message}` } });
    }
  }, [dispatch]);

  const deleteGameSlot = useCallback((slotId: string) => {
    try {
      localStorage.removeItem(`textblivion_save_slot_${slotId}`);

      const stored = localStorage.getItem(METADATA_KEY);
      if (stored) {
        let list: SaveSlotMetadata[] = JSON.parse(stored);
        list = list.filter(m => m.id !== slotId);
        localStorage.setItem(METADATA_KEY, JSON.stringify(list));
        setSlotsMetadata(list);
      }
    } catch (e) {
      console.error('Error deleting save slot metadata', e);
    }
  }, []);

  const importLegacySave = useCallback((slotId: string): boolean => {
    try {
      const legacyData = localStorage.getItem(LOCAL_STORAGE_SAVE_KEY);
      if (!legacyData) return false;

      const parsedState = JSON.parse(legacyData) as GameState;
      localStorage.setItem(`textblivion_save_slot_${slotId}`, legacyData);

      const newMeta: SaveSlotMetadata = {
        id: slotId,
        characterName: parsedState.character?.name || 'Unnamed Prisoner',
        characterRace: parsedState.character?.race || 'Unknown',
        characterArchetype: parsedState.character?.archetype || 'Unknown',
        characterLevel: parsedState.character?.level || 1,
        currentDayNumber: parsedState.currentDayNumber,
        currentTimeOfDay: parsedState.currentTimeOfDay,
        currentProvince: parsedState.currentProvince,
        currentCity: parsedState.currentCity,
        timestamp: new Date().toLocaleString(),
        unixTimestamp: Date.now(),
      };

      const stored = localStorage.getItem(METADATA_KEY);
      let list: SaveSlotMetadata[] = stored ? JSON.parse(stored) : [];
      list = list.filter(m => m.id !== slotId);
      list.push(newMeta);
      list.sort((a, b) => a.id.localeCompare(b.id));

      localStorage.setItem(METADATA_KEY, JSON.stringify(list));
      setSlotsMetadata(list);
      return true;
    } catch (e) {
      console.error('Error importing legacy save:', e);
      return false;
    }
  }, []);

  const requestNewGame = useCallback(() => {
    dispatch({ type: 'REQUEST_NEW_GAME' });
  }, [dispatch]);

  return {
    saveGameSlot,
    loadGameSlot,
    deleteGameSlot,
    slotsMetadata,
    hasLegacySave,
    importLegacySave,
    requestNewGame,
  };
};

