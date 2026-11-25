import {useState} from 'react';
import {computeActivityScores} from '../domain/activities';
import type {WeatherBundle} from '../types/weather';
import {handleCardPointerMove, triggerHaptic} from '../utils/haptics';
import {AnimatedNumber} from './AnimatedNumber';

interface ActivityScoresProps {
  weather: WeatherBundle;
  frost?: boolean;
}

export function ActivityScores({weather, frost = false}: ActivityScoresProps) {
  const scores = computeActivityScores(weather);
  const [selectedId, setSelectedId] = useState<string>(scores[0].id);

  const selected = scores.find((s) => s.id === selectedId) ?? scores[0];
  const radius = 21;
  const circumference = 2 * Math.PI * radius;

  return (
    <section
      aria-label="Outdoor activity scores"
      onMouseMove={handleCardPointerMove}
      className={`rounded-3xl border weatherly-surface-card weatherly-card-lift p-5 shadow-[0_8px_24px_rgba(15,27,61,0.06)] flex flex-col justify-between gap-4 ${
        frost ? 'weatherly-frost-card' : ''
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-[#0F1B3D]">Activity Comfort</h2>
        <span className="text-xs text-[#475569]">Tap a ring for details</span>
      </div>

      <div className="grid grid-cols-5 gap-2">
        {scores.map((item) => {
          const isSelected = item.id === selected.id;
          const safeScore = Number.isFinite(item.score) ? item.score : 50;
          const dashOffset = circumference * (1 - safeScore / 100);
          const strokeColor =
            safeScore >= 75 ? '#22C55E' : safeScore >= 45 ? '#F59E0B' : '#EF4444';

          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={isSelected}
              onClick={() => {
                triggerHaptic(6);
                setSelectedId(item.id);
              }}
              className={`weatherly-pressable rounded-2xl py-2 px-1 flex flex-col items-center gap-1.5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F97316] ${
                isSelected ? 'bg-[#0F1B3D] text-white' : 'bg-white/75 text-[#0F1B3D] hover:bg-white'
              }`}
            >
              <div className="relative w-12 h-12 flex items-center justify-center">
                <svg width="48" height="48" viewBox="0 0 52 52" aria-hidden="true">
                  <circle
                    cx="26"
                    cy="26"
                    r={radius}
                    fill="none"
                    stroke={isSelected ? 'rgba(255,255,255,0.18)' : 'rgba(15,27,61,0.1)'}
                    strokeWidth="4.5"
                  />
                  <circle
                    cx="26"
                    cy="26"
                    r={radius}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth="4.5"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={dashOffset}
                    transform="rotate(-90 26 26)"
                    style={{transition: 'stroke-dashoffset 500ms cubic-bezier(0.16, 1, 0.3, 1)'}}
                  />
                </svg>
                <span className="absolute text-xs font-semibold tabular-nums">
                  <AnimatedNumber value={item.score} />
                </span>
              </div>
              <span className="text-[11px] font-medium truncate max-w-full px-0.5">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>

      <div className="rounded-2xl bg-white/80 px-3.5 py-2.5 text-xs text-[#334155]">
        <strong className="text-[#0F1B3D]">{selected.label}:</strong> {selected.reason}
      </div>
    </section>
  );
}
