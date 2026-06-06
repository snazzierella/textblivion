

import React from 'react';
import { Province, Coordinate, WeatherCondition, EnvironmentalCondition } from '../types.ts';
import { LOCATION_COORDINATES_ON_MAP, PROVINCE_CENTER_COORDINATES, ENVIRONMENTAL_CONDITION_TEMP_DISPLAY } from '../constants.ts';
import { findNearestCityOnMap } from '../hooks/gameReducerHelpers.ts';

const MAP_URL = "/maps/tamriel.png";

interface MapPanelProps {
  currentProvince: Province | null;
  currentCity: string | null;
  currentWeather: WeatherCondition;
  currentEnvironmentalCondition: EnvironmentalCondition;
  onMapClick: () => void;
  currentTemperature?: number; 
}

const MapPanel: React.FC<MapPanelProps> = ({ currentProvince, currentCity, currentWeather, currentEnvironmentalCondition, onMapClick, currentTemperature }) => {
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
  
  // Use specific temp if available, otherwise fallback to approx range
  const tempDisplay = currentTemperature !== undefined 
    ? `${currentTemperature}°F`
    : (ENVIRONMENTAL_CONDITION_TEMP_DISPLAY[currentEnvironmentalCondition] || "");


  return (
    <div className="p-3 bg-gray-800 rounded-lg shadow">
      <h3
        className="text-lg font-semibold text-amber-400 border-b border-gray-700 pb-1 mb-3"
        aria-label="Map Panel Title"
      >
        Map of Tamriel
      </h3>
      <div
        className="relative overflow-hidden rounded group cursor-zoom-in"
        onClick={onMapClick}
        onKeyPress={(e) => { if (e.key === 'Enter' || e.key === ' ') onMapClick(); }}
        role="button"
        tabIndex={0}
        aria-label="Click to view larger map"
        aria-haspopup="dialog"
        style={{ maxHeight: 'calc(100vh - 450px)' }} 
      >
        <div style={{ position: 'relative', width: '100%', height: '0', paddingTop: '56.25%' }}>
          <img
            src={MAP_URL}
            alt="Detailed map of the continent of Tamriel. Click to enlarge."
            className="absolute top-0 left-0 w-full h-full object-fill rounded" 
            aria-describedby="map-attribution"
          />
          {playerMarkerCoords && playerTooltipText && (
            <div
              title={playerTooltipText} 
              aria-label={`Marker indicating current location: ${playerTooltipText}`}
              className="absolute w-3 h-3 bg-red-600 rounded-full border-2 border-white shadow-lg transform -translate-x-1/2 -translate-y-1/2 animate-pulse"
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
      <p id="map-attribution" className="text-xs text-gray-500 text-center pt-2">
        Map image from <a href={MAP_URL} target="_blank" rel="noopener noreferrer" className="underline hover:text-amber-400">spartanmazda.wikia.com</a>.
      </p>
      { (displayLocationName || currentProvince) && (
        <p className="text-sm text-center text-amber-300 mt-2">
            <span className="font-bold">{locationTextBelowMap}</span>
        </p>
      )}
      <p className="text-sm text-center text-blue-300 mt-1" title={`Current weather: ${currentWeather}. Temp: ${tempDisplay}`}>
        Weather: {getWeatherEmoji(currentWeather)} {currentWeather} <span className="text-xs text-sky-400">({tempDisplay})</span>
      </p>
    </div>
  );
};

export default MapPanel;