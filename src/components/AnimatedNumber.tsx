import {useEffect, useRef, useState} from 'react';

interface AnimatedNumberProps {
  value: number;
  decimals?: number;
  suffix?: string;
  prefix?: string;
  durationMs?: number;
  className?: string;
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return true;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function AnimatedNumber({
  value,
  decimals = 0,
  suffix = '',
  prefix = '',
  durationMs = 400,
  className = '',
}: AnimatedNumberProps) {
  const [display, setDisplay] = useState<number>(value);
  const currentRef = useRef<number>(value);
  const hasMounted = useRef<boolean>(false);

  useEffect(() => {
    const startVal = hasMounted.current ? currentRef.current : 0;
    hasMounted.current = true;

    if (prefersReducedMotion() || Math.abs(value - startVal) < 0.05) {
      currentRef.current = value;
      setDisplay(value);
      return;
    }

    let frameId = 0;
    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / durationMs);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      const next = startVal + (value - startVal) * eased;
      currentRef.current = next;
      setDisplay(next);

      if (t < 1) {
        frameId = requestAnimationFrame(tick);
      } else {
        currentRef.current = value;
        setDisplay(value);
      }
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [value, durationMs]);

  const factor = Math.pow(10, decimals);
  const formatted =
    decimals > 0
      ? (Math.round(display * factor) / factor).toFixed(decimals)
      : String(Math.round(display));

  return (
    <span className={`tabular-nums ${className}`}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}
