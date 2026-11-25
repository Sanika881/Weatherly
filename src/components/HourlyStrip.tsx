import {RotateCcw} from 'lucide-react';
import {useId, useRef} from 'react';
import {formatHourLabel} from '../domain/time';
import {formatTemp} from '../domain/units';
import {WeatherIcon} from '../icons/WeatherIcon';
import type {HourlyPoint, TemperatureUnit} from '../types/weather';
import {handleCardPointerMove, triggerHaptic} from '../utils/haptics';

interface HourlyStripProps {
  hourly: HourlyPoint[];
  timezoneOffsetSec: number;
  unit: TemperatureUnit;
  scrubIndex: number;
  onScrubChange: (index: number) => void;
  frost?: boolean;
}

function RainDropFill({percent, active}: {percent: number; active: boolean}) {
  const uid = useId().replace(/:/g, '');
  const clipId = `drop-${uid}`;
  const clamped = Math.max(0, Math.min(100, percent));
  const fillY = 16 - (clamped / 100) * 14;

  return (
    <svg width="13" height="16" viewBox="0 0 14 18" aria-hidden="true" className="shrink-0">
      <defs>
        <clipPath id={clipId}>
          <path d="M7 1.5C7 1.5 12.5 7.7 12.5 11.4C12.5 14.5 10 16.5 7 16.5C4 16.5 1.5 14.5 1.5 11.4C1.5 7.7 7 1.5 7 1.5Z" />
        </clipPath>
      </defs>
      <path
        d="M7 1.5C7 1.5 12.5 7.7 12.5 11.4C12.5 14.5 10 16.5 7 16.5C4 16.5 1.5 14.5 1.5 11.4C1.5 7.7 7 1.5 7 1.5Z"
        fill="none"
        stroke={active ? 'rgba(186,230,253,0.85)' : 'rgba(14,116,144,0.55)'}
        strokeWidth="1.3"
      />
      <g clipPath={`url(#${clipId})`}>
        <rect
          x="0"
          y={fillY}
          width="14"
          height="18"
          fill={active ? '#7DD3FC' : '#0EA5E9'}
        />
      </g>
    </svg>
  );
}

