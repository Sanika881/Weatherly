import {Check, Droplet, Glasses, Shirt, Sun, Umbrella} from 'lucide-react';
import {useState} from 'react';
import {computeWearAdvice, type WearItem} from '../domain/activities';
import type {WeatherBundle} from '../types/weather';
import {handleCardPointerMove, triggerHaptic} from '../utils/haptics';

interface WearCardProps {
  weather: WeatherBundle;
  frost?: boolean;
}

function WearIcon({kind}: {kind: WearItem['kind']}) {
  switch (kind) {
    case 'umbrella':
      return <Umbrella className="w-4 h-4 text-sky-600" aria-hidden="true" />;
    case 'sunscreen':
      return <Sun className="w-4 h-4 text-[#F97316]" aria-hidden="true" />;
    case 'sunglasses':
      return <Glasses className="w-4 h-4 text-[#0F1B3D]" aria-hidden="true" />;
    case 'water':
      return <Droplet className="w-4 h-4 text-cyan-600" aria-hidden="true" />;
    default:
      return <Shirt className="w-4 h-4 text-indigo-600" aria-hidden="true" />;
  }
}

export function WearCard({weather, frost = false}: WearCardProps) {
  const [checkedIds, setCheckedIds] = useState<string[]>([]);
  const items = computeWearAdvice(weather);

  const toggleItem = (id: string) => {
    triggerHaptic(6);
    setCheckedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <section
      aria-label="What should I wear"
      onMouseMove={handleCardPointerMove}
      className={`rounded-3xl border weatherly-surface-card weatherly-card-lift p-5 shadow-[0_8px_24px_rgba(15,27,61,0.06)] flex flex-col justify-between gap-3 ${
        frost ? 'weatherly-frost-card' : ''
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-[#0F1B3D]">What should I wear?</h2>
        <span className="text-xs text-[#475569] tabular-nums">
          {checkedIds.filter((id) => items.some((i) => i.id === id)).length}/{items.length} ready
        </span>
      </div>

      <ul className="space-y-2">
        {items.map((item) => {
          const checked = checkedIds.includes(item.id);
          return (
            <li key={item.id}>
              <button
                type="button"
                role="checkbox"
                aria-checked={checked}
                onClick={() => toggleItem(item.id)}
                className={`weatherly-pressable w-full rounded-2xl px-3.5 py-2.5 flex items-center justify-between gap-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F97316] ${
                  checked ? 'bg-emerald-50/90 text-[#0F1B3D]' : 'bg-white/80 hover:bg-white text-[#0F1B3D]'
                }`}
              >
                <span className="flex items-center gap-3 min-w-0">
                  <span className="w-8 h-8 rounded-full bg-slate-900/5 flex items-center justify-center shrink-0">
                    <WearIcon kind={item.kind} />
                  </span>
                  <span className="min-w-0">
                    <span
                      className={`block text-sm font-medium truncate ${
                        checked ? 'line-through text-[#64748B]' : ''
                      }`}
                    >
                      {item.label}
                    </span>
                    <span className="block text-[11px] text-[#475569] truncate">
                      {item.detail}
                    </span>
                  </span>
                </span>

                <span
                  aria-hidden="true"
                  className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                    checked
                      ? 'bg-emerald-600 border-emerald-600 text-white'
                      : 'border-slate-300 bg-white'
                  }`}
                >
                  {checked && <Check className="w-3 h-3" />}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
