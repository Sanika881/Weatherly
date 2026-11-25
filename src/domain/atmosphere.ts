import type {
  AtmosphereEffect,
  AtmosphereTheme,
  SkyPhase,
  WeatherBundle,
  WeatherConditionKind,
} from '../types/weather';

const DAWN_WINDOW_SEC = 45 * 60;
const GOLDEN_WINDOW_SEC = 60 * 60;
const DUSK_WINDOW_SEC = 45 * 60;

export function computeSkyPhase(
  observedAt: number,
  sunrise: number,
  sunset: number
): SkyPhase {
  if (sunrise <= 0 || sunset <= 0 || sunset <= sunrise) {
    return 'day';
  }

  const daySec = 86400;
  let t = observedAt;
  while (t < sunrise - daySec / 2) t += daySec;
  while (t > sunset + daySec / 2) t -= daySec;

  if (t >= sunrise - DAWN_WINDOW_SEC && t < sunrise + 20 * 60) {
    return 'dawn';
  }
  if (t >= sunrise + 20 * 60 && t < sunset - GOLDEN_WINDOW_SEC) {
    return 'day';
  }
  if (t >= sunset - GOLDEN_WINDOW_SEC && t < sunset) {
    return 'golden-hour';
  }
  if (t >= sunset && t < sunset + DUSK_WINDOW_SEC) {
    return 'dusk';
  }
  return 'night';
}

function resolveEffect(
  phase: SkyPhase,
  condition: WeatherConditionKind,
  cloudCover: number
): AtmosphereEffect {
  if (condition === 'thunder') return 'thunder';
  if (condition === 'rain') return 'rain';
  if (condition === 'snow') return 'snow';
  if (condition === 'mist') return 'mist';
  if (phase === 'night' && cloudCover < 55) return 'stars';
  if (cloudCover >= 30 || condition === 'cloudy' || condition === 'partly-cloudy') {
    return 'clouds';
  }
  return 'none';
}

