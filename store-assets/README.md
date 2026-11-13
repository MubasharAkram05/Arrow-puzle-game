# Store assets: Arrow Expert

Made from the source art in `brand-images/` by `npm run assets` (`scripts/assets.py`; needs Python 3 with
Pillow and numpy). The screenshots come from the real game with `npm run screenshots`
(`scripts/store-screenshots.cjs`, Playwright). This file is written by `npm run assets`: run it again after new
screenshots so the table is up to date.

- ✅ = meets the rule in the "Slot" column (Google Play's rules for store files, as of late 2026; check the
  Play Console when uploading).
- Feature graphic (1024 x 500): not made yet.
- `android/res/` goes into `android/app/src/main/res/` once the Android project exists (`npx cap add android`);
  `npm run assets` copies it there automatically when that folder exists. Merge `android/splash-theme.xml`
  into `values/styles.xml`.
- Package ID: `com.sussal.arrowexpert` (`capacitor.config.json`).

| File                                                                 | Size (px)   | File size | Slot                                                                          | OK  |
| -------------------------------------------------------------------- | ----------- | --------- | ----------------------------------------------------------------------------- | --- |
| `public/icons/apple-touch-icon.png`                                  | 180 x 180   | 35 KB     | iOS home screen icon                                                          | ✅  |
| `public/icons/icon-192.png`                                          | 192 x 192   | 39 KB     | Web app manifest icon (any)                                                   | ✅  |
| `public/icons/icon-512.png`                                          | 512 x 512   | 227 KB    | Web app manifest icon (any)                                                   | ✅  |
| `public/icons/logo-256.png`                                          | 256 x 256   | 36 KB     | Loading screen, Home and Credits logo (transparent)                           | ✅  |
| `public/icons/maskable-512.png`                                      | 512 x 512   | 209 KB    | Web app manifest icon (maskable, art in the 80% safe circle)                  | ✅  |
| `store-assets/android/res/drawable-hdpi/splash_icon.png`             | 432 x 432   | 47 KB     | Android 12+ splash icon (288 dp, art in the 192 dp circle, hdpi)              | ✅  |
| `store-assets/android/res/drawable-land-hdpi/splash.png`             | 800 x 480   | 146 KB    | @capacitor/splash-screen, Android 11 and older (light)                        | ✅  |
| `store-assets/android/res/drawable-land-mdpi/splash.png`             | 480 x 320   | 70 KB     | @capacitor/splash-screen, Android 11 and older (light)                        | ✅  |
| `store-assets/android/res/drawable-land-xhdpi/splash.png`            | 1280 x 720  | 300 KB    | @capacitor/splash-screen, Android 11 and older (light)                        | ✅  |
| `store-assets/android/res/drawable-land-xxhdpi/splash.png`           | 1600 x 960  | 519 KB    | @capacitor/splash-screen, Android 11 and older (light)                        | ✅  |
| `store-assets/android/res/drawable-land-xxxhdpi/splash.png`          | 1920 x 1280 | 847 KB    | @capacitor/splash-screen, Android 11 and older (light)                        | ✅  |
| `store-assets/android/res/drawable-mdpi/splash_icon.png`             | 288 x 288   | 24 KB     | Android 12+ splash icon (288 dp, art in the 192 dp circle, mdpi)              | ✅  |
| `store-assets/android/res/drawable-night-land-hdpi/splash.png`       | 800 x 480   | 129 KB    | @capacitor/splash-screen, Android 11 and older (dark)                         | ✅  |
| `store-assets/android/res/drawable-night-land-mdpi/splash.png`       | 480 x 320   | 62 KB     | @capacitor/splash-screen, Android 11 and older (dark)                         | ✅  |
| `store-assets/android/res/drawable-night-land-xhdpi/splash.png`      | 1280 x 720  | 257 KB    | @capacitor/splash-screen, Android 11 and older (dark)                         | ✅  |
| `store-assets/android/res/drawable-night-land-xxhdpi/splash.png`     | 1600 x 960  | 458 KB    | @capacitor/splash-screen, Android 11 and older (dark)                         | ✅  |
| `store-assets/android/res/drawable-night-land-xxxhdpi/splash.png`    | 1920 x 1280 | 746 KB    | @capacitor/splash-screen, Android 11 and older (dark)                         | ✅  |
| `store-assets/android/res/drawable-night-port-hdpi/splash.png`       | 480 x 800   | 284 KB    | @capacitor/splash-screen, Android 11 and older (dark)                         | ✅  |
| `store-assets/android/res/drawable-night-port-mdpi/splash.png`       | 320 x 480   | 126 KB    | @capacitor/splash-screen, Android 11 and older (dark)                         | ✅  |
| `store-assets/android/res/drawable-night-port-xhdpi/splash.png`      | 720 x 1280  | 639 KB    | @capacitor/splash-screen, Android 11 and older (dark)                         | ✅  |
| `store-assets/android/res/drawable-night-port-xxhdpi/splash.png`     | 960 x 1600  | 935 KB    | @capacitor/splash-screen, Android 11 and older (dark)                         | ✅  |
| `store-assets/android/res/drawable-night-port-xxxhdpi/splash.png`    | 1280 x 1920 | 1249 KB   | @capacitor/splash-screen, Android 11 and older (dark)                         | ✅  |
| `store-assets/android/res/drawable-night/splash.png`                 | 480 x 800   | 284 KB    | @capacitor/splash-screen, Android 11 and older (dark)                         | ✅  |
| `store-assets/android/res/drawable-port-hdpi/splash.png`             | 480 x 800   | 324 KB    | @capacitor/splash-screen, Android 11 and older (light)                        | ✅  |
| `store-assets/android/res/drawable-port-mdpi/splash.png`             | 320 x 480   | 141 KB    | @capacitor/splash-screen, Android 11 and older (light)                        | ✅  |
| `store-assets/android/res/drawable-port-xhdpi/splash.png`            | 720 x 1280  | 713 KB    | @capacitor/splash-screen, Android 11 and older (light)                        | ✅  |
| `store-assets/android/res/drawable-port-xxhdpi/splash.png`           | 960 x 1600  | 1060 KB   | @capacitor/splash-screen, Android 11 and older (light)                        | ✅  |
| `store-assets/android/res/drawable-port-xxxhdpi/splash.png`          | 1280 x 1920 | 1437 KB   | @capacitor/splash-screen, Android 11 and older (light)                        | ✅  |
| `store-assets/android/res/drawable-xhdpi/splash_icon.png`            | 576 x 576   | 78 KB     | Android 12+ splash icon (288 dp, art in the 192 dp circle, xhdpi)             | ✅  |
| `store-assets/android/res/drawable-xxhdpi/splash_icon.png`           | 864 x 864   | 157 KB    | Android 12+ splash icon (288 dp, art in the 192 dp circle, xxhdpi)            | ✅  |
| `store-assets/android/res/drawable-xxxhdpi/splash_icon.png`          | 1152 x 1152 | 259 KB    | Android 12+ splash icon (288 dp, art in the 192 dp circle, xxxhdpi)           | ✅  |
| `store-assets/android/res/drawable/splash.png`                       | 480 x 800   | 324 KB    | @capacitor/splash-screen, Android 11 and older (light)                        | ✅  |
| `store-assets/android/res/mipmap-hdpi/ic_launcher.png`               | 72 x 72     | 7 KB      | Android launcher icon, square, before Android 8 (48 dp, hdpi)                 | ✅  |
| `store-assets/android/res/mipmap-hdpi/ic_launcher_background.png`    | 162 x 162   | 17 KB     | Android adaptive icon background layer (108 dp, hdpi)                         | ✅  |
| `store-assets/android/res/mipmap-hdpi/ic_launcher_foreground.png`    | 162 x 162   | 9 KB      | Android adaptive icon foreground layer (108 dp, hdpi)                         | ✅  |
| `store-assets/android/res/mipmap-hdpi/ic_launcher_monochrome.png`    | 162 x 162   | 5 KB      | Android adaptive icon monochrome layer (108 dp, hdpi)                         | ✅  |
| `store-assets/android/res/mipmap-hdpi/ic_launcher_round.png`         | 72 x 72     | 8 KB      | Android launcher icon, round, before Android 8 (48 dp, hdpi)                  | ✅  |
| `store-assets/android/res/mipmap-mdpi/ic_launcher.png`               | 48 x 48     | 4 KB      | Android launcher icon, square, before Android 8 (48 dp, mdpi)                 | ✅  |
| `store-assets/android/res/mipmap-mdpi/ic_launcher_background.png`    | 108 x 108   | 8 KB      | Android adaptive icon background layer (108 dp, mdpi)                         | ✅  |
| `store-assets/android/res/mipmap-mdpi/ic_launcher_foreground.png`    | 108 x 108   | 5 KB      | Android adaptive icon foreground layer (108 dp, mdpi)                         | ✅  |
| `store-assets/android/res/mipmap-mdpi/ic_launcher_monochrome.png`    | 108 x 108   | 3 KB      | Android adaptive icon monochrome layer (108 dp, mdpi)                         | ✅  |
| `store-assets/android/res/mipmap-mdpi/ic_launcher_round.png`         | 48 x 48     | 4 KB      | Android launcher icon, round, before Android 8 (48 dp, mdpi)                  | ✅  |
| `store-assets/android/res/mipmap-xhdpi/ic_launcher.png`              | 96 x 96     | 12 KB     | Android launcher icon, square, before Android 8 (48 dp, xhdpi)                | ✅  |
| `store-assets/android/res/mipmap-xhdpi/ic_launcher_background.png`   | 216 x 216   | 29 KB     | Android adaptive icon background layer (108 dp, xhdpi)                        | ✅  |
| `store-assets/android/res/mipmap-xhdpi/ic_launcher_foreground.png`   | 216 x 216   | 14 KB     | Android adaptive icon foreground layer (108 dp, xhdpi)                        | ✅  |
| `store-assets/android/res/mipmap-xhdpi/ic_launcher_monochrome.png`   | 216 x 216   | 7 KB      | Android adaptive icon monochrome layer (108 dp, xhdpi)                        | ✅  |
| `store-assets/android/res/mipmap-xhdpi/ic_launcher_round.png`        | 96 x 96     | 13 KB     | Android launcher icon, round, before Android 8 (48 dp, xhdpi)                 | ✅  |
| `store-assets/android/res/mipmap-xxhdpi/ic_launcher.png`             | 144 x 144   | 23 KB     | Android launcher icon, square, before Android 8 (48 dp, xxhdpi)               | ✅  |
| `store-assets/android/res/mipmap-xxhdpi/ic_launcher_background.png`  | 324 x 324   | 69 KB     | Android adaptive icon background layer (108 dp, xxhdpi)                       | ✅  |
| `store-assets/android/res/mipmap-xxhdpi/ic_launcher_foreground.png`  | 324 x 324   | 27 KB     | Android adaptive icon foreground layer (108 dp, xxhdpi)                       | ✅  |
| `store-assets/android/res/mipmap-xxhdpi/ic_launcher_monochrome.png`  | 324 x 324   | 11 KB     | Android adaptive icon monochrome layer (108 dp, xxhdpi)                       | ✅  |
| `store-assets/android/res/mipmap-xxhdpi/ic_launcher_round.png`       | 144 x 144   | 25 KB     | Android launcher icon, round, before Android 8 (48 dp, xxhdpi)                | ✅  |
| `store-assets/android/res/mipmap-xxxhdpi/ic_launcher.png`            | 192 x 192   | 39 KB     | Android launcher icon, square, before Android 8 (48 dp, xxxhdpi)              | ✅  |
| `store-assets/android/res/mipmap-xxxhdpi/ic_launcher_background.png` | 432 x 432   | 125 KB    | Android adaptive icon background layer (108 dp, xxxhdpi)                      | ✅  |
| `store-assets/android/res/mipmap-xxxhdpi/ic_launcher_foreground.png` | 432 x 432   | 44 KB     | Android adaptive icon foreground layer (108 dp, xxxhdpi)                      | ✅  |
| `store-assets/android/res/mipmap-xxxhdpi/ic_launcher_monochrome.png` | 432 x 432   | 17 KB     | Android adaptive icon monochrome layer (108 dp, xxxhdpi)                      | ✅  |
| `store-assets/android/res/mipmap-xxxhdpi/ic_launcher_round.png`      | 192 x 192   | 42 KB     | Android launcher icon, round, before Android 8 (48 dp, xxxhdpi)               | ✅  |
| `store-assets/checks/adaptive-round-48.png`                          | 48 x 48     | 4 KB      | Review only: the icon at 48 px                                                | ✅  |
| `store-assets/checks/icon-48.png`                                    | 48 x 48     | 4 KB      | Review only: the icon at 48 px                                                | ✅  |
| `store-assets/play/icon-512.png`                                     | 512 x 512   | 227 KB    | Play Store: app icon (512 x 512 PNG, up to 1 MB, full square)                 | ✅  |
| `store-assets/screenshots/phone/01-tap-arrows.png`                   | 1080 x 1920 | 208 KB    | Play Store: phone screenshot (PNG/JPEG, no alpha, sides 320-3840 px, max 2:1) | ✅  |
| `store-assets/screenshots/phone/02-think.png`                        | 1080 x 1920 | 179 KB    | Play Store: phone screenshot (PNG/JPEG, no alpha, sides 320-3840 px, max 2:1) | ✅  |
| `store-assets/screenshots/phone/03-shapes.png`                       | 1080 x 1920 | 152 KB    | Play Store: phone screenshot (PNG/JPEG, no alpha, sides 320-3840 px, max 2:1) | ✅  |
| `store-assets/screenshots/phone/04-snake-arrows.png`                 | 1080 x 1920 | 208 KB    | Play Store: phone screenshot (PNG/JPEG, no alpha, sides 320-3840 px, max 2:1) | ✅  |
| `store-assets/screenshots/phone/05-weekly-quests.png`                | 1080 x 1920 | 351 KB    | Play Store: phone screenshot (PNG/JPEG, no alpha, sides 320-3840 px, max 2:1) | ✅  |
| `store-assets/screenshots/phone/06-daily-rewards.png`                | 1080 x 1920 | 292 KB    | Play Store: phone screenshot (PNG/JPEG, no alpha, sides 320-3840 px, max 2:1) | ✅  |
| `store-assets/screenshots/phone/07-badges-trophies.png`              | 1080 x 1920 | 267 KB    | Play Store: phone screenshot (PNG/JPEG, no alpha, sides 320-3840 px, max 2:1) | ✅  |
| `store-assets/screenshots/phone/08-themes.png`                       | 1080 x 1920 | 235 KB    | Play Store: phone screenshot (PNG/JPEG, no alpha, sides 320-3840 px, max 2:1) | ✅  |
| `store-assets/screenshots/tablet-10/01-tap-arrows.png`               | 1600 x 2560 | 328 KB    | Play Store: 10-inch tablet screenshot (no alpha, sides 1080-3840 px, max 2:1) | ✅  |
| `store-assets/screenshots/tablet-10/03-shapes.png`                   | 1600 x 2560 | 307 KB    | Play Store: 10-inch tablet screenshot (no alpha, sides 1080-3840 px, max 2:1) | ✅  |
| `store-assets/screenshots/tablet-10/05-weekly-quests.png`            | 1600 x 2560 | 538 KB    | Play Store: 10-inch tablet screenshot (no alpha, sides 1080-3840 px, max 2:1) | ✅  |
| `store-assets/screenshots/tablet-10/07-badges-trophies.png`          | 1600 x 2560 | 454 KB    | Play Store: 10-inch tablet screenshot (no alpha, sides 1080-3840 px, max 2:1) | ✅  |
| `store-assets/screenshots/tablet-7/01-tap-arrows.png`                | 1200 x 1920 | 204 KB    | Play Store: 7-inch tablet screenshot (no alpha, sides 1080-3840 px, max 2:1)  | ✅  |
| `store-assets/screenshots/tablet-7/03-shapes.png`                    | 1200 x 1920 | 171 KB    | Play Store: 7-inch tablet screenshot (no alpha, sides 1080-3840 px, max 2:1)  | ✅  |
| `store-assets/screenshots/tablet-7/05-weekly-quests.png`             | 1200 x 1920 | 362 KB    | Play Store: 7-inch tablet screenshot (no alpha, sides 1080-3840 px, max 2:1)  | ✅  |
| `store-assets/screenshots/tablet-7/07-badges-trophies.png`           | 1200 x 1920 | 313 KB    | Play Store: 7-inch tablet screenshot (no alpha, sides 1080-3840 px, max 2:1)  | ✅  |
| `store-assets/splash/splash-dark-1080x1920.png`                      | 1080 x 1920 | 1107 KB   | Review copy of the splash screen (not uploaded)                               | ✅  |
| `store-assets/splash/splash-light-1080x1920.png`                     | 1080 x 1920 | 1257 KB   | Review copy of the splash screen (not uploaded)                               | ✅  |
| `public/favicon.ico`                                                 | 16, 32, 48  | 7 KB      | Browser tab icon                                                              | ✅  |

Other files: `android/res/mipmap-anydpi-v26/ic_launcher.xml` and `ic_launcher_round.xml` (adaptive icon with
background, foreground and monochrome layers), `android/res/values[-night]/splash_colors.xml` (splash background:
royal blue #0250F7 light, deep navy #0B1020 dark), `android/splash-theme.xml`, `listing.md` (store text).
