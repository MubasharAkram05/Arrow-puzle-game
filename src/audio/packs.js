/**
 * Sound packs. Each pack plays pop (escape), bump (blocked) and win with Web Audio only.
 * Every function gets: tone(freq, endFreq, type, start, dur, vol), noise(start, dur, vol, filterHz), t (now).
 */
export const PACKS = {
  soft: {
    pop: (tone, noise, t) => tone(520, 900, 'sine', t, 0.1, 0.25),
    bump: (tone, noise, t) => tone(150, 70, 'triangle', t, 0.18, 0.35),
    win: (tone, noise, t) =>
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, 0, 'sine', t + i * 0.11, 0.24, 0.22)),
  },
  retro: {
    pop: (tone, noise, t) => {
      tone(880, 0, 'square', t, 0.05, 0.12);
      tone(1320, 0, 'square', t + 0.05, 0.06, 0.12);
    },
    bump: (tone, noise, t) => {
      tone(110, 0, 'square', t, 0.08, 0.16);
      tone(82, 0, 'square', t + 0.08, 0.1, 0.16);
    },
    win: (tone, noise, t) =>
      [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5].forEach((f, i) =>
        tone(f, 0, 'square', t + i * 0.08, 0.09, 0.12),
      ),
  },
  nature: {
    // bird chirp, a soft wooden knock, and a little bird song
    pop: (tone, noise, t) => {
      tone(1800, 2600, 'sine', t, 0.06, 0.18);
      tone(2200, 3000, 'sine', t + 0.07, 0.05, 0.12);
    },
    bump: (tone, noise, t) => {
      tone(220, 120, 'sine', t, 0.12, 0.3);
      noise(t, 0.06, 0.18, 900);
    },
    win: (tone, noise, t) => {
      [0, 0.12, 0.24, 0.42, 0.5].forEach((d, i) => tone(1600 + i * 180, 2400 + i * 200, 'sine', t + d, 0.09, 0.16));
      tone(1046.5, 0, 'triangle', t + 0.62, 0.3, 0.14);
    },
  },
};