export function getAtmosphere(
  weather: WeatherBundle | null,
  forceNight = false
): AtmosphereTheme {
  if (!weather) {
    return {
      phase: 'day',
      isDarkSky: false,
      skyFrom: '#C7E2EE',
      skyVia: '#DCEAE8',
      skyTo: '#F4DFD4',
      overlayOpacity: 0.16,
      effect: 'clouds',
      glassBg: 'rgba(15, 27, 61, 0.48)',
      glassBorder: 'rgba(255, 255, 255, 0.24)',
      glassText: '#FFFFFF',
      glassMuted: 'rgba(241, 245, 249, 0.90)',
      surfaceBg: 'rgba(255, 255, 255, 0.88)',
      surfaceBorder: 'rgba(255, 255, 255, 0.76)',
      surfaceText: '#0F1B3D',
      surfaceMuted: '#475569',
    };
  }

  const phase: SkyPhase = forceNight
    ? 'night'
    : computeSkyPhase(weather.observedAt, weather.sunrise, weather.sunset);
  const {cloudCover, icon} = weather.current;
  const effect = resolveEffect(phase, icon, cloudCover);
  const isOvercast = cloudCover >= 70 || icon === 'rain' || icon === 'thunder' || icon === 'mist';

  if (phase === 'night') {
    return {
      phase,
      isDarkSky: true,
      skyFrom: isOvercast ? '#0B1324' : '#09142C',
      skyVia: isOvercast ? '#16213B' : '#13244A',
      skyTo: isOvercast ? '#1E293B' : '#1D335D',
      overlayOpacity: isOvercast ? 0.35 : 0.28,
      effect,
      glassBg: 'rgba(15, 27, 61, 0.56)',
      glassBorder: 'rgba(255, 255, 255, 0.20)',
      glassText: '#F8FAFC',
      glassMuted: 'rgba(226, 232, 240, 0.88)',
      surfaceBg: 'rgba(255, 255, 255, 0.90)',
      surfaceBorder: 'rgba(255, 255, 255, 0.74)',
      surfaceText: '#0F1B3D',
      surfaceMuted: '#475569',
    };
  }

  if (phase === 'dawn') {
    return {
      phase,
      isDarkSky: false,
      skyFrom: '#94B3D6',
      skyVia: '#D7C5D8',
      skyTo: '#F5CBB6',
      overlayOpacity: isOvercast ? 0.24 : 0.15,
      effect,
      glassBg: 'rgba(15, 27, 61, 0.48)',
      glassBorder: 'rgba(255, 255, 255, 0.24)',
      glassText: '#FFFFFF',
      glassMuted: 'rgba(241, 245, 249, 0.90)',
      surfaceBg: 'rgba(255, 255, 255, 0.88)',
      surfaceBorder: 'rgba(255, 255, 255, 0.76)',
      surfaceText: '#0F1B3D',
      surfaceMuted: '#475569',
    };
  }

  if (phase === 'golden-hour') {
    return {
      phase,
      isDarkSky: false,
      skyFrom: isOvercast ? '#7E96B5' : '#5886BA',
      skyVia: isOvercast ? '#B9B1BD' : '#C9AEAA',
      skyTo: isOvercast ? '#D4B6A4' : '#F3BE92',
      overlayOpacity: isOvercast ? 0.25 : 0.18,
      effect,
      glassBg: 'rgba(15, 27, 61, 0.48)',
      glassBorder: 'rgba(255, 255, 255, 0.24)',
      glassText: '#FFFFFF',
      glassMuted: 'rgba(248, 250, 252, 0.90)',
      surfaceBg: 'rgba(255, 255, 255, 0.88)',
      surfaceBorder: 'rgba(255, 255, 255, 0.76)',
      surfaceText: '#0F1B3D',
      surfaceMuted: '#475569',
    };
  }

  if (phase === 'dusk') {
    return {
      phase,
      isDarkSky: true,
      skyFrom: '#1B2D52',
      skyVia: '#42476D',
      skyTo: '#8D6674',
      overlayOpacity: 0.3,
      effect,
      glassBg: 'rgba(15, 27, 61, 0.52)',
      glassBorder: 'rgba(255, 255, 255, 0.22)',
      glassText: '#FFFFFF',
      glassMuted: 'rgba(226, 232, 240, 0.88)',
      surfaceBg: 'rgba(255, 255, 255, 0.88)',
      surfaceBorder: 'rgba(255, 255, 255, 0.74)',
      surfaceText: '#0F1B3D',
      surfaceMuted: '#475569',
    };
  }

  if (icon === 'rain' || icon === 'thunder') {
    return {
      phase,
      isDarkSky: true,
      skyFrom: '#364F6B',
      skyVia: '#4E6B89',
      skyTo: '#718CA6',
      overlayOpacity: 0.32,
      effect,
      glassBg: 'rgba(15, 27, 61, 0.50)',
      glassBorder: 'rgba(255, 255, 255, 0.22)',
      glassText: '#FFFFFF',
      glassMuted: 'rgba(226, 232, 240, 0.90)',
      surfaceBg: 'rgba(255, 255, 255, 0.88)',
      surfaceBorder: 'rgba(255, 255, 255, 0.74)',
      surfaceText: '#0F1B3D',
      surfaceMuted: '#475569',
    };
  }

  if (isOvercast) {
    return {
      phase,
      isDarkSky: false,
      skyFrom: '#7FA3C4',
      skyVia: '#A7C1D6',
      skyTo: '#D7DCE0',
      overlayOpacity: 0.2,
      effect,
      glassBg: 'rgba(15, 27, 61, 0.48)',
      glassBorder: 'rgba(255, 255, 255, 0.24)',
      glassText: '#FFFFFF',
      glassMuted: 'rgba(241, 245, 249, 0.90)',
      surfaceBg: 'rgba(255, 255, 255, 0.88)',
      surfaceBorder: 'rgba(255, 255, 255, 0.76)',
      surfaceText: '#0F1B3D',
      surfaceMuted: '#475569',
    };
  }

  return {
    phase,
    isDarkSky: false,
    skyFrom: '#4580B8',
    skyVia: '#8AB8D8',
    skyTo: '#EED6CA',
    overlayOpacity: 0.14,
    effect,
    glassBg: 'rgba(15, 27, 61, 0.46)',
    glassBorder: 'rgba(255, 255, 255, 0.24)',
    glassText: '#FFFFFF',
    glassMuted: 'rgba(241, 245, 249, 0.90)',
    surfaceBg: 'rgba(255, 255, 255, 0.88)',
    surfaceBorder: 'rgba(255, 255, 255, 0.76)',
    surfaceText: '#0F1B3D',
    surfaceMuted: '#475569',
  };
}
