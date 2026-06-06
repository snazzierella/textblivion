
import React from 'react';
import { Quest } from '../types.ts'; // Assuming Quest type is defined in types.ts

interface QuestLogPanelProps {
  quests: Quest[]; 
  currentObjective: string;
}

const PanelSection: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({ title, children, className }) => (
  <div className={`mb-4 p-3 bg-gray-800 rounded-lg shadow ${className}`}>
    <h3 className="text-lg font-semibold text-amber-400 border-b border-gray-700 pb-1 mb-2">{title}</h3>
    {children}
  </div>
);

const QuestLogPanel: React.FC<QuestLogPanelProps> = ({ quests, currentObjective }) => {
  const availableQuestsAndLeads = quests.filter(q => q.isActive && !q.isCompleted);
  const completedQuests = quests.filter(q => q.isCompleted);

  return (
    <div className="h-full text-gray-300 text-sm">
      <PanelSection title="Current Objective" className="bg-amber-900/30 border border-amber-700/50">
        <p className="text-amber-200 leading-relaxed">{currentObjective || "No current objective."}</p>
      </PanelSection>

      <PanelSection title="Available Quests & Leads">
        {availableQuestsAndLeads.length > 0 ? (
          <ul className="list-none pl-0 space-y-2">
            {availableQuestsAndLeads.map(quest => (
              <li key={quest.id} className="p-2 bg-gray-700 rounded hover:bg-gray-600 transition-colors">
                <strong className="text-gray-100 block">{quest.title}</strong>
                <p className="text-xs text-gray-400 mt-1">{quest.description}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="italic text-gray-500">No other available quests or leads at the moment.</p>
        )}
      </PanelSection>
      
      {completedQuests.length > 0 && (
        <PanelSection title="Completed Quests">
          <ul className="list-none pl-0 space-y-1">
            {completedQuests.map(quest => (
              <li key={quest.id} className="p-1.5 bg-gray-700/50 rounded text-gray-500">
                <strong className="line-through">{quest.title}</strong>
                <p className="text-xs text-gray-600 mt-0.5 italic">{quest.description}</p>
              </li>
            ))}
          </ul>
        </PanelSection>
      )}
    </div>
  );
};

export default QuestLogPanel;