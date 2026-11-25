import {CalendarDays, Compass, Gauge, Home, MapPin, Settings} from 'lucide-react';
import type {TemperatureUnit} from '../types/weather';
import {triggerHaptic} from '../utils/haptics';

export type NavSection = 'overview' | 'forecast' | 'metrics' | 'cities';

interface SidebarProps {
  activeSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  onOpenSettings: () => void;
  onLogoTap: () => void;
  unit: TemperatureUnit;
  onToggleUnit: () => void;
}

const NAV_ITEMS: Array<{id: NavSection; label: string; Icon: typeof Home}> = [
  {id: 'overview', label: 'Overview', Icon: Home},
  {id: 'forecast', label: '7-Day Outlook', Icon: CalendarDays},
  {id: 'metrics', label: 'Atmosphere', Icon: Gauge},
  {id: 'cities', label: 'Saved Cities', Icon: MapPin},
];

export function Sidebar({
  activeSection,
  onSelectSection,
  onOpenSettings,
  onLogoTap,
  unit,
  onToggleUnit,
}: SidebarProps) {
  return (
    <>
      <aside
        aria-label="Primary navigation"
        className="hidden lg:flex flex-col items-center justify-between w-[76px] shrink-0 rounded-3xl py-6 px-2.5 border backdrop-blur-xl weatherly-surface-card shadow-[0_8px_32px_rgba(15,27,61,0.08)] sticky top-6 h-[calc(100vh-3rem)]"
      >
        <div className="flex flex-col items-center gap-7 w-full">
          <button
            type="button"
            onClick={() => {
              triggerHaptic(6);
              onLogoTap();
              onSelectSection('overview');
            }}
            aria-label="Weatherly home"
            className="weatherly-pressable w-11 h-11 rounded-2xl bg-[#FFF3E8] flex items-center justify-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F97316] transition-transform duration-150 hover:scale-105"
          >
            <Compass className="w-5 h-5 text-[#F97316]" aria-hidden="true" />
          </button>

          <nav className="flex flex-col items-center gap-3 w-full">
            {NAV_ITEMS.map(({id, label, Icon}) => {
              const isActive = activeSection === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    triggerHaptic(5);
                    onSelectSection(id);
                  }}
                  aria-label={label}
                  aria-current={isActive ? 'page' : undefined}
                  title={label}
                  className={`weatherly-pressable relative w-11 h-11 rounded-2xl flex items-center justify-center transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F97316] ${
                    isActive
                      ? 'bg-[#F97316]/12 text-[#F97316]'
                      : 'text-[#64748B] hover:text-[#0F1B3D] hover:bg-slate-900/5'
                  }`}
                >
                  {isActive && (
                    <span
                      aria-hidden="true"
                      className="absolute -left-2.5 w-1 h-5 rounded-r-full bg-[#F97316]"
                    />
                  )}
                  <Icon className="w-5 h-5" aria-hidden="true" />
                </button>
              );
            })}
          </nav>
        </div>

        <div className="flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={() => {
              triggerHaptic(8);
              onToggleUnit();
            }}
            aria-label={`Switch temperature unit to ${unit === 'C' ? 'Fahrenheit' : 'Celsius'}`}
            className="weatherly-pressable w-11 h-11 rounded-2xl text-xs font-semibold tabular-nums bg-slate-900/5 text-[#0F1B3D] hover:bg-slate-900/10 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F97316]"
          >
            °{unit}
          </button>
          <button
            type="button"
            onClick={() => {
              triggerHaptic(6);
              onOpenSettings();
            }}
            aria-label="Open settings"
            title="Settings"
            className="weatherly-pressable w-11 h-11 rounded-2xl flex items-center justify-center text-[#64748B] hover:text-[#0F1B3D] hover:bg-slate-900/5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F97316]"
          >
            <Settings className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>
      </aside>

      <nav
        aria-label="Mobile navigation"
        className="lg:hidden fixed bottom-3 inset-x-3 z-40 rounded-full border backdrop-blur-xl weatherly-surface-card shadow-[0_8px_28px_rgba(15,27,61,0.14)] px-3 py-1.5 flex items-center justify-around"
      >
        {NAV_ITEMS.map(({id, label, Icon}) => {
          const isActive = activeSection === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => {
                triggerHaptic(5);
                onSelectSection(id);
              }}
              aria-label={label}
              aria-current={isActive ? 'page' : undefined}
              className={`weatherly-pressable min-w-[44px] min-h-[44px] px-3 rounded-full flex items-center justify-center gap-1.5 text-xs font-medium whitespace-nowrap shrink-0 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F97316] ${
                isActive ? 'bg-[#F97316] text-white' : 'text-[#475569] hover:text-[#0F1B3D]'
              }`}
            >
              <Icon className="w-4 h-4" aria-hidden="true" />
              <span className="sr-only sm:not-sr-only">{label.split(' ')[0]}</span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => {
            triggerHaptic(6);
            onOpenSettings();
          }}
          aria-label="Open settings"
          className="weatherly-pressable min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center text-[#475569] hover:text-[#0F1B3D] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F97316]"
        >
          <Settings className="w-4 h-4" aria-hidden="true" />
        </button>
      </nav>
    </>
  );
}
