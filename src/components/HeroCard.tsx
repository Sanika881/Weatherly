import {Bookmark, MapPin, Moon, Share2, Sun} from 'lucide-react';
import {useState} from 'react';
import {getFriendlyMicrocopy} from '../domain/activities';
import {getGoldenHourCountdown, getMoonPhase} from '../domain/celestial';
import {formatCityDate, formatCityTime} from '../domain/time';
import {convertTemp, formatTemp} from '../domain/units';
import {computeFeelsLikeFactors} from '../domain/viewWeather';
import {WeatherIcon} from '../icons/WeatherIcon';
import type {TemperatureUnit, WeatherBundle} from '../types/weather';
import {handleCardPointerMove, triggerHaptic} from '../utils/haptics';
import {AnimatedNumber} from './AnimatedNumber';

interface HeroCardProps {
  weather: WeatherBundle;
  unit: TemperatureUnit;
  isSaved: boolean;
  isForecastMode: boolean;
  isLocating?: boolean;
  onToggleSave: () => void;
  onShare: () => void;
  isSharing?: boolean;
}

export function HeroCard({
  weather,
  unit,
  isSaved,
  isForecastMode,
  isLocating = false,
  onToggleSave,
  onShare,
  isSharing = false,
}: HeroCardProps) {
  const [reactionActive, setReactionActive] = useState(false);
  const [feelsBlend, setFeelsBlend] = useState(100);

  const {location, current, timezoneOffsetSec, observedAt, sunrise, sunset} = weather;
  const localTime = formatCityTime(observedAt, timezoneOffsetSec);
  const localDate = formatCityDate(observedAt, timezoneOffsetSec);
  const goldenCountdown = getGoldenHourCountdown(observedAt, sunrise, sunset);
  const moon = getMoonPhase(observedAt);
  const microcopy = getFriendlyMicrocopy(weather);

  const placeSubtitle = [location.region || location.state, location.country]
    .filter(Boolean)
    .join(', ');
  const displayPlace = isLocating
    ? 'Your location'
    : placeSubtitle
    ? `${location.name}, ${placeSubtitle}`
    : location.name;

  const factors = computeFeelsLikeFactors({
    tempC: current.tempC,
    feelsLikeC: current.feelsLikeC,
    humidity: current.humidity,
    windKmh: current.windKmh,
    cloudCover: current.cloudCover,
    isDay: current.isDay,
  });

  const blendedTempC =
    current.tempC + ((current.feelsLikeC - current.tempC) * feelsBlend) / 100;
  const displayTemp = convertTemp(blendedTempC, unit);

  const isHot = current.tempC > 32;
  const isCold = current.tempC < 5;

  const triggerPlayfulReaction = () => {
    triggerHaptic(12);
    setReactionActive(true);
    window.setTimeout(() => setReactionActive(false), 2400);
  };

  return (
    <section
      aria-label="Current weather overview"
      onMouseMove={handleCardPointerMove}
      className={`rounded-3xl border backdrop-blur-xl weatherly-surface-card weatherly-card-lift p-6 sm:p-8 shadow-[0_12px_36px_rgba(15,27,61,0.08)] flex flex-col justify-between gap-6 relative ${
        isCold ? 'weatherly-frost-card' : ''
      }`}
    >
      {/* Top location bar, forecast timestamp & share/save actions */}
      <div className="flex flex-wrap items-start justify-between gap-4 relative z-10">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[#0F1B3D]">
            <MapPin className="w-4 h-4 text-[#F97316] shrink-0" aria-hidden="true" />
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight truncate">
              {displayPlace}
            </h1>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-[#334155] flex flex-wrap items-center gap-x-2 gap-y-0.5">
            {isForecastMode ? (
              <span className="font-semibold text-[#C2410C]">
                {localDate.split(',')[0]}, {localTime} · forecast
              </span>
            ) : (
              <>
                <span>{localDate}</span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">{localTime}</span>
              </>
            )}
            <span aria-hidden="true">·</span>
            <span>{current.description}</span>
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              triggerHaptic(8);
              onShare();
            }}
            disabled={isSharing}
            aria-label="Share weather card image"
            className="weatherly-pressable min-h-[40px] px-4 py-2 rounded-full bg-slate-900/6 text-[#0F1B3D] hover:bg-slate-900/12 text-xs font-medium inline-flex items-center gap-1.5 whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F97316]"
          >
            <Share2 className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{isSharing ? 'Rendering…' : 'Share'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              triggerHaptic(8);
              onToggleSave();
            }}
            aria-label={isSaved ? `Remove ${location.name} from saved cities` : `Save ${location.name}`}
            aria-pressed={isSaved}
            className={`weatherly-pressable min-h-[40px] px-4 py-2 rounded-full text-xs font-medium inline-flex items-center gap-1.5 whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F97316] ${
              isSaved
                ? 'bg-[#F97316] text-white'
                : 'bg-slate-900/6 text-[#0F1B3D] hover:bg-slate-900/12'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" fill={isSaved ? 'currentColor' : 'none'} aria-hidden="true" />
            <span>{isSaved ? 'Saved' : 'Save city'}</span>
          </button>
        </div>
      </div>

      {/* Main temperature, microcopy, & clickable top-right sun/moon illustration */}
      <div className="flex items-center justify-between gap-6 relative z-10">
        <div className="min-w-0">
          <div className="text-[clamp(3.25rem,5.2vw,4.6rem)] font-semibold leading-none tracking-tight text-[#0F1B3D] tabular-nums">
            <AnimatedNumber value={displayTemp} suffix={`°${unit}`} />
          </div>
          <p className="mt-2 text-sm font-medium text-[#0F1B3D]">{microcopy}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-[#334155] tabular-nums">
            <span>High {formatTemp(current.maxC, unit)}</span>
            <span aria-hidden="true">·</span>
            <span>Low {formatTemp(current.minC, unit)}</span>
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1">
              <Sun className="w-3.5 h-3.5 text-[#C2410C]" aria-hidden="true" />
              {goldenCountdown}
            </span>
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1">
              <Moon className="w-3.5 h-3.5 text-[#334155]" aria-hidden="true" />
              {moon.name} ({moon.illumination}%)
            </span>
          </div>
        </div>

        {/* Dedicated non-overlapping top-right sun/moon weather illustration */}
        <button
          type="button"
          onClick={triggerPlayfulReaction}
          aria-label={`Weather illustration for ${current.condition}. Activate for a playful animation`}
          title="Tap for a weather surprise"
          className="weatherly-pressable shrink-0 rounded-3xl p-2 bg-gradient-to-br from-sky-200/45 to-amber-100/45 hover:from-sky-200/65 hover:to-amber-100/65 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F97316]"
        >
          <WeatherIcon
            kind={current.icon}
            size={112}
            reactionActive={reactionActive}
            heatShimmer={isHot}
            className="w-24 h-24 sm:w-28 sm:h-28"
          />
        </button>
      </div>

      {/* Feels-like interactive factor slider */}
      <div className="rounded-2xl bg-white/80 px-4 py-4 space-y-2 relative z-10">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <label htmlFor="feels-like-slider" className="font-semibold text-[#0F1B3D]">
            {feelsBlend < 50 ? 'Actual temperature' : 'Feels-like temperature'}
          </label>
          <span className="text-[#334155] tabular-nums">
            Actual {formatTemp(current.tempC, unit)} → Feels like {formatTemp(current.feelsLikeC, unit)}
          </span>
        </div>

        <input
          id="feels-like-slider"
          type="range"
          min={0}
          max={100}
          value={feelsBlend}
          onChange={(e) => setFeelsBlend(Number(e.target.value))}
          aria-label="Blend between actual temperature and feels-like temperature"
          className="w-full accent-[#F97316] cursor-pointer h-1.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F97316]"
        />

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#334155] tabular-nums">
          {factors.map((f) => {
            const deltaUnit = unit === 'F' ? Math.round(f.deltaC * 1.8 * 10) / 10 : f.deltaC;
            const sign = deltaUnit > 0 ? '+' : '';
            return (
              <span key={f.label}>
                {f.label}{' '}
                <strong
                  className={
                    deltaUnit > 0
                      ? 'text-[#C2410C]'
                      : deltaUnit < 0
                      ? 'text-[#0369A1]'
                      : 'text-[#334155]'
                  }
                >
                  {sign}
                  {deltaUnit}°
                </strong>
              </span>
            );
          })}
        </div>
      </div>
    </section>
  );
}
