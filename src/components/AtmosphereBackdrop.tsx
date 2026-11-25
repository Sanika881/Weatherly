import {useEffect, useRef, useState} from 'react';
import {getSunArcPosition} from '../domain/celestial';
import type {AtmosphereEffect, AtmosphereTheme} from '../types/weather';

interface AtmosphereBackdropProps {
  theme: AtmosphereTheme;
  observedAt?: number;
  sunrise?: number;
  sunset?: number;
  tempC?: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  phase: number;
}

function createParticles(effect: AtmosphereEffect, w: number, h: number): Particle[] {
  const count = effect === 'rain' || effect === 'thunder' ? 56 : effect === 'snow' ? 42 : 30;
  return Array.from({length: Math.min(60, count)}, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
    vx:
      effect === 'rain' || effect === 'thunder'
        ? -1.2 - Math.random() * 0.8
        : effect === 'snow'
        ? (Math.random() - 0.5) * 0.7
        : (Math.random() - 0.5) * 0.25,
    vy:
      effect === 'rain' || effect === 'thunder'
        ? 7 + Math.random() * 5
        : effect === 'snow'
        ? 0.9 + Math.random() * 1.1
        : effect === 'stars'
        ? 0
        : -0.15 - Math.random() * 0.2,
    size:
      effect === 'rain' || effect === 'thunder'
        ? 12 + Math.random() * 10
        : effect === 'snow'
        ? 1.8 + Math.random() * 2.2
        : 1.2 + Math.random() * 1.6,
    alpha: 0.25 + Math.random() * 0.55,
    phase: Math.random() * Math.PI * 2,
  }));
}

