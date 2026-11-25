interface RangeBarProps {
  dayMinC: number;
  dayMaxC: number;
  globalMinC: number;
  globalMaxC: number;
  currentTempC?: number;
  showCurrentDot?: boolean;
  rowIndex?: number;
}

function tempToGradientColor(tempC: number): string {
  if (tempC <= 5) return '#7DD3FC';
  if (tempC <= 14) return '#A3E635';
  if (tempC <= 21) return '#FACC15';
  if (tempC <= 27) return '#F59E0B';
  return '#F97316';
}

export function RangeBar({
  dayMinC,
  dayMaxC,
  globalMinC,
  globalMaxC,
  currentTempC,
  showCurrentDot = false,
  rowIndex = 0,
}: RangeBarProps) {
  const span = Math.max(1, globalMaxC - globalMinC);
  const leftPct = Math.max(0, Math.min(100, ((dayMinC - globalMinC) / span) * 100));
  const rightPct = Math.max(0, Math.min(100, ((dayMaxC - globalMinC) / span) * 100));
  const widthPct = Math.max(8, rightPct - leftPct);

  const startColor = tempToGradientColor(dayMinC);
  const endColor = tempToGradientColor(dayMaxC);

  const dotPct =
    showCurrentDot && typeof currentTempC === 'number'
      ? Math.max(leftPct + 2, Math.min(leftPct + widthPct - 2, ((currentTempC - globalMinC) / span) * 100))
      : null;

  return (
    <div className="relative h-1.5 w-full rounded-full bg-white/20 overflow-visible" aria-hidden="true">
      <div
        className="weatherly-bar-animate absolute top-0 h-1.5 rounded-full"
        style={{
          left: `${leftPct}%`,
          width: `${widthPct}%`,
          animationDelay: `${rowIndex * 60}ms`,
          background: `linear-gradient(90deg, ${startColor} 0%, ${endColor} 100%)`,
        }}
      />
      {dotPct !== null && (
        <span
          className="weatherly-today-dot absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-white"
          style={{left: `${dotPct}%`}}
        />
      )}
    </div>
  );
}
