// Web Audio API Synthesizer + HTML5 Audio fallback for instant order alerts and continuous alarm ringing
// Supports Android WebView, Capacitor native wrappers, and standard desktop/mobile browsers.

export type SoundType =
  | 'service_bell'
  | 'alarm_chime'
  | 'urgent_buzzer'
  | 'classic_dingdong'
  | 'cash_register'
  | 'melody'
  // Backward-compatibility aliases
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
    id: 'service_bell',
    name: 'Order Service Bell',
    description: 'Crisp, loud restaurant service bell chime with realistic metallic ring',
    durationSec: 1.6,
  },
  {
    id: 'alarm_chime',
    name: 'Order Alarm Siren',
    description: 'High-urgency two-tone order alarm that cuts through warehouse noise',
    durationSec: 1.5,
  },
  {
    id: 'urgent_buzzer',
    name: 'Delivery Terminal Alert',
    description: 'Sharp triple-tone commercial delivery terminal notification',
    durationSec: 1.2,
  },
  {
    id: 'classic_dingdong',
    name: 'Shop Doorbell (Ding-Dong)',
    description: 'Acoustic brass two-tone bell chime with long warm sustain',
    durationSec: 1.6,
  },
  {
    id: 'cash_register',
    name: 'Cash Register Ring',
    description: 'Mechanical register drawer ring with metallic coin chime',
    durationSec: 1.2,
  },
  {
    id: 'melody',
    name: 'Musical Chime',
    description: 'Upbeat 8-note melodic chime',
    durationSec: 1.5,
  },
];

let globalAudioCtx: AudioContext | null = null;
let activeLoopTimeout: ReturnType<typeof setTimeout> | null = null;
let isCurrentlyLooping = false;
let audioUnlocked = false;

function getAudioContext(): AudioContext | null {
  try {
    const AudioContextClass =
      window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return null;

    if (!globalAudioCtx || globalAudioCtx.state === 'closed') {
      globalAudioCtx = new AudioContextClass();
    }
    if (globalAudioCtx.state === 'suspended') {
      globalAudioCtx.resume().catch(() => {});
    }
    return globalAudioCtx;
  } catch (err) {
    console.warn('AudioContext initialization error:', err);
    return null;
  }
}

/**
 * Unlock AudioContext on user interaction or app initialization
 */
export async function unlockAudioContext(): Promise<boolean> {
  try {
    const ctx = getAudioContext();
    if (!ctx) return false;

    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    // Play a 1ms inaudible buffer to force mobile browsers and Android WebView into unmuted state
    const buffer = ctx.createBuffer(1, 1, 22050);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0);

    audioUnlocked = ctx.state === 'running';
    return audioUnlocked;
  } catch (e) {
    console.warn('Failed to unlock AudioContext:', e);
    return false;
  }
}

// Auto-register touch & click listeners on window to automatically unlock audio as early as possible
if (typeof window !== 'undefined') {
  const autoUnlock = () => {
    unlockAudioContext();
    window.removeEventListener('click', autoUnlock);
    window.removeEventListener('touchstart', autoUnlock);
    window.removeEventListener('keydown', autoUnlock);
  };
  window.addEventListener('click', autoUnlock, { once: true, passive: true });
  window.addEventListener('touchstart', autoUnlock, { once: true, passive: true });
  window.addEventListener('keydown', autoUnlock, { once: true, passive: true });
}

/**
 * Play a single synthesized note with attack-decay envelope
 */
function playTone(
  ctx: AudioContext,
  freq: number,
  startTime: number,
  duration: number,
  gainValue: number,
  type: OscillatorType = 'sine'
) {
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);

    // Instant attack, exponential decay envelope
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(Math.max(gainValue, 0.0001), startTime + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.00001, startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.05);
  } catch (err) {
    console.warn('Error playing tone:', err);
  }
}

/**
 * Synthesize a physically modeled acoustic bell strike with natural inharmonic overtones
 */
function playAcousticBell(
  ctx: AudioContext,
  baseFreq: number,
  startTime: number,
  duration: number,
  volume: number
) {
  try {
    const partials = [
      { mult: 0.5, gain: 0.35, decay: duration * 1.1, type: 'sine' as OscillatorType },
      { mult: 1.0, gain: 1.0, decay: duration, type: 'sine' as OscillatorType },
      { mult: 1.2, gain: 0.55, decay: duration * 0.75, type: 'sine' as OscillatorType },
      { mult: 1.5, gain: 0.4, decay: duration * 0.6, type: 'sine' as OscillatorType },
      { mult: 2.0, gain: 0.65, decay: duration * 0.8, type: 'sine' as OscillatorType },
      { mult: 2.76, gain: 0.3, decay: duration * 0.45, type: 'triangle' as OscillatorType },
      { mult: 4.07, gain: 0.22, decay: duration * 0.3, type: 'sine' as OscillatorType },
    ];

    partials.forEach((p) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = p.type;
      osc.frequency.setValueAtTime(baseFreq * p.mult, startTime);

      const targetGain = Math.max(0.0001, volume * p.gain);
      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.exponentialRampToValueAtTime(targetGain, startTime + 0.004);
      gain.gain.exponentialRampToValueAtTime(0.00001, startTime + p.decay);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + p.decay + 0.05);
    });
  } catch (err) {
    console.warn('Error playing bell:', err);
  }
}

/**
 * Play specific synthesized sound effect
 */
