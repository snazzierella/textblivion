

import React, { useEffect, useRef } from 'react';
import { Province, Coordinate, WeatherCondition } from '../types.ts';
import { LOCATION_COORDINATES_ON_MAP, PROVINCE_CENTER_COORDINATES } from '../constants.ts';
import { findNearestCityOnMap } from '../hooks/gameReducerHelpers.ts';

const MAP_URL = "/maps/tamriel.png";
const MAP_MODAL_ID = "map-modal-content";
const MAP_MODAL_TITLE_ID = "map-modal-title";

interface MapModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProvince: Province | null;
  currentCity: string | null;
  currentWeather: WeatherCondition;
  currentTemperature?: number;
}

const MapModal: React.FC<MapModalProps> = ({ isOpen, onClose, currentProvince, currentCity, currentWeather, currentTemperature }) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      previouslyFocusedElementRef.current = document.activeElement as HTMLElement;
      closeButtonRef.current?.focus();

      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          onClose();
        }
        if (event.key === 'Tab') {
          if (modalRef.current && modalRef.current.contains(document.activeElement)) {
             const focusableElements = Array.from(
                modalRef.current.querySelectorAll<HTMLElement>(
                    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                )
             ).filter(el => (el as HTMLElement).offsetParent !== null) as HTMLElement[];

            if (focusableElements.length === 1 && document.activeElement === focusableElements[0]) {
                event.preventDefault();
            } else if (focusableElements.length > 1) {
                const firstElement = focusableElements[0];
                const lastElement = focusableElements[focusableElements.length - 1];
                if (event.shiftKey) {
                    if (document.activeElement === firstElement) {
                        lastElement.focus();
                        event.preventDefault();
                    }
                } else {
                    if (document.activeElement === lastElement) {
                        firstElement.focus();
                        event.preventDefault();
                    }
                }
            }
          }
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        previouslyFocusedElementRef.current?.focus();
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  let playerMarkerCoords: Coordinate | null = null;
  let displayLocationName: string | null = null; 
  let displayProvinceNameForText: string | null = currentProvince; 
  let playerTooltipText: string | null = null;

  const matchedCity = findNearestCityOnMap(currentCity);
  const isNearCity = currentCity ? (currentCity.startsWith("Near: ") || currentCity.toLowerCase().includes("near") || matchedCity !== currentCity) : false;

  if (matchedCity && LOCATION_COORDINATES_ON_MAP[matchedCity]) {
    const cityData = LOCATION_COORDINATES_ON_MAP[matchedCity];
    playerMarkerCoords = { x: cityData.x, y: cityData.y };
    displayLocationName = cityData.name;
    displayProvinceNameForText = cityData.province;
    playerTooltipText = isNearCity ? `Near ${cityData.name}, ${cityData.province}` : `${cityData.name}, ${cityData.province}`;
  } else if (currentProvince && PROVINCE_CENTER_COORDINATES[currentProvince]) {
    playerMarkerCoords = PROVINCE_CENTER_COORDINATES[currentProvince];
    displayLocationName = currentProvince;
    displayProvinceNameForText = null;
    playerTooltipText = currentProvince;
  }

  let locationTextBelowMap = "Location: Unknown";
  if (displayLocationName) {
    locationTextBelowMap = `Currently: ${isNearCity ? 'Near ' : ''}${displayLocationName}`;
    if (displayProvinceNameForText && displayLocationName !== displayProvinceNameForText) {
      locationTextBelowMap += `, ${displayProvinceNameForText}`;
    }
  } else if (currentProvince) {
    locationTextBelowMap = `Currently in: ${currentProvince}`;
  }

  const getWeatherEmoji = (weather: WeatherCondition): string => {
    switch(weather) {
      case WeatherCondition.CLEAR: return "☀️";
      case WeatherCondition.CLOUDY: return "☁️";
      case WeatherCondition.OVERCAST: return "🌥️";
      case WeatherCondition.RAIN: return "🌧️";
      case WeatherCondition.STORM: return "⛈️";
      case WeatherCondition.SNOW: return "🌨️";
      case WeatherCondition.BLIZZARD: return "❄️";
      case WeatherCondition.FOG: return "🌫️";
      default: return "";
    }
  }
  
  const tempDisplay = currentTemperature !== undefined ? `${currentTemperature}°F` : '';

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby={MAP_MODAL_TITLE_ID}
      aria-describedby="map-modal-description"
    >
      <div
        ref={modalRef}
        id={MAP_MODAL_ID}
        className="bg-gray-800 p-4 sm:p-6 rounded-lg shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 id={MAP_MODAL_TITLE_ID} className="text-xl sm:text-2xl font-bold text-amber-400">
            Map of Tamriel
          </h2>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white bg-gray-700 hover:bg-red-600 rounded-full transition-colors"
            aria-label="Close map"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div id="map-modal-description" className="sr-only">
            Enlarged view of the Tamriel map. Current location is marked. Use Escape key or close button to dismiss.
        </div>

        <div className="relative overflow-auto flex-grow custom-scrollbar rounded group">
          <div style={{ position: 'relative', width: '100%', height: '0', paddingTop: '56.25%' }}>
            <img
              src={MAP_URL}
              alt="Enlarged map of Tamriel."
              className="absolute top-0 left-0 w-full h-full object-fill rounded" 
            />
            {Object.values(LOCATION_COORDINATES_ON_MAP).map(loc => (
              <div
                key={`modal-marker-${loc.name}`}
                title={`${loc.name}, ${loc.province}`}
                aria-label={`Map marker for ${loc.name}`}
                className="absolute w-3 h-3 sm:w-3.5 sm:h-3.5 opacity-0 transform -translate-x-1/2 -translate-y-1/2 cursor-help"
                style={{
                  left: loc.x,
                  top: loc.y,
                  zIndex: 1
                }}
              >
                <span className="sr-only">{loc.name}</span>
              </div>
            ))}
            {playerMarkerCoords && playerTooltipText && (
              <div
                title={playerTooltipText} 
                aria-label={`Marker indicating current location: ${playerTooltipText}`}
                className="absolute w-3.5 h-3.5 sm:w-4 sm:h-4 bg-red-500 rounded-full border-2 border-white shadow-xl transform -translate-x-1/2 -translate-y-1/2 animate-pulse"
                style={{
                  left: playerMarkerCoords.x,
                  top: playerMarkerCoords.y,
                  zIndex: 2 
                }}
              >
                <span className="sr-only">Current location: {playerTooltipText}</span>
              </div>
            )}
          </div>
        </div>
        <div className="text-sm text-center mt-3 pt-2 border-t border-gray-700">
            {(displayLocationName || currentProvince) && (
              <p className="text-amber-300">
                  <span className="font-bold">{locationTextBelowMap}</span>
              </p>
            )}
            <p className="text-blue-300 mt-1" title={`Current weather: ${currentWeather}`}>
                Weather: {getWeatherEmoji(currentWeather)} {currentWeather} {tempDisplay && <span className="text-xs text-sky-400">({tempDisplay})</span>}
            </p>
        </div>
      </div>
    </div>
  );
};

export default MapModal;