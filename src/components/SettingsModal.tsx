import {RefreshCw, X} from 'lucide-react';
import {useEffect} from 'react';
import {clearMemoryCache} from '../services/cache';
import {hasOpenWeatherKey, type WeatherProviderId} from '../services/weatherService';
import type {TemperatureUnit} from '../types/weather';

interface SettingsModalProps {
  unit: TemperatureUnit;
  onChangeUnit: (unit: TemperatureUnit) => void;
  providerPreference: 'auto' | WeatherProviderId;
  onChangeProvider: (provider: 'auto' | WeatherProviderId) => void;
  onRefresh: () => void;
  onClose: () => void;
}

export default function SettingsModal({
  unit,
  onChangeUnit,
  providerPreference,
  onChangeProvider,
  onRefresh,
  onClose,
}: SettingsModalProps) {
  const owmKeyConfigured = hasOpenWeatherKey();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F1B3D]/45 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-3xl bg-white text-[#0F1B3D] p-6 shadow-[0_24px_60px_rgba(15,27,61,0.28)] border border-white/80 space-y-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 id="settings-title" className="text-lg font-semibold">
            Preferences
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close preferences"
            className="w-9 h-9 rounded-full flex items-center justify-center text-[#475569] hover:text-[#0F1B3D] hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F97316]"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {/* Temperature Unit */}
        <div className="space-y-2">
          <div className="text-sm font-medium text-[#0F1B3D]">Temperature & Speed Units</div>
          <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-slate-100">
            <button
              type="button"
              onClick={() => onChangeUnit('C')}
              className={`py-2 px-3 rounded-xl text-sm font-medium transition-colors ${
                unit === 'C' ? 'bg-[#0F1B3D] text-white' : 'text-[#475569] hover:text-[#0F1B3D]'
              }`}
            >
              Metric (°C, km/h)
            </button>
            <button
              type="button"
              onClick={() => onChangeUnit('F')}
              className={`py-2 px-3 rounded-xl text-sm font-medium transition-colors ${
                unit === 'F' ? 'bg-[#0F1B3D] text-white' : 'text-[#475569] hover:text-[#0F1B3D]'
              }`}
            >
              Imperial (°F, mph)
            </button>
          </div>
        </div>

        {/* Weather Provider */}
        <div className="space-y-2">
          <div className="text-sm font-medium text-[#0F1B3D]">Data Provider</div>
          <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-slate-100">
            <button
              type="button"
              onClick={() => onChangeProvider('auto')}
              className={`py-2 px-3 rounded-xl text-sm font-medium transition-colors ${
                providerPreference === 'auto'
                  ? 'bg-[#F97316] text-white'
                  : 'text-[#475569] hover:text-[#0F1B3D]'
              }`}
            >
              {owmKeyConfigured ? 'OpenWeather (Auto)' : 'Auto Fallback'}
            </button>
            <button
              type="button"
              onClick={() => onChangeProvider('open-meteo')}
              className={`py-2 px-3 rounded-xl text-sm font-medium transition-colors ${
                providerPreference === 'open-meteo'
                  ? 'bg-[#F97316] text-white'
                  : 'text-[#475569] hover:text-[#0F1B3D]'
              }`}
            >
              Open-Meteo
            </button>
          </div>
          <p className="text-xs text-[#475569] leading-relaxed">
            {owmKeyConfigured
              ? 'OpenWeather API key detected via VITE_OPENWEATHER_API_KEY.'
              : 'Set VITE_OPENWEATHER_API_KEY in your environment to use OpenWeather endpoints; Open-Meteo is active right now with zero key required.'}
          </p>
        </div>

        {/* Cache management */}
        <div className="pt-2 border-t border-slate-200 flex items-center justify-between gap-4">
          <div className="text-xs text-[#475569]">
            Forecasts are cached in memory for 10 minutes.
          </div>
          <button
            type="button"
            onClick={() => {
              clearMemoryCache();
              onRefresh();
              onClose();
            }}
            className="px-4 py-2 rounded-full bg-slate-900 text-white text-xs font-medium inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 hover:bg-slate-800"
          >
            <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Clear & Refresh</span>
          </button>
        </div>
      </div>
    </div>
  );
}