export function playSoundEffect(type: SoundType, volume: number = 0.85) {
  const ctx = getAudioContext();
  if (!ctx) return;

  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }

  const now = ctx.currentTime + 0.02;
  const masterVolume = Math.max(0.1, Math.min(volume, 1.0)) * 0.85;

  // Trigger tactile vibration on supported mobile devices
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate([200, 100, 200, 100, 300]);
    } catch {
      // Ignored if vibration is not allowed
    }
  }

  switch (type) {
    case 'service_bell':
    case 'chime': {
      // Order Service Bell: Crisp triple strike chime (Ding! Ding! Ding!)
      playAcousticBell(ctx, 1046.5, now, 1.3, masterVolume);
      playAcousticBell(ctx, 1318.5, now + 0.15, 1.4, masterVolume * 1.05);
      playAcousticBell(ctx, 1567.98, now + 0.32, 1.6, masterVolume * 1.15);
      break;
    }

    case 'alarm_chime': {
      // High-urgency delivery order alarm: alternating chime
      playTone(ctx, 880.0, now, 0.18, masterVolume * 0.9, 'triangle');
      playTone(ctx, 1760.0, now, 0.16, masterVolume * 0.35, 'sine');

      playTone(ctx, 1174.66, now + 0.16, 0.2, masterVolume, 'triangle');
      playTone(ctx, 2349.32, now + 0.16, 0.18, masterVolume * 0.35, 'sine');

      playTone(ctx, 880.0, now + 0.35, 0.18, masterVolume * 0.9, 'triangle');
      playTone(ctx, 1760.0, now + 0.35, 0.16, masterVolume * 0.35, 'sine');

      playTone(ctx, 1174.66, now + 0.52, 0.45, masterVolume * 1.1, 'triangle');
      playTone(ctx, 2349.32, now + 0.52, 0.4, masterVolume * 0.4, 'sine');
      break;
    }

    case 'urgent_buzzer':
    case 'radar': {
      // Triple commercial order buzzer beep
      playTone(ctx, 1760.0, now, 0.09, masterVolume * 0.95, 'square');
      playTone(ctx, 2093.0, now + 0.12, 0.09, masterVolume, 'square');
      playTone(ctx, 2637.0, now + 0.24, 0.28, masterVolume * 1.1, 'square');
      break;
    }

    case 'classic_dingdong':
    case 'ding_dong': {
      // Classic Ding-Dong counter doorbell
      playAcousticBell(ctx, 987.77, now, 1.2, masterVolume);
      playAcousticBell(ctx, 659.25, now + 0.34, 1.6, masterVolume * 1.15);
      break;
    }

    case 'cash_register': {
      // Register drawer lever click + coin chime
      playTone(ctx, 1200, now, 0.04, masterVolume * 0.8, 'square');
      playTone(ctx, 1600, now + 0.04, 0.05, masterVolume * 0.9, 'square');
      playAcousticBell(ctx, 1760.0, now + 0.1, 0.8, masterVolume * 0.7);
      playAcousticBell(ctx, 2637.0, now + 0.22, 1.0, masterVolume * 0.8);
      break;
    }

    case 'melody': {
      // 8-note energetic cheerful tune
      const notes = [
        { freq: 523.25, time: 0, dur: 0.14, type: 'triangle' as OscillatorType },
        { freq: 659.25, time: 0.13, dur: 0.14, type: 'triangle' as OscillatorType },
        { freq: 783.99, time: 0.26, dur: 0.15, type: 'triangle' as OscillatorType },
        { freq: 880.0, time: 0.42, dur: 0.15, type: 'sine' as OscillatorType },
        { freq: 987.77, time: 0.58, dur: 0.16, type: 'triangle' as OscillatorType },
        { freq: 1046.5, time: 0.76, dur: 0.3, type: 'sine' as OscillatorType },
        { freq: 783.99, time: 1.1, dur: 0.16, type: 'sine' as OscillatorType },
        { freq: 1046.5, time: 1.3, dur: 0.45, type: 'triangle' as OscillatorType },
      ];
      notes.forEach((n) => {
        playTone(ctx, n.freq, now + n.time, n.dur, masterVolume, n.type);
        playTone(ctx, n.freq * 2, now + n.time, n.dur * 0.6, masterVolume * 0.2, 'sine');
      });
      break;
    }

    case 'fanfare': {
      const fanNotes = [
        { freq: 392.0, time: 0, dur: 0.14 },
        { freq: 523.25, time: 0.14, dur: 0.14 },
        { freq: 659.25, time: 0.28, dur: 0.16 },
        { freq: 783.99, time: 0.46, dur: 0.65 },
        { freq: 1046.5, time: 0.46, dur: 0.65 },
      ];
      fanNotes.forEach((n) => {
        playTone(ctx, n.freq, now + n.time, n.dur, masterVolume * 0.8, 'sawtooth');
        playTone(ctx, n.freq, now + n.time, n.dur, masterVolume, 'triangle');
      });
      break;
    }
  }
}

/**
 * Start repeating sound until explicitly stopped (e.g. order accepted or cancelled)
 */
export function startSoundLoop(
  type: SoundType,
  volume: number = 0.85,
  repeatIntervalSec: number = 2.4
) {
  stopSoundLoop();
  isCurrentlyLooping = true;

  const loop = () => {
    if (!isCurrentlyLooping) return;
    playSoundEffect(type, volume);
    activeLoopTimeout = setTimeout(loop, Math.max(1.4, repeatIntervalSec) * 1000);
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
