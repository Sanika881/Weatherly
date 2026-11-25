import {Droplets} from 'lucide-react';
import {convertTemp, formatTemp} from '../domain/units';
import {WeatherIcon} from '../icons/WeatherIcon';
import type {DailyForecast, TemperatureUnit, WeatherConditionKind} from '../types/weather';
import {handleCardPointerMove} from '../utils/haptics';
import {AnimatedNumber} from './AnimatedNumber';

interface TomorrowCardProps {
  cityName: string;
  tomorrow?: DailyForecast;
  unit: TemperatureUnit;
  frost?: boolean;
}

function getTomorrowTint(icon: WeatherConditionKind): {bg: string; border: string} {
  switch (icon) {
    case 'rain':
    case 'thunder':
      return {bg: '#DFF2B0', border: '#CBE48F'};
    case 'clear-day':
    case 'partly-cloudy':
      return {bg: '#FFE8D2', border: '#FAD4B2'};
    case 'snow':
    case 'mist':
      return {bg: '#E2F1FC', border: '#C7E2F7'};
    default:
      return {bg: '#E8EEF5', border: '#D3DFEC'};
  }
}

export function TomorrowCard({cityName, tomorrow, unit, frost = false}: TomorrowCardProps) {
  if (!tomorrow) return null;
  const tint = getTomorrowTint(tomorrow.icon);

  return (
    <section
      aria-label="Tomorrow forecast"
      onMouseMove={handleCardPointerMove}
      className={`rounded-3xl border weatherly-card-lift p-6 shadow-[0_8px_24px_rgba(15,27,61,0.06)] text-[#0F1B3D] flex flex-col justify-between gap-4 ${
        frost ? 'weatherly-frost-card' : ''
      }`}
      style={{backgroundColor: tint.bg, borderColor: tint.border}}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="text-xs font-medium text-[#334155]">Tomorrow</span>
          <h2 className="mt-0.5 text-lg font-semibold text-[#0F1B3D]">{cityName}</h2>
        </div>
        <WeatherIcon kind={tomorrow.icon} size={56} />
      </div>

      <div className="flex items-end justify-between gap-4 pt-2">
        <div>
          <div className="text-3xl font-semibold tabular-nums text-[#0F1B3D]">
            <AnimatedNumber value={convertTemp(tomorrow.maxC, unit)} suffix={`°${unit}`} />
          </div>
          <div className="mt-1 text-sm font-medium text-[#334155]">{tomorrow.condition}</div>
        </div>

        <div className="text-right text-xs text-[#334155] tabular-nums space-y-1">
          <div>Low {formatTemp(tomorrow.minC, unit)}</div>
          <div className="inline-flex items-center gap-1 justify-end">
            <Droplets className="w-3.5 h-3.5 text-sky-700" aria-hidden="true" />
            <span>{tomorrow.precipProbability}% rain</span>
          </div>
        </div>
      </div>
    </section>
  );
}
