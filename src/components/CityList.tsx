import {ArrowLeftRight, ArrowUpDown, GripVertical, MapPin, Plus, X} from 'lucide-react';
import {useRef, useState} from 'react';
import {formatCityTime} from '../domain/time';
import {formatTemp} from '../domain/units';
import {WeatherIcon} from '../icons/WeatherIcon';
import type {CityLiveSnapshot, CityLocation, SavedCity, TemperatureUnit} from '../types/weather';
import {handleCardPointerMove, triggerHaptic} from '../utils/haptics';

interface CityListProps {
  cities: SavedCity[];
  snapshots: Record<string, CityLiveSnapshot>;
  activeCityId: string;
  unit: TemperatureUnit;
  onSelectCity: (city: CityLocation) => void;
  onRemoveCity: (city: SavedCity) => void;
  onReorderCities: (nextOrder: SavedCity[]) => void;
  onAddDefaults: () => void;
  onOpenCompare: () => void;
  frost?: boolean;
}

function TinySparkline({temps, active}: {temps: number[]; active: boolean}) {
  if (temps.length < 2) return null;
  const minT = Math.min(...temps);
  const maxT = Math.max(...temps);
  const span = Math.max(1, maxT - minT);
  const pts = temps
    .map((v, i) => {
      const x = 2 + (i / (temps.length - 1)) * 42;
      const y = 16 - ((v - minT) / span) * 12;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg width="46" height="20" viewBox="0 0 46 20" aria-hidden="true" className="shrink-0">
      <polyline
        fill="none"
        stroke={active ? '#FDBA74' : '#F97316'}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={pts}
      />
    </svg>
  );
}

export function CityList({
  cities,
  snapshots,
  activeCityId,
  unit,
  onSelectCity,
  onRemoveCity,
  onReorderCities,
  onAddDefaults,
  onOpenCompare,
  frost = false,
}: CityListProps) {
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const touchStartX = useRef<number | null>(null);
  const nowSec = Math.floor(Date.now() / 1000);

  const handleDrop = (targetIdx: number) => {
    if (dragIdx === null || dragIdx === targetIdx) {
      setDragIdx(null);
      return;
    }
    const next = [...cities];
    const [moved] = next.splice(dragIdx, 1);
    next.splice(targetIdx, 0, moved);
    triggerHaptic(8);
    onReorderCities(next);
    setDragIdx(null);
  };

  const moveCity = (idx: number, delta: number) => {
    const target = idx + delta;
    if (target < 0 || target >= cities.length) return;
    const next = [...cities];
    const [moved] = next.splice(idx, 1);
    next.splice(target, 0, moved);
    triggerHaptic(6);
    onReorderCities(next);
  };

  return (
    <section
      id="cities-section"
      aria-label="Saved cities"
      onMouseMove={handleCardPointerMove}
      className={`rounded-3xl border weatherly-surface-card weatherly-card-lift p-5 shadow-[0_8px_24px_rgba(15,27,61,0.06)] flex flex-col gap-3 ${
        frost ? 'weatherly-frost-card' : ''
      }`}
    >
      <div className="flex items-center justify-between gap-2 px-1">
        <div>
          <h2 className="text-base font-semibold text-[#0F1B3D]">Saved Cities</h2>
          <p className="text-[11px] text-[#475569]">Drag to reorder · swipe or × to remove</p>
        </div>

        {cities.length >= 2 && (
          <button
            type="button"
            onClick={() => {
              triggerHaptic(8);
              onOpenCompare();
            }}
            className="weatherly-pressable min-h-[34px] px-3 py-1.5 rounded-full bg-[#0F1B3D] text-white text-xs font-medium inline-flex items-center gap-1.5 whitespace-nowrap hover:bg-[#1E293B] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F97316]"
          >
            <ArrowLeftRight className="w-3.5 h-3.5 text-[#F97316]" aria-hidden="true" />
            <span>Compare</span>
          </button>
        )}
      </div>

      {cities.length === 0 ? (
        <div className="rounded-2xl bg-white/70 p-5 text-center">
          <p className="text-sm text-[#475569]">
            Save favorite cities from the Hero card or command palette to switch forecasts in one click.
          </p>
          <button
            type="button"
            onClick={onAddDefaults}
            className="mt-3 px-4 py-2 rounded-full bg-[#0F1B3D] text-white text-xs font-medium inline-flex items-center gap-1.5 hover:bg-[#1E293B] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Add sample cities</span>
          </button>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {cities.map((city, idx) => {
            const isActive = city.id === activeCityId;
            const snap = snapshots[city.id];
            const isLoading = snap?.loading;
            const tempC = snap?.tempC ?? city.lastTempC;
            const highC = snap?.highC ?? city.lastHighC;
            const lowC = snap?.lowC ?? city.lastLowC;
            const cond = snap?.condition ?? city.lastCondition ?? 'Weather';
            const icon = snap?.icon ?? city.lastIcon;
            const localTimeStr = snap
              ? formatCityTime(nowSec, snap.timezoneOffsetSec)
              : null;

            return (
              <li
                key={city.id}
                draggable
                onDragStart={() => setDragIdx(idx)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(idx)}
                onTouchStart={(e) => {
                  touchStartX.current = e.touches[0]?.clientX ?? null;
                }}
                onTouchEnd={(e) => {
                  if (touchStartX.current === null) return;
                  const endX = e.changedTouches[0]?.clientX ?? touchStartX.current;
                  if (touchStartX.current - endX > 70) {
                    triggerHaptic(10);
                    onRemoveCity(city);
                  }
                  touchStartX.current = null;
                }}
                className={`group rounded-2xl transition-all duration-150 flex items-center gap-1 pr-2 ${
                  dragIdx === idx ? 'opacity-55 scale-[0.98]' : ''
                } ${
                  isActive
                    ? 'bg-[#0F1B3D] text-white shadow-sm'
                    : 'bg-white/80 text-[#0F1B3D] hover:bg-white'
                }`}
              >
                <span
                  className={`pl-2 cursor-grab active:cursor-grabbing ${
                    isActive ? 'text-slate-400' : 'text-slate-400'
                  }`}
                  aria-hidden="true"
                >
                  <GripVertical className="w-3.5 h-3.5" />
                </span>

                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic(6);
                    onSelectCity(city);
                  }}
                  className="flex-1 min-w-0 flex items-center justify-between gap-2 px-2 py-2.5 text-left rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F97316]"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {icon ? (
                      <WeatherIcon kind={icon} size={26} />
                    ) : (
                      <MapPin
                        className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#F97316]' : 'text-[#64748B]'}`}
                        aria-hidden="true"
                      />
                    )}
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate">
                        {city.name}
                        {city.country ? `, ${city.country}` : ''}
                      </div>
                      <div
                        className={`text-[11px] truncate tabular-nums ${
                          isActive ? 'text-slate-300' : 'text-[#475569]'
                        }`}
                      >
                        {isLoading ? 'Updating…' : `${localTimeStr ? `${localTimeStr} · ` : ''}${cond}`}
                      </div>
                    </div>
                  </div>

                  {isLoading ? (
                    <div className="h-5 w-16 rounded-full bg-slate-900/10 animate-pulse shrink-0" />
                  ) : (
                    <div className="flex items-center gap-2 shrink-0">
                      {snap?.sparkline && snap.sparkline.length > 1 && (
                        <TinySparkline temps={snap.sparkline} active={isActive} />
                      )}
                      <div className="text-right tabular-nums">
                        {typeof tempC === 'number' && (
                          <div className="text-sm font-semibold">{formatTemp(tempC, unit)}</div>
                        )}
                        {typeof highC === 'number' && typeof lowC === 'number' && (
                          <div
                            className={`text-[10px] font-medium ${
                              isActive ? 'text-orange-300' : 'text-[#F97316]'
                            }`}
                          >
                            {formatTemp(highC, unit)} / {formatTemp(lowC, unit)}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => moveCity(idx, idx === 0 ? 1 : -1)}
                  aria-label={`Reorder ${city.name}`}
                  title="Move up or down"
                  className={`hidden sm:flex w-7 h-7 rounded-full items-center justify-center shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity ${
                    isActive
                      ? 'text-slate-300 hover:text-white hover:bg-white/10'
                      : 'text-[#64748B] hover:text-[#0F1B3D] hover:bg-slate-900/10'
                  }`}
                >
                  <ArrowUpDown className="w-3 h-3" aria-hidden="true" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic(8);
                    onRemoveCity(city);
                  }}
                  aria-label={`Remove ${city.name}`}
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F97316] ${
                    isActive
                      ? 'text-slate-300 hover:text-white hover:bg-white/10'
                      : 'text-[#64748B] hover:text-[#0F1B3D] hover:bg-slate-900/10'
                  }`}
                >
                  <X className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
