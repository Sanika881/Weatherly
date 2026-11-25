import {Award, Droplets, Wind, X} from 'lucide-react';
import {useEffect, useState} from 'react';
import {getAqiMeta} from '../domain/aqi';
import {formatSpeed, formatTemp} from '../domain/units';
import {WeatherIcon} from '../icons/WeatherIcon';
import type {CityLiveSnapshot, SavedCity, TemperatureUnit} from '../types/weather';

interface CompareModalProps {
  cities: SavedCity[];
  snapshots: Record<string, CityLiveSnapshot>;
  unit: TemperatureUnit;
  onClose: () => void;
}

function scoreCityComfort(snap?: CityLiveSnapshot): number {
  if (!snap) return 50;
  const tempComfort = 100 - Math.abs(snap.tempC - 21) * 3.2;
  const rainPenalty = (snap.precipProbability ?? 0) * 0.65;
  const windPenalty = Math.max(0, (snap.windKmh ?? 10) - 20) * 1.2;
  const aqiPenalty = ((snap.aqiIndex ?? 1) - 1) * 10;
  return tempComfort - rainPenalty - windPenalty - aqiPenalty;
}

export default function CompareModal({cities, snapshots, unit, onClose}: CompareModalProps) {
  const [leftId, setLeftId] = useState(cities[0]?.id ?? '');
  const [rightId, setRightId] = useState(cities[1]?.id ?? cities[0]?.id ?? '');
  const [splitPct, setSplitPct] = useState(50);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const leftCity = cities.find((c) => c.id === leftId) ?? cities[0];
  const rightCity = cities.find((c) => c.id === rightId) ?? cities[1] ?? cities[0];

  if (!leftCity || !rightCity) return null;

  const leftSnap = snapshots[leftCity.id];
  const rightSnap = snapshots[rightCity.id];

  const leftScore = scoreCityComfort(leftSnap);
  const rightScore = scoreCityComfort(rightSnap);
  const winner = leftScore >= rightScore ? leftCity.name : rightCity.name;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="compare-title"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F1B3D]/55 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl rounded-3xl bg-white text-[#0F1B3D] p-6 shadow-[0_24px_64px_rgba(15,27,61,0.3)] border border-white/80 space-y-5"
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 id="compare-title" className="text-lg font-semibold">
              Compare Cities
            </h2>
            <p className="text-xs text-[#475569] inline-flex items-center gap-1.5 mt-0.5">
              <Award className="w-3.5 h-3.5 text-[#F97316]" aria-hidden="true" />
              <span>
                Better weather right now: <strong className="text-[#0F1B3D]">{winner}</strong>
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close comparison"
            className="w-9 h-9 rounded-full flex items-center justify-center text-[#475569] hover:bg-slate-100"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {/* Selectors */}
        <div className="grid grid-cols-2 gap-3">
          <select
            aria-label="First city to compare"
            value={leftCity.id}
            onChange={(e) => setLeftId(e.target.value)}
            className="rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-[#0F1B3D]"
          >
            {cities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            aria-label="Second city to compare"
            value={rightCity.id}
            onChange={(e) => setRightId(e.target.value)}
            className="rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-[#0F1B3D]"
          >
            {cities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Split-screen comparison slider */}
        <div className="relative rounded-3xl overflow-hidden border border-slate-200 bg-slate-50 min-h-[220px]">
          <div className="grid grid-cols-2">
            {/* Left city panel */}
            <div
              className="p-5 bg-gradient-to-br from-sky-50 to-orange-50 flex flex-col justify-between gap-4 transition-opacity"
              style={{opacity: Math.max(0.45, splitPct / 100 + 0.35)}}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-base font-semibold">{leftCity.name}</div>
                  <div className="text-xs text-[#475569]">{leftSnap?.condition ?? 'Loading'}</div>
                </div>
                <WeatherIcon kind={leftSnap?.icon ?? 'partly-cloudy'} size={42} />
              </div>

              <div className="text-4xl font-semibold tabular-nums">
                {leftSnap ? formatTemp(leftSnap.tempC, unit, true) : '--'}
              </div>

              <div className="space-y-1.5 text-xs text-[#334155] tabular-nums">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1">
                    <Droplets className="w-3.5 h-3.5 text-sky-600" aria-hidden="true" /> Rain
                  </span>
                  <span>{leftSnap?.precipProbability ?? 0}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1">
                    <Wind className="w-3.5 h-3.5 text-[#F97316]" aria-hidden="true" /> Wind
                  </span>
                  <span>{formatSpeed(leftSnap?.windKmh ?? 0, unit)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Air Quality</span>
                  <span>{leftSnap?.aqiIndex ? getAqiMeta(leftSnap.aqiIndex).band : 'Good'}</span>
                </div>
              </div>
            </div>

            {/* Right city panel */}
            <div
              className="p-5 bg-[#0F1B3D] text-white flex flex-col justify-between gap-4 transition-opacity"
              style={{opacity: Math.max(0.45, (100 - splitPct) / 100 + 0.35)}}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-base font-semibold">{rightCity.name}</div>
                  <div className="text-xs text-slate-300">{rightSnap?.condition ?? 'Loading'}</div>
                </div>
                <WeatherIcon kind={rightSnap?.icon ?? 'partly-cloudy'} size={42} />
              </div>

              <div className="text-4xl font-semibold tabular-nums">
                {rightSnap ? formatTemp(rightSnap.tempC, unit, true) : '--'}
              </div>

              <div className="space-y-1.5 text-xs text-slate-300 tabular-nums">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1">
                    <Droplets className="w-3.5 h-3.5 text-sky-300" aria-hidden="true" /> Rain
                  </span>
                  <span>{rightSnap?.precipProbability ?? 0}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1">
                    <Wind className="w-3.5 h-3.5 text-orange-300" aria-hidden="true" /> Wind
                  </span>
                  <span>{formatSpeed(rightSnap?.windKmh ?? 0, unit)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Air Quality</span>
                  <span>{rightSnap?.aqiIndex ? getAqiMeta(rightSnap.aqiIndex).band : 'Good'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-xs text-[#475569]">
            <span>Focus {leftCity.name}</span>
            <label htmlFor="compare-split-slider">Comparison spotlight</label>
            <span>Focus {rightCity.name}</span>
          </div>
          <input
            id="compare-split-slider"
            type="range"
            min={10}
            max={90}
            value={splitPct}
            onChange={(e) => setSplitPct(Number(e.target.value))}
            className="w-full accent-[#F97316] h-1.5 cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
}