export function AtmosphereBackdrop({
  theme,
  observedAt = 0,
  sunrise = 0,
  sunset = 0,
  tempC = 20,
}: AtmosphereBackdropProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [parallax, setParallax] = useState({x: 0, y: 0});
  const [lightningFlash, setLightningFlash] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--sky-from', theme.skyFrom);
    root.style.setProperty('--sky-via', theme.skyVia);
    root.style.setProperty('--sky-to', theme.skyTo);
    root.style.setProperty('--sky-overlay-opacity', String(theme.overlayOpacity));
    root.style.setProperty('--glass-bg', theme.glassBg);
    root.style.setProperty('--glass-border', theme.glassBorder);
    root.style.setProperty('--glass-text', theme.glassText);
    root.style.setProperty('--glass-muted', theme.glassMuted);
    root.style.setProperty('--surface-bg', theme.surfaceBg);
    root.style.setProperty('--surface-border', theme.surfaceBorder);
    root.style.setProperty('--surface-text', theme.surfaceText);
    root.style.setProperty('--surface-muted', theme.surfaceMuted);
  }, [theme]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;

    const handlePointer = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      const nx = (e.clientX / window.innerWidth - 0.5) * 2;
      const ny = (e.clientY / window.innerHeight - 0.5) * 2;
      setParallax({x: nx * 7, y: ny * 5});
    };

    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.gamma === null || e.beta === null) return;
      const nx = Math.max(-1, Math.min(1, e.gamma / 30));
      const ny = Math.max(-1, Math.min(1, (e.beta - 45) / 30));
      setParallax({x: nx * 7, y: ny * 5});
    };

    window.addEventListener('pointermove', handlePointer, {passive: true});
    window.addEventListener('deviceorientation', handleOrientation, {passive: true});
    return () => {
      window.removeEventListener('pointermove', handlePointer);
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = containerRef.current;
    if (!canvas || !host) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);
    const particles = createParticles(theme.effect, width, height);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    let isVisible = true;
    const observer = new IntersectionObserver(
      (entries) => {
        isVisible = entries[0]?.isIntersecting ?? true;
      },
      {threshold: 0.05}
    );
    observer.observe(host);

    let rafId = 0;
    let tick = 0;
    let nextFlashAt = 160 + Math.random() * 200;

    const render = () => {
      rafId = requestAnimationFrame(render);
      if (document.hidden || !isVisible) return;

      tick++;
      ctx.clearRect(0, 0, width, height);

      if (theme.effect === 'thunder' && tick > nextFlashAt) {
        nextFlashAt = tick + 180 + Math.random() * 240;
        setLightningFlash(true);
        window.setTimeout(() => setLightningFlash(false), 180);
      }

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;

        if (theme.effect === 'snow') {
          p.x += Math.sin(tick * 0.02 + p.phase) * 0.4;
        }
        if (p.y > height + 20) {
          p.y = -15;
          p.x = Math.random() * width;
        } else if (p.y < -15) {
          p.y = height + 10;
          p.x = Math.random() * width;
        }
        if (p.x < -20) p.x = width + 10;
        if (p.x > width + 20) p.x = -10;

        if (theme.effect === 'rain' || theme.effect === 'thunder') {
          ctx.strokeStyle = `rgba(224, 242, 254, ${p.alpha * 0.65})`;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x + p.vx * 1.4, p.y + p.size);
          ctx.stroke();
        } else if (theme.effect === 'snow') {
          ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        } else if (theme.effect === 'stars') {
          const twinkle = 0.35 + 0.65 * Math.abs(Math.sin(tick * 0.025 + p.phase));
          ctx.fillStyle = `rgba(255, 253, 232, ${twinkle * 0.85})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y * 0.55, p.size, 0, Math.PI * 2);
          ctx.fill();
        } else if (theme.effect === 'none' || theme.effect === 'clouds') {
          const moteAlpha = p.alpha * (0.35 + 0.3 * Math.sin(tick * 0.02 + p.phase));
          ctx.fillStyle = `rgba(255, 248, 220, ${moteAlpha})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 0.85, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };

    rafId = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleResize);
      observer.disconnect();
    };
  }, [theme.effect]);

  const arc = getSunArcPosition(observedAt, sunrise, sunset);
  const arcAngle = Math.PI * (1 - arc.progress);
  const arcCenterX = 500;
  const arcBaseY = 230;
  const arcRadiusX = 410;
  const arcRadiusY = 175;
  const bodyX = arcCenterX + Math.cos(arcAngle) * arcRadiusX;
  const bodyY = arcBaseY - Math.sin(arcAngle) * arcRadiusY;

  const isHot = tempC > 32;

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 overflow-hidden z-0"
    >
      {/* Subtle top scrim so header text always maintains >=4.5:1 AA contrast */}
      <div
        className="absolute inset-x-0 top-0 h-44"
        style={{
          background:
            'linear-gradient(180deg, rgba(15, 27, 61, 0.52) 0%, rgba(15, 27, 61, 0.22) 55%, transparent 100%)',
        }}
      />

      {/* Crisp Sunrise-to-Sunset Arc with glowing Sun or Moon */}
      {observedAt > 0 && Number.isFinite(bodyX) && Number.isFinite(bodyY) && (
        <svg
          viewBox="0 0 1000 260"
          preserveAspectRatio="xMidYMin slice"
          className="absolute inset-x-0 top-0 w-full h-[260px] transition-transform duration-200 ease-out"
          style={{transform: `translate3d(${parallax.x * 0.7}px, ${parallax.y * 0.7}px, 0)`}}
        >
          <defs>
            <radialGradient id="skySunGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#FEF08A" stopOpacity="0.95" />
              <stop offset="45%" stopColor="#FBBF24" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="skyMoonGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#F8FAFC" stopOpacity="0.65" />
              <stop offset="100%" stopColor="#CBD5E1" stopOpacity="0" />
            </radialGradient>
          </defs>

          <path
            d={`M ${arcCenterX - arcRadiusX} ${arcBaseY} A ${arcRadiusX} ${arcRadiusY} 0 0 1 ${
              arcCenterX + arcRadiusX
            } ${arcBaseY}`}
            fill="none"
            stroke="rgba(255,255,255,0.22)"
            strokeWidth="1.25"
            strokeDasharray="4 7"
          />

          {arc.isDay ? (
            <g transform={`translate(${bodyX}, ${bodyY})`}>
              <circle cx="0" cy="0" r="36" fill="url(#skySunGlow)" />
              <g className="weatherly-anim-spin">
                {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
                  <line
                    key={a}
                    x1="0"
                    y1="-15"
                    x2="0"
                    y2="-21"
                    stroke="#FEF08A"
                    strokeWidth="2"
                    strokeLinecap="round"
                    transform={`rotate(${a})`}
                    opacity="0.75"
                  />
                ))}
              </g>
              <circle cx="0" cy="0" r="11" fill="#FEF08A" />
            </g>
          ) : (
            <g transform={`translate(${bodyX}, ${bodyY})`}>
              <circle cx="0" cy="0" r="26" fill="url(#skyMoonGlow)" />
              <path
                d="M4 -9C-1.5 -8 -5 -3 -5 2C-5 7.5 -0.5 12 5 12C7 12 9 11.4 10.6 10.3C8.5 13.8 4.6 16 0.2 16C-6.5 16 -12 10.5 -12 3.8C-12 -2.9 -6.5 -8.4 0.2 -8.4C1.5 -8.4 2.8 -8.2 4 -9Z"
                fill="#F8FAFC"
              />
            </g>
          )}
        </svg>
      )}

      {(theme.effect === 'clouds' || theme.effect === 'mist') && (
        <div
          className="absolute inset-0 weatherly-anim-sky-cloud transition-transform duration-200 ease-out"
          style={{
            opacity: theme.overlayOpacity + 0.1,
            transform: `translate3d(${parallax.x}px, ${parallax.y}px, 0)`,
          }}
        >
          <div
            className="absolute -top-16 left-[8%] h-56 w-[420px] rounded-full blur-3xl"
            style={{background: 'rgba(255, 255, 255, 0.45)'}}
          />
          <div
            className="absolute top-12 right-[10%] h-64 w-[480px] rounded-full blur-3xl"
            style={{background: 'rgba(255, 255, 255, 0.35)'}}
          />
        </div>
      )}

      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full transition-transform duration-200 ease-out"
        style={{transform: `translate3d(${parallax.x * 0.5}px, ${parallax.y * 0.5}px, 0)`}}
      />

      {lightningFlash && (
        <div className="absolute inset-0 bg-white/30 transition-opacity duration-150" />
      )}

      {isHot && (
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 50% 35%, transparent 55%, rgba(249, 115, 22, 0.22) 100%)',
          }}
        />
      )}
    </div>
  );
}