export function HourlyStrip({
  hourly,
  timezoneOffsetSec,
  unit,
  scrubIndex,
  onScrubChange,
  frost = false,
}: HourlyStripProps) {
  const items = hourly.slice(0, 24);
  const trackRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);

  if (items.length === 0) return null;

  const maxIndex = items.length - 1;
  const activePoint = items[Math.min(scrubIndex, maxIndex)] ?? items[0];
  const activeLabel = formatHourLabel(activePoint.timestamp, timezoneOffsetSec, scrubIndex === 0);

  const updateFromPointer = (clientX: number) => {
    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / Math.max(1, rect.width)));
    const nextIdx = Math.round(ratio * maxIndex);
    if (nextIdx !== scrubIndex) {
      triggerHaptic(5);
      onScrubChange(nextIdx);
      const card = stripRef.current?.children[nextIdx] as HTMLElement | undefined;
      card?.scrollIntoView({behavior: 'smooth', inline: 'nearest', block: 'nearest'});
    }
  };

  const handleTrackPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    updateFromPointer(e.clientX);
  };

  const handleTrackPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.buttons !== 1 && e.pointerType === 'mouse') return;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      updateFromPointer(e.clientX);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      const next = Math.min(maxIndex, scrubIndex + 1);
      onScrubChange(next);
      triggerHaptic(5);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      const next = Math.max(0, scrubIndex - 1);
      onScrubChange(next);
      triggerHaptic(5);
    } else if (e.key === 'Home') {
      e.preventDefault();
      onScrubChange(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      onScrubChange(maxIndex);
    }
  };

  return (
    <section
      aria-label="Next 24 hours time-travel forecast"
      onMouseMove={handleCardPointerMove}
      className={`rounded-3xl border weatherly-surface-card weatherly-card-lift p-6 shadow-[0_8px_24px_rgba(15,27,61,0.06)] ${
        frost ? 'weatherly-frost-card' : ''
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-base font-semibold text-[#0F1B3D]">Next 24 Hours</h2>
          <p className="text-xs text-[#475569] mt-0.5" aria-live="polite">
            {scrubIndex === 0
              ? 'Drag the timeline or tap any hour to preview sky & conditions'
              : `Previewing ${activeLabel} · ${formatTemp(activePoint.tempC, unit)} · ${activePoint.condition}`}
          </p>
        </div>

        {scrubIndex > 0 && (
          <button
            type="button"
            onClick={() => {
              triggerHaptic(10);
              onScrubChange(0);
              stripRef.current?.scrollTo({left: 0, behavior: 'smooth'});
            }}
            className="weatherly-pressable min-h-[36px] px-3.5 py-1.5 rounded-full bg-[#F97316] text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm hover:bg-[#EA580C] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F97316]"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Now</span>
          </button>
        )}
      </div>

      {/* Draggable Time-Travel Scrubber Slider */}
      <div className="mb-4 px-1">
        <div
          ref={trackRef}
          role="slider"
          tabIndex={0}
          aria-label="Time-travel forecast scrubber"
          aria-valuemin={0}
          aria-valuemax={maxIndex}
          aria-valuenow={scrubIndex}
          aria-valuetext={`${activeLabel}, ${formatTemp(activePoint.tempC, unit)}, ${activePoint.condition}`}
          onPointerDown={handleTrackPointerDown}
          onPointerMove={handleTrackPointerMove}
          onKeyDown={handleKeyDown}
          className="relative h-7 flex items-center cursor-ew-resize touch-none select-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F97316] rounded-full"
        >
          <div className="w-full h-2 rounded-full bg-slate-900/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#0F1B3D] to-[#F97316] transition-all duration-150 ease-out"
              style={{width: `${(scrubIndex / Math.max(1, maxIndex)) * 100}%`}}
            />
          </div>
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-white border-2 border-[#F97316] shadow-md transition-all duration-150 ease-out"
            style={{left: `${(scrubIndex / Math.max(1, maxIndex)) * 100}%`}}
          />
        </div>
      </div>

      {/* Horizontally scrollable hourly cards with aligned per-card rain mini bar & filling drop */}
      <div
        ref={stripRef}
        className="weatherly-scroll-strip flex items-stretch gap-2.5 overflow-x-auto pb-2 snap-x"
      >
        {items.map((hour, idx) => {
          const isSelected = idx === scrubIndex;
          const isNow = idx === 0;
          const pop = Math.max(0, Math.min(100, hour.precipProbability));

          return (
            <button
              key={hour.timestamp}
              type="button"
              onClick={() => {
                triggerHaptic(6);
                onScrubChange(idx);
              }}
              aria-pressed={isSelected}
              className={`group snap-start min-w-[78px] shrink-0 rounded-2xl px-2.5 py-3 flex flex-col items-center justify-between gap-2 transition-all duration-150 weatherly-pressable focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F97316] ${
                isSelected
                  ? 'bg-[#0F1B3D] text-white shadow-md scale-[1.02]'
                  : 'bg-white/75 text-[#0F1B3D] hover:bg-white'
              }`}
            >
              <span
                className={`text-xs font-medium whitespace-nowrap ${
                  isSelected ? 'text-orange-300' : 'text-[#475569]'
                }`}
              >
                {formatHourLabel(hour.timestamp, timezoneOffsetSec, isNow)}
              </span>

              <WeatherIcon kind={hour.icon} size={26} />

              <span className="text-sm font-semibold tabular-nums">
                {formatTemp(hour.tempC, unit)}
              </span>

              {/* Aligned per-card vertical mini bar + filling raindrop */}
              <div className="w-full flex items-end justify-center gap-1.5 pt-1">
                <div
                  className={`w-1.5 h-6 rounded-full flex items-end overflow-hidden ${
                    isSelected ? 'bg-white/15' : 'bg-slate-900/10'
                  }`}
                  aria-hidden="true"
                >
                  <div
                    className={`w-full rounded-full transition-all duration-300 ${
                      isSelected ? 'bg-sky-300' : 'bg-sky-500'
                    }`}
                    style={{height: `${Math.max(10, pop)}%`}}
                  />
                </div>
                <div className="flex flex-col items-center">
                  <RainDropFill percent={pop} active={isSelected} />
                  <span
                    className={`text-[10px] font-medium tabular-nums leading-none mt-0.5 ${
                      isSelected ? 'text-sky-200' : 'text-sky-800'
                    }`}
                  >
                    {pop}%
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
