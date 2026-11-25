import {ChevronDown, Droplets, Sunrise, Sunset} from 'lucide-react';
import {useState} from 'react';
import {formatCityTime} from '../domain/time';
import {convertTemp, formatTemp} from '../domain/units';
import {WeatherIcon} from '../icons/WeatherIcon';
import type {DailyForecast, TemperatureUnit} from '../types/weather';
import {handleCardPointerMove, triggerHaptic} from '../utils/haptics';
import {RangeBar} from './RangeBar';

interface ForecastCardProps {
  cityName: string;
  currentTempC: number;
  condition: string;
  daily: DailyForecast[];
  timezoneOffsetSec: number;
  unit: TemperatureUnit;
  frost?: boolean;
}

function DayMiniSparkline({temps, unit}: {temps: number[]; unit: TemperatureUnit}) {
  if (temps.length < 2) return null;
  const converted = temps.map((t) => convertTemp(t, unit));
  const minT = Math.min(...converted);
  const maxT = Math.max(...converted);
  const span = Math.max(1, maxT - minT);
  const w = 132;
  const h = 32;

  const pts = converted
    .map((val, i) => {
      const x = 6 + (i / (converted.length - 1)) * (w - 12);
      const y = h - 6 - ((val - minT) / span) * (h - 12);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      <polyline
        fill="none"
        stroke="#FDBA74"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={pts}
      />
    </svg>
  );
}

export function ForecastCard({
  cityName,
  currentTempC,
  condition,
  daily,
  timezoneOffsetSec,
  unit,
  frost = false,
}: ForecastCardProps) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const days = daily.slice(0, 7);
  const globalMinC = days.length > 0 ? Math.min(...days.map((d) => d.minC)) : 0;
  const globalMaxC = days.length > 0 ? Math.max(...days.map((d) => d.maxC)) : 30;

  return (
    <section
      id="forecast-section"
      aria-label="7-day weather forecast"
      onMouseMove={handleCardPointerMove}
      className={`rounded-3xl border backdrop-blur-xl weatherly-glass-card weatherly-card-lift p-6 shadow-[0_12px_36px_rgba(15,27,61,0.14)] flex flex-col justify-between ${
        frost ? 'weatherly-frost-card' : ''
      }`}
    >
      <div className="text-center pb-4">
        <h2 className="text-2xl font-normal tracking-tight text-white">{cityName}</h2>
        <p className="mt-1 text-base font-normal text-white/85 tabular-nums">
          {formatTemp(currentTempC, unit)} <span aria-hidden="true">|</span> {condition}
        </p>
      </div>

      <ul className="divide-y divide-white/15">
        {days.map((day, idx) => {
          const isToday = idx === 0;
          const isExpanded = expandedIdx === idx;
          const isHovered = hoveredIdx === idx && !isExpanded;

          return (
            <li key={day.timestamp} className="relative py-1 first:pt-0 last:pb-0">
              <button
                type="button"
                aria-expanded={isExpanded}
                onClick={() => {
                  triggerHaptic(6);
                  setExpandedIdx((prev) => (prev === idx ? null : idx));
                }}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx((prev) => (prev === idx ? null : prev))}
                onFocus={() => setHoveredIdx(idx)}
                onBlur={() => setHoveredIdx((prev) => (prev === idx ? null : prev))}
                className="group w-full grid grid-cols-[54px_34px_38px_1fr_38px_18px] items-center gap-2 py-2 px-1.5 rounded-xl hover:bg-white/10 transition-colors text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                <span className="text-sm font-medium text-white whitespace-nowrap">
                  {day.dayLabel}
                </span>

                <div className="flex items-center justify-center">
                  <WeatherIcon kind={day.icon} size={24} />
                </div>

                <span className="text-sm font-medium text-sky-50/90 text-right tabular-nums">
                  {formatTemp(day.minC, unit)}
                </span>

                <div className="px-1">
                  <RangeBar
                    dayMinC={day.minC}
                    dayMaxC={day.maxC}
                    globalMinC={globalMinC}
                    globalMaxC={globalMaxC}
                    currentTempC={isToday ? currentTempC : undefined}
                    showCurrentDot={isToday}
                    rowIndex={idx}
                  />
                </div>

                <span className="text-sm font-semibold text-white text-right tabular-nums">
                  {formatTemp(day.maxC, unit)}
                </span>

                <ChevronDown
                  className={`w-3.5 h-3.5 text-white/85 transition-transform duration-200 ${
                    isExpanded ? 'rotate-180' : ''
                  }`}
                  aria-hidden="true"
                />
              </button>

              {/* Hover/Focus tooltip with hourly mini-curve */}
              {isHovered && Array.isArray(day.hourlyMini) && day.hourlyMini.length > 1 && (
                <div
                  role="tooltip"
                  className="hidden sm:flex items-center gap-3 absolute right-6 -top-12 z-20 rounded-2xl bg-[#0F1B3D]/95 text-white px-3.5 py-2 shadow-lg border border-white/15 pointer-events-none"
                >
                  <div>
                    <div className="text-[11px] text-slate-300">{day.dayLabel} curve</div>
                    <div className="text-xs font-semibold tabular-nums">
                      {formatTemp(day.minC, unit)} – {formatTemp(day.maxC, unit)}
                    </div>
                  </div>
                  <DayMiniSparkline temps={day.hourlyMini} unit={unit} />
                </div>
              )}

              {/* Inline expanded day details */}
              {isExpanded && (
                <div className="mt-1 mb-2 rounded-2xl bg-white/12 border border-white/15 p-3.5 text-xs text-white space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-white/90">
                    <span className="inline-flex items-center gap-1.5 tabular-nums">
                      <Droplets className="w-3.5 h-3.5 text-sky-300" aria-hidden="true" />
                      {day.precipProbability}% rain chance
                    </span>
                    {day.sunrise && day.sunset && (
                      <div className="flex items-center gap-3 tabular-nums">
                        <span className="inline-flex items-center gap-1">
                          <Sunrise className="w-3.5 h-3.5 text-amber-300" aria-hidden="true" />
                          {formatCityTime(day.sunrise, timezoneOffsetSec)}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Sunset className="w-3.5 h-3.5 text-orange-300" aria-hidden="true" />
                          {formatCityTime(day.sunset, timezoneOffsetSec)}
                        </span>
                      </div>
                    )}
                  </div>

                  {day.periods && (
                    <div className="grid grid-cols-4 gap-2 pt-2 border-t border-white/15 text-center">
                      {day.periods.map((p) => (
                        <div key={p.period} className="flex flex-col items-center gap-1">
                          <span className="text-[11px] text-white/90">{p.period}</span>
                          <WeatherIcon kind={p.icon} size={20} />
                          <span className="font-semibold tabular-nums">
                            {formatTemp(p.tempC, unit)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
