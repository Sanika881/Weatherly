import {ArrowDown, ArrowRight, ArrowUp, ChevronDown, Navigation} from 'lucide-react';
import {useState} from 'react';
import {getAqiMeta} from '../domain/aqi';
import {formatHourLabel} from '../domain/time';
import {
  convertSpeed,
  convertVisibility,
  degreesToCompass,
  formatTemp,
} from '../domain/units';
import {getUvMeta} from '../domain/uv';
import type {TemperatureUnit, WeatherBundle} from '../types/weather';
import {handleCardPointerMove, triggerHaptic} from '../utils/haptics';
import {AnimatedNumber} from './AnimatedNumber';

type TileId = 'aqi' | 'pressure' | 'uv' | 'humidity' | 'wind' | 'visibility';

interface MetricsGridProps {
  weather: WeatherBundle;
  unit: TemperatureUnit;
  frost?: boolean;
}

export function MetricsGrid({weather, unit, frost = false}: MetricsGridProps) {
  const [expanded, setExpanded] = useState<TileId | null>(null);
  const [fogPreviewKm, setFogPreviewKm] = useState<number | null>(null);

  const {current, airQuality, uv, hourly, timezoneOffsetSec} = weather;

  const toggleTile = (id: TileId) => {
    triggerHaptic(7);
    setExpanded((prev) => (prev === id ? null : id));
  };

  const pressureLabel =
    current.pressureTrend === 'rising'
      ? 'Rising'
      : current.pressureTrend === 'falling'
      ? 'Falling'
      : 'Steady';

  const aqiMeta = airQuality ? getAqiMeta(airQuality.index) : null;
  const uvMeta = uv ? getUvMeta(uv.index) : null;

  // Pressure needle angle (-70deg falling, 0deg steady, +70deg rising, scaled by pressure)
  const safePressure = Number.isFinite(current.pressureHpa) ? current.pressureHpa : 1013;
  const pressureNorm = Math.max(-1, Math.min(1, (safePressure - 1013) / 25));
  const needleDeg = Number.isFinite(pressureNorm) ? pressureNorm * 65 : 0;

  // Pressure 24h sparkline points
  const pressureSeries = hourly
    .slice(0, 12)
    .map((h) => h.pressureHpa)
    .filter((p) => Number.isFinite(p));
  const pMin = pressureSeries.length ? Math.min(...pressureSeries) : 1000;
  const pMax = pressureSeries.length ? Math.max(...pressureSeries) : 1020;
  const pSpan = Math.max(2, pMax - pMin);
  const pressureSvgPoints = pressureSeries
    .map((p, i) => {
      const x = 6 + (i / Math.max(1, pressureSeries.length - 1)) * 208;
      const y = 38 - ((p - pMin) / pSpan) * 28;
      return `${x.toFixed(1)},${(Number.isFinite(y) ? y : 24).toFixed(1)}`;
    })
    .join(' ');

  // UV hourly curve for expanded UV chart
  const uvSeries = hourly.slice(0, 12).map((h) => ({
    ...h,
    uvIndex: Number.isFinite(h.uvIndex) ? h.uvIndex : 0,
  }));
  const safeUvNow = uv && Number.isFinite(uv.index) ? uv.index : 0;
  const maxUvToday = Math.max(1, ...uvSeries.map((h) => h.uvIndex), safeUvNow);
  const peakUvPoint = uvSeries.reduce(
    (best, cur) => (cur.uvIndex > best.uvIndex ? cur : best),
    uvSeries[0] ?? {timestamp: weather.observedAt, uvIndex: safeUvNow}
  );
  const uvCurveCoords = uvSeries.map((h, i) => {
    const x = 8 + (i / Math.max(1, uvSeries.length - 1)) * 204;
    const y = 46 - (h.uvIndex / Math.max(11, maxUvToday)) * 38;
    return {x, y: Number.isFinite(y) ? y : 46};
  });
  const uvLinePoints = uvCurveCoords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
  const uvAreaPath =
    uvCurveCoords.length > 1
      ? `M ${uvCurveCoords[0].x.toFixed(1)} 48 L ${uvLinePoints.replace(/ /g, ' L ')} L ${uvCurveCoords[
          uvCurveCoords.length - 1
        ].x.toFixed(1)} 48 Z`
      : '';

  // Visibility fog blur calculation
  const effectiveVisKm = fogPreviewKm ?? current.visibilityKm;
  const blurPx = Math.max(0, Math.min(8, (12 - effectiveVisKm) * 0.65));

  // Wind streak duration inversely proportional to speed
  const windDurationSec = Math.max(0.55, Math.min(3, 45 / Math.max(8, current.windKmh)));
  const gustWobbleDeg = current.windGustKmh && current.windGustKmh > current.windKmh + 8 ? 10 : 3;

  // Humidity liquid wave top offset
  const waveTopPct = Math.max(8, Math.min(92, 100 - current.humidity));

  const visibilityLabel =
    current.visibilityKm >= 10
      ? 'Crystal clear view'
      : current.visibilityKm >= 5
      ? 'Light haze'
      : 'Reduced visibility';

  const humidityLabel =
    current.humidity >= 75
      ? 'Humid air'
      : current.humidity >= 40
      ? 'Comfortable balance'
      : 'Dry air';

  const pollutants = airQuality
    ? [
        {name: 'PM2.5', val: airQuality.pm25, max: 75, unit: 'µg/m³', note: 'Fine particles'},
        {name: 'PM10', val: airQuality.pm10, max: 150, unit: 'µg/m³', note: 'Coarse dust'},
        {name: 'O₃', val: airQuality.o3 ?? 36, max: 180, unit: 'µg/m³', note: 'Ground ozone'},
        {name: 'NO₂', val: airQuality.no2 ?? 18, max: 200, unit: 'µg/m³', note: 'Traffic gas'},
        {name: 'CO', val: airQuality.co ?? 210, max: 4000, unit: 'µg/m³', note: 'Carbon monoxide'},
      ]
    : [];

  return (
    <section
      id="metrics-section"
      aria-label="Atmospheric metrics"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
    >
      {/* 1. Dark Navy Contrast Tile: Air Quality */}
      {airQuality && aqiMeta && (
        <article
          onMouseMove={handleCardPointerMove}
          className={`rounded-3xl bg-[#0F1B3D] text-white weatherly-card-lift shadow-[0_12px_32px_rgba(15,27,61,0.18)] transition-all duration-300 ${
            expanded === 'aqi' ? 'sm:col-span-2' : ''
          }`}
        >
          <button
            type="button"
            aria-expanded={expanded === 'aqi'}
            onClick={() => toggleTile('aqi')}
            className="w-full h-full p-5 text-left flex flex-col justify-between gap-4 rounded-3xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F97316]"
          >
            <div className="flex items-start justify-between gap-2 w-full">
              <div>
                <h3 className="text-sm font-medium text-slate-300">Air Quality</h3>
                <div className="mt-1 flex items-baseline gap-2.5">
                  <span className="text-2xl font-semibold tabular-nums">
                    <AnimatedNumber value={airQuality.index} />
                  </span>
                  <span className={`text-sm font-semibold ${aqiMeta.badgeTextClass}`}>
                    {aqiMeta.band}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-300 tabular-nums">
                <span>PM2.5 {airQuality.pm25}</span>
                <ChevronDown
                  className={`w-4 h-4 transition-transform duration-200 ${
                    expanded === 'aqi' ? 'rotate-180' : ''
                  }`}
                  aria-hidden="true"
                />
              </div>
            </div>

            <div className="w-full">
              <div
                className="h-2 w-full rounded-full bg-white/15 overflow-hidden"
                role="progressbar"
                aria-valuenow={airQuality.index}
                aria-valuemin={1}
                aria-valuemax={5}
                aria-label={`Air quality ${aqiMeta.band}`}
              >
                <div
                  className="weatherly-bar-animate h-full rounded-full"
                  style={{width: `${aqiMeta.percent}%`, backgroundColor: aqiMeta.barColor}}
                />
              </div>
              <p className="mt-2.5 text-xs text-slate-300 leading-relaxed">{aqiMeta.description}</p>
            </div>

            {expanded === 'aqi' && (
              <div className="w-full pt-3 border-t border-white/15 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {pollutants.map((pol, idx) => {
                  const pct = Math.max(6, Math.min(100, (pol.val / pol.max) * 100));
                  return (
                    <div key={pol.name} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-white">
                          {pol.name} <span className="font-normal text-slate-400">· {pol.note}</span>
                        </span>
                        <span className="tabular-nums text-slate-200">
                          {pol.val} {pol.unit}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className="weatherly-bar-animate h-full rounded-full bg-emerald-400"
                          style={{width: `${pct}%`, animationDelay: `${idx * 60}ms`}}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </button>
        </article>
      )}

      {/* 2. Pressure with animated needle gauge & 24h sparkline */}
      <article
        onMouseMove={handleCardPointerMove}
        className={`rounded-3xl border weatherly-surface-card weatherly-card-lift shadow-[0_8px_24px_rgba(15,27,61,0.06)] transition-all duration-300 ${
          frost ? 'weatherly-frost-card' : ''
        } ${expanded === 'pressure' ? 'sm:col-span-2' : ''}`}
      >
        <button
          type="button"
          aria-expanded={expanded === 'pressure'}
          onClick={() => toggleTile('pressure')}
          className="w-full h-full p-5 text-left flex flex-col justify-between gap-4 rounded-3xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F97316]"
        >
          <div className="flex items-start justify-between w-full">
            <div>
              <h3 className="text-sm font-medium text-[#475569]">Pressure</h3>
              <div className="mt-1 text-2xl font-semibold text-[#0F1B3D] tabular-nums">
                <AnimatedNumber value={current.pressureHpa} />{' '}
                <span className="text-sm font-medium text-[#475569]">hPa</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="w-9 h-9 rounded-full bg-slate-900/5 flex items-center justify-center text-[#F97316]"
                aria-label={`Pressure ${pressureLabel}`}
              >
                {current.pressureTrend === 'rising' ? (
                  <ArrowUp className="w-4 h-4" aria-hidden="true" />
                ) : current.pressureTrend === 'falling' ? (
                  <ArrowDown className="w-4 h-4" aria-hidden="true" />
                ) : (
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                )}
              </span>
              <ChevronDown
                className={`w-4 h-4 text-[#64748B] transition-transform duration-200 ${
                  expanded === 'pressure' ? 'rotate-180' : ''
                }`}
                aria-hidden="true"
              />
            </div>
          </div>

          <div className="w-full flex items-center justify-between gap-4">
            {/* Animated needle gauge */}
            <svg width="68" height="38" viewBox="0 0 68 38" aria-hidden="true" className="shrink-0">
              <path
                d="M8 32 A 26 26 0 0 1 60 32"
                fill="none"
                stroke="rgba(15,27,61,0.12)"
                strokeWidth="5"
                strokeLinecap="round"
              />
              <g
                style={{
                  transformOrigin: '34px 32px',
                  transform: `rotate(${needleDeg}deg)`,
                  transition: 'transform 500ms cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              >
                <line x1="34" y1="32" x2="34" y2="11" stroke="#F97316" strokeWidth="2.5" strokeLinecap="round" />
                <circle cx="34" cy="32" r="3.5" fill="#0F1B3D" />
              </g>
            </svg>
            <p className="text-xs text-[#475569]">{pressureLabel} barometric trend</p>
          </div>

          {expanded === 'pressure' && pressureSeries.length > 1 && (
            <div className="w-full pt-3 border-t border-slate-900/10 space-y-2">
              <div className="flex items-center justify-between text-xs text-[#475569] tabular-nums">
                <span>24h Barometric Curve</span>
                <span>
                  Range {pMin}–{pMax} hPa
                </span>
              </div>
              <svg viewBox="0 0 220 44" className="w-full h-11" aria-hidden="true">
                <polyline
                  fill="none"
                  stroke="#0F1B3D"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={pressureSvgPoints}
                />
              </svg>
            </div>
          )}
        </button>
      </article>

      {/* 3. UV Index with hourly curve, peak callout & skin-type burn guide */}
      {uv && uvMeta && (
        <article
          onMouseMove={handleCardPointerMove}
          className={`rounded-3xl border weatherly-surface-card weatherly-card-lift shadow-[0_8px_24px_rgba(15,27,61,0.06)] transition-all duration-300 ${
            frost ? 'weatherly-frost-card' : ''
          } ${expanded === 'uv' ? 'sm:col-span-2' : ''}`}
        >
          <button
            type="button"
            aria-expanded={expanded === 'uv'}
            onClick={() => toggleTile('uv')}
            className="w-full h-full p-5 text-left flex flex-col justify-between gap-3 rounded-3xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F97316]"
          >
            <div className="flex items-start justify-between gap-3 w-full">
              <div>
                <h3 className="text-sm font-medium text-[#475569]">UV Index</h3>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-2xl font-semibold text-[#0F1B3D] tabular-nums">
                    <AnimatedNumber value={uv.index} decimals={1} />
                  </span>
                  <span className="text-sm font-semibold text-[#0F1B3D]">{uv.level}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <svg width="64" height="38" viewBox="0 0 68 40" aria-hidden="true" className="shrink-0">
                  <path
                    d="M8 34 A 26 26 0 0 1 60 34"
                    fill="none"
                    stroke="rgba(15,27,61,0.12)"
                    strokeWidth="6"
                    strokeLinecap="round"
                  />
                  <path
                    d="M8 34 A 26 26 0 0 1 60 34"
                    fill="none"
                    stroke={uvMeta.color}
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray="81.68"
                    strokeDashoffset={
                      Number.isFinite(uvMeta.ratio) ? 81.68 * (1 - uvMeta.ratio) : 81.68
                    }
                  />
                </svg>
                <ChevronDown
                  className={`w-4 h-4 text-[#64748B] transition-transform duration-200 ${
                    expanded === 'uv' ? 'rotate-180' : ''
                  }`}
                  aria-hidden="true"
                />
              </div>
            </div>

            <p className="text-xs text-[#475569] leading-relaxed">{uv.advice}</p>

            {expanded === 'uv' && (
              <div className="w-full pt-3 border-t border-slate-900/10 space-y-3">
                <div className="flex items-center justify-between text-xs text-[#475569]">
                  <span>Today&apos;s UV curve</span>
                  <span className="font-semibold text-[#0F1B3D]">
                    Peak {peakUvPoint.uvIndex} at{' '}
                    {formatHourLabel(peakUvPoint.timestamp, timezoneOffsetSec)}
                  </span>
                </div>
                {uvAreaPath && (
                  <svg viewBox="0 0 220 52" className="w-full h-14" aria-hidden="true">
                    <path d={uvAreaPath} fill="rgba(249, 115, 22, 0.22)" />
                    <polyline
                      fill="none"
                      stroke="#F97316"
                      strokeWidth="2"
                      strokeLinecap="round"
                      points={uvLinePoints}
                    />
                    {uvCurveCoords[0] && (
                      <circle
                        cx={uvCurveCoords[0].x}
                        cy={uvCurveCoords[0].y}
                        r="3.5"
                        fill="#0F1B3D"
                        stroke="#FFFFFF"
                        strokeWidth="1.5"
                      />
                    )}
                  </svg>
                )}
                <div className="grid grid-cols-3 gap-2 text-center text-[11px] text-[#475569] tabular-nums">
                  <div className="rounded-xl bg-white/75 p-2">
                    <div className="font-semibold text-[#0F1B3D]">Fair skin</div>
                    <div>{uv.index >= 6 ? '~20 min' : uv.index >= 3 ? '~40 min' : '60+ min'}</div>
                  </div>
                  <div className="rounded-xl bg-white/75 p-2">
                    <div className="font-semibold text-[#0F1B3D]">Medium skin</div>
                    <div>{uv.index >= 6 ? '~35 min' : uv.index >= 3 ? '~60 min' : '90+ min'}</div>
                  </div>
                  <div className="rounded-xl bg-white/75 p-2">
                    <div className="font-semibold text-[#0F1B3D]">Deep skin</div>
                    <div>{uv.index >= 6 ? '~60 min' : '90+ min'}</div>
                  </div>
                </div>
              </div>
            )}
          </button>
        </article>
      )}

      {/* 4. Humidity with animated dual liquid-wave SVG */}
      <article
        onMouseMove={handleCardPointerMove}
        className={`rounded-3xl border weatherly-surface-card weatherly-card-lift shadow-[0_8px_24px_rgba(15,27,61,0.06)] transition-all duration-300 ${
          frost ? 'weatherly-frost-card' : ''
        } ${expanded === 'humidity' ? 'sm:col-span-2' : ''}`}
      >
        <button
          type="button"
          aria-expanded={expanded === 'humidity'}
          onClick={() => toggleTile('humidity')}
          className="w-full h-full p-5 text-left flex flex-col justify-between gap-3 rounded-3xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F97316]"
        >
          <div className="flex items-start justify-between w-full">
            <div>
              <h3 className="text-sm font-medium text-[#475569]">Humidity</h3>
              <div className="mt-1 text-2xl font-semibold text-[#0F1B3D] tabular-nums">
                <AnimatedNumber value={current.humidity} suffix="%" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              {typeof current.dewPointC === 'number' && (
                <span className="text-xs text-[#475569] tabular-nums">
                  Dew {formatTemp(current.dewPointC, unit)}
                </span>
              )}
              <ChevronDown
                className={`w-4 h-4 text-[#64748B] transition-transform duration-200 ${
                  expanded === 'humidity' ? 'rotate-180' : ''
                }`}
                aria-hidden="true"
              />
            </div>
          </div>

          {/* Dual sliding sine wave liquid fill */}
          <div className="relative w-full h-10 rounded-2xl bg-sky-100/70 overflow-hidden" aria-hidden="true">
            <div
              className="absolute inset-x-0 bottom-0 transition-all duration-500"
              style={{top: `${waveTopPct}%`}}
            >
              <svg
                viewBox="0 0 240 24"
                preserveAspectRatio="none"
                className="w-[200%] h-4 -mt-3 weatherly-wave-animate"
              >
                <path
                  d="M0 12 Q 30 4 60 12 T 120 12 T 180 12 T 240 12 V 24 H 0 Z"
                  fill="rgba(56, 189, 248, 0.55)"
                />
              </svg>
              <svg
                viewBox="0 0 240 24"
                preserveAspectRatio="none"
                className="w-[200%] h-4 -mt-3.5 weatherly-wave-animate-slow"
              >
                <path
                  d="M0 12 Q 30 19 60 12 T 120 12 T 180 12 T 240 12 V 24 H 0 Z"
                  fill="rgba(14, 165, 233, 0.72)"
                />
              </svg>
              <div className="w-full h-full bg-[#0EA5E9]/70" />
            </div>
          </div>

          <p className="text-xs text-[#475569]">{humidityLabel}</p>

          {expanded === 'humidity' && (
            <p className="pt-2 border-t border-slate-900/10 text-xs text-[#475569] leading-relaxed w-full">
              Relative humidity measures moisture saturation in the air. At {current.humidity}%,
              perspiration evaporates{' '}
              {current.humidity >= 70 ? 'more slowly, making warm air feel muggier.' : 'efficiently for comfortable breathing.'}
            </p>
          )}
        </button>
      </article>

      {/* 5. Wind with rotating compass needle & speed-scaled animated streak lines */}
      <article
        onMouseMove={handleCardPointerMove}
        className={`rounded-3xl border weatherly-surface-card weatherly-card-lift shadow-[0_8px_24px_rgba(15,27,61,0.06)] transition-all duration-300 ${
          frost ? 'weatherly-frost-card' : ''
        } ${expanded === 'wind' ? 'sm:col-span-2' : ''}`}
      >
        <button
          type="button"
          aria-expanded={expanded === 'wind'}
          onClick={() => toggleTile('wind')}
          className="w-full h-full p-5 text-left flex flex-col justify-between gap-3 rounded-3xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F97316]"
        >
          <div className="flex items-start justify-between w-full">
            <div>
              <h3 className="text-sm font-medium text-[#475569]">Wind</h3>
              <div className="mt-1 text-2xl font-semibold text-[#0F1B3D] tabular-nums">
                <AnimatedNumber value={convertSpeed(current.windKmh, unit)} />{' '}
                <span className="text-sm font-medium text-[#475569]">
                  {unit === 'F' ? 'mph' : 'km/h'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#0F1B3D] bg-slate-900/5 px-2.5 py-1.5 rounded-full">
                <Navigation
                  className="w-3.5 h-3.5 text-[#F97316] transition-transform duration-500"
                  style={{
                    transform: `rotate(${current.windDeg + (expanded === 'wind' ? gustWobbleDeg : 0)}deg)`,
                  }}
                  aria-hidden="true"
                />
                <span>{degreesToCompass(current.windDeg)}</span>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-[#64748B] transition-transform duration-200 ${
                  expanded === 'wind' ? 'rotate-180' : ''
                }`}
                aria-hidden="true"
              />
            </div>
          </div>

          {/* Animated wind streak lines scaled by wind speed */}
          <div className="relative h-6 w-full overflow-hidden rounded-full bg-slate-900/5" aria-hidden="true">
            <span
              className="weatherly-wind-streak absolute top-1.5 left-0 h-0.5 w-16 rounded-full bg-[#F97316]/60"
              style={{'--wind-dur': `${windDurationSec}s`} as React.CSSProperties}
            />
            <span
              className="weatherly-wind-streak absolute top-4 left-0 h-0.5 w-12 rounded-full bg-[#0F1B3D]/40"
              style={{
                '--wind-dur': `${(windDurationSec * 1.25).toFixed(2)}s`,
                animationDelay: '0.4s',
              } as React.CSSProperties}
            />
          </div>

          <p className="text-xs text-[#475569] tabular-nums">
            {current.windGustKmh
              ? `Gusts up to ${convertSpeed(current.windGustKmh, unit)} ${unit === 'F' ? 'mph' : 'km/h'}`
              : `Bearing ${current.windDeg}° (${degreesToCompass(current.windDeg)})`}
          </p>

          {expanded === 'wind' && (
            <div className="pt-2 border-t border-slate-900/10 text-xs text-[#475569] w-full flex items-center justify-between">
              <span>Beaufort scale: {current.windKmh < 12 ? 'Light breeze' : current.windKmh < 28 ? 'Moderate breeze' : 'Fresh wind'}</span>
              <span className="tabular-nums font-semibold text-[#0F1B3D]">{degreesToCompass(current.windDeg)} ({current.windDeg}°)</span>
            </div>
          )}
        </button>
      </article>

      {/* 6. Visibility with skyline fog-clarity preview & separate Cloud Cover */}
      <article
        onMouseMove={handleCardPointerMove}
        className={`rounded-3xl border weatherly-surface-card weatherly-card-lift shadow-[0_8px_24px_rgba(15,27,61,0.06)] transition-all duration-300 ${
          frost ? 'weatherly-frost-card' : ''
        } ${expanded === 'visibility' ? 'sm:col-span-2' : ''}`}
      >
        <div className="w-full h-full p-5 flex flex-col justify-between gap-3">
          <button
            type="button"
            aria-expanded={expanded === 'visibility'}
            onClick={() => toggleTile('visibility')}
            className="w-full text-left flex items-start justify-between rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F97316]"
          >
            <div>
              <h3 className="text-sm font-medium text-[#475569]">Visibility &amp; Cloud Cover</h3>
              <div className="mt-1 text-2xl font-semibold text-[#0F1B3D] tabular-nums">
                <AnimatedNumber value={convertVisibility(current.visibilityKm, unit)} decimals={1} />{' '}
                <span className="text-sm font-medium text-[#475569]">
                  {unit === 'F' ? 'mi' : 'km'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#475569] tabular-nums">
                Cloud cover {current.cloudCover}%
              </span>
              <ChevronDown
                className={`w-4 h-4 text-[#64748B] transition-transform duration-200 ${
                  expanded === 'visibility' ? 'rotate-180' : ''
                }`}
                aria-hidden="true"
              />
            </div>
          </button>

          {/* Small skyline silhouette blurred/sharpened by visibility */}
          <div className="rounded-2xl bg-gradient-to-b from-sky-100/70 to-slate-200/70 px-3 pt-3 pb-1 overflow-hidden">
            <svg
              viewBox="0 0 220 34"
              className="w-full h-8 transition-all duration-300"
              style={{filter: `blur(${blurPx.toFixed(1)}px)`}}
              aria-hidden="true"
            >
              <path
                d="M0 34 V22 H14 V14 H26 V26 H38 V8 H52 V24 H68 V16 H80 V28 H96 V6 H110 V22 H126 V12 H142 V26 H158 V10 H172 V20 H190 V15 H204 V25 H220 V34 Z"
                fill="#0F1B3D"
                opacity="0.72"
              />
            </svg>
          </div>

          <p className="text-xs text-[#475569]">{visibilityLabel}</p>

          {expanded === 'visibility' && (
            <div className="pt-2 border-t border-slate-900/10 space-y-1.5">
              <div className="flex items-center justify-between text-xs text-[#475569]">
                <label htmlFor="fog-clarity-slider">Preview fog clarity</label>
                <span className="tabular-nums font-semibold text-[#0F1B3D]">
                  {convertVisibility(effectiveVisKm, unit)} {unit === 'F' ? 'mi' : 'km'}
                </span>
              </div>
              <input
                id="fog-clarity-slider"
                type="range"
                min={0.5}
                max={16}
                step={0.5}
                value={effectiveVisKm}
                onChange={(e) => setFogPreviewKm(Number(e.target.value))}
                className="w-full accent-[#F97316] h-1.5 cursor-pointer"
              />
            </div>
          )}
        </div>
      </article>
    </section>
  );
}
