/**
 * Splash screens (3.24.0). The web loading screen (#boot-splash in index.html) shows the logo while the app
 * loads, then fades into Home in 220 ms. On Android the native splash (@capacitor/splash-screen; the Android 12+
 * system splash before it) stays until the app is ready, then fades out the same way.
 */
import { Capacitor } from '@capacitor/core';

/** Fade the loading screens out; call once Home is drawn. */
export function hideBootSplash() {
  const el = document.getElementById('boot-splash');
  if (el) {
    // next frame, so Home has painted underneath before the fade starts
    requestAnimationFrame(() => {
      el.classList.add('done');
      setTimeout(() => el.remove(), 260);
    });
  }
  if (Capacitor.isNativePlatform()) {
    import('@capacitor/splash-screen')
      .then(({ SplashScreen }) => SplashScreen.hide({ fadeOutDuration: 250 }))
      .catch(() => {
        // plugin missing in this build: the native splash hides on its own after launchShowDuration
      });
  }
}
