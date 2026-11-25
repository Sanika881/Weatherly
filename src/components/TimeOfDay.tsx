import {Droplets, Thermometer, Wind} from 'lucide-react';
import {useState} from 'react';
import {convertSpeed, convertTemp} from '../domain/units';
import {WeatherIcon} from '../icons/WeatherIcon';
import type {TemperatureUnit, TimeOfDaySlot} from '../types/weather';
import {handleCardPointerMove, triggerHaptic} from '../utils/haptics';
import {AnimatedNumber} from './AnimatedNumber';

type MetricMode = 'temp' | 'wind' | 'precip';

interface TimeOfDayProps {
  slots: TimeOfDaySlot[];
  unit: TemperatureUnit;
  frost?: boolean;
}

const MODES: Array<{id: MetricMode; label: string; Icon: typeof Thermometer}> = [
  {id: 'temp', label: 'Temp', Icon: Thermometer},
  {id: 'wind', label: 'Wind', Icon: Wind},
  {id: 'precip', label: 'Rain', Icon: Droplets},
];

export function TimeOfDay({slots, unit, frost = false}: TimeOfDayProps) {
  const [mode, setMode] = useState<MetricMode>('temp');

  return (
    <section
      aria-label="How is the temperature today"
      onMouseMove={handleCardPointerMove}
      className={`rounded-3xl border weatherly-surface-card weatherly-card-lift p-6 shadow-[0_8px_24px_rgba(15,27,61,0.06)] flex flex-col justify-between gap-5 ${
        frost ? 'weatherly-frost-card' : ''
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base sm:text-lg font-semibold text-[#0F1B3D]">
          How is the temperature today?
        </h2>

        <div
          role="tablist"
          aria-label="Time of day metric"
          className="inline-flex items-center gap-1 p-1 rounded-full bg-slate-900/6"
        >
          {MODES.map(({id, label, Icon}) => {
            const active = mode === id;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  triggerHaptic(6);
                  setMode(id);
                }}
                className={`weatherly-pressable min-h-[36px] px-3 py-1.5 rounded-full text-xs font-medium inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F97316] ${
                  active
                    ? 'bg-[#F97316] text-white shadow-sm'
                    : 'text-[#475569] hover:text-[#0F1B3D]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-900/10">
        {slots.map((slot, idx) => {
          const isFeatured = idx === 1;
          const numericVal =
            mode === 'temp'
              ? convertTemp(slot.tempC, unit)
              : mode === 'wind'
              ? convertSpeed(slot.windKmh, unit)
              : slot.precipProbability;
          const suffix =
            mode === 'temp' ? '°' : mode === 'wind' ? (unit === 'F' ? ' mph' : ' km/h') : '%';

          return (
            <div
              key={slot.period}
              className="py-3 sm:py-2 px-3 flex flex-col items-center justify-between gap-3 text-center"
            >
              <div
                className={`w-11 h-11 rounded-full flex items-center justify-center ${
                  isFeatured ? 'bg-[#0F1B3D]' : 'bg-white/80'
                }`}
              >
                <WeatherIcon kind={slot.icon} size={28} />
              </div>

              <div>
                <div className="text-lg font-semibold text-[#0F1B3D] tabular-nums">
                  <AnimatedNumber value={numericVal} suffix={suffix} />
                </div>
                <div className="mt-0.5 text-xs font-medium text-[#475569]">{slot.period}</div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
