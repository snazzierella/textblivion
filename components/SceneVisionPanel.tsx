
import React, { useState, useEffect, useRef } from 'react';
import LoadingSpinner from './LoadingSpinner.tsx';

interface SceneVisionPanelProps {
  imageUrl: string | null;
  onGenerate: () => Promise<void>;
  isLoading: boolean;
  characterName: string | undefined; 
}

const SceneVisionPanel: React.FC<SceneVisionPanelProps> = ({ imageUrl, onGenerate, isLoading, characterName }) => {
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const triggerButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);


  const handleGenerateClick = () => {
    if (!isLoading) {
      onGenerate();
    }
  };

  const openModal = () => {
    if (imageUrl) {
      setIsImageModalOpen(true);
    }
  };

  const closeModal = () => {
    setIsImageModalOpen(false);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isImageModalOpen) {
        closeModal();
      }
    };

    if (isImageModalOpen) {
      document.addEventListener('keydown', handleKeyDown);
      closeButtonRef.current?.focus();
    } else {
      document.removeEventListener('keydown', handleKeyDown);
      triggerButtonRef.current?.focus();
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isImageModalOpen]);

  return (
    <>
      <div className="p-3 bg-gray-800 rounded-lg shadow h-full flex flex-col">
        <h3 className="text-lg font-semibold text-amber-400 border-b border-gray-700 pb-1 mb-3">
          Scene Vision
        </h3>
        <div className="flex-grow flex flex-col items-center justify-center bg-gray-700/50 rounded-md p-2 min-h-[200px]">
          {isLoading ? (
            <LoadingSpinner />
          ) : imageUrl ? (
            <button
              ref={triggerButtonRef}
              onClick={openModal}
              className="w-full h-full flex items-center justify-center cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-gray-800 rounded"
              aria-label={characterName ? `View enlarged vision of the current scene for ${characterName}` : "View enlarged vision of the current scene"}
              aria-haspopup="dialog"
            >
              <img 
                src={imageUrl} 
                alt={characterName ? `A vision of the current scene for ${characterName}` : "A vision of the current scene"}
                className="max-w-full max-h-full h-auto object-contain rounded-md shadow-lg"
                style={{ maxHeight: 'calc(100vh - 500px)'}} // Adjusted for typical panel height
              />
            </button>
          ) : (
            <p className="text-gray-400 text-center text-sm">
              {characterName ? `${characterName}, you may` : "You may"} attempt to conjure a vision of the current scene.
            </p>
          )}
        </div>
        <button
          onClick={handleGenerateClick}
          disabled={isLoading}
          className="mt-3 w-full p-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold transition-colors duration-150 disabled:bg-gray-500 disabled:cursor-not-allowed"
          aria-live="polite" 
          aria-busy={isLoading}
          aria-label={isLoading ? "Generating scene vision, please wait" : "Generate a vision of the current scene"}
        >
          {isLoading ? 'Generating...' : 'Conjure Scene Vision'}
        </button>
      </div>

      {isImageModalOpen && imageUrl && (
        <div
          ref={modalRef}
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={closeModal} // Close on overlay click
          role="dialog"
          aria-modal="true"
          aria-labelledby="enlarged-scene-vision-title"
        >
          <div
            className="bg-gray-900 p-4 rounded-lg shadow-2xl max-w-3xl w-auto max-h-[90vh] flex flex-col relative"
            onClick={(e) => e.stopPropagation()} // Prevent close on inner content click
          >
            <h2 id="enlarged-scene-vision-title" className="sr-only">Enlarged Scene Vision</h2>
            <button
              ref={closeButtonRef}
              onClick={closeModal}
              className="absolute top-2 right-2 p-2 text-gray-400 hover:text-white bg-gray-700 hover:bg-red-600 rounded-full transition-colors z-10"
              aria-label="Close enlarged image"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <img
              src={imageUrl}
              alt={characterName ? `Enlarged vision of the current scene for ${characterName}` : "Enlarged vision of the current scene"}
              className="max-w-full max-h-[80vh] h-auto object-contain rounded"
            />
          </div>
        </div>
      )}
    </>
  );
};

export default SceneVisionPanel;
