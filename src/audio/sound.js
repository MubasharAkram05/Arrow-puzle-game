import { state } from '../game/state.js';

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

/**
 * Play a named sound effect (no-op when sound is off or Web Audio is missing).
 * @param {'pop'|'bump'|'win'} type
 */
export function playSound(type) {
  if (!state.sound) return;
  try {
    initAudio();
    if (!audioCtx) return;
    const t = audioCtx.currentTime;
    if (type === 'pop') tone(520, 900, 'sine', t, 0.1, 0.25);
    else if (type === 'bump') tone(150, 70, 'triangle', t, 0.18, 0.35);
    else if (type === 'win') {
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, 0, 'sine', t + i * 0.11, 0.24, 0.22));
    }
  } catch {
    // audio not available
  }
}
