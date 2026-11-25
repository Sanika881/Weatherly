export interface SunArcPosition {
  isDay: boolean;
  progress: number; // 0..1 across arc
}

export function getSunArcPosition(
  observedAt: number,
  sunrise: number,
  sunset: number
): SunArcPosition {
  if (
    !Number.isFinite(observedAt) ||
    !Number.isFinite(sunrise) ||
    !Number.isFinite(sunset) ||
    observedAt <= 0
  ) {
    return {isDay: true, progress: 0.5};
  }

  const daySec = 86400;
  let t = observedAt;
  while (t < sunrise - daySec / 2) t += daySec;
  while (t > sunset + daySec / 2) t -= daySec;

  if (t >= sunrise && t <= sunset && sunset > sunrise) {
    return {
      isDay: true,
      progress: Math.max(0, Math.min(1, (t - sunrise) / (sunset - sunrise))),
    };
  }

  // Night arc between sunset and next sunrise
  const nextSunrise = t > sunset ? sunrise + daySec : sunrise;
  const prevSunset = t > sunset ? sunset : sunset - daySec;
  const nightSpan = Math.max(3600, nextSunrise - prevSunset);
  return {
    isDay: false,
    progress: Math.max(0, Math.min(1, (t - prevSunset) / nightSpan)),
  };
}

function formatDurationCompact(seconds: number): string {
  const totalMins = Math.max(1, Math.round(seconds / 60));
  const hrs = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  if (hrs === 0) return `${mins}m`;
  if (mins === 0) return `${hrs}h`;
  return `${hrs}h ${mins}m`;
}

export function getGoldenHourCountdown(
  observedAt: number,
  sunrise: number,
  sunset: number
): string {
  const daySec = 86400;
  let t = observedAt;
  while (t < sunrise - daySec / 2) t += daySec;
  while (t > sunset + daySec / 2) t -= daySec;

  const goldenStart = sunset - 3600;
  if (t >= goldenStart && t < sunset) {
    return `Golden hour · ${formatDurationCompact(sunset - t)} left`;
  }
  if (t >= sunrise && t < goldenStart) {
    return `Golden hour in ${formatDurationCompact(goldenStart - t)}`;
  }
  if (t < sunrise) {
    return `Sunrise in ${formatDurationCompact(sunrise - t)}`;
  }
  return `Sunrise in ${formatDurationCompact(sunrise + daySec - t)}`;
}

export interface MoonPhaseInfo {
  name: string;
  illumination: number; // 0..100
  phaseRatio: number; // 0..1
}

export function getMoonPhase(unixSeconds: number): MoonPhaseInfo {
  // Reference new moon: Jan 6 2000 18:14 UTC = 947182440
  const synodicMonthSec = 29.53058867 * 86400;
  const refNewMoon = 947182440;
  const diff = unixSeconds - refNewMoon;
  const phaseRatio = (((diff % synodicMonthSec) + synodicMonthSec) % synodicMonthSec) / synodicMonthSec;
  const illumination = Math.round(((1 - Math.cos(phaseRatio * 2 * Math.PI)) / 2) * 100);

  let name = 'New Moon';
  if (phaseRatio < 0.0625 || phaseRatio >= 0.9375) name = 'New Moon';
  else if (phaseRatio < 0.1875) name = 'Waxing Crescent';
  else if (phaseRatio < 0.3125) name = 'First Quarter';
  else if (phaseRatio < 0.4375) name = 'Waxing Gibbous';
  else if (phaseRatio < 0.5625) name = 'Full Moon';
  else if (phaseRatio < 0.6875) name = 'Waning Gibbous';
  else if (phaseRatio < 0.8125) name = 'Last Quarter';
  else name = 'Waning Crescent';

  return {name, illumination, phaseRatio};
}
