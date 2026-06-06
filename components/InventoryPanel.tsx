import React, { useState } from 'react';
import { Item } from '../types.ts';
import { enrichItemWithStats } from '../hooks/gameReducerHelpers.ts';

interface InventoryPanelProps {
  title: string;
  items: Item[];
  septims?: number;
  dispatch?: React.Dispatch<any>;
  equippedItems?: Item[];
  isStashed?: boolean;
}

const InventoryPanel: React.FC<InventoryPanelProps> = ({ 
  title, 
  items, 
  septims, 
  dispatch, 
  equippedItems = [],
  isStashed = false
}) => {
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

  const handleItemClick = (item: Item) => {
    if (isStashed) return; // Stashed items cannot be directly used/equipped without moving first
    setSelectedItem(selectedItem?.id === item.id ? null : item);
  };

  const executeAction = (actionType: 'equip' | 'unequip' | 'consume') => {
    if (!dispatch || !selectedItem) return;
    
    if (actionType === 'equip') {
      dispatch({ type: 'EQUIP_INVENTORY_ITEM', payload: { itemId: selectedItem.id } });
    } else if (actionType === 'unequip') {
      dispatch({ type: 'UNEQUIP_INVENTORY_ITEM', payload: { itemId: selectedItem.id } });
    } else if (actionType === 'consume') {
      dispatch({ type: 'CONSUME_INVENTORY_ITEM', payload: { itemId: selectedItem.id } });
    }
    
    setSelectedItem(null);
  };

  return (
    <div id={`inventory_panel_${title.toLowerCase()}`} className="mb-6 p-4 bg-gray-900 border border-gray-800 rounded-lg shadow-xl relative">
      <h3 className="text-lg font-bold text-amber-500 border-b border-gray-800 pb-2 mb-3 flex justify-between items-center">
        <span>{title}</span>
        {title === "Carried" && septims !== undefined && (
          <span className="text-yellow-500 font-mono text-sm font-semibold flex items-center gap-1">
            🪙 {septims} Septims
          </span>
        )}
      </h3>

      {items.length > 0 ? (
        <ul className="list-none pl-0 space-y-2 text-sm text-gray-300">
          {items.map(itemRaw => {
            const item = enrichItemWithStats(itemRaw);
            const isEquipped = equippedItems.some(eq => eq.id === item.id);
            const isSelected = selectedItem?.id === item.id;
            
            let qtyText = item.quantity > 1 ? `x${item.quantity}` : '';
            let chargeText = '';
            if (item.maxCharges && item.currentCharges !== undefined) {
              chargeText = `[${item.currentCharges}/${item.maxCharges} ${item.chargeLabel || ''}]`;
            }

            // Compile rich tooltip information
            let tooltipLines = [item.description || 'No description.'];
            
            if (item.isWeapon && item.damage !== undefined) {
              tooltipLines.push(`Type: Weapon 🗡️ (Damage: ${item.damage})`);
            }
            if (item.isArmor && item.armorRating !== undefined) {
              tooltipLines.push(`Type: Armor 🛡️ (Armor Rating: ${item.armorRating})`);
            }
            if (item.isFood && item.hungerReduction !== undefined) {
              tooltipLines.push(`Type: Consumable 🍎 (Satiety: -${item.hungerReduction}%)`);
            }
            if (item.isPotion) {
              tooltipLines.push(`Type: Potion 🧪`);
            }
            if (item.insulationQuality) {
              tooltipLines.push(`Insulation Quality: ${item.insulationQuality}`);
            }
            if (item.comfortBonus) {
              tooltipLines.push(`Comfort Bonus: +${item.comfortBonus}`);
            }
            if (isEquipped) {
              tooltipLines.push(`Status: Currently Equipped 🏠`);
            }

            const tooltipText = tooltipLines.join('\n');

            return (
              <li 
                key={item.id} 
                id={`inventory_item_${item.id}`}
                title={tooltipText}
                onClick={() => handleItemClick(item)}
                className={`p-2.5 rounded border transition-all cursor-pointer select-none flex flex-col gap-1.5 ${
                  isEquipped 
                    ? 'bg-amber-950/20 border-amber-900/45 hover:bg-amber-950/35' 
                    : isSelected
                    ? 'bg-gray-800 border-amber-600'
                    : 'bg-gray-850 border-gray-800 hover:border-gray-700 hover:bg-gray-800/70'
                }`}
              >
                <div className="flex justify-between items-center gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-semibold text-gray-100 truncate">
                      {item.name}
                    </span>
                    {qtyText && (
                      <span className="text-xs bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded border border-gray-700 font-mono font-medium whitespace-nowrap">
                        {qtyText}
                      </span>
                    )}
                    {isEquipped && (
                      <span className="text-[10px] text-amber-400/80 bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-900/30 whitespace-nowrap">
                        🏠 Equipped
                      </span>
                    )}
                  </div>

                  {chargeText && (
                    <span className="text-xs text-sky-400 font-mono font-medium whitespace-nowrap bg-sky-950/40 px-1.5 py-0.5 rounded border border-sky-900/30">
                      {chargeText}
                    </span>
                  )}
                </div>

                {/* Dropdown / Interactive action menu if selected */}
                {isSelected && !isStashed && (
                  <div 
                    onClick={(e) => e.stopPropagation()} 
                    className="mt-2 pt-2 border-t border-gray-800 flex flex-wrap gap-1.5"
                  >
                    {/* Equip/Unequip buttons */}
                    {item.isEquippable && (
                      isEquipped ? (
                        <button
                          id={`action_unequip_${item.id}`}
                          onClick={() => executeAction('unequip')}
                          className="px-2.5 py-1 text-xs bg-red-900/80 hover:bg-red-800 text-red-100 rounded font-bold transition-all border border-red-700/50"
                        >
                          Unequip
                        </button>
                      ) : (
                        <button
                          id={`action_equip_${item.id}`}
                          onClick={() => executeAction('equip')}
                          className="px-2.5 py-1 text-xs bg-amber-600 hover:bg-amber-500 text-gray-900 rounded font-extrabold transition-all border border-amber-400/50"
                        >
                          Equip
                        </button>
                      )
                    )}

                    {/* Eat/Drink/Consume button */}
                    {item.isConsumable && (
                      <button
                        id={`action_consume_${item.id}`}
                        onClick={() => executeAction('consume')}
                        className="px-2.5 py-1 text-xs bg-emerald-600 hover:bg-emerald-500 text-gray-900 rounded font-extrabold transition-all border border-emerald-400/50"
                      >
                        {item.name.toLowerCase().includes('water') || item.name.toLowerCase().includes('drink') || item.name.toLowerCase().includes('potion') || item.name.toLowerCase().includes('waterskin') || item.name.toLowerCase().includes('flask') ? 'Drink' : 'Eat'}
                      </button>
                    )}

                    <button
                      id={`action_cancel_${item.id}`}
                      onClick={() => setSelectedItem(null)}
                      className="px-2.5 py-1 text-xs bg-gray-800 hover:bg-gray-700 text-gray-400 rounded transition-all border border-gray-700/40 ml-auto"
                    >
                      Close
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="italic text-gray-500 text-center py-4 bg-gray-950/30 rounded-lg border border-dashed border-gray-800">
          Empty
        </p>
      )}
    </div>
  );
};

export default InventoryPanel;
