import type {AtmosphereEffect} from '../types/weather';

let audioCtx: AudioContext | null = null;
let stopCurrentNodes: (() => void) | null = null;

function createNoiseBuffer(ctx: AudioContext, seconds = 2): AudioBuffer {
  const length = ctx.sampleRate * seconds;
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let lastOut = 0;
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1;
    // Soft brown/pink slope
    data[i] = (lastOut + 0.04 * white) / 1.04;
    lastOut = data[i];
  }
  return buffer;
}

export function startAmbientSound(effect: AtmosphereEffect): void {
  stopAmbientSound();

  const AudioContextCtor =
    window.AudioContext ||
    (window as unknown as {webkitAudioContext?: typeof AudioContext}).webkitAudioContext;
  if (!AudioContextCtor) return;

  if (!audioCtx) {
    audioCtx = new AudioContextCtor();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }

  const ctx = audioCtx;
  const master = ctx.createGain();
  master.gain.setValueAtTime(0.001, ctx.currentTime);
  master.gain.exponentialRampToValueAtTime(0.14, ctx.currentTime + 0.6);
  master.connect(ctx.destination);

  if (effect === 'stars') {
    // Night crickets: gentle pulsing high-frequency oscillator pairs
    const osc = ctx.createOscillator();
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    const chirpGain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.value = 4150;
    lfo.type = 'sine';
    lfo.frequency.value = 3.2;

    lfoGain.gain.value = 0.045;
    chirpGain.gain.value = 0.045;

    lfo.connect(lfoGain);
    lfoGain.connect(chirpGain.gain);
    osc.connect(chirpGain);
    chirpGain.connect(master);

    osc.start();
    lfo.start();

    stopCurrentNodes = () => {
      try {
        osc.stop();
        lfo.stop();
        master.disconnect();
      } catch {
        // ignore
      }
    };
    return;
  }

  // Soft rain or gentle wind using filtered noise buffer
  const src = ctx.createBufferSource();
  src.buffer = createNoiseBuffer(ctx, 3);
  src.loop = true;

  const filter = ctx.createBiquadFilter();
  if (effect === 'rain' || effect === 'thunder') {
    filter.type = 'bandpass';
    filter.frequency.value = 1100;
    filter.Q.value = 0.55;
  } else {
    // Gentle breeze
    filter.type = 'lowpass';
    filter.frequency.value = 360;
    filter.Q.value = 1.2;
  }

  src.connect(filter);
  filter.connect(master);
  src.start();

  stopCurrentNodes = () => {
    try {
      src.stop();
      master.disconnect();
    } catch {
      // ignore
    }
  };
}

export function stopAmbientSound(): void {
  if (stopCurrentNodes) {
    stopCurrentNodes();
    stopCurrentNodes = null;
  }
}
