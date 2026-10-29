import { state } from '../game/state.js';
import { PACKS } from './packs.js';

let audioCtx = null;

/** Create or resume the audio context. Must run inside a user gesture. */
export function initAudio() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!audioCtx && AC) audioCtx = new AC();
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  } catch {
    audioCtx = null;
  }
}

/** One short enveloped tone. */
function tone(freq, endFreq, type, start, dur, vol) {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, start + dur);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(vol, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start(start);
  osc.stop(start + dur + 0.02);
}

/** Short burst of filtered white noise (wooden knocks, rustles). */
function noise(start, dur, vol, filterHz) {
  const len = Math.max(1, Math.floor(audioCtx.sampleRate * dur));
  const buf = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = audioCtx.createBufferSource();
  src.buffer = buf;
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = filterHz;
  const gain = audioCtx.createGain();
  gain.gain.value = vol;
  src.connect(filter).connect(gain).connect(audioCtx.destination);
  src.start(start);
}

/**
 * Play a named sound effect from the equipped pack (no-op when sound is off or Web Audio is missing).
 * @param {'pop'|'bump'|'win'} type
 * @param {string} [pack] sound pack id (defaults to the equipped one; used by Shop previews)
 */
export function playSound(type, pack) {
  if (!state.sound) return;
  try {
    initAudio();
    if (!audioCtx) return;
    const p = PACKS[pack || state.cosmetics.equipped.sound] || PACKS.soft;
    if (p[type]) p[type](tone, noise, audioCtx.currentTime);
  } catch {
    // audio not available
  }
}
