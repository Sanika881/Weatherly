import {LocateFixed, RefreshCw, Search, Volume2, VolumeX, WifiOff, X} from 'lucide-react';
import {lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {ActivityScores} from '../components/ActivityScores';
import {AtmosphereBackdrop} from '../components/AtmosphereBackdrop';
import {CityList} from '../components/CityList';
import {ConfettiBurst} from '../components/ConfettiBurst';
import {ForecastCard} from '../components/ForecastCard';
import {HeroCard} from '../components/HeroCard';
import {HourlyStrip} from '../components/HourlyStrip';
import {MetricsGrid} from '../components/MetricTile';
import {SearchBar} from '../components/SearchBar';
import {type NavSection, Sidebar} from '../components/Sidebar';
import {DashboardSkeleton} from '../components/skeletons/DashboardSkeleton';
import {TimeOfDay} from '../components/TimeOfDay';
import {TomorrowCard} from '../components/TomorrowCard';
import {WearCard} from '../components/WearCard';
import {isWeekendClearAndMild} from '../domain/activities';
import {getAtmosphere} from '../domain/atmosphere';
import {getGreetingForOffset} from '../domain/time';
import {deriveViewedWeather} from '../domain/viewWeather';
import {DEFAULT_CITY, useGeolocation} from '../hooks/useGeolocation';
import {useLocalStorage} from '../hooks/useLocalStorage';
import {useSavedCitiesWeather} from '../hooks/useSavedCitiesWeather';
import {useWeather} from '../hooks/useWeather';
import type {WeatherProviderId} from '../services/weatherService';
import type {CityLocation, SavedCity, TemperatureUnit} from '../types/weather';
import {triggerHaptic} from '../utils/haptics';
import {ErrorBoundary} from './ErrorBoundary';

const SettingsModal = lazy(() => import('../components/SettingsModal'));
const CommandPalette = lazy(() => import('../components/CommandPalette'));
const CompareModal = lazy(() => import('../components/CompareModal'));

const INITIAL_SAVED_CITIES: SavedCity[] = [
  {
    id: '51.507,-0.128',
    name: 'London',
    country: 'GB',
    lat: 51.5074,
    lon: -0.1278,
  },
  {
    id: '40.713,-74.006',
    name: 'New York',
    country: 'US',
    lat: 40.7128,
    lon: -74.006,
  },
  {
    id: '35.676,139.650',
    name: 'Tokyo',
    country: 'JP',
    lat: 35.6762,
    lon: 139.6503,
  },
];

function formatUpdatedAgo(fetchedAtMs: number, nowMs: number): string {
  const diffSec = Math.max(0, Math.floor((nowMs - fetchedAtMs) / 1000));
  if (diffSec < 45) return 'Updated just now';
  const mins = Math.floor(diffSec / 60);
  if (mins < 60) return `Updated ${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  return `Updated ${hrs}h ago`;
}

function WeatherlyDashboard() {
  const [unit, setUnit] = useLocalStorage<TemperatureUnit>('weatherly_unit_v1', 'C', 1);
  const [savedCities, setSavedCities] = useLocalStorage<SavedCity[]>(
    'weatherly_cities_v1',
    INITIAL_SAVED_CITIES,
    1
  );
  const [recentCities, setRecentCities] = useLocalStorage<CityLocation[]>(
    'weatherly_recent_v1',
    INITIAL_SAVED_CITIES,
    1
  );
  const [selectedCity, setSelectedCity] = useLocalStorage<CityLocation | null>(
    'weatherly_active_city_v1',
    null,
    1
  );
  const [providerPref, setProviderPref] = useLocalStorage<'auto' | WeatherProviderId>(
    'weatherly_provider_v1',
    'auto',
    1
  );

  const [activeSection, setActiveSection] = useState<NavSection>('overview');
  const [scrubIndex, setScrubIndex] = useState(0);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [undoToast, setUndoToast] = useState<{city: SavedCity; index: number} | null>(null);
  const [stormEggActive, setStormEggActive] = useState(false);
  const [nightEggActive, setNightEggActive] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [pullDistance, setPullDistance] = useState(0);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const logoTapRef = useRef<number[]>([]);
  const keyBufferRef = useRef<string>('');
  const celebratedCityRef = useRef<string>('');
  const touchStartYRef = useRef<number | null>(null);

  const geo = useGeolocation(selectedCity ?? undefined);
  const activeLocation = selectedCity ?? geo.location;
  const preferredProvider = providerPref === 'auto' ? undefined : providerPref;

  const {data, status, error, isOffline, refresh} = useWeather(activeLocation, preferredProvider);
  const savedSnapshots = useSavedCitiesWeather(savedCities, preferredProvider);

  // Reset time-travel scrubber when switching location
  useEffect(() => {
    setScrubIndex(0);
  }, [activeLocation.id]);

  // Reset dismissed notice when connectivity or error state changes
  useEffect(() => {
    setBannerDismissed(false);
  }, [isOffline, error?.message, data?.isStale]);

  // Live "Updated X min ago" tick
  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  // Derive viewed weather from live bundle + scrubber + Easter eggs
  const viewedWeather = useMemo(
    () =>
      deriveViewedWeather(data, scrubIndex, {
        stormActive: stormEggActive,
        forceNight: nightEggActive,
      }),
    [data, scrubIndex, stormEggActive, nightEggActive]
  );

  const atmosphere = useMemo(
    () => getAtmosphere(viewedWeather, nightEggActive),
    [viewedWeather, nightEggActive]
  );

  // Ambient sound effect sync (lazy-loaded Web Audio synthesizer)
  useEffect(() => {
    if (!soundEnabled) {
      import('../utils/ambientSound').then((m) => m.stopAmbientSound());
      return;
    }
    import('../utils/ambientSound').then((m) => m.startAmbientSound(atmosphere.effect));
    return () => {
      import('../utils/ambientSound').then((m) => m.stopAmbientSound());
    };
  }, [soundEnabled, atmosphere.effect]);

  // Weekend clear & mild (18-26C) confetti-lite celebration
  useEffect(() => {
    if (!data) return;
    if (celebratedCityRef.current === data.location.id) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;

    if (isWeekendClearAndMild(data)) {
      celebratedCityRef.current = data.location.id;
      setShowConfetti(true);
      const timer = window.setTimeout(() => setShowConfetti(false), 1800);
      return () => window.clearTimeout(timer);
    }
  }, [data]);

  // Global keyboard shortcuts: / or Cmd/Ctrl+K for Command Palette, and typing "storm" Easter egg
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const inInput =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.tagName === 'SELECT' ||
        target?.isContentEditable;

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsPaletteOpen((o) => !o);
        return;
      }

      if (!inInput && e.key === '/') {
        e.preventDefault();
        setIsPaletteOpen(true);
        return;
      }

      if (!inInput && e.key.length === 1) {
        keyBufferRef.current = (keyBufferRef.current + e.key.toLowerCase()).slice(-5);
        if (keyBufferRef.current === 'storm') {
          keyBufferRef.current = '';
          triggerHaptic(18);
          setStormEggActive(true);
          window.setTimeout(() => setStormEggActive(false), 5000);
        }
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  const handleLogoTap = useCallback(() => {
    const now = Date.now();
    const recent = logoTapRef.current.filter((t) => now - t < 2500);
    recent.push(now);
    logoTapRef.current = recent;
    if (recent.length >= 5) {
      logoTapRef.current = [];
      triggerHaptic(15);
      setNightEggActive((n) => !n);
    }
  }, []);

  const isCurrentSaved = useMemo(() => {
    const loc = viewedWeather?.location ?? activeLocation;
    return savedCities.some(
      (c) =>
        c.id === loc.id ||
        (Math.abs(c.lat - loc.lat) < 0.05 && Math.abs(c.lon - loc.lon) < 0.05)
    );
  }, [savedCities, viewedWeather, activeLocation]);

  const handleToggleSaveCurrent = useCallback(() => {
    const loc = viewedWeather?.location ?? activeLocation;
    setSavedCities((prev) => {
      const exists = prev.some(
        (c) =>
          c.id === loc.id ||
          (Math.abs(c.lat - loc.lat) < 0.05 && Math.abs(c.lon - loc.lon) < 0.05)
      );
      if (exists) {
        return prev.filter(
          (c) =>
            c.id !== loc.id &&
            !(Math.abs(c.lat - loc.lat) < 0.05 && Math.abs(c.lon - loc.lon) < 0.05)
        );
      }
      const nextCity: SavedCity = {
        ...loc,
        lastTempC: viewedWeather?.current.tempC,
        lastHighC: viewedWeather?.current.maxC,
        lastLowC: viewedWeather?.current.minC,
        lastCondition: viewedWeather?.current.condition,
        lastIcon: viewedWeather?.current.icon,
      };
      return [nextCity, ...prev];
    });
  }, [viewedWeather, activeLocation, setSavedCities]);

  const handleSelectCity = useCallback(
    (city: CityLocation) => {
      setRecentCities((prev) => {
        const filtered = prev.filter((c) => c.id !== city.id);
        return [city, ...filtered].slice(0, 6);
      });

      const docWithVt = document as Document & {
        startViewTransition?: (cb: () => void) => void;
      };
      if (typeof docWithVt.startViewTransition === 'function') {
        docWithVt.startViewTransition(() => setSelectedCity(city));
      } else {
        setSelectedCity(city);
      }
    },
    [setSelectedCity, setRecentCities]
  );

  const handleRemoveCity = useCallback(
    (city: SavedCity) => {
      const index = savedCities.findIndex((c) => c.id === city.id);
      setSavedCities((prev) => prev.filter((c) => c.id !== city.id));
      setUndoToast({city, index: Math.max(0, index)});
      window.setTimeout(() => {
        setUndoToast((cur) => (cur?.city.id === city.id ? null : cur));
      }, 4500);
    },
    [savedCities, setSavedCities]
  );

  const handleUndoRemove = useCallback(() => {
    if (!undoToast) return;
    setSavedCities((prev) => {
      const next = [...prev];
      next.splice(undoToast.index, 0, undoToast.city);
      return next;
    });
    setUndoToast(null);
  }, [undoToast, setSavedCities]);

  const handleUseMyLocation = useCallback(() => {
    setSelectedCity(null);
    geo.requestLocation();
  }, [setSelectedCity, geo]);

  const handleSelectSection = useCallback((section: NavSection) => {
    setActiveSection(section);
    if (section === 'overview') {
      window.scrollTo({top: 0, behavior: 'smooth'});
      return;
    }
    const targetId =
      section === 'forecast'
        ? 'forecast-section'
        : section === 'metrics'
        ? 'metrics-section'
        : 'cities-section';
    document.getElementById(targetId)?.scrollIntoView({behavior: 'smooth', block: 'start'});
  }, []);

  const handleShare = useCallback(async () => {
    if (!viewedWeather) return;
    setIsSharing(true);
    try {
      const {shareWeatherCardPng} = await import('../utils/shareCard');
      await shareWeatherCardPng(viewedWeather, unit);
    } finally {
      setIsSharing(false);
    }
  }, [viewedWeather, unit]);

  const isForecastMode = scrubIndex > 0;
  const isColdFrost = (viewedWeather?.current.tempC ?? 20) < 5;
  const greeting = viewedWeather
    ? getGreetingForOffset(viewedWeather.observedAt, viewedWeather.timezoneOffsetSec)
    : 'Welcome';
  const showNotice = Boolean(
    !bannerDismissed && (isOffline || error?.type === 'partial' || data?.isStale)
  );

  return (
    <div
      className="min-h-screen weatherly-sky-canvas relative pb-24 lg:pb-8"
      onTouchStart={(e) => {
        if (window.scrollY === 0) {
          touchStartYRef.current = e.touches[0]?.clientY ?? null;
        }
      }}
      onTouchMove={(e) => {
        if (touchStartYRef.current === null) return;
        const delta = (e.touches[0]?.clientY ?? 0) - touchStartYRef.current;
        if (delta > 0 && window.scrollY === 0) {
          setPullDistance(Math.min(72, delta * 0.45));
        }
      }}
      onTouchEnd={() => {
        if (pullDistance > 48) {
          triggerHaptic(10);
          refresh();
        }
        touchStartYRef.current = null;
        setPullDistance(0);
      }}
    >
      <AtmosphereBackdrop
        theme={atmosphere}
        observedAt={viewedWeather?.observedAt}
        sunrise={viewedWeather?.sunrise}
        sunset={viewedWeather?.sunset}
        tempC={viewedWeather?.current.tempC}
      />

      {showConfetti && <ConfettiBurst />}

      {/* Mobile pull-to-refresh indicator */}
      {pullDistance > 8 && (
        <div
          aria-hidden="true"
          className="lg:hidden fixed top-2 left-1/2 -translate-x-1/2 z-50 px-3.5 py-1.5 rounded-full bg-white/90 text-[#0F1B3D] text-xs font-medium shadow-md flex items-center gap-2"
          style={{transform: `translate(-50%, ${Math.round(pullDistance * 0.35)}px)`}}
        >
          <RefreshCw className={`w-3.5 h-3.5 text-[#F97316] ${pullDistance > 48 ? 'animate-spin' : ''}`} />
          <span>{pullDistance > 48 ? 'Release to refresh' : 'Pull to refresh'}</span>
        </div>
      )}

      <div className="relative z-10 max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 flex gap-6">
        <Sidebar
          activeSection={activeSection}
          onSelectSection={handleSelectSection}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onLogoTap={handleLogoTap}
          unit={unit}
          onToggleUnit={() => setUnit((u) => (u === 'C' ? 'F' : 'C'))}
        />

        <main className="flex-1 min-w-0 space-y-6">
          {/* Top Bar (z-40 keeps floating search dropdown above banner and cards) */}
          <header
            className={`relative z-40 flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-3xl transition-colors duration-300 ${
              isForecastMode
                ? 'bg-[#0F1B3D]/55 backdrop-blur-md px-4 py-3 border border-amber-300/45'
                : ''
            }`}
          >
            <div className="min-w-0">
              <div className="text-xs font-medium flex flex-wrap items-center gap-2 text-white/90 drop-shadow-[0_1px_2px_rgba(15,27,61,0.4)]">
                <span>Weatherly</span>
                <span aria-hidden="true">·</span>
                <span className="capitalize">{atmosphere.phase.replace('-', ' ')}</span>
                {data && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums">{formatUpdatedAgo(data.fetchedAtMs, nowMs)}</span>
                  </>
                )}
                {isForecastMode && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="font-semibold text-amber-300">Forecast preview</span>
                  </>
                )}
                {nightEggActive && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>Night preview</span>
                  </>
                )}
              </div>
              <div className="text-lg sm:text-xl font-semibold tracking-tight text-white drop-shadow-[0_1px_3px_rgba(15,27,61,0.45)]">
                {greeting}
              </div>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto justify-end">
              <SearchBar
                onSelectCity={handleSelectCity}
                preferredProvider={preferredProvider}
              />

              <button
                type="button"
                onClick={() => {
                  triggerHaptic(5);
                  setIsPaletteOpen(true);
                }}
                aria-label="Open command palette"
                title="Quick search (/ or Cmd+K)"
                className="weatherly-pressable hidden sm:flex w-11 h-11 rounded-full border weatherly-surface-card items-center justify-center shrink-0 shadow-sm hover:bg-white transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F97316]"
              >
                <Search className="w-4 h-4 text-[#0F1B3D]" aria-hidden="true" />
              </button>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic(6);
                  setSoundEnabled((s) => !s);
                }}
                aria-label={soundEnabled ? 'Mute ambient weather audio' : 'Play ambient weather audio'}
                aria-pressed={soundEnabled}
                title="Ambient weather sound"
                className={`weatherly-pressable w-11 h-11 rounded-full border flex items-center justify-center shrink-0 shadow-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F97316] ${
                  soundEnabled
                    ? 'bg-[#F97316] border-[#F97316] text-white'
                    : 'weatherly-surface-card text-[#0F1B3D] hover:bg-white'
                }`}
              >
                {soundEnabled ? (
                  <Volume2 className="w-4 h-4" aria-hidden="true" />
                ) : (
                  <VolumeX className="w-4 h-4" aria-hidden="true" />
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic(6);
                  handleUseMyLocation();
                }}
                aria-label="Use current location"
                title="Use my location"
                className="weatherly-pressable w-11 h-11 rounded-full border weatherly-surface-card flex items-center justify-center shrink-0 shadow-sm hover:bg-white transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F97316]"
              >
                <LocateFixed
                  className={`w-4 h-4 ${geo.isLocating ? 'text-[#F97316] animate-pulse' : 'text-[#0F1B3D]'}`}
                  aria-hidden="true"
                />
              </button>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic(6);
                  refresh();
                }}
                aria-label="Refresh weather"
                title="Refresh forecast"
                className="weatherly-pressable w-11 h-11 rounded-full border weatherly-surface-card flex items-center justify-center shrink-0 shadow-sm hover:bg-white transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F97316]"
              >
                <RefreshCw
                  className={`w-4 h-4 text-[#0F1B3D] ${status === 'loading' ? 'animate-spin' : ''}`}
                  aria-hidden="true"
                />
              </button>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic(8);
                  setUnit((u) => (u === 'C' ? 'F' : 'C'));
                }}
                aria-label={`Switch temperature unit to ${unit === 'C' ? 'Fahrenheit' : 'Celsius'}`}
                className="weatherly-pressable lg:hidden h-11 px-3.5 rounded-full border weatherly-surface-card text-xs font-semibold tabular-nums shrink-0 shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F97316]"
              >
                °{unit}
              </button>
            </div>
          </header>

          {/* Slim Dismissible Notice (stacked in flow below header; never overlaps search dropdown) */}
          {showNotice && (
            <div
              role="status"
              className="relative z-10 w-full sm:w-fit max-w-full rounded-2xl bg-[#FEF3C7]/92 backdrop-blur-md border border-[#D97706]/30 px-4 py-2 text-xs sm:text-sm text-[#451A03] flex items-center justify-between gap-3 shadow-sm"
            >
              <span className="inline-flex items-center gap-2 min-w-0">
                <WifiOff className="w-3.5 h-3.5 text-[#92400E] shrink-0" aria-hidden="true" />
                <span className="truncate">
                  {error?.message ?? 'You appear to be offline. Displaying cached forecast data.'}
                </span>
              </span>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={refresh}
                  className="text-xs font-semibold text-[#92400E] hover:text-[#451A03] underline rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F97316]"
                >
                  Retry
                </button>
                <button
                  type="button"
                  onClick={() => setBannerDismissed(true)}
                  aria-label="Dismiss notice"
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[#78350F] hover:bg-[#451A03]/10 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F97316]"
                >
                  <X className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>
          )}

          {/* Loading Skeleton */}
          {status === 'loading' && !data && <DashboardSkeleton />}

          {/* Friendly Error State */}
          {status === 'error' && !data && error && (
            <div
              role="alert"
              className="rounded-3xl border weatherly-surface-card p-8 text-center max-w-lg mx-auto my-12 space-y-4"
            >
              <h2 className="text-lg font-semibold text-[#0F1B3D]">Unable to fetch weather</h2>
              <p className="text-sm text-[#475569]">{error.message}</p>
              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={refresh}
                  className="px-5 py-2.5 rounded-full bg-[#F97316] text-white text-sm font-medium hover:bg-[#EA580C] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F97316]"
                >
                  Try again
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectCity(DEFAULT_CITY)}
                  className="px-5 py-2.5 rounded-full bg-slate-900/10 text-[#0F1B3D] text-sm font-medium hover:bg-slate-900/15 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F97316]"
                >
                  Load London
                </button>
              </div>
            </div>
          )}

          {/* Main Bento Grid */}
          {viewedWeather && (
            <div className="space-y-6">
              {/* Row 1: Hero + Reference 1 Frosted Glass 7-Day Card */}
              <div
                className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch weatherly-stagger-in"
                style={{animationDelay: '0ms'}}
              >
                <div className="xl:col-span-7 flex flex-col [&>section]:flex-1">
                  <HeroCard
                    weather={viewedWeather}
                    unit={unit}
                    isSaved={isCurrentSaved}
                    isForecastMode={isForecastMode}
                    isLocating={
                      geo.isLocating ||
                      (activeLocation.name === 'Your location' && status === 'loading')
                    }
                    onToggleSave={handleToggleSaveCurrent}
                    onShare={handleShare}
                    isSharing={isSharing}
                  />
                </div>

                <div className="xl:col-span-5 flex flex-col [&>section]:flex-1">
                  <ForecastCard
                    cityName={viewedWeather.location.name}
                    currentTempC={viewedWeather.current.tempC}
                    condition={viewedWeather.current.condition}
                    daily={viewedWeather.daily}
                    timezoneOffsetSec={viewedWeather.timezoneOffsetSec}
                    unit={unit}
                    frost={isColdFrost}
                  />
                </div>
              </div>

              {/* Row 2: 24-Hour Draggable Time-Travel Scrubber */}
              <div className="weatherly-stagger-in" style={{animationDelay: '40ms'}}>
                <HourlyStrip
                  hourly={viewedWeather.hourly}
                  timezoneOffsetSec={viewedWeather.timezoneOffsetSec}
                  unit={unit}
                  scrubIndex={scrubIndex}
                  onScrubChange={setScrubIndex}
                  frost={isColdFrost}
                />
              </div>

              {/* Row 3: Expandable Atmospheric Metrics */}
              <div className="weatherly-stagger-in" style={{animationDelay: '80ms'}}>
                <MetricsGrid weather={viewedWeather} unit={unit} frost={isColdFrost} />
              </div>

              {/* Row 4: Fun & Practical Guidance (Wear + Activity Comfort Rings) */}
              <div
                className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch weatherly-stagger-in"
                style={{animationDelay: '120ms'}}
              >
                <div className="lg:col-span-5 flex flex-col [&>section]:flex-1">
                  <WearCard weather={viewedWeather} frost={isColdFrost} />
                </div>
                <div className="lg:col-span-7 flex flex-col [&>section]:flex-1">
                  <ActivityScores weather={viewedWeather} frost={isColdFrost} />
                </div>
              </div>

              {/* Row 5: Time of Day + Tomorrow Tinted Card + Live Saved Cities */}
              <div
                className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch weatherly-stagger-in"
                style={{animationDelay: '160ms'}}
              >
                <div className="lg:col-span-5 flex flex-col [&>section]:flex-1">
                  <TimeOfDay slots={viewedWeather.timeOfDay} unit={unit} frost={isColdFrost} />
                </div>

                <div className="lg:col-span-3 flex flex-col [&>section]:flex-1">
                  <TomorrowCard
                    cityName={viewedWeather.location.name}
                    tomorrow={viewedWeather.daily[1]}
                    unit={unit}
                    frost={isColdFrost}
                  />
                </div>

                <div className="lg:col-span-4 flex flex-col [&>section]:flex-1">
                  <CityList
                    cities={savedCities}
                    snapshots={savedSnapshots}
                    activeCityId={viewedWeather.location.id}
                    unit={unit}
                    onSelectCity={handleSelectCity}
                    onRemoveCity={handleRemoveCity}
                    onReorderCities={setSavedCities}
                    onAddDefaults={() => setSavedCities(INITIAL_SAVED_CITIES)}
                    onOpenCompare={() => setIsCompareOpen(true)}
                    frost={isColdFrost}
                  />
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Undo remove city toast */}
      {undoToast && (
        <div
          role="status"
          className="fixed bottom-20 lg:bottom-6 right-6 z-50 rounded-full bg-[#0F1B3D] text-white px-4 py-2.5 shadow-xl flex items-center gap-3 text-xs font-medium"
        >
          <span>Removed {undoToast.city.name}</span>
          <button
            type="button"
            onClick={handleUndoRemove}
            className="text-[#F97316] font-semibold hover:underline"
          >
            Undo
          </button>
        </div>
      )}

      {isSettingsOpen && (
        <Suspense fallback={null}>
          <SettingsModal
            unit={unit}
            onChangeUnit={setUnit}
            providerPreference={providerPref}
            onChangeProvider={setProviderPref}
            onRefresh={refresh}
            onClose={() => setIsSettingsOpen(false)}
          />
        </Suspense>
      )}

      {isPaletteOpen && (
        <Suspense fallback={null}>
          <CommandPalette
            recentCities={recentCities}
            unit={unit}
            preferredProvider={preferredProvider}
            onSelectCity={handleSelectCity}
            onUseMyLocation={handleUseMyLocation}
            onToggleUnit={() => setUnit((u) => (u === 'C' ? 'F' : 'C'))}
            onClose={() => setIsPaletteOpen(false)}
          />
        </Suspense>
      )}

      {isCompareOpen && (
        <Suspense fallback={null}>
          <CompareModal
            cities={savedCities}
            snapshots={savedSnapshots}
            unit={unit}
            onClose={() => setIsCompareOpen(false)}
          />
        </Suspense>
      )}
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <WeatherlyDashboard />
    </ErrorBoundary>
  );
}
