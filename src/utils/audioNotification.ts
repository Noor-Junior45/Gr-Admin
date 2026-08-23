// Web Audio API Synthesizer for instant, zero-dependency audio alerts

export type SoundType =
  | 'melody'
  | 'cash_register'
  | 'chime'
  | 'ding_dong'
  | 'radar'
  | 'fanfare';

export interface SoundOption {
  id: SoundType;
  name: string;
  description: string;
  durationSec: number;
}

export const SOUND_OPTIONS: SoundOption[] = [
  {
    id: 'melody',
    name: 'Joyful Melody (Song)',
    description: 'Upbeat 8-note musical sequence with bright harmonies',
    durationSec: 1.6,
  },
  {
    id: 'cash_register',
    name: 'Cash Register & Chime',
    description: 'Crisp retail register ring and metallic coins chime',
    durationSec: 1.2,
  },
  {
    id: 'chime',
    name: 'Warehouse Bell Chime',
    description: 'Warm vibraphone 3-tone announcement bell',
    durationSec: 1.4,
  },
  {
    id: 'ding_dong',
    name: 'Doorbell Ding-Dong',
    description: 'Classic rich two-tone entrance bell',
    durationSec: 1.0,
  },
  {
    id: 'fanfare',
    name: 'Celebration Fanfare',
    description: 'Triumphant brass chime for incoming sales',
    durationSec: 1.5,
  },
  {
    id: 'radar',
    name: 'High-Priority Pulse',
    description: 'High-frequency double ping for noisy warehouse floors',
    durationSec: 0.8,
  },
];

let globalAudioCtx: AudioContext | null = null;
let activeLoopTimeout: NodeJS.Timeout | null = null;
let isCurrentlyLooping = false;

function getAudioContext(): AudioContext | null {
  try {
    const AudioContextClass =
      window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return null;

    if (!globalAudioCtx || globalAudioCtx.state === 'closed') {
      globalAudioCtx = new AudioContextClass();
    }
    if (globalAudioCtx.state === 'suspended') {
      globalAudioCtx.resume();
    }
    return globalAudioCtx;
  } catch (err) {
    console.warn('AudioContext initialization error:', err);
    return null;
  }
}

/**
 * Unlock AudioContext on user interaction
 */
export async function unlockAudioContext(): Promise<boolean> {
  const ctx = getAudioContext();
  if (!ctx) return false;
  if (ctx.state === 'suspended') {
    try {
      await ctx.resume();
    } catch (e) {
      console.warn('Failed to resume AudioContext:', e);
    }
  }
  return ctx.state === 'running';
}

/**
 * Play a single synthesized note with envelope
 */
function playTone(
  ctx: AudioContext,
  freq: number,
  startTime: number,
  duration: number,
  gainValue: number,
  type: OscillatorType = 'sine'
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);

  // Attack-Decay envelope
  gain.gain.setValueAtTime(0.001, startTime);
  gain.gain.exponentialRampToValueAtTime(Math.max(gainValue, 0.001), startTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(startTime);
  osc.stop(startTime + duration + 0.05);
}

/**
 * Play specific synthesized sound sequence
 */
