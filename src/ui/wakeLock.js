/**
 * Keep the screen on while a level is being played (3.25.0), so a player thinking about the next move doesn't
 * see the phone dim and lock. Uses the Screen Wake Lock API (Android WebView and modern browsers); where it is
 * missing or refused, nothing happens. The lock is dropped on every other screen and while the app is hidden,
 * and taken again when the player comes back to a level.
 */
let lock = null;
let wanted = false;

async function acquire() {
  if (!wanted || lock || document.hidden || !('wakeLock' in navigator)) return;
  try {
    lock = await navigator.wakeLock.request('screen');
    lock.addEventListener('release', () => (lock = null));
  } catch {
    lock = null; // not allowed (battery saver, no user gesture yet): the screen just times out as usual
  }
}

/**
 * Keep the screen on (true, on the game screen) or let it sleep (false).
 * @param {boolean} on
 */
export function keepAwake(on) {
  wanted = on;
  if (on) acquire();
  else if (lock) {
    lock.release().catch(() => {});
    lock = null;
  }
}

// the system drops the lock when the app goes to the background: take it again on return
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) acquire();
});