export function playSoundEffect(type: SoundType, volume: number = 0.8) {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime + 0.02;
  const masterVolume = Math.max(0.05, Math.min(volume, 1.0)) * 0.7;

  switch (type) {
    case 'melody': {
      // 8-note energetic cheerful tune (C5, E5, G5, A5, B5, C6, G5, C6)
      const notes = [
        { freq: 523.25, time: 0, dur: 0.15, type: 'triangle' as OscillatorType },
        { freq: 659.25, time: 0.14, dur: 0.15, type: 'triangle' as OscillatorType },
        { freq: 783.99, time: 0.28, dur: 0.16, type: 'triangle' as OscillatorType },
        { freq: 880.00, time: 0.44, dur: 0.16, type: 'sine' as OscillatorType },
        { freq: 987.77, time: 0.60, dur: 0.18, type: 'triangle' as OscillatorType },
        { freq: 1046.5, time: 0.80, dur: 0.35, type: 'sine' as OscillatorType },
        { freq: 783.99, time: 1.15, dur: 0.18, type: 'sine' as OscillatorType },
        { freq: 1046.5, time: 1.35, dur: 0.50, type: 'triangle' as OscillatorType },
      ];
      notes.forEach((n) => {
        playTone(ctx, n.freq, now + n.time, n.dur, masterVolume, n.type);
        // Add subtle harmonic layer
        playTone(ctx, n.freq * 2, now + n.time, n.dur * 0.6, masterVolume * 0.2, 'sine');
      });
      break;
    }

    case 'cash_register': {
      // Register click + metallic chime chords
      playTone(ctx, 1200, now, 0.05, masterVolume * 0.8, 'square');
      playTone(ctx, 1600, now + 0.04, 0.06, masterVolume * 0.9, 'square');

      // Cash bells
      const bells = [
        { freq: 1760.0, time: 0.12, dur: 0.5 },
        { freq: 2637.0, time: 0.22, dur: 0.6 },
        { freq: 3520.0, time: 0.32, dur: 0.8 },
      ];
      bells.forEach((b) => {
        playTone(ctx, b.freq, now + b.time, b.dur, masterVolume * 0.6, 'sine');
        playTone(ctx, b.freq * 1.5, now + b.time, b.dur * 0.7, masterVolume * 0.25, 'triangle');
      });
      break;
    }

    case 'chime': {
      // 3-tone vibraphone bell chime (F5 -> A5 -> C6)
      const chimeNotes = [
        { freq: 698.46, time: 0, dur: 0.4 },
        { freq: 880.00, time: 0.25, dur: 0.5 },
        { freq: 1046.5, time: 0.55, dur: 0.9 },
      ];
      chimeNotes.forEach((n) => {
        playTone(ctx, n.freq, now + n.time, n.dur, masterVolume, 'sine');
        playTone(ctx, n.freq * 2, now + n.time, n.dur * 0.8, masterVolume * 0.35, 'triangle');
        playTone(ctx, n.freq * 3, now + n.time, n.dur * 0.3, masterVolume * 0.15, 'sine');
      });
      break;
    }

    case 'ding_dong': {
      // High Ding -> Lower Dong
      playTone(ctx, 987.77, now, 0.5, masterVolume, 'sine');
      playTone(ctx, 1975.5, now, 0.4, masterVolume * 0.3, 'triangle');

      playTone(ctx, 659.25, now + 0.35, 0.8, masterVolume * 1.1, 'sine');
      playTone(ctx, 1318.5, now + 0.35, 0.6, masterVolume * 0.35, 'triangle');
      break;
    }

    case 'fanfare': {
      // Brass fanfare: G4 -> C5 -> E5 -> G5 (held)
      const fanNotes = [
        { freq: 392.00, time: 0, dur: 0.15 },
        { freq: 523.25, time: 0.15, dur: 0.15 },
        { freq: 659.25, time: 0.30, dur: 0.18 },
        { freq: 783.99, time: 0.50, dur: 0.75 },
        { freq: 1046.5, time: 0.50, dur: 0.75 },
      ];
      fanNotes.forEach((n) => {
        playTone(ctx, n.freq, now + n.time, n.dur, masterVolume * 0.8, 'sawtooth');
        playTone(ctx, n.freq, now + n.time, n.dur, masterVolume, 'triangle');
      });
      break;
    }

    case 'radar': {
      // Double sharp radar beep
      playTone(ctx, 1500, now, 0.12, masterVolume, 'sine');
      playTone(ctx, 2200, now + 0.15, 0.18, masterVolume * 1.1, 'sine');
      playTone(ctx, 1500, now + 0.35, 0.12, masterVolume, 'sine');
      playTone(ctx, 2200, now + 0.50, 0.25, masterVolume * 1.1, 'sine');
      break;
    }
  }
}

/**
 * Start repeating sound until explicitly stopped
 */
export function startSoundLoop(
  type: SoundType,
  volume: number,
  repeatIntervalSec: number = 3.5
) {
  stopSoundLoop();
  isCurrentlyLooping = true;

  const loop = () => {
    if (!isCurrentlyLooping) return;
    playSoundEffect(type, volume);
    activeLoopTimeout = setTimeout(loop, repeatIntervalSec * 1000);
  };

  loop();
}

/**
 * Stop any active repeating sound
 */
export function stopSoundLoop() {
  isCurrentlyLooping = false;
  if (activeLoopTimeout) {
    clearTimeout(activeLoopTimeout);
    activeLoopTimeout = null;
  }
}

export function isAudioLooping(): boolean {
  return isCurrentlyLooping;
}
